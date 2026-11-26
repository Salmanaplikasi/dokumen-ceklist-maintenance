import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  Camera,
  Check,
  Cloud,
  FileDown,
  FileText,
  FolderOpen,
  LocateFixed,
  MapPin,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  User,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import {
  DEFAULT_FIELDDOC_ORG,
  FIELDDOC_PER_PAGE,
} from '../data/fieldDocAssets.ts';
import type {
  CloudConnectionState,
  FieldDocAssetItem,
  FieldDocReport,
} from '../types/fielddoc.ts';
import {
  buildItemsList,
  filterAssetItems,
  formatIndonesianFullDay,
  todayIso,
} from '../utils/fieldDocLogic.ts';
import {
  getLastKnownOnlinePos,
  shrinkPhotoWithWatermark,
} from '../utils/fieldDocWatermark.ts';

interface FieldDocWorkspaceProps {
  report: FieldDocReport;
  isEditingArchive: boolean;
  isOnline: boolean;
  cloudStatus: CloudConnectionState;
  busyExport: boolean;
  onUpdateReport: (updater: (prev: FieldDocReport) => FieldDocReport) => void;
  onOpenProfileModal: () => void;
  onOpenCloudModal: () => void;
  onFetchGps: () => Promise<void>;
  gpsLoading: boolean;
  onAddSlot: () => void;
  onRemoveSlot: (index: number) => void;
  onClearSlotImage: (index: number) => void;
  onResetWorkspace: () => void;
  onSaveArchive: () => Promise<void>;
  onExportDocx: () => Promise<void>;
  onExportPdf: () => Promise<void>;
  onToast: (msg: string, isError?: boolean) => void;
}

