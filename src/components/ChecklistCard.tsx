import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  MinusCircle,
  OctagonAlert,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  ChecklistItemWithResponse,
  ChecklistStatus,
  ChecklistTemplateItem,
} from '../types/checklist';
import { requiresRemarksWarning } from '../utils/checklistLogic';

interface ChecklistCardProps {
  item: ChecklistItemWithResponse;
  index: number;
  showEquipmentName: boolean;
  onSelectStatus: (id: string, status: ChecklistStatus) => void;
  onChangeRemarks: (id: string, remarks: string) => void;
  onEditItem: (item: ChecklistTemplateItem) => void;
  onDeleteCustom?: (id: string) => void;
}

const STATUS_CONFIG: {
  value: Exclude<ChecklistStatus, ''>;
  label: string;
  Icon: typeof CheckCircle2;
  activeClass: string;
  idleClass: string;
}[] = [
  {
    value: 'OK',
    label: 'OK',
    Icon: CheckCircle2,
    activeClass: 'bg-emerald-600 text-white border-emerald-700 shadow-sm',
    idleClass:
      'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50 hover:border-emerald-500',
  },
  {
    value: 'OBSERVATION',
    label: 'OBSERVATION',
    Icon: Eye,
    activeClass: 'bg-blue-600 text-white border-blue-700 shadow-sm',
    idleClass:
      'bg-white text-blue-800 border-blue-300 hover:bg-blue-50 hover:border-blue-500',
  },
  {
    value: 'MINOR',
    label: 'MINOR',
    Icon: AlertTriangle,
    activeClass: 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm',
    idleClass:
      'bg-white text-amber-800 border-amber-300 hover:bg-amber-50 hover:border-amber-500',
  },
  {
    value: 'CRITICAL',
    label: 'CRITICAL',
    Icon: OctagonAlert,
    activeClass: 'bg-red-600 text-white border-red-700 shadow-sm',
    idleClass:
      'bg-white text-red-800 border-red-300 hover:bg-red-50 hover:border-red-500',
  },
  {
    value: 'N/A',
    label: 'N/A',
    Icon: MinusCircle,
    activeClass: 'bg-slate-600 text-white border-slate-700 shadow-sm',
    idleClass:
      'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400',
  },
];

function getFrequencyTextColor(frequency: string): string {
  switch (frequency) {
    case 'Monthly':
      return 'text-sky-700';
    case 'Quarterly':
      return 'text-amber-700';
    case 'Semi-Annually':
    case 'Annually':
      return 'text-red-700';
    case 'Weekly':
    case 'Bi-Weekly':
      return 'text-slate-600';
    default:
      return 'text-indigo-700';
  }
}

export function ChecklistCard({
  item,
  index,
  showEquipmentName,
  onSelectStatus,
  onChangeRemarks,
  onEditItem,
  onDeleteCustom,
}: ChecklistCardProps) {
  const needsRemarks = requiresRemarksWarning(item.status, item.remarks);
  const isCritical = item.status === 'CRITICAL';
  const isMinor = item.status === 'MINOR';

  const cardSurfaceClass = needsRemarks
    ? isCritical
      ? 'bg-red-50/40 border-red-400'
      : 'bg-amber-50/40 border-amber-400'
    : item.status === 'OK'
    ? 'bg-white border-emerald-300/80'
    : 'bg-white border-slate-200';

  const remarksInputId = `remarks-${item.id}`;
  const cardHeadingId = `task-title-${item.id}`;

  return (
    <article
      aria-labelledby={cardHeadingId}
      data-testid={`checklist-card-${item.id}`}
      className={`rounded-2xl border p-5 sm:p-6 transition-colors duration-150 space-y-4 ${cardSurfaceClass}`}
    >
      {/* Top Unboxed Metadata Kicker + Edit/Delete Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm font-semibold text-slate-500 pt-1">
          <span className="font-mono-num text-slate-900">
            No. {String(index + 1).padStart(2, '0')}
          </span>
          <span aria-hidden="true">·</span>
          <span className={getFrequencyTextColor(item.frequency)}>{item.frequency}</span>
          <span aria-hidden="true">·</span>
          <span className="text-slate-700">{item.category}</span>
          {showEquipmentName && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-slate-500">{item.equipmentCategory}</span>
            </>
          )}
          {item.isCustom && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-blue-700">Item Manual</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 -mt-1 -mr-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onEditItem(item)}
            aria-label={`Edit tugas ${index + 1}: ${item.taskDescription}`}
            className="min-h-[40px] px-2.5 py-1.5 flex items-center gap-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Edit</span>
          </button>

          {item.isCustom && onDeleteCustom && (
            <button
              type="button"
              onClick={() => onDeleteCustom(item.id)}
              aria-label={`Hapus item manual: ${item.taskDescription}`}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Primary Task Description — High-Legibility */}
      <h2
        id={cardHeadingId}
        className="text-base sm:text-[18px] font-bold text-slate-900 leading-snug"
      >
        {item.taskDescription}
      </h2>

      {/* Large Tactile Status Pill Selector Buttons */}
      <div
        role="radiogroup"
        aria-label={`Status untuk tugas ${index + 1}: ${item.taskDescription}`}
        className="grid grid-cols-2 sm:grid-cols-5 gap-2.5"
      >
        {STATUS_CONFIG.map(({ value, label, Icon, activeClass, idleClass }, btnIdx) => {
          const isSelected = item.status === value;
          const isLastOnMobile = btnIdx === STATUS_CONFIG.length - 1;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelectStatus(item.id, isSelected ? '' : value)}
              className={`min-h-[50px] px-3 py-2.5 rounded-full border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                isLastOnMobile ? 'col-span-2 sm:col-span-1' : ''
              } ${isSelected ? activeClass : idleClass}`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Mandatory Visual Warning when MINOR or CRITICAL lacks Remarks */}
      {needsRemarks && (
        <div
          role="alert"
          className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-bold border ${
            isCritical
              ? 'bg-red-100/80 border-red-300 text-red-900'
              : 'bg-amber-100/80 border-amber-300 text-amber-950'
          }`}
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            Status {item.status} dipilih — mohon wajib tulis temuan lapangan di kolom Remarks di bawah.
          </span>
        </div>
      )}

      {/* Remarks Input */}
      <div>
        <label
          htmlFor={remarksInputId}
          className={`block text-xs sm:text-sm font-bold mb-1.5 ${
            needsRemarks
              ? isCritical
                ? 'text-red-800'
                : 'text-amber-900'
              : 'text-slate-600'
          }`}
        >
          Remarks / Catatan Temuan Lapangan{' '}
          {(isMinor || isCritical) && (
            <span className="font-extrabold text-red-700">(Wajib diisi)</span>
          )}
        </label>
        <input
          id={remarksInputId}
          type="text"
          value={item.remarks}
          onChange={(e) => onChangeRemarks(item.id, e.target.value)}
          placeholder={
            isMinor || isCritical
              ? 'Tulis temuan kerusakan & tindakan...'
              : 'Opsional: angka ukur (Volt/Bar/°C) atau catatan...'
          }
          className={`w-full min-h-[48px] px-4 py-2.5 rounded-xl border text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
            needsRemarks
              ? isCritical
                ? 'border-red-400 bg-white focus:border-red-600 focus:ring-red-500/20'
                : 'border-amber-400 bg-white focus:border-amber-600 focus:ring-amber-500/20'
              : 'border-slate-300 bg-slate-50/70 focus:bg-white focus:border-blue-600 focus:ring-blue-600/20'
          }`}
        />
      </div>
    </article>
  );
}
