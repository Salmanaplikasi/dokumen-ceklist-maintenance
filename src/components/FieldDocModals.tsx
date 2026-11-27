import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import type { CloudConnectionState } from '../types/fielddoc.ts';

interface ConfirmModalProps {
  isOpen: boolean;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function FieldDocConfirmModal({
  isOpen,
  message,
  confirmLabel = 'Lanjutkan',
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fdoc-confirm-text"
      className="no-print fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl space-y-4">
        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" aria-hidden="true" />
        </div>
        <p id="fdoc-confirm-text" className="text-sm sm:text-base font-bold text-slate-900">
          {message}
        </p>
        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-sm cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ProfileModalProps {
  isOpen: boolean;
  initialName: string;
  initialEmail: string;
  onClose: () => void;
  onSave: (name: string, email: string) => void;
}

export function FieldDocProfileModal({
  isOpen,
  initialName,
  initialEmail,
  onClose,
  onSave,
}: ProfileModalProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setEmail(initialEmail);
    }
  }, [isOpen, initialName, initialEmail]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fdoc-prof-title"
      className="no-print fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="fdoc-prof-title" className="text-base font-extrabold text-slate-900">
                Identitas Pelapor &amp; Keterangan
              </h3>
              <p className="text-xs text-slate-600">
                Digunakan pada watermark foto, ekspor dokumen, dan Arsip Tim.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal profil"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700">Nama / Inisial Teknisi</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: M. Salman. A"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700">Jabatan / Keterangan</span>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Contoh: Teknisi Lapangan"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-sm cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() =>
              onSave(name.trim() || 'M. Salman. A', email.trim() || 'Teknisi Lapangan')
            }
            className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm cursor-pointer"
          >
            Simpan Profil
          </button>
        </div>
      </div>
    </div>
  );
}

interface CloudModalProps {
  isOpen: boolean;
  cloudStatus: CloudConnectionState;
  totalReportsCount: number;
  localOnlyCount: number;
  authBusy?: boolean;
  syncBusy?: boolean;
  onClose: () => void;
  onSignInGoogle: () => Promise<void>;
  onSignOutGoogle: () => Promise<void>;
  onSyncLocalNow: () => Promise<void>;
}

export function FieldDocCloudModal({
  isOpen,
  cloudStatus,
  totalReportsCount,
  localOnlyCount,
  authBusy = false,
  syncBusy = false,
  onClose,
  onSignInGoogle,
  onSignOutGoogle,
  onSyncLocalNow,
}: CloudModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentHost =
    typeof window !== 'undefined' && window.location.hostname
      ? window.location.hostname
      : 'domain Vercel Anda';

  const isConnected = cloudStatus.mode === 'connected';
  const syncedCount = Math.max(0, totalReportsCount - localOnlyCount);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fdoc-cloud-title"
      className="no-print fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-blue-50 text-blue-700'
              }`}
            >
              <Cloud className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="fdoc-cloud-title" className="text-base font-extrabold text-slate-900">
                Status Sinkronisasi Online Tim (Firebase)
              </h3>
              <p className="text-xs text-slate-600">
                Database online sudah terpasang otomatis agar seluruh tim di Vercel dapat mengakses Arsip Tim bersama.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup status sinkronisasi"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          className={`rounded-xl border p-4 space-y-2 ${
            isConnected
              ? 'bg-emerald-50/70 border-emerald-200'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Status Koneksi
            </span>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-extrabold ${
                isConnected ? 'text-emerald-700' : 'text-blue-800'
              }`}
            >
              {isConnected ? (
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{cloudStatus.label}</span>
            </span>
          </div>

          {cloudStatus.mode === 'connected' && cloudStatus.userEmail && (
            <p className="text-xs text-slate-700">
              Akun aktif: <strong className="text-slate-900">{cloudStatus.userEmail}</strong>
            </p>
          )}

          {cloudStatus.mode === 'auth-required' && (
            <p className="text-xs text-slate-700 leading-relaxed">
              Masuk dengan akun Google untuk mengaktifkan penyimpanan &amp; baca Arsip Tim secara online. Arsip lokal yang sudah ada di perangkat tidak akan dihapus dan otomatis diunggah setelah login.
            </p>
          )}

          {cloudStatus.mode === 'disconnected' && (
            <p className="text-xs text-slate-700 leading-relaxed">
              Perangkat sedang offline atau jaringan terputus. Anda tetap dapat menyimpan ke arsip lokal dan sistem akan menyinkronkan otomatis saat online kembali.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
            <p className="text-[11px] font-bold text-slate-500 uppercase">Tersimpan Online</p>
            <p className="text-lg font-extrabold text-emerald-700 font-mono-num">
              {syncedCount} Laporan
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
            <p className="text-[11px] font-bold text-slate-500 uppercase">Menunggu Sync Lokal</p>
            <p className="text-lg font-extrabold text-amber-700 font-mono-num">
              {localOnlyCount} Laporan
            </p>
          </div>
        </div>

        <div className="space-y-2.5 pt-1">
          {cloudStatus.mode === 'connected' ? (
            <button
              type="button"
              disabled={syncBusy}
              onClick={() => void onSyncLocalNow()}
              className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw
                className={`w-4 h-4 shrink-0 ${syncBusy ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>
                {syncBusy
                  ? 'Menyinkronkan Arsip Lokal...'
                  : 'Sinkronkan Arsip Lokal Sekarang'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              disabled={authBusy}
              onClick={() => void onSignInGoogle()}
              className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {authBusy
                  ? 'Membuka Login Google...'
                  : 'Masuk dengan Google (Aktifkan Arsip Online)'}
              </span>
            </button>
          )}
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          Catatan deploy Vercel: bila login Google menampilkan pesan domain belum terdaftar, tambahkan domain <strong className="font-mono text-slate-700">{currentHost}</strong> di Firebase Console &rarr; Authentication &rarr; Settings &rarr; Authorized domains.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          {cloudStatus.mode === 'connected' ? (
            <button
              type="button"
              disabled={authBusy}
              onClick={() => void onSignOutGoogle()}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-700 font-bold text-sm inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Keluar Akun Google</span>
            </button>
          ) : (
            <span className="text-xs text-slate-500 font-medium">
              Arsip lokal di perangkat tetap aman.
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-sm cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
