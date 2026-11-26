import { AlertTriangle } from 'lucide-react';
import { ChecklistProgress } from '../types/checklist';

interface ProgressBannerProps {
  progress: ChecklistProgress;
  equipmentLabel: string;
  frequencyLabel: string;
  onJumpToIssues: () => void;
}

export function ProgressBanner({
  progress,
  equipmentLabel,
  frequencyLabel,
  onJumpToIssues,
}: ProgressBannerProps) {
  const isComplete = progress.total > 0 && progress.completed === progress.total;

  return (
    <section
      aria-label="Progres inspeksi"
      className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-2.5"
    >
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-slate-500">
            {equipmentLabel === 'ALL' ? 'Semua Peralatan' : equipmentLabel}
            <span className="mx-1.5" aria-hidden="true">·</span>
            {frequencyLabel === 'ALL' ? 'Semua Frekuensi' : frequencyLabel}
          </p>
          <p
            data-testid="progress-text"
            className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5 tabular-nums"
          >
            Selesai: {progress.completed} dari {progress.total} Tugas
          </p>
        </div>

        <div className="flex items-baseline gap-2">
          <span
            className={`text-2xl sm:text-3xl font-extrabold font-mono-num ${
              isComplete ? 'text-emerald-700' : 'text-blue-700'
            }`}
          >
            {progress.percentage}%
          </span>
          <span className="text-sm font-medium text-slate-500">
            {isComplete ? 'Lengkap' : 'Tercapai'}
          </span>
        </div>
      </div>

      {/* Crisp Progress Bar */}
      <div
        role="progressbar"
        aria-valuenow={progress.percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Persentase penyelesaian checklist"
        className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/80"
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isComplete ? 'bg-emerald-600' : 'bg-blue-600'
          }`}
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      {/* Clean Unboxed Metadata Breakdown (Zero-Pill Discipline) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-sm">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-slate-600 tabular-nums">
          <span className="font-semibold text-emerald-700">OK: {progress.okCount}</span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className="font-semibold text-blue-700">Observation: {progress.observationCount}</span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className="font-semibold text-amber-700">Minor: {progress.minorCount}</span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className="font-semibold text-red-700">Critical: {progress.criticalCount}</span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className="font-semibold text-slate-600">N/A: {progress.naCount}</span>
        </div>

        {progress.missingRemarksCount > 0 && (
          <button
            type="button"
            onClick={onJumpToIssues}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-red-700 hover:text-red-800 underline underline-offset-4 cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {progress.missingRemarksCount} temuan MINOR/CRITICAL belum ada catatan Remarks
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
