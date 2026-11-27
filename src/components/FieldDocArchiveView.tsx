import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  FolderArchive,
  HardDrive,
  LogIn,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { DEFAULT_FIELDDOC_ORG } from '../data/fieldDocAssets.ts';
import type { CloudConnectionState, FieldDocReport } from '../types/fielddoc.ts';
import {
  filterArchiveReports,
  formatIndonesianDate,
} from '../utils/fieldDocLogic.ts';

interface FieldDocArchiveViewProps {
  reports: FieldDocReport[];
  cloudStatus: CloudConnectionState;
  localOnlyCount: number;
  loadingReportId?: string | null;
  authBusy?: boolean;
  syncBusy?: boolean;
  onRefresh: () => void;
  onEditReport: (report: FieldDocReport) => void;
  onDeleteReport: (report: FieldDocReport) => void;
  onOpenCloudModal: () => void;
  onSignInGoogle: () => Promise<void>;
  onSyncLocalNow: () => Promise<void>;
  onCreateNew: () => void;
}

export function FieldDocArchiveView({
  reports,
  cloudStatus,
  localOnlyCount,
  loadingReportId = null,
  authBusy = false,
  syncBusy = false,
  onRefresh,
  onEditReport,
  onDeleteReport,
  onOpenCloudModal,
  onSignInGoogle,
  onSyncLocalNow,
  onCreateNew,
}: FieldDocArchiveViewProps) {
  const [query, setQuery] = useState('');

  const filteredReports = useMemo(
    () => filterArchiveReports(reports, query),
    [reports, query]
  );

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="font-bold text-slate-900">Database Arsip Tim</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{reports.length} Laporan Tersimpan</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={onOpenCloudModal}
              className={`font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer ${
                cloudStatus.mode === 'connected' ? 'text-emerald-700' : 'text-blue-700'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{cloudStatus.label}</span>
            </button>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
            Arsip Laporan Dokumentasi Lapangan
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-72">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari judul, ruangan, atau nama..."
              aria-label="Cari laporan arsip"
              className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {cloudStatus.mode === 'auth-required' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-bold text-blue-950">
              Aktifkan Arsip Tim Online agar Semua Pengguna Bisa Mengakses Laporan
            </p>
            <p className="text-xs text-blue-800">
              Masuk dengan Google untuk menyinkronkan arsip ke cloud. Laporan lokal yang sudah ada ({reports.length} laporan) tetap aman dan otomatis diunggah saat masuk.
            </p>
          </div>
          <button
            type="button"
            disabled={authBusy}
            onClick={() => void onSignInGoogle()}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer whitespace-nowrap"
          >
            <LogIn className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{authBusy ? 'Membuka Google...' : 'Masuk Google'}</span>
          </button>
        </div>
      )}

      {cloudStatus.mode === 'connected' && localOnlyCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-amber-900 font-medium">
            Terdapat <strong className="font-mono-num">{localOnlyCount}</strong> arsip lokal yang belum terunggah ke cloud.
          </p>
          <button
            type="button"
            disabled={syncBusy}
            onClick={() => void onSyncLocalNow()}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${syncBusy ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{syncBusy ? 'Menyinkronkan...' : `Sinkronkan ${localOnlyCount} Arsip Lokal`}</span>
          </button>
        </div>
      )}

      {filteredReports.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center space-y-3">
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <FolderArchive className="w-5 h-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-slate-700">
            {reports.length > 0
              ? 'Tidak ada laporan arsip yang cocok dengan pencarian Anda.'
              : 'Belum ada laporan dokumentasi foto tersimpan di Arsip.'}
          </p>
          <div>
            <button
              type="button"
              onClick={onCreateNew}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Buat Laporan Dokumentasi Baru</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full border-collapse min-w-[680px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-extrabold text-slate-600 uppercase tracking-wide">
                <th className="py-3 px-4">Judul Pekerjaan &amp; Kop</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Pembuat</th>
                <th className="py-3 px-4">Dokumentasi</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredReports.map((item) => {
                const filledPhotos =
                  item.filledCount ?? (item.slots || []).filter((s) => Boolean(s.img)).length;
                const totalSlots = item.slotCount ?? (item.slots?.length || 0);
                const isSynced = item.syncStatus === 'synced';
                const isLoading = loadingReportId === item.id;

                return (
                  <tr key={item.id || `${item.title}-${item.date}`} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[11px] font-extrabold text-blue-800">
                          {item.org || DEFAULT_FIELDDOC_ORG}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                            isSynced
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {isSynced ? (
                            <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                          ) : (
                            <HardDrive className="w-3 h-3" aria-hidden="true" />
                          )}
                          <span>{isSynced ? 'Online' : 'Lokal'}</span>
                        </span>
                      </div>
                      <p className="font-bold text-slate-900">
                        {item.title || 'Tanpa Judul'}
                      </p>
                      {item.wmLoc && (
                        <p className="text-xs text-slate-500">{item.wmLoc}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700 tabular-nums">
                      {formatIndonesianDate(item.date)}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">
                        {item.author || 'Teknisi'}
                      </p>
                      {item.email && (
                        <p className="text-xs text-slate-500">{item.email}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono-num text-xs font-bold text-blue-800">
                      {filledPhotos} Foto / {totalSlots} Slot
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => onEditReport(item)}
                          className="min-h-[38px] px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{isLoading ? 'Memuat...' : 'Edit'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => onDeleteReport(item)}
                          className="min-h-[38px] px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
