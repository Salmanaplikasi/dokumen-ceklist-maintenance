import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { DEFAULT_FIELDDOC_ORG } from '../data/fieldDocAssets.ts';
import type {
  CloudConnectionState,
  FieldDocReport,
  FieldDocSlot,
} from '../types/fielddoc.ts';
import {
  FDOC_KEYS,
  clampFieldDocReportForCloud,
  createBlankSlot,
  mergeLocalAndCloudReports,
  sanitizeLocalReports,
  todayIso,
} from './fieldDocLogic.ts';
import {
  OperationType,
  auth,
  db,
  handleFirestoreError,
  testConnection,
} from './firebaseClient.ts';

const REPORTS_COLLECTION = 'fielddoc_reports';

let activeAuthUnsub: Unsubscribe | null = null;
let activeSnapshotUnsub: Unsubscribe | null = null;
let currentCloudReports: FieldDocReport[] = [];
let currentSignedInUser: User | null = null;
let migrationInFlight = false;

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

function persistLocalReportsSafely(reports: FieldDocReport[]): void {
  try {
    window.localStorage.setItem(FDOC_KEYS.localReports, JSON.stringify(reports));
  } catch {
    // Keep metadata + most recent reports if localStorage quota is tight
    try {
      const compact = reports.slice(0, 15).map((r) => ({
        ...r,
        slots: r.slots.map((s) => ({ desc: s.desc, img: s.img })),
      }));
      window.localStorage.setItem(FDOC_KEYS.localReports, JSON.stringify(compact));
    } catch {
      // Ignore quota exhaustion
    }
  }
}

export function getCurrentAuthUser(): User | null {
  return auth?.currentUser ?? currentSignedInUser;
}

function stopSnapshotListener(): void {
  if (activeSnapshotUnsub) {
    try {
      activeSnapshotUnsub();
    } catch {
      // Ignore
    }
    activeSnapshotUnsub = null;
  }
}

export function stopOnlineFirebaseSync(): void {
  stopSnapshotListener();
  if (activeAuthUnsub) {
    try {
      activeAuthUnsub();
    } catch {
      // Ignore
    }
    activeAuthUnsub = null;
  }
}

