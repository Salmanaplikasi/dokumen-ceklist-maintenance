import { AlertTriangle, RotateCcw, X } from 'lucide-react';

interface ResetConfirmModalProps {
  isOpen: boolean;
  currentViewLabel: string;
  onClose: () => void;
  onResetCurrentView: () => void;
  onResetAllData: () => void;
}

export function ResetConfirmModal({
  isOpen,
  currentViewLabel,
  onClose,
  onResetCurrentView,
  onResetAllData,
}: ResetConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-modal-title"
      className="no-print fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 id="reset-modal-title" className="text-lg font-extrabold text-slate-900">
                Konfirmasi Reset Checklist
              </h2>
              <p className="text-sm text-slate-600">
                Data yang direset tidak dapat dikembalikan.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog konfirmasi reset"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5 text-sm text-slate-700">
          <p>Pilih cakupan data yang ingin dibersihkan:</p>
          <p className="font-semibold text-slate-900">Tampilan aktif: {currentViewLabel}</p>
        </div>

        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={() => {
              onResetCurrentView();
              onClose();
            }}
            className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Reset Status di Tampilan Ini Saja</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onResetAllData();
              onClose();
            }}
            className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Reset Semua Data &amp; Mulai Baru</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm sm:text-base cursor-pointer"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
