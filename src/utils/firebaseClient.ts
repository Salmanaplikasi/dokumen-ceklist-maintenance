import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

try {
  appInstance = initializeApp(firebaseConfig);
  dbInstance = getFirestore(appInstance, firebaseConfig.firestoreDatabaseId);
  authInstance = getAuth(appInstance);
} catch (error) {
  console.error('Failed to initialize Firebase SDK:', error);
}

export const firebaseApp = appInstance;
export const db = dbInstance;
export const auth = authInstance;

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<boolean> {
  if (!db) return false;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return false;
    }
    return true;
  }
}

export interface GoogleAuthActionResult {
  ok: boolean;
  user?: User;
  errorCode?: string;
  message: string;
}

export async function signInWithGoogle(): Promise<GoogleAuthActionResult> {
  if (!auth) {
    return {
      ok: false,
      message: 'Konfigurasi Firebase belum tersedia di perangkat ini.',
    };
  }
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return {
      ok: true,
      user: cred.user,
      message: `Masuk sebagai ${cred.user.displayName || cred.user.email || 'Teknisi'}.`,
    };
  } catch (error: unknown) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code)
        : '';
    if (code === 'auth/unauthorized-domain') {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'domain ini';
      return {
        ok: false,
        errorCode: code,
        message: `Domain "${host}" belum didaftarkan di Firebase Authentication -> Settings -> Authorized domains. Tambahkan "${host}" di Firebase Console agar login Google aktif di Vercel.`,
      };
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return {
        ok: false,
        errorCode: code,
        message: 'Login Google dibatalkan.',
      };
    }
    return {
      ok: false,
      errorCode: code,
      message: 'Gagal login dengan Google. Pastikan koneksi internet aktif dan popup diizinkan.',
    };
  }
}

export async function signOutGoogle(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}
