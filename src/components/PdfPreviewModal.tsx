import { useEffect } from 'react';
import { FileDown, Printer, X } from 'lucide-react';
import {
  ChecklistItemWithResponse,
  ChecklistProgress,
  InspectionMeta,
} from '../types/checklist';
import { PrintReport } from './PrintReport';

interface PdfPreviewModalProps {
  isOpen: boolean;
  items: ChecklistItemWithResponse[];
  meta: InspectionMeta;
  equipmentLabel: string;
  frequencyLabel: string;
  progress: ChecklistProgress;
  onClose: () => void;
  onDownloadPdf: () => void;
  onNativePrint: () => void;
}

export function PdfPreviewModal({
  isOpen,
  items,
  meta,
  equipmentLabel,
  frequencyLabel,
  progress,
  onClose,
  onDownloadPdf,
  onNativePrint,
}: PdfPreviewModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-preview-modal-title"
      className="no-print fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-5"
    >
      <div className="bg-slate-100 w-full max-w-6xl rounded-2xl border border-slate-300 shadow-2xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Modal Top Toolbar */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            <h2
              id="pdf-preview-modal-title"
              className="text-base sm:text-lg font-extrabold text-slate-900"
            >
              Pratinjau Laporan PDF (A4 Landscape — Siap Cetak)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              {items.length} tugas · Klik <strong>Download PDF (.pdf)</strong> untuk menyimpan file siap print tanpa perlu edit ulang.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onDownloadPdf}
              disabled={items.length === 0}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0F2942] hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm inline-flex items-center gap-2 cursor-pointer transition-colors"
            >
              <FileDown className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Download PDF (.pdf)</span>
            </button>

            <button
              type="button"
              onClick={onNativePrint}
              disabled={items.length === 0}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-800 font-bold text-sm inline-flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Cetak Printer</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup pratinjau PDF"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable A4 Landscape Paper Preview */}
        <div className="flex-1 overflow-auto p-3 sm:p-6">
          <div className="overflow-x-auto pb-2">
            <div className="mx-auto w-fit [&_table.print-table]:w-full [&_table.print-table]:border-collapse [&_table.print-table_th]:border [&_table.print-table_th]:border-slate-600 [&_table.print-table_th]:px-2 [&_table.print-table_th]:py-1.5 [&_table.print-table_td]:border [&_table.print-table_td]:border-slate-500 [&_table.print-table_td]:px-2 [&_table.print-table_td]:py-1.5">
              <PrintReport
                items={items}
                meta={meta}
                equipmentLabel={equipmentLabel}
                frequencyLabel={frequencyLabel}
                progress={progress}
                previewOnScreen
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
