import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Cloud,
  Copy,
  Link2,
  User,
  X,
} from 'lucide-react';
import type { FieldDocCloudConfig } from '../types/fielddoc.ts';
import { buildCloudShareUrl } from '../utils/fieldDocLogic.ts';

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
                Identitas Pelapor &amp; Email
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
            <span className="text-xs font-bold text-slate-700">Keterangan / Email</span>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Contoh: teknisi@perusahaan.com"
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
  initialConfig: FieldDocCloudConfig | null;
  onClose: () => void;
  onConnect: (cfg: FieldDocCloudConfig) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onToast: (msg: string, isError?: boolean) => void;
}

export function FieldDocCloudModal({
  isOpen,
  initialConfig,
  onClose,
  onConnect,
  onDisconnect,
  onToast,
}: CloudModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [projectId, setProjectId] = useState('');
  const [room, setRoom] = useState('tim_fasilitas_1');
  const [consent, setConsent] = useState(false);
  const [shareUrlPreview, setShareUrlPreview] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(initialConfig?.apiKey || '');
      setProjectId(initialConfig?.projectId || '');
      setRoom(initialConfig?.room || 'tim_fasilitas_1');
      setConsent(Boolean(initialConfig?.consent));
      setShareUrlPreview('');
    }
  }, [isOpen, initialConfig]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyShareLink = async () => {
    if (!apiKey.trim() || !projectId.trim()) {
      onToast('Isi Firebase API Key dan Project ID terlebih dahulu.', true);
      return;
    }
    const url = buildCloudShareUrl(window.location.origin, window.location.pathname, {
      apiKey,
      projectId,
      room: room || 'tim_fasilitas_1',
    });
    setShareUrlPreview(url);
    try {
      await navigator.clipboard.writeText(url);
      onToast('Link Auto-Connect berhasil disalin ke clipboard.');
    } catch {
      onToast('Link Auto-Connect dibuat — salin dari kotak di bawah.');
    }
  };

  const handleSubmit = async () => {
    if (!apiKey.trim() || !projectId.trim()) {
      onToast('Harap isi Firebase API Key dan Project ID.', true);
      return;
    }
    if (!consent) {
      onToast('Harap centang persetujuan sinkronisasi data.', true);
      return;
    }
    setSaving(true);
    try {
      await onConnect({
        apiKey: apiKey.trim(),
        projectId: projectId.trim(),
        room: room.trim() || 'tim_fasilitas_1',
        consent,
      });
    } finally {
      setSaving(false);
    }
  };

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
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="fdoc-cloud-title" className="text-base font-extrabold text-slate-900">
                Pengaturan Cloud Privat Tim (Firebase)
              </h3>
              <p className="text-xs text-slate-600">
                Sinkronisasi arsip FieldDoc real-time antar-perangkat melalui Firestore tim Anda.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pengaturan cloud"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-700">Firebase API Key</span>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-700">Firebase Project ID</span>
            <input
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="nama-project-firebase"
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-700">Kode Ruang Kerja Tim</span>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="tim_fasilitas_1"
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </label>

          <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-blue-700 rounded"
            />
            <span className="text-xs text-slate-700 leading-relaxed">
              Saya menyetujui sinkronisasi data laporan dokumentasi otomatis ke database Firebase privat tim ini.
            </span>
          </label>
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleCopyShareLink}
            className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Link2 className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
            <span>Salin Link Auto-Connect untuk Perangkat Lain</span>
          </button>

          {shareUrlPreview && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2">
              <input
                type="text"
                readOnly
                value={shareUrlPreview}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Link Auto-Connect"
                className="flex-1 bg-transparent text-xs font-mono text-slate-700 focus:outline-none"
              />
              <Copy className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => void onDisconnect()}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-700 font-bold text-sm cursor-pointer"
          >
            Putuskan
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-sm cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSubmit()}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-bold text-sm cursor-pointer"
            >
              {saving ? 'Menghubungkan...' : 'Hubungkan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
