import { ClipboardCheck, Printer } from 'lucide-react';

interface HeaderBarProps {
  onPrintPdf: () => void;
}

export function HeaderBar({ onPrintPdf }: HeaderBarProps) {
  return (
    <header className="no-print sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#top"
          className="flex items-center gap-2.5 text-slate-900 font-extrabold text-base sm:text-lg tracking-tight whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md"
        >
          <ClipboardCheck className="w-5 h-5 text-blue-700 shrink-0" aria-hidden="true" />
          <span>Checklist Maintenance</span>
        </a>

        {/* Zone 2: Clean single-line text nav links (Desktop) */}
        <nav
          aria-label="Navigasi bagian"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          <a
            href="#info-inspeksi"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Info Inspeksi
          </a>
          <a
            href="#filter-tugas"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Filter Peralatan
          </a>
          <a
            href="#daftar-checklist"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Daftar Tugas
          </a>
          <a
            href="#unduh-laporan"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Unduh Laporan
          </a>
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onPrintPdf}
            className="min-h-[40px] px-4 py-2 rounded-lg bg-[#0F2942] hover:bg-slate-800 active:scale-[0.98] text-white text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <Printer className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>
    </header>
  );
}
