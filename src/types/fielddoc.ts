export interface FieldDocSlot {
  img: string;
  desc: string;
}

export interface FieldDocReport {
  id: string | null;
  org: string;
  site: string;
  title: string;
  date: string;
  wmOn: boolean;
  wmLoc: string;
  wmGps: string;
  slots: FieldDocSlot[];
  author: string;
  email: string;
  updated?: number;
  ownerUid?: string;
  visibility?: 'team' | 'private';
  slotCount?: number;
  filledCount?: number;
  syncStatus?: 'synced' | 'local-only';
}

export interface FieldDocAssetItem {
  t: string;
  n: string;
  k: string;
  r: string;
  l: string;
}

export interface FieldDocCloudConfig {
  apiKey: string;
  projectId: string;
  room: string;
  consent: boolean;
}

export interface CachedGpsPosition {
  lat: string;
  lon: string;
  acc: number;
  addr: string;
  formatted: string;
  savedAt: string;
}

export type CloudConnectionState =
  | { mode: 'local'; label: string }
  | { mode: 'auth-required'; label: string }
  | { mode: 'connected'; label: string; room: string; userEmail?: string; uid?: string }
  | { mode: 'disconnected'; label: string }
  | { mode: 'invalid'; label: string };
