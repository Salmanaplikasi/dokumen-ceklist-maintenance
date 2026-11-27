import {
  DEFAULT_FIELDDOC_ORG,
  FIELDDOC_DAYS,
  FIELDDOC_MONTHS,
  FIELDDOC_RAW_ASSETS,
  FIELDDOC_SYSTEMS,
} from '../data/fieldDocAssets.ts';
import type {
  FieldDocAssetItem,
  FieldDocCloudConfig,
  FieldDocReport,
  FieldDocSlot,
} from '../types/fielddoc.ts';

export const FDOC_KEYS = {
  sitePrefix: 'fdoc_site_prefix',
  engineerName: 'fdoc_engineer_name',
  engineerEmail: 'fdoc_engineer_email',
  orgHeader: 'fdoc_org_header',
  wmLoc: 'fdoc_wm_loc',
  wmGps: 'fdoc_wm_gps',
  lastOnlinePos: 'fdoc_last_online_pos',
  privateCloudCfg: 'fdoc_private_cloud_cfg',
  localReports: 'fdoc_local_reports',
} as const;

export function todayIso(): string {
  const d = new Date();
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

export function formatIndonesianDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return isoDate;
  const [y, m, d] = parts;
  return `${d} ${FIELDDOC_MONTHS[m - 1] ?? ''} ${y}`;
}

export function formatIndonesianFullDay(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return isoDate;
  const [y, m, d] = parts;
  const dtObj = new Date(y, m - 1, d);
  return `${FIELDDOC_DAYS[dtObj.getDay()] ?? ''}, ${d} ${FIELDDOC_MONTHS[m - 1] ?? ''} ${y}`;
}

export function nowTimeStr(now: Date = new Date()): string {
  return (
    String(now.getHours()).padStart(2, '0') +
    ':' +
    String(now.getMinutes()).padStart(2, '0') +
    ':' +
    String(now.getSeconds()).padStart(2, '0') +
    ' WIB'
  );
}

export function buildItemsList(sitePrefix: string): FieldDocAssetItem[] {
  const pfx = sitePrefix.trim();
  const fullPfx = pfx ? `${pfx}-` : '';

  const systemItems: FieldDocAssetItem[] = FIELDDOC_SYSTEMS.map((s) => ({
    t: s,
    n: s,
    k: 'Seluruh sistem',
    r: '',
    l: s.toLowerCase(),
  }));

  const assetItems: FieldDocAssetItem[] = FIELDDOC_RAW_ASSETS.map(([sysIdx, tag, room]) => {
    const sysName = FIELDDOC_SYSTEMS[sysIdx] ?? '';
    const tagged = `${fullPfx}${tag}`;
    const fullText = `${sysName} - ${tagged}${room ? ` - ${room}` : ''}`;
    return {
      t: fullText,
      n: tagged,
      k: `${sysName}${room ? ` · ${room}` : ''}`,
      r: room || '',
      l: fullText.toLowerCase(),
    };
  });

  return [...systemItems, ...assetItems];
}

export function filterAssetItems(
  items: FieldDocAssetItem[],
  query: string,
  limit = 30
): { matches: FieldDocAssetItem[]; overflowCount: number } {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const filtered =
    tokens.length === 0
      ? items
      : items.filter((item) => tokens.every((tok) => item.l.includes(tok)));
  return {
    matches: filtered.slice(0, limit),
    overflowCount: Math.max(0, filtered.length - limit),
  };
}

export function createBlankSlot(): FieldDocSlot {
  return { img: '', desc: '' };
}

export function createFreshFieldDocReport(opts?: {
  org?: string;
  site?: string;
  wmLoc?: string;
  wmGps?: string;
  author?: string;
  email?: string;
  title?: string;
  date?: string;
}): FieldDocReport {
  return {
    id: null,
    org: (opts?.org ?? DEFAULT_FIELDDOC_ORG).trim() || DEFAULT_FIELDDOC_ORG,
    site: opts?.site ?? '',
    title: opts?.title ?? '',
    date: opts?.date ?? todayIso(),
    wmOn: true,
    wmLoc: opts?.wmLoc || 'Area Fasilitas Utama',
    wmGps: opts?.wmGps || '',
    slots: Array.from({ length: 3 }, createBlankSlot),
    author: opts?.author || 'M. Salman. A',
    email: opts?.email || 'Teknisi Lapangan',
  };
}

export function sanitizeFieldDocFilename(
  title: string,
  date: string,
  ext: 'docx' | 'pdf' | 'xlsx'
): string {
  const safeTitle =
    title
      .replace(/[^\w\- ]+/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 40) || 'Teknis';
  const safeDate = date || todayIso();
  return `Laporan_Dokumentasi_${safeTitle}_${safeDate}.${ext}`;
}

