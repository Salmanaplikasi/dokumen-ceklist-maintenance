import { useState } from 'react';
import { Download, Share2, WifiOff, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;
  if (!isInstallable && !isIOS) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => (isIOS ? setShowIOSGuide(true) : void install())}
        className="min-h-[38px] px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
      >
        {isIOS ? (
          <Share2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        )}
        <span>Pasang Aplikasi</span>
      </button>

      {showIOSGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Panduan pemasangan di iOS"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-extrabold text-slate-900">
                Pasang ke Layar Utama (iOS)
              </h3>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                aria-label="Tutup panduan"
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Ketuk ikon <strong>Bagikan (Share)</strong> di bilah Safari lalu pilih{' '}
              <strong>Tambah ke Layar Utama (Add to Home Screen)</strong> agar aplikasi
              dapat dibuka langsung meski sedang offline.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full min-h-[42px] rounded-xl bg-[#0F2942] text-white text-sm font-bold cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
}

interface OfflineIndicatorProps {
  isOnline: boolean;
  offlineReady: boolean;
}

export function OfflineIndicator({ isOnline, offlineReady }: OfflineIndicatorProps) {
  if (isOnline && !offlineReady) return null;

  if (!isOnline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="no-print bg-amber-50 border border-amber-300 text-amber-950 rounded-xl px-4 py-2.5 flex items-center gap-2.5 text-xs sm:text-sm font-semibold"
      >
        <WifiOff className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
        <span>
          Mode Offline Aktif — Checklist, kamera/watermark, arsip lokal, dan ekspor Excel/Word/PDF tetap berfungsi penuh di perangkat Anda.
        </span>
      </div>
    );
  }

  return null;
}