export function FieldDocWorkspace({
  report,
  isEditingArchive,
  isOnline,
  cloudStatus,
  busyExport,
  onUpdateReport,
  onOpenProfileModal,
  onOpenCloudModal,
  onFetchGps,
  gpsLoading,
  onAddSlot,
  onRemoveSlot,
  onClearSlotImage,
  onResetWorkspace,
  onSaveArchive,
  onExportDocx,
  onExportPdf,
  onToast,
}: FieldDocWorkspaceProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [targetSlotIndex, setTargetSlotIndex] = useState<number>(0);

  const orgInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const allItems = useMemo(() => buildItemsList(report.site), [report.site]);
  const { matches: filteredAssets, overflowCount } = useMemo(
    () => filterAssetItems(allItems, report.title, 30),
    [allItems, report.title]
  );

  const filledCount = useMemo(
    () => report.slots.filter((s) => Boolean(s.img)).length,
    [report.slots]
  );

  const pageCount = Math.max(1, Math.ceil(report.slots.length / FIELDDOC_PER_PAGE));
  const orgDisplay = report.org.trim() || DEFAULT_FIELDDOC_ORG;
  const cachedPos = getLastKnownOnlinePos();

  const triggerPhotoInput = (slotIdx: number, mode: 'camera' | 'gallery') => {
    setTargetSlotIndex(slotIdx);
    if (mode === 'camera') {
      cameraInputRef.current?.click();
    } else {
      galleryInputRef.current?.click();
    }
  };

  const handleFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    onToast('Memproses foto & mencetak watermark lokasi...');
    try {
      const dataUrl = await shrinkPhotoWithWatermark(file, report);
      onUpdateReport((prev) => {
        const nextSlots = [...prev.slots];
        if (nextSlots[targetSlotIndex]) {
          nextSlots[targetSlotIndex] = {
            ...nextSlots[targetSlotIndex],
            img: dataUrl,
          };
        }
        return { ...prev, slots: nextSlots };
      });
      onToast('Foto berhasil dimasukkan dengan watermark lokasi.');
    } catch {
      onToast('Gagal membaca atau mengolah foto.', true);
    }
  };

  const handleSelectAsset = (item: FieldDocAssetItem) => {
    const prefix = report.site.trim();
    const nextWmLoc = item.r
      ? `${prefix ? `${prefix} - ` : ''}${item.r}`
      : report.wmLoc;
    onUpdateReport((prev) => ({
      ...prev,
      title: item.t,
      wmLoc: nextWmLoc,
    }));
    setDropdownOpen(false);
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-4">
      {/* Hidden Camera & Gallery File Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void handleFileSelected(e)}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleFileSelected(e)}
      />

      {/* Compact Control & Identity Strip */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="font-bold text-slate-900">FieldDoc Utility</span>
            <span aria-hidden="true">·</span>
            <span>Auto-Sync Lokal &amp; Cloud Privat</span>
            <span aria-hidden="true">·</span>
            <span
              className={`font-semibold inline-flex items-center gap-1 ${
                cloudStatus.mode === 'connected' ? 'text-emerald-700' : 'text-slate-600'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" aria-hidden="true" />
              {cloudStatus.label}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            Dokumentasi foto lapangan dengan watermark GPS &amp; waktu otomatis, siap ekspor ke Word (`.docx`) dan PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenProfileModal}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <User className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
            <span>{report.author}</span>
          </button>

          <button
            type="button"
            onClick={onOpenCloudModal}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Cloud className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
            <span>Koneksi Cloud</span>
          </button>
        </div>
      </section>

      {/* Quick Jump & Photo Counter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => scrollToSection('fdoc-kop')}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-600 text-slate-700 text-xs sm:text-sm font-semibold cursor-pointer"
          >
            1. Kop &amp; Lokasi
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('fdoc-sheets')}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-600 text-slate-700 text-xs sm:text-sm font-semibold cursor-pointer"
          >
            2. Dokumentasi Foto
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('fdoc-export')}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-600 text-slate-700 text-xs sm:text-sm font-semibold cursor-pointer"
          >
            3. Panel Export
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-xs sm:text-sm font-semibold text-slate-700 tabular-nums">
            Foto Terisi:{' '}
            <strong className="text-blue-700 font-mono-num">
              {filledCount}/{report.slots.length}
            </strong>
          </span>
          <button
            type="button"
            onClick={onResetWorkspace}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Buat Baru / Reset</span>
          </button>
        </div>
      </div>

      {isEditingArchive && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-xs sm:text-sm text-amber-900 font-medium">
          <strong>Mode Edit Arsip:</strong> Perubahan data dapat disimpan kembali ke Arsip Tim secara langsung.
        </div>
      )}

      {/* Paginated Photo Documentation Sheets */}
      <div id="fdoc-sheets" className="space-y-5">
        {Array.from({ length: pageCount }).map((_, pageIdx) => {
          const start = pageIdx * FIELDDOC_PER_PAGE;
          const end = Math.min(start + FIELDDOC_PER_PAGE, report.slots.length);
          const pageSlots = report.slots.slice(start, end);

          return (
            <section
              key={pageIdx}
              className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-5"
            >
              {pageIdx === 0 ? (
                <div id="fdoc-kop" className="space-y-4">
                  {/* Sheet Corporate Kop Preview */}
                  <div className="border-b-2 border-blue-800 pb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-extrabold tracking-wider uppercase text-blue-800">
                        {orgDisplay}
                      </p>
                      <h2
                        className={`text-lg sm:text-xl font-extrabold mt-1 break-words ${
                          report.title ? 'text-slate-900' : 'text-slate-400 font-semibold'
                        }`}
                      >
                        {report.title || 'Judul Pekerjaan'}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        orgInputRef.current?.focus();
                        orgInputRef.current?.select();
                      }}
                      className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold shrink-0 cursor-pointer"
                    >
                      Ubah Kop
                    </button>
                  </div>

                  {/* Master Metadata Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <label className="md:col-span-5 block space-y-1">
                      <span className="text-xs font-bold text-slate-700">
                        Kop / Header Laporan Korporat
                      </span>
                      <input
                        ref={orgInputRef}
                        type="text"
                        value={report.org}
                        onChange={(e) =>
                          onUpdateReport((prev) => ({ ...prev, org: e.target.value }))
                        }
                        placeholder="Ketik kop laporan Anda di sini..."
                        className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </label>

                    <label className="md:col-span-3 block space-y-1">
                      <span className="text-xs font-bold text-slate-700">
                        Kode Lokasi / Site (Opsional)
                      </span>
                      <input
                        type="text"
                        value={report.site}
                        onChange={(e) =>
                          onUpdateReport((prev) => ({
                            ...prev,
                            site: e.target.value,
                          }))
                        }
                        placeholder="Misal: BDX-CGK3A"
                        className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </label>

                    <label className="md:col-span-4 block space-y-1">
                      <span className="text-xs font-bold text-slate-700">
                        Tanggal Pelaksanaan
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={report.date}
                          onChange={(e) =>
                            onUpdateReport((prev) => ({
                              ...prev,
                              date: e.target.value || todayIso(),
                            }))
                          }
                          className="flex-1 min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                        <span className="text-xs font-bold text-blue-700 whitespace-nowrap hidden sm:inline">
                          {formatIndonesianFullDay(report.date)}
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Equipment / Job Title Autocomplete + Manual Entry */}
                  <div className="relative space-y-1">
                    <label
                      htmlFor="fdoc-job-title"
                      className="block text-xs font-bold text-slate-700"
                    >
                      Judul Pekerjaan / Tag Peralatan (Pilih dari Daftar atau Ketik Manual)
                    </label>
                    <div className="relative">
                      <Search
                        className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        id="fdoc-job-title"
                        ref={titleInputRef}
                        type="text"
                        value={report.title}
                        onFocus={() => setDropdownOpen(true)}
                        onBlur={() => {
                          window.setTimeout(() => setDropdownOpen(false), 180);
                        }}
                        onChange={(e) => {
                          onUpdateReport((prev) => ({ ...prev, title: e.target.value }));
                          setDropdownOpen(true);
                        }}
                        placeholder="Ketik nama sistem atau kode unit (mis. FCU-11.1, PAU-1, CHWP) atau judul kustom..."
                        className="w-full min-h-[46px] pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      {report.title && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateReport((prev) => ({ ...prev, title: '' }))
                          }
                          aria-label="Hapus judul pekerjaan"
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {dropdownOpen && (
                      <ul
                        role="listbox"
                        className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border-2 border-blue-700 rounded-xl max-h-64 overflow-y-auto shadow-xl p-1.5 space-y-0.5"
                      >
                        {filteredAssets.length > 0 ? (
                          <>
                            {filteredAssets.map((item, idx) => (
                              <li key={`${item.t}-${idx}`}>
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectAsset(item);
                                  }}
                                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 flex flex-col cursor-pointer"
                                >
                                  <span className="text-sm font-bold text-slate-900">
                                    {item.n}
                                  </span>
                                  <span className="text-xs text-slate-500">{item.k}</span>
                                </button>
                              </li>
                            ))}
                            {overflowCount > 0 && (
                              <li className="px-3 py-1.5 text-xs text-slate-500">
                                +{overflowCount} unit lainnya — lanjutkan ketik untuk mempersempit hasil
                              </li>
                            )}
                          </>
                        ) : (
                          <li className="px-3 py-2 text-xs text-slate-600">
                            Ketik judul kustom jika pekerjaan belum masuk daftar peralatan.
                          </li>
                        )}
                      </ul>
                    )}
                  </div>

                  {/* Conota Live Watermark & GPS Panel */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="inline-flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={report.wmOn}
                          onChange={(e) =>
                            onUpdateReport((prev) => ({ ...prev, wmOn: e.target.checked }))
                          }
                          className="w-4 h-4 accent-blue-700 rounded"
                        />
                        <span className="text-sm font-bold text-blue-900 inline-flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-blue-700" aria-hidden="true" />
                          <span>Conota Live Timestamp &amp; Location Watermark</span>
                        </span>
                      </label>

                      <span
                        className={`text-xs font-bold inline-flex items-center gap-1.5 ${
                          isOnline ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {isOnline ? (
                          <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>
                          {isOnline
                            ? 'Online (GPS Siap)'
                            : 'Offline (Mengunci Lokasi Terakhir)'}
                        </span>
                      </span>
                    </div>

                    <div
                      className={`grid grid-cols-1 md:grid-cols-2 gap-3 transition-opacity ${
                        report.wmOn ? 'opacity-100' : 'opacity-45'
                      }`}
                    >
                      <label className="block space-y-1">
                        <span className="text-xs font-bold text-slate-700">
                          Nama Lokasi / Area Ruangan (Muncul di Foto)
                        </span>
                        <input
                          type="text"
                          value={report.wmLoc}
                          onChange={(e) =>
                            onUpdateReport((prev) => ({ ...prev, wmLoc: e.target.value }))
                          }
                          placeholder="Contoh: Ruang Trafo A / Lantai 1"
                          className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </label>

                      <div className="space-y-1">
                        <label
                          htmlFor="fdoc-gps-in"
                          className="block text-xs font-bold text-slate-700"
                        >
                          Titik Koordinat GPS (Auto-Lock Terakhir Saat Offline)
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="fdoc-gps-in"
                            type="text"
                            value={report.wmGps}
                            onChange={(e) =>
                              onUpdateReport((prev) => ({ ...prev, wmGps: e.target.value }))
                            }
                            placeholder="Klik Ambil GPS atau ketik koordinat manual..."
                            className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                          <button
                            type="button"
                            disabled={gpsLoading}
                            onClick={() => void onFetchGps()}
                            className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                          >
                            <LocateFixed className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span>{gpsLoading ? 'Mencari...' : 'Ambil GPS'}</span>
                          </button>
                        </div>
                        <p className="text-[11px] font-mono-num text-slate-500">
                          {cachedPos
                            ? `Titik terakhir (${cachedPos.savedAt}): ${cachedPos.formatted}`
                            : 'Klik "Ambil GPS" untuk mengunci koordinat lokasi secara otomatis.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-b-2 border-blue-800 pb-3 space-y-1">
                  <p className="text-[11px] font-extrabold tracking-wider uppercase text-blue-800">
                    {orgDisplay}
                  </p>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    {report.title || 'Judul Pekerjaan'}
                  </h2>
                  <p className="text-xs font-semibold text-blue-700">
                    {formatIndonesianFullDay(report.date)}
                  </p>
                </div>
              )}

              {/* Photo Documentation 3-Column Responsive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pageSlots.map((slot, localIdx) => {
                  const globalIdx = start + localIdx;
                  const numStr = String(globalIdx + 1).padStart(2, '0');
                  return (
                    <div
                      key={globalIdx}
                      className="border border-slate-200 rounded-xl p-3 bg-white flex flex-col gap-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono-num text-xs font-extrabold text-blue-800">
                          DOK #{numStr}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemoveSlot(globalIdx)}
                          className="min-h-[34px] px-2.5 py-1 rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50 text-red-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Hapus Slot</span>
                        </button>
                      </div>

                      <div className="aspect-[4/3] rounded-lg overflow-hidden relative bg-slate-50 border border-slate-200">
                        {slot.img ? (
                          <>
                            <img
                              src={slot.img}
                              alt={`Foto Dokumentasi #${numStr}`}
                              className="w-full h-full object-cover block"
                            />
                            <div className="absolute inset-x-0 bottom-0 p-2 bg-slate-950/80 backdrop-blur-xs flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => triggerPhotoInput(globalIdx, 'camera')}
                                className="flex-1 min-h-[38px] px-2.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Kamera</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => triggerPhotoInput(globalIdx, 'gallery')}
                                className="min-h-[38px] px-2.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <FolderOpen className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Galeri</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onClearSlotImage(globalIdx)}
                                aria-label={`Hapus foto ${numStr}`}
                                className="min-h-[38px] min-w-[38px] rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full p-2.5 flex gap-2">
                            <button
                              type="button"
                              onClick={() => triggerPhotoInput(globalIdx, 'camera')}
                              className="flex-1 rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-600 hover:bg-blue-50 bg-white text-slate-800 flex flex-col items-center justify-center gap-1.5 text-xs font-bold cursor-pointer transition-colors"
                            >
                              <Camera className="w-6 h-6 text-blue-700" aria-hidden="true" />
                              <span>Ambil Kamera</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => triggerPhotoInput(globalIdx, 'gallery')}
                              className="flex-1 rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-600 hover:bg-blue-50 bg-white text-slate-800 flex flex-col items-center justify-center gap-1.5 text-xs font-bold cursor-pointer transition-colors"
                            >
                              <FolderOpen className="w-6 h-6 text-slate-600" aria-hidden="true" />
                              <span>Pilih Galeri</span>
                            </button>
                          </div>
                        )}
                      </div>

                      <textarea
                        rows={2}
                        value={slot.desc}
                        onChange={(e) => {
                          const val = e.target.value;
                          onUpdateReport((prev) => {
                            const nextSlots = [...prev.slots];
                            if (nextSlots[globalIdx]) {
                              nextSlots[globalIdx] = {
                                ...nextSlots[globalIdx],
                                desc: val,
                              };
                            }
                            return { ...prev, slots: nextSlots };
                          });
                        }}
                        placeholder={`Tulis deskripsi pekerjaan / temuan teknis foto #${numStr}...`}
                        aria-label={`Deskripsi foto ${numStr}`}
                        className="w-full min-h-[68px] px-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="text-right text-xs font-semibold text-slate-500 tabular-nums pt-1">
                Halaman {pageIdx + 1} dari {pageCount}
              </div>
            </section>
          );
        })}
      </div>

      {/* Add Photo Slot Action */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onAddSlot}
          className="w-full max-w-md min-h-[48px] px-6 py-3 rounded-xl border-2 border-dashed border-blue-700 bg-white hover:bg-blue-50 text-blue-800 font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Tambah Slot Foto Dokumentasi</span>
        </button>
      </div>

      {/* Bottom Export & Save Dock */}
      <section
        id="fdoc-export"
        className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div className="space-y-0.5">
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
            Ekspor Dokumentasi &amp; Simpan Arsip
          </h3>
          <p className="text-xs sm:text-sm text-slate-600">
            Unduh hasil dokumentasi foto ke format Word (.docx) atau PDF siap cetak, atau simpan ke Arsip Tim.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 shrink-0">
          <button
            type="button"
            disabled={busyExport}
            onClick={() => void onExportDocx()}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{busyExport ? 'Membuat...' : 'Export Word (.docx)'}</span>
          </button>

          <button
            type="button"
            disabled={busyExport}
            onClick={() => void onExportPdf()}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#0F2942] hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <FileDown className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{busyExport ? 'Membuat...' : 'Export PDF'}</span>
          </button>

          <button
            type="button"
            disabled={busyExport}
            onClick={() => void onSaveArchive()}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-bold text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
          >
            {busyExport ? (
              <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <Save className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
            <span>Simpan ke Arsip</span>
          </button>
        </div>
      </section>
    </div>
  );
}
