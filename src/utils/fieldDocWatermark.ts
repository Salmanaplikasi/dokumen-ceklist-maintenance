import type { CachedGpsPosition, FieldDocReport } from '../types/fielddoc.ts';
import {
  FDOC_KEYS,
  formatIndonesianDate,
  formatIndonesianFullDay,
  nowTimeStr,
  todayIso,
  wrapCanvasLines,
} from './fieldDocLogic.ts';

const WATERMARK_FONT =
  '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export function getLastKnownOnlinePos(): CachedGpsPosition | null {
  try {
    const raw = window.localStorage.getItem(FDOC_KEYS.lastOnlinePos);
    if (raw) return JSON.parse(raw) as CachedGpsPosition;
  } catch {
    // Ignore storage read error
  }
  return null;
}

export function saveLastKnownOnlinePos(
  lat: string,
  lon: string,
  acc: number,
  addr: string,
  formatted: string
): CachedGpsPosition {
  const payload: CachedGpsPosition = {
    lat,
    lon,
    acc,
    addr: addr || '',
    formatted,
    savedAt: `${nowTimeStr()} (${formatIndonesianDate(todayIso())})`,
  };
  try {
    window.localStorage.setItem(FDOC_KEYS.lastOnlinePos, JSON.stringify(payload));
    window.localStorage.setItem(FDOC_KEYS.wmGps, formatted);
  } catch {
    // Ignore storage quota error
  }
  return payload;
}

export function getInitialGpsString(): string {
  try {
    const manual = window.localStorage.getItem(FDOC_KEYS.wmGps);
    if (manual) return manual;
  } catch {
    // Ignore
  }
  const cached = getLastKnownOnlinePos();
  return cached ? cached.formatted : '';
}

export function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal memuat gambar.'));
    img.src = src;
  });
}

export function drawConotaWatermark(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: Pick<FieldDocReport, 'wmOn' | 'wmLoc' | 'title' | 'date' | 'wmGps' | 'author' | 'email'>
): void {
  if (!state.wmOn) return;

  const pad = Math.round(w * 0.025);
  const fTitle = Math.max(14, Math.round(w * 0.024));
  const fSub = Math.max(11, Math.round(w * 0.019));
  const lineH = Math.round(fSub * 1.38);

  const locName = (state.wmLoc || state.title || 'Lokasi Dokumentasi').trim();
  const dateStr = `${formatIndonesianFullDay(state.date)}  •  ${nowTimeStr()}`;

  let gpsStr = (state.wmGps || '').trim();
  if (!gpsStr) {
    const cachedPos = getLastKnownOnlinePos();
    if (cachedPos?.formatted) gpsStr = cachedPos.formatted;
  }

  const engStr =
    (state.author || 'M. Salman. A') + (state.email ? ` (${state.email})` : '');

  ctx.save();
  ctx.font = `bold ${fTitle}px ${WATERMARK_FONT}`;
  const maxTextW = w - pad * 4;
  const locLines = wrapCanvasLines(
    (txt) => ctx.measureText(txt).width,
    `📍 ${locName}`,
    maxTextW
  ).slice(0, 2);

  const infoLines: string[] = [`📅 ${dateStr}`];
  if (gpsStr) {
    ctx.font = `${fSub}px ${WATERMARK_FONT}`;
    const gLines = wrapCanvasLines(
      (txt) => ctx.measureText(txt).width,
      `🌐 ${gpsStr}`,
      maxTextW
    ).slice(0, 2);
    infoLines.push(...gLines);
  }
  infoLines.push(`👤 ${engStr}`);

  const boxH =
    pad * 1.6 +
    locLines.length * Math.round(fTitle * 1.3) +
    infoLines.length * lineH +
    6;
  const boxY = h - boxH;

  const grad = ctx.createLinearGradient(0, boxY - 24, 0, h);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0)');
  grad.addColorStop(0.22, 'rgba(15, 23, 42, 0.72)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0.88)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, boxY - 24, w, boxH + 24);

  const barX = pad;
  const barTop = boxY + pad * 0.5;
  const barHeight = boxH - pad * 1.2;
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(barX, barTop, Math.max(4, Math.round(w * 0.006)), barHeight);

  const textX = barX + Math.max(12, Math.round(w * 0.018));
  let curY = barTop + fTitle - 2;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  ctx.fillStyle = '#fbbf24';
  ctx.font = `bold ${fTitle}px ${WATERMARK_FONT}`;
  locLines.forEach((line) => {
    ctx.fillText(line, textX, curY);
    curY += Math.round(fTitle * 1.3);
  });

  ctx.fillStyle = '#f8fafc';
  ctx.font = `600 ${fSub}px ${WATERMARK_FONT}`;
  curY += 2;
  infoLines.forEach((line) => {
    ctx.fillText(line, textX, curY);
    curY += lineH;
  });

  ctx.restore();
}