export function sanitizeLocalReports(rawJson: string | null): {
  reports: FieldDocReport[];
  mutated: boolean;
} {
  let list: unknown[] = [];
  let mutated = false;
  try {
    const parsed = JSON.parse(rawJson || '[]');
    if (Array.isArray(parsed)) {
      list = parsed;
    } else {
      mutated = true;
    }
  } catch {
    return { reports: [], mutated: false };
  }

  const seen = new Set<string>();
  const reports: FieldDocReport[] = [];

  list.forEach((rawItem, idx) => {
    if (!rawItem || typeof rawItem !== 'object') {
      mutated = true;
      return;
    }
    const item = { ...(rawItem as Record<string, unknown>) };
    if (!item.id || seen.has(String(item.id))) {
      item.id = `rep_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
      mutated = true;
    } else if (typeof item.id !== 'string') {
      item.id = String(item.id);
      mutated = true;
    }
    seen.add(item.id as string);

    const rawSlots = Array.isArray(item.slots) ? item.slots : [];
    const slots: FieldDocSlot[] = rawSlots.map((s) => {
      if (s && typeof s === 'object') {
        const sr = s as Record<string, unknown>;
        return {
          img: typeof sr.img === 'string' ? sr.img : '',
          desc: typeof sr.desc === 'string' ? sr.desc : '',
        };
      }
      return createBlankSlot();
    });

    reports.push({
      id: item.id as string,
      org: typeof item.org === 'string' && item.org.trim() ? item.org : DEFAULT_FIELDDOC_ORG,
      site: typeof item.site === 'string' ? item.site : '',
      title: typeof item.title === 'string' ? item.title : '',
      date: typeof item.date === 'string' && item.date ? item.date : todayIso(),
      wmOn: item.wmOn === undefined ? true : Boolean(item.wmOn),
      wmLoc: typeof item.wmLoc === 'string' ? item.wmLoc : 'Area Fasilitas Utama',
      wmGps: typeof item.wmGps === 'string' ? item.wmGps : '',
      slots: slots.length > 0 ? slots : Array.from({ length: 3 }, createBlankSlot),
      author: typeof item.author === 'string' ? item.author : 'M. Salman. A',
      email: typeof item.email === 'string' ? item.email : 'Teknisi Lapangan',
      updated: typeof item.updated === 'number' ? item.updated : 0,
      ownerUid: typeof item.ownerUid === 'string' ? item.ownerUid : undefined,
      visibility: item.visibility === 'private' ? 'private' : 'team',
      slotCount: typeof item.slotCount === 'number' ? item.slotCount : undefined,
      filledCount: typeof item.filledCount === 'number' ? item.filledCount : undefined,
      syncStatus: item.syncStatus === 'synced' ? 'synced' : 'local-only',
    });
  });

  reports.sort((a, b) => (b.updated || 0) - (a.updated || 0));
  return { reports, mutated };
}

export function filterArchiveReports(
  reports: FieldDocReport[],
  query: string
): FieldDocReport[] {
  const q = query.toLowerCase().trim();
  if (!q) return reports;
  return reports.filter((x) => {
    const haystack = [
      x.org || '',
      x.title || '',
      x.date || '',
      formatIndonesianDate(x.date),
      x.author || '',
      x.email || '',
      x.wmLoc || '',
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function parseCloudAutoConnectParam(search: string): FieldDocCloudConfig | null {
  try {
    const params = new URLSearchParams(search);
    const encoded = params.get('cloud_cfg');
    if (!encoded) return null;
    const jsonStr =
      typeof atob === 'function'
        ? atob(encoded)
        : Buffer.from(encoded, 'base64').toString('utf8');
    const decoded = JSON.parse(jsonStr) as Partial<FieldDocCloudConfig>;
    if (decoded && decoded.apiKey && decoded.projectId && decoded.room) {
      return {
        apiKey: String(decoded.apiKey).trim(),
        projectId: String(decoded.projectId).trim(),
        room: String(decoded.room).trim(),
        consent: true,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function buildCloudShareUrl(
  origin: string,
  pathname: string,
  cfg: Pick<FieldDocCloudConfig, 'apiKey' | 'projectId' | 'room'>
): string {
  const payload = JSON.stringify({
    apiKey: cfg.apiKey.trim(),
    projectId: cfg.projectId.trim(),
    room: cfg.room.trim() || 'tim_fasilitas_1',
  });
  const encoded =
    typeof btoa === 'function'
      ? btoa(payload)
      : Buffer.from(payload, 'utf8').toString('base64');
  return `${origin}${pathname}?cloud_cfg=${encodeURIComponent(encoded)}`;
}

export function wrapCanvasLines(
  measureWidth: (text: string) => number,
  text: string,
  maxWidth: number
): string[] {
  const out: string[] = [];
  const safeMaxWidth = Math.max(12, maxWidth);

  const splitLongToken = (token: string): string[] => {
    if (measureWidth(token) <= safeMaxWidth) return [token];
    const parts: string[] = [];
    let chunk = '';
    for (const ch of token) {
      const nextChunk = chunk + ch;
      if (chunk && measureWidth(nextChunk) > safeMaxWidth) {
        parts.push(chunk);
        chunk = ch;
      } else {
        chunk = nextChunk;
      }
    }
    if (chunk) parts.push(chunk);
    return parts;
  };

  String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .forEach((par) => {
      if (!par) {
        out.push('');
        return;
      }
      let line = '';
      const rawWords = par.split(' ');
      rawWords.forEach((rawWord) => {
        const chunks = splitLongToken(rawWord);
        chunks.forEach((word) => {
          const candidate = line ? `${line} ${word}` : word;
          if (measureWidth(candidate) > safeMaxWidth && line) {
            out.push(line);
            line = word;
          } else {
            line = candidate;
          }
        });
      });
      out.push(line);
    });
  return out;
}

export function estimateWrappedLineCount(
  text: string,
  maxCharsPerLine: number
): number {
  const lines = wrapCanvasLines(
    (s) => s.length,
    text || '',
    Math.max(8, maxCharsPerLine)
  );
  return Math.max(1, lines.length);
}

/**
 * Merges locally archived reports with cloud reports non-destructively:
 * - Never drops unsynced local-only reports so existing local Arsip Tim stays intact.
 * - Preserves locally cached photo slots if cloud summary metadata has not yet hydrated subcollection slots.
 * - Keeps the newest version when both local and cloud have the same report ID.
 */
export function mergeLocalAndCloudReports(
  localReports: FieldDocReport[],
  cloudReports: FieldDocReport[]
): FieldDocReport[] {
  const byId = new Map<string, FieldDocReport>();

  for (const local of localReports) {
    if (!local.id) continue;
    byId.set(String(local.id), {
      ...local,
      id: String(local.id),
      syncStatus: local.syncStatus ?? 'local-only',
    });
  }

  for (const cloud of cloudReports) {
    if (!cloud.id) continue;
    const id = String(cloud.id);
    const existing = byId.get(id);
    const cloudSlots = Array.isArray(cloud.slots) ? cloud.slots : [];
    const existingSlots = existing && Array.isArray(existing.slots) ? existing.slots : [];

    const cloudHasImages = cloudSlots.some((s) => Boolean(s.img));
    const existingHasImages = existingSlots.some((s) => Boolean(s.img));

    const resolvedSlots =
      cloudHasImages || existingSlots.length === 0
        ? cloudSlots
        : existingSlots;

    if (!existing || (cloud.updated || 0) >= (existing.updated || 0)) {
      byId.set(id, {
        ...cloud,
        id,
        slots: resolvedSlots.length > 0 ? resolvedSlots : cloudSlots,
        syncStatus: 'synced',
      });
    } else {
      byId.set(id, {
        ...existing,
        ownerUid: existing.ownerUid || cloud.ownerUid,
        visibility: existing.visibility || cloud.visibility || 'team',
        syncStatus: 'local-only',
      });
    }
  }

  return Array.from(byId.values()).sort((a, b) => (b.updated || 0) - (a.updated || 0));
}

/**
 * Clamps all fields of a FieldDocReport strictly within the limits declared in firebase-blueprint.json
 * and firestore.rules so Firestore mutations never fail schema bounds.
 */
export function clampFieldDocReportForCloud(
  report: FieldDocReport,
  fallbackOwnerUid: string
): {
  id: string;
  ownerUid: string;
  visibility: 'team' | 'private';
  org: string;
  site: string;
  title: string;
  date: string;
  wmOn: boolean;
  wmLoc: string;
  wmGps: string;
  author: string;
  roleLabel: string;
  slotCount: number;
  filledCount: number;
  clientUpdatedMs: number;
  slots: Array<{ slotIndex: number; img: string; desc: string }>;
} {
  const safeId =
    (report.id || `rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`)
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .slice(0, 128) || `rep_${Date.now()}`;
  const rawOwner = (report.ownerUid || fallbackOwnerUid).replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
  const clampedSlots = (Array.isArray(report.slots) && report.slots.length > 0
    ? report.slots
    : [createBlankSlot()]
  )
    .slice(0, 50)
    .map((s, idx) => ({
      slotIndex: idx,
      img: typeof s.img === 'string' && s.img.length <= 450000 ? s.img : '',
      desc: String(s.desc || '').slice(0, 4000),
    }));

  const filledCount = clampedSlots.filter((s) => Boolean(s.img)).length;

  return {
    id: safeId,
    ownerUid: rawOwner,
    visibility: report.visibility === 'private' ? 'private' : 'team',
    org: (report.org || DEFAULT_FIELDDOC_ORG).trim().slice(0, 200) || DEFAULT_FIELDDOC_ORG,
    site: String(report.site || '').slice(0, 64),
    title: (report.title || 'Laporan Dokumentasi Pekerjaan').trim().slice(0, 250) || 'Laporan Dokumentasi Pekerjaan',
    date: (report.date || todayIso()).slice(0, 32),
    wmOn: Boolean(report.wmOn),
    wmLoc: String(report.wmLoc || '').slice(0, 200),
    wmGps: String(report.wmGps || '').slice(0, 160),
    author: (report.author || 'Teknisi Lapangan').trim().slice(0, 120) || 'Teknisi Lapangan',
    roleLabel: String(report.email || 'Teknisi Lapangan').slice(0, 120),
    slotCount: clampedSlots.length,
    filledCount,
    clientUpdatedMs: typeof report.updated === 'number' && report.updated >= 0 ? report.updated : Date.now(),
    slots: clampedSlots,
  };
}

