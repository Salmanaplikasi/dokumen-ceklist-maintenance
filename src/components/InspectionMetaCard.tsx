import { Calendar, MapPin, User, UserCheck } from 'lucide-react';
import { InspectionMeta } from '../types/checklist';

interface InspectionMetaCardProps {
  meta: InspectionMeta;
  onChange: (patch: Partial<InspectionMeta>) => void;
  lastSavedLabel: string;
}

export function InspectionMetaCard({
  meta,
  onChange,
  lastSavedLabel,
}: InspectionMetaCardProps) {
  return (
    <section
      id="info-inspeksi"
      aria-labelledby="info-inspeksi-heading"
      className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
        <div>
          <h1
            id="info-inspeksi-heading"
            className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight"
          >
            Informasi Inspeksi Lapangan
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Isi identitas petugas dan kode unit sebelum memulai pengecekan.
          </p>
        </div>
        <p className="text-xs text-slate-500 font-medium tabular-nums">
          {lastSavedLabel}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div>
          <label
            htmlFor="input-technician-name"
            className="flex items-center gap-1.5 text-sm font-bold text-slate-800 mb-1"
          >
            <User className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
            <span>Nama Teknisi / Petugas</span>
          </label>
          <input
            id="input-technician-name"
            type="text"
            value={meta.technicianName}
            onChange={(e) => onChange({ technicianName: e.target.value })}
            placeholder="Contoh: Budi Santoso"
            autoComplete="name"
            className="w-full min-h-[46px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="input-inspection-date"
            className="flex items-center gap-1.5 text-sm font-bold text-slate-800 mb-1"
          >
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
            <span>Tanggal Inspeksi</span>
          </label>
          <input
            id="input-inspection-date"
            type="date"
            value={meta.inspectionDate}
            onChange={(e) => onChange({ inspectionDate: e.target.value })}
            className="w-full min-h-[46px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-base text-slate-900 font-mono-num focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="input-unit-location"
            className="flex items-center gap-1.5 text-sm font-bold text-slate-800 mb-1"
          >
            <MapPin className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
            <span>Lokasi / Kode Unit</span>
          </label>
          <input
            id="input-unit-location"
            type="text"
            value={meta.unitLocation}
            onChange={(e) => onChange({ unitLocation: e.target.value })}
            placeholder="CHWP-01 / Basement"
            className="w-full min-h-[46px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="input-supervisor-name"
            className="flex items-center gap-1.5 text-sm font-bold text-slate-800 mb-1"
          >
            <UserCheck className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
            <span>Supervisor (Tanda Tangan)</span>
          </label>
          <input
            id="input-supervisor-name"
            type="text"
            value={meta.supervisorName}
            onChange={(e) => onChange({ supervisorName: e.target.value })}
            placeholder="Opsional: Nama Supervisor"
            className="w-full min-h-[46px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-colors"
          />
        </div>
      </div>
    </section>
  );
}