export async function shrinkPhotoWithWatermark(
  file: File,
  state: Pick<FieldDocReport, 'wmOn' | 'wmLoc' | 'title' | 'date' | 'wmGps' | 'author' | 'email'>
): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImg(objectUrl);
    const W = 800;
    const H = 600;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D tidak tersedia.');

    const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);

    drawConotaWatermark(ctx, W, H, state);
    let dataUrl = canvas.toDataURL('image/jpeg', 0.75);
    let quality = 0.65;
    while (dataUrl.length > 430000 && quality >= 0.35) {
      dataUrl = canvas.toDataURL('image/jpeg', quality);
      quality -= 0.1;
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function coverImageCanvas(
  src: string,
  w: number,
  h: number
): Promise<HTMLCanvasElement> {
  const img = await loadImg(src);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D tidak tersedia.');

  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  return canvas;
}

export interface GpsFetchResult {
  ok: boolean;
  coordText: string;
  source: 'gps' | 'ip' | 'cache' | 'none';
  message: string;
}

export async function fetchLiveGpsCoords(): Promise<GpsFetchResult> {
  const cached = getLastKnownOnlinePos();

  if (!navigator.onLine) {
    if (cached?.formatted) {
      try {
        window.localStorage.setItem(FDOC_KEYS.wmGps, cached.formatted);
      } catch {
        // Ignore
      }
      return {
        ok: true,
        coordText: cached.formatted,
        source: 'cache',
        message: 'Mode Offline: Menggunakan titik lokasi terakhir yang tersimpan.',
      };
    }
    return {
      ok: false,
      coordText: '',
      source: 'none',
      message: 'Perangkat sedang offline. Silakan isi lokasi secara manual.',
    };
  }

  const getBrowserPos = (highAccuracy: boolean, timeout: number) =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('no_gps'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: highAccuracy,
        timeout,
        maximumAge: 120000,
      });
    });

  const getAddressName = async (lat: string, lon: string): Promise<string> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
      );
      if (res.ok) {
        const data = (await res.json()) as {
          address?: Record<string, string | undefined>;
        };
        const a = data.address || {};
        return [
          a.road || a.suburb || a.village || a.neighbourhood,
          a.city || a.town || a.county || a.state,
        ]
          .filter(Boolean)
          .join(', ');
      }
    } catch {
      // Ignore reverse geocode failure
    }
    return '';
  };

  try {
    let pos: GeolocationPosition;
    try {
      pos = await getBrowserPos(true, 5000);
    } catch {
      pos = await getBrowserPos(false, 6000);
    }

    const lat = pos.coords.latitude.toFixed(6);
    const lon = pos.coords.longitude.toFixed(6);
    const acc = Math.round(pos.coords.accuracy);
    const addr = await getAddressName(lat, lon);
    const coordText = `${lat}, ${lon} (±${acc}m)${addr ? ` • ${addr}` : ''}`;

    saveLastKnownOnlinePos(lat, lon, acc, addr, coordText);
    return {
      ok: true,
      coordText,
      source: 'gps',
      message: 'Koordinat GPS berhasil dikunci & disimpan!',
    };
  } catch {
    try {
      const resIp = await fetch('https://get.geojs.io/v1/ip/geo.json');
      if (resIp.ok) {
        const ipData = (await resIp.json()) as {
          latitude?: string;
          longitude?: string;
          city?: string;
          region?: string;
        };
        const lat = parseFloat(ipData.latitude || '0').toFixed(6);
        const lon = parseFloat(ipData.longitude || '0').toFixed(6);
        const area = [ipData.city, ipData.region].filter(Boolean).join(', ');
        const coordText = `${lat}, ${lon}${area ? ` • ${area}` : ''}`;

        saveLastKnownOnlinePos(lat, lon, 50, area, coordText);
        return {
          ok: true,
          coordText,
          source: 'ip',
          message: 'Lokasi berhasil diambil melalui jaringan (Mode Indoor/PC)!',
        };
      }
    } catch {
      // Ignore IP geo failure
    }

    if (cached?.formatted) {
      try {
        window.localStorage.setItem(FDOC_KEYS.wmGps, cached.formatted);
      } catch {
        // Ignore
      }
      return {
        ok: true,
        coordText: cached.formatted,
        source: 'cache',
        message: 'Mode Indoor: Menggunakan titik lokasi terakhir yang tersimpan.',
      };
    }

    return {
      ok: false,
      coordText: '',
      source: 'none',
      message: 'Sinyal GPS terhalang ruangan. Anda dapat mengetik lokasi manual.',
    };
  }
}
