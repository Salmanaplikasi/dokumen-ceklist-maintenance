import { deleteApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  setDoc,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  CloudConnectionState,
  FieldDocCloudConfig,
  FieldDocReport,
} from '../types/fielddoc.ts';
import {
  FDOC_KEYS,
  parseCloudAutoConnectParam,
  sanitizeLocalReports,
} from './fieldDocLogic.ts';

const FIELDDOC_APP_NAME = 'fielddoc-private-sync';

let activeDb: Firestore | null = null;
let activeUnsubscribe: Unsubscribe | null = null;

function withTimeout<T>(promise: Promise<T>, ms = 4000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error('timeout')), ms);
    }),
  ]);
}

export function getPrivateCloudConfig(): FieldDocCloudConfig | null {
  try {
    const raw = window.localStorage.getItem(FDOC_KEYS.privateCloudCfg);
    if (raw) return JSON.parse(raw) as FieldDocCloudConfig;
  } catch {
    // Ignore
  }
  return null;
}

export function savePrivateCloudConfig(cfg: FieldDocCloudConfig): void {
  try {
    window.localStorage.setItem(FDOC_KEYS.privateCloudCfg, JSON.stringify(cfg));
  } catch {
    // Ignore
  }
}

export function clearPrivateCloudConfig(): void {
  try {
    window.localStorage.removeItem(FDOC_KEYS.privateCloudCfg);
  } catch {
    // Ignore
  }
}

export function checkUrlAutoConnectConfig(): boolean {
  try {
    const parsed = parseCloudAutoConnectParam(window.location.search);
    if (parsed) {
      savePrivateCloudConfig(parsed);
      window.history.replaceState({}, document.title, window.location.pathname);
      return true;
    }
  } catch {
    // Ignore
  }
  return false;
}

export function getSanitizedLocalReports(): FieldDocReport[] {
  try {
    const raw = window.localStorage.getItem(FDOC_KEYS.localReports);
    const { reports, mutated } = sanitizeLocalReports(raw);
    if (mutated) {
      window.localStorage.setItem(FDOC_KEYS.localReports, JSON.stringify(reports));
    }
    return reports;
  } catch {
    return [];
  }
}

export function getWorkspaceCollectionName(): string {
  const cfg = getPrivateCloudConfig();
  const cleanRoom = (cfg?.room ? cfg.room : 'default_workspace').replace(/[^\w\-]/g, '_');
  return `workspace_${cleanRoom}`;
}

export function stopPrivateFirebaseConnection(): void {
  if (activeUnsubscribe) {
    try {
      activeUnsubscribe();
    } catch {
      // Ignore
    }
    activeUnsubscribe = null;
  }
  activeDb = null;
}

export async function initPrivateFirebaseConnection(
  onCloudDataReceived: (reports: FieldDocReport[]) => void,
  onStatusChange: (status: CloudConnectionState) => void
): Promise<boolean> {
  const cfg = getPrivateCloudConfig();

  if (activeUnsubscribe) {
    try {
      activeUnsubscribe();
    } catch {
      // Ignore
    }
    activeUnsubscribe = null;
  }

  if (!cfg || !cfg.apiKey || !cfg.projectId || !cfg.consent) {
    activeDb = null;
    onStatusChange({
      mode: 'local',
      label: 'Penyimpanan Lokal',
    });
    return false;
  }

  try {
    const firebaseConfig = {
      apiKey: cfg.apiKey.trim(),
      authDomain: `${cfg.projectId.trim()}.firebaseapp.com`,
      projectId: cfg.projectId.trim(),
    };

    const existing = getApps().find((a) => a.name === FIELDDOC_APP_NAME);
    let app: FirebaseApp;
    if (existing) {
      const prevOpts = existing.options;
      if (
        prevOpts.apiKey !== firebaseConfig.apiKey ||
        prevOpts.projectId !== firebaseConfig.projectId
      ) {
        await deleteApp(existing);
        app = initializeApp(firebaseConfig, FIELDDOC_APP_NAME);
      } else {
        app = existing;
      }
    } else {
      app = initializeApp(firebaseConfig, FIELDDOC_APP_NAME);
    }

    try {
      const auth = getAuth(app);
      await withTimeout(signInAnonymously(auth), 2500);
    } catch {
      // Anonymous auth optional depending on user's Firestore rules
    }

    activeDb = getFirestore(app);
    const colName = getWorkspaceCollectionName();

    activeUnsubscribe = onSnapshot(
      collection(activeDb, colName),
      (snap) => {
        const cloudList: FieldDocReport[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as FieldDocReport;
          cloudList.push({
            ...data,
            id: String(data.id || docSnap.id),
          });
        });
        cloudList.sort((a, b) => (b.updated || 0) - (a.updated || 0));
        try {
          window.localStorage.setItem(
            FDOC_KEYS.localReports,
            JSON.stringify(cloudList.slice(0, 25))
          );
        } catch {
          // Ignore quota errors
        }

        onStatusChange({
          mode: 'connected',
          label: `Cloud Aktif (${cfg.room || 'Tim'})`,
          room: cfg.room || 'Tim',
        });
        onCloudDataReceived(cloudList);
      },
      () => {
        onStatusChange({
          mode: 'disconnected',
          label: 'Cloud Terputus (Mode Lokal)',
        });
      }
    );

    return true;
  } catch {
    activeDb = null;
    onStatusChange({
      mode: 'invalid',
      label: 'Konfigurasi Cloud Belum Valid',
    });
    return false;
  }
}

export const FieldDocStorageEngine = {
  async saveReport(report: FieldDocReport): Promise<FieldDocReport> {
    const saved: FieldDocReport = {
      ...report,
      id: report.id
        ? String(report.id)
        : `rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      updated: Date.now(),
    };

    const list = getSanitizedLocalReports();
    const idx = list.findIndex((x) => String(x.id) === saved.id);
    if (idx >= 0) list[idx] = saved;
    else list.unshift(saved);

    try {
      window.localStorage.setItem(FDOC_KEYS.localReports, JSON.stringify(list));
    } catch {
      // Ignore quota errors
    }

    const cfg = getPrivateCloudConfig();
    if (activeDb && cfg?.consent && navigator.onLine && saved.id) {
      const colName = getWorkspaceCollectionName();
      await withTimeout(setDoc(doc(activeDb, colName, saved.id), saved)).catch(() => {});
    }

    return saved;
  },

  getReports(currentCache: FieldDocReport[] = []): FieldDocReport[] {
    return currentCache.length > 0 ? currentCache : getSanitizedLocalReports();
  },

  async deleteReport(id: string): Promise<void> {
    const targetId = String(id);
    const list = getSanitizedLocalReports().filter((x) => String(x.id) !== targetId);
    try {
      window.localStorage.setItem(FDOC_KEYS.localReports, JSON.stringify(list));
    } catch {
      // Ignore
    }

    const cfg = getPrivateCloudConfig();
    if (activeDb && cfg?.consent && navigator.onLine) {
      const colName = getWorkspaceCollectionName();
      await withTimeout(deleteDoc(doc(activeDb, colName, targetId))).catch(() => {});
    }
  },
};
