import { Camera, Code2, Eye, FileDown, FileSpreadsheet, FileText, RotateCcw } from 'lucide-react';

interface ExportFooterBarProps {
  visibleCount: number;
  onDownloadExcel: () => void;
  onDownloadWord: () => void;
  onDownloadPdf: () => void;
  onOpenPdfPreview: () => void;
  onOpenFieldDocFromChecklist: () => void;
  onDownloadStandaloneHtml: () => void;
  onOpenResetModal: () => void;
}

export function ExportFooterBar({
  visibleCount,
  onDownloadExcel,
  onDownloadWord,
  onDownloadPdf,
  onOpenPdfPreview,
  onOpenFieldDocFromChecklist,
  onDownloadStandaloneHtml,
  onOpenResetModal,
}: ExportFooterBarProps) {
  return (
    <section
      id="unduh-laporan"
      aria-labelledby="unduh-laporan-heading"
      className="no-print bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2
            id="unduh-laporan-heading"
            className="text-lg sm:text-xl font-extrabold text-slate-900"
          >
            Ekspor &amp; Simpan Laporan Inspeksi
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Unduh hasil checklist sesuai tampilan filter saat ini ({visibleCount} tugas) ke format Excel, Word, atau PDF siap tanda tangan.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenPdfPreview}
          disabled={visibleCount === 0}
          className="self-start sm:self-auto min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-800 font-semibold text-sm inline-flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
        >
          <Eye className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
          <span>Pratinjau &amp; Print</span>
        </button>
      </div>

      {/* Primary 3 Required Multi-Format Export Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={onDownloadExcel}
          disabled={visibleCount === 0}
          className="min-h-[52px] px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 active:scale-[0.98] text-white font-bold text-base flex items-center justify-center gap-2.5 transition-all whitespace-nowrap cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        >
          <FileSpreadsheet className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>Download Excel (.xlsx)</span>
        </button>

        <button
          type="button"
          onClick={onDownloadWord}
          disabled={visibleCount === 0}
          className="min-h-[52px] px-5 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 active:scale-[0.98] text-white font-bold text-base flex items-center justify-center gap-2.5 transition-all whitespace-nowrap cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          <FileText className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>Download Word (.doc)</span>
        </button>

        <button
          type="button"
          onClick={onDownloadPdf}
          disabled={visibleCount === 0}
          className="min-h-[52px] px-5 py-3 rounded-xl bg-[#0F2942] hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 active:scale-[0.98] text-white font-bold text-base flex items-center justify-center gap-2.5 transition-all whitespace-nowrap cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800 focus-visible:ring-offset-2"
        >
          <FileDown className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>Download / Cetak PDF</span>
        </button>
      </div>

      {/* Secondary Row: FieldDoc Photo Bridge, Standalone Single HTML Download & Reset */}
      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenFieldDocFromChecklist}
            className="min-h-[46px] px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <Camera className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Buat Dokumentasi Foto (FieldDoc)</span>
          </button>

          <button
            type="button"
            onClick={onDownloadStandaloneHtml}
            className="min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <Code2 className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
            <span>Unduh Versi 1 File HTML (Standalone)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenResetModal}
          className="min-h-[46px] px-4 py-2.5 rounded-xl border border-red-300 bg-white hover:bg-red-50 text-red-700 font-bold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
        >
          <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Reset / Mulai Baru</span>
        </button>
      </div>
    </section>
  );
}