async function upsertUserPrivateProfile(user: User): Promise<void> {
  if (!db) return;
  const path = `users/${user.uid}/private/profile`;
  try {
    await setDoc(
      doc(db, 'users', user.uid, 'private', 'profile'),
      {
        uid: user.uid,
        displayName: (user.displayName || 'Teknisi Lapangan').slice(0, 120),
        email: (user.email || '').slice(0, 200),
        roleLabel: 'Teknisi Lapangan',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

async function writeReportAndSlotsToFirestore(
  report: FieldDocReport,
  user: User,
  existingOwnerUid?: string
): Promise<FieldDocReport> {
  const firestore = db;
  if (!firestore) throw new Error('Firestore belum diinisialisasi.');

  const clamped = clampFieldDocReportForCloud(report, existingOwnerUid || user.uid);
  const reportPath = `${REPORTS_COLLECTION}/${clamped.id}`;
  const reportRef = doc(firestore, REPORTS_COLLECTION, clamped.id);
  const slotsColRef = collection(firestore, REPORTS_COLLECTION, clamped.id, 'slots');

  let alreadyExistsInCloud = false;
  let preservedOwnerUid = clamped.ownerUid;

  try {
    const existingSnap = await getDoc(reportRef);
    if (existingSnap.exists()) {
      alreadyExistsInCloud = true;
      const existingData = existingSnap.data() as { ownerUid?: string };
      if (existingData.ownerUid) {
        preservedOwnerUid = existingData.ownerUid;
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, reportPath);
  }

  let existingSlotIds: string[] = [];
  if (alreadyExistsInCloud) {
    try {
      const slotSnap = await getDocs(
        query(slotsColRef, where('visibility', '==', clamped.visibility))
      );
      existingSlotIds = slotSnap.docs.map((d) => d.id);
    } catch {
      existingSlotIds = [];
    }
  }

  const batch = writeBatch(firestore);
  const baseReportPayload = {
    id: clamped.id,
    ownerUid: preservedOwnerUid,
    visibility: clamped.visibility,
    org: clamped.org,
    site: clamped.site,
    title: clamped.title,
    date: clamped.date,
    wmOn: clamped.wmOn,
    wmLoc: clamped.wmLoc,
    wmGps: clamped.wmGps,
    author: clamped.author,
    roleLabel: clamped.roleLabel,
    slotCount: clamped.slotCount,
    filledCount: clamped.filledCount,
    clientUpdatedMs: clamped.clientUpdatedMs,
    updatedAt: serverTimestamp(),
  };

  if (alreadyExistsInCloud) {
    batch.update(reportRef, baseReportPayload);
  } else {
    batch.set(reportRef, {
      ...baseReportPayload,
      createdAt: serverTimestamp(),
    });
  }

  const desiredSlotIds = new Set<string>();
  clamped.slots.forEach((slot, idx) => {
    const slotId = `slot_${idx}`;
    desiredSlotIds.add(slotId);
    const slotRef = doc(firestore, REPORTS_COLLECTION, clamped.id, 'slots', slotId);
    const isExistingSlot = existingSlotIds.includes(slotId);

    const slotPayload = {
      reportId: clamped.id,
      ownerUid: preservedOwnerUid,
      visibility: clamped.visibility,
      slotIndex: slot.slotIndex,
      img: slot.img,
      desc: slot.desc,
      updatedAt: serverTimestamp(),
    };

    if (isExistingSlot) {
      batch.update(slotRef, slotPayload);
    } else {
      batch.set(slotRef, {
        ...slotPayload,
        createdAt: serverTimestamp(),
      });
    }
  });

  // Clean up any removed trailing slots
  for (const oldSlotId of existingSlotIds) {
    if (!desiredSlotIds.has(oldSlotId)) {
      batch.delete(doc(firestore, REPORTS_COLLECTION, clamped.id, 'slots', oldSlotId));
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, reportPath);
  }

  return {
    ...report,
    id: clamped.id,
    ownerUid: preservedOwnerUid,
    visibility: clamped.visibility,
    slotCount: clamped.slotCount,
    filledCount: clamped.filledCount,
    updated: clamped.clientUpdatedMs,
    syncStatus: 'synced',
  };
}

/**
 * Non-destructively migrates any local-only or newer local reports from Arsip Tim into Firestore
 * without deleting or overwriting existing local archives.
 */
export async function syncLocalArchiveToCloud(
  cloudSnapshotIds?: Set<string>
): Promise<{ uploadedCount: number; failedCount: number }> {
  const user = getCurrentAuthUser();
  if (!db || !user || !user.emailVerified || !navigator.onLine || migrationInFlight) {
    return { uploadedCount: 0, failedCount: 0 };
  }

  migrationInFlight = true;
  let uploadedCount = 0;
  let failedCount = 0;

  try {
    const localList = getSanitizedLocalReports();
    const knownCloudById = new Map(
      currentCloudReports.map((r) => [String(r.id), r])
    );

    const updatedLocalList = [...localList];

    for (let i = 0; i < updatedLocalList.length; i++) {
      const localItem = updatedLocalList[i];
      if (!localItem.id || !localItem.title?.trim()) continue;
      const cloudMatch = knownCloudById.get(String(localItem.id));
      const needsUpload =
        (!cloudSnapshotIds?.has(String(localItem.id)) && !cloudMatch) ||
        (cloudMatch && (localItem.updated || 0) > (cloudMatch.updated || 0)) ||
        localItem.syncStatus === 'local-only';

      if (!needsUpload) continue;

      try {
        const synced = await writeReportAndSlotsToFirestore(
          localItem,
          user,
          cloudMatch?.ownerUid
        );
        updatedLocalList[i] = synced;
        uploadedCount += 1;
      } catch {
        failedCount += 1;
      }
    }

    if (uploadedCount > 0) {
      persistLocalReportsSafely(updatedLocalList);
    }
  } finally {
    migrationInFlight = false;
  }

  return { uploadedCount, failedCount };
}

export async function loadReportWithSlots(
  report: FieldDocReport
): Promise<FieldDocReport> {
  const user = getCurrentAuthUser();
  if (!db || !user || !user.emailVerified || !navigator.onLine || !report.id) {
    return report;
  }

  const slotsPath = `${REPORTS_COLLECTION}/${report.id}/slots`;
  try {
    const q = query(
      collection(db, REPORTS_COLLECTION, report.id, 'slots'),
      where('visibility', '==', report.visibility || 'team')
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      return report;
    }

    const fetchedSlots = snap.docs
      .map((d) => d.data() as { slotIndex?: number; img?: string; desc?: string })
      .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0))
      .map((d): FieldDocSlot => ({
        img: typeof d.img === 'string' ? d.img : '',
        desc: typeof d.desc === 'string' ? d.desc : '',
      }));

    const hydrated: FieldDocReport = {
      ...report,
      slots: fetchedSlots.length > 0 ? fetchedSlots : [createBlankSlot()],
      syncStatus: 'synced',
    };

    // Keep local offline cache hydrated with full photos
    const localList = getSanitizedLocalReports();
    const idx = localList.findIndex((x) => String(x.id) === String(hydrated.id));
    if (idx >= 0) localList[idx] = hydrated;
    else localList.unshift(hydrated);
    persistLocalReportsSafely(localList);

    return hydrated;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, slotsPath);
  }
}

export function initOnlineFirebaseSync(callbacks: {
  onReportsMerged: (reports: FieldDocReport[]) => void;
  onStatusChange: (status: CloudConnectionState) => void;
  onLocalMigrated?: (count: number) => void;
  onError?: (msg: string) => void;
}): void {
  stopOnlineFirebaseSync();

  // Immediately show existing local Arsip Tim so nothing is ever hidden or deleted
  callbacks.onReportsMerged(getSanitizedLocalReports());

  const firestore = db;
  if (!auth || !firestore) {
    callbacks.onStatusChange({
      mode: 'local',
      label: 'Penyimpanan Lokal',
    });
    return;
  }

  void testConnection();

  activeAuthUnsub = onAuthStateChanged(auth, async (user) => {
    currentSignedInUser = user;
    stopSnapshotListener();

    if (!user) {
      currentCloudReports = [];
      callbacks.onStatusChange({
        mode: 'auth-required',
        label: 'Masuk Google untuk Arsip Online',
      });
      callbacks.onReportsMerged(getSanitizedLocalReports());
      return;
    }

    if (!navigator.onLine) {
      callbacks.onStatusChange({
        mode: 'disconnected',
        label: 'Offline (Arsip Lokal Tersimpan)',
      });
      callbacks.onReportsMerged(getSanitizedLocalReports());
      return;
    }

    try {
      await upsertUserPrivateProfile(user);
    } catch {
      // Continue subscribing to team archive even if private profile write is throttled
    }

    const teamQuery = query(
      collection(firestore, REPORTS_COLLECTION),
      where('visibility', '==', 'team')
    );

    let firstSnapshotHandled = false;

    activeSnapshotUnsub = onSnapshot(
      teamQuery,
      async (snapshot) => {
        const localBeforeMerge = getSanitizedLocalReports();
        const localById = new Map(localBeforeMerge.map((r) => [String(r.id), r]));
        const cloudIds = new Set<string>();

        const cloudList: FieldDocReport[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          const id = String(data.id || docSnap.id);
          cloudIds.add(id);

          const cachedLocal = localById.get(id);
          const slotCount =
            typeof data.slotCount === 'number' && data.slotCount > 0
              ? data.slotCount
              : cachedLocal?.slots.length || 3;

          // Keep locally cached slots if already present, otherwise create placeholder slots
          // matching slotCount until user opens/edits the report (which hydrates full photos)
          const slots: FieldDocSlot[] =
            cachedLocal && cachedLocal.slots.length > 0
              ? cachedLocal.slots
              : Array.from({ length: slotCount }, createBlankSlot);

          return {
            id,
            org:
              typeof data.org === 'string' && data.org.trim()
                ? data.org
                : DEFAULT_FIELDDOC_ORG,
            site: typeof data.site === 'string' ? data.site : '',
            title: typeof data.title === 'string' ? data.title : 'Tanpa Judul',
            date: typeof data.date === 'string' && data.date ? data.date : todayIso(),
            wmOn: data.wmOn === undefined ? true : Boolean(data.wmOn),
            wmLoc: typeof data.wmLoc === 'string' ? data.wmLoc : '',
            wmGps: typeof data.wmGps === 'string' ? data.wmGps : '',
            author: typeof data.author === 'string' ? data.author : 'Teknisi',
            email: typeof data.roleLabel === 'string' ? data.roleLabel : 'Teknisi Lapangan',
            updated:
              typeof data.clientUpdatedMs === 'number' ? data.clientUpdatedMs : Date.now(),
            ownerUid: typeof data.ownerUid === 'string' ? data.ownerUid : undefined,
            visibility: data.visibility === 'private' ? 'private' : 'team',
            slotCount,
            filledCount:
              typeof data.filledCount === 'number'
                ? data.filledCount
                : slots.filter((s) => Boolean(s.img)).length,
            slots,
            syncStatus: 'synced',
          };
        });

        currentCloudReports = cloudList;
        const merged = mergeLocalAndCloudReports(localBeforeMerge, cloudList);
        persistLocalReportsSafely(merged);

        callbacks.onStatusChange({
          mode: 'connected',
          label: `Online Tim (${user.displayName || user.email || 'Aktif'})`,
          room: 'team',
          userEmail: user.email || undefined,
          uid: user.uid,
        });
        callbacks.onReportsMerged(merged);

        if (!firstSnapshotHandled) {
          firstSnapshotHandled = true;
          const { uploadedCount } = await syncLocalArchiveToCloud(cloudIds);
          if (uploadedCount > 0) {
            callbacks.onLocalMigrated?.(uploadedCount);
          }
        }
      },
      (error) => {
        callbacks.onStatusChange({
          mode: 'disconnected',
          label: 'Sinkronisasi Terputus (Mode Lokal)',
        });
        callbacks.onError?.('Tidak dapat memuat Arsip Online. Menampilkan arsip lokal.');
        try {
          handleFirestoreError(error, OperationType.LIST, REPORTS_COLLECTION);
        } catch {
          // Keep UI resilient while preserving structured console diagnostics
        }
      }
    );
  });
}

export const FieldDocStorageEngine = {
  async saveReport(report: FieldDocReport): Promise<FieldDocReport> {
    const baseSaved: FieldDocReport = {
      ...report,
      id: report.id
        ? String(report.id).replace(/[^a-zA-Z0-9_\-]/g, '_')
        : `rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      updated: Date.now(),
      visibility: report.visibility || 'team',
      syncStatus: 'local-only',
    };

    const list = getSanitizedLocalReports();
    const idx = list.findIndex((x) => String(x.id) === baseSaved.id);
    if (idx >= 0) list[idx] = baseSaved;
    else list.unshift(baseSaved);
    persistLocalReportsSafely(list);

    const user = getCurrentAuthUser();
    if (db && user && user.emailVerified && navigator.onLine) {
      const synced = await writeReportAndSlotsToFirestore(
        baseSaved,
        user,
        baseSaved.ownerUid
      );
      const refreshedList = getSanitizedLocalReports();
      const rIdx = refreshedList.findIndex((x) => String(x.id) === synced.id);
      if (rIdx >= 0) refreshedList[rIdx] = synced;
      else refreshedList.unshift(synced);
      persistLocalReportsSafely(refreshedList);
      return synced;
    }

    return baseSaved;
  },

  getReports(): FieldDocReport[] {
    return mergeLocalAndCloudReports(getSanitizedLocalReports(), currentCloudReports);
  },

  async deleteReport(id: string, visibility: 'team' | 'private' = 'team'): Promise<void> {
    const targetId = String(id);
    const list = getSanitizedLocalReports().filter((x) => String(x.id) !== targetId);
    persistLocalReportsSafely(list);

    const user = getCurrentAuthUser();
    if (db && user && user.emailVerified && navigator.onLine) {
      const reportPath = `${REPORTS_COLLECTION}/${targetId}`;
      try {
        const slotSnap = await getDocs(
          query(
            collection(db, REPORTS_COLLECTION, targetId, 'slots'),
            where('visibility', '==', visibility)
          )
        );
        const batch = writeBatch(db);
        slotSnap.docs.forEach((d) => batch.delete(d.ref));
        batch.delete(doc(db, REPORTS_COLLECTION, targetId));
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, reportPath);
      }
    }
  },
};
