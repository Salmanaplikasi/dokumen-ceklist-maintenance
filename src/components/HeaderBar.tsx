import { ClipboardCheck, FileDown, Plus, Printer } from 'lucide-react';

export type ActiveAppModule = 'checklist' | 'fielddoc' | 'archive';

interface HeaderBarProps {
  activeModule: ActiveAppModule;
  archiveCount: number;
  onSelectModule: (mod: ActiveAppModule) => void;
  onPrintPdf: () => void;
  onExportFieldDocPdf: () => void;
  onCreateNewFieldDoc: () => void;
}

export function HeaderBar({
  activeModule,
  archiveCount,
  onSelectModule,
  onPrintPdf,
  onExportFieldDocPdf,
  onCreateNewFieldDoc,
}: HeaderBarProps) {
  return (
    <header className="no-print sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onSelectModule('checklist')}
          className="flex items-center gap-2.5 text-slate-900 font-extrabold text-base sm:text-lg tracking-tight whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md"
        >
          <ClipboardCheck className="w-5 h-5 text-blue-700 shrink-0" aria-hidden="true" />
          <span>Checklist &amp; FieldDoc</span>
        </button>

        {/* Zone 2: Clean single-line text module links (Desktop) */}
        <nav
          aria-label="Navigasi modul utama"
          className="hidden md:flex items-center gap-6 h-full text-sm font-semibold"
        >
          <button
            type="button"
            onClick={() => onSelectModule('checklist')}
            className={`h-full inline-flex items-center border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeModule === 'checklist'
                ? 'border-blue-700 text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Checklist Maintenance
          </button>

          <button
            type="button"
            onClick={() => onSelectModule('fielddoc')}
            className={`h-full inline-flex items-center border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeModule === 'fielddoc'
                ? 'border-blue-700 text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            FieldDoc Foto
          </button>

          <button
            type="button"
            onClick={() => onSelectModule('archive')}
            className={`h-full inline-flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeModule === 'archive'
                ? 'border-blue-700 text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Arsip Tim</span>
            <span className="font-mono-num text-xs text-slate-500">({archiveCount})</span>
          </button>
        </nav>

        {/* Zone 3: Single Contextual Primary Action */}
        <div className="flex items-center shrink-0">
          {activeModule === 'checklist' && (
            <button
              type="button"
              onClick={onPrintPdf}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-[#0F2942] hover:bg-slate-800 active:scale-[0.98] text-white text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <Printer className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Cetak / PDF</span>
            </button>
          )}

          {activeModule === 'fielddoc' && (
            <button
              type="button"
              onClick={onExportFieldDocPdf}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-[#0F2942] hover:bg-slate-800 active:scale-[0.98] text-white text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <FileDown className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Export PDF</span>
            </button>
          )}

          {activeModule === 'archive' && (
            <button
              type="button"
              onClick={onCreateNewFieldDoc}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 active:scale-[0.98] text-white text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Laporan Baru</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

