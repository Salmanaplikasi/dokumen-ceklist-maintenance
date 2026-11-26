import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  Check,
  CheckCheck,
  ChevronDown,
  ListFilter,
  PenLine,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { FilterState, Frequency } from '../types/checklist';

const MANUAL_OPTION_VALUE = '__MANUAL_INPUT__';

interface FilterToolbarProps {
  equipmentCategories: string[];
  equipmentCounts: Record<string, number>;
  allFrequencies: Frequency[];
  availableFrequencies: Frequency[];
  filter: FilterState;
  visibleCount: number;
  onEquipmentChange: (equipment: string) => void;
  onFrequencyChange: (frequency: Frequency | 'ALL') => void;
  onSearchChange: (query: string) => void;
  onStatusFilterChange: (statusFilter: FilterState['statusFilter']) => void;
  onSetAllOk: () => void;
  onOpenAddModal: () => void;
}

export function FilterToolbar({
  equipmentCategories,
  equipmentCounts,
  allFrequencies,
  availableFrequencies,
  filter,
  visibleCount,
  onEquipmentChange,
  onFrequencyChange,
  onSearchChange,
  onStatusFilterChange,
  onSetAllOk,
  onOpenAddModal,
}: FilterToolbarProps) {
  const [eqMode, setEqMode] = useState<'select' | 'manual'>('select');
  const [manualEqDraft, setManualEqDraft] = useState('');
  const eqInputRef = useRef<HTMLInputElement>(null);

  const [freqMode, setFreqMode] = useState<'select' | 'manual'>('select');
  const [manualFreqDraft, setManualFreqDraft] = useState('');
  const freqInputRef = useRef<HTMLInputElement>(null);

  // Keep draft synced when active filter changes externally (e.g. Reset or Modal save)
  useEffect(() => {
    if (filter.equipmentCategory !== 'ALL') {
      setManualEqDraft(filter.equipmentCategory);
    }
  }, [filter.equipmentCategory]);

  useEffect(() => {
    if (filter.frequency !== 'ALL') {
      setManualFreqDraft(filter.frequency);
    }
  }, [filter.frequency]);

  const hasCustomActiveEq =
    filter.equipmentCategory !== 'ALL' &&
    !equipmentCategories.includes(filter.equipmentCategory);

  const hasCustomActiveFreq =
    filter.frequency !== 'ALL' && !allFrequencies.includes(filter.frequency);

  const enterManualEqMode = (clearDraft: boolean) => {
    setEqMode('manual');
    setManualEqDraft(
      clearDraft
        ? ''
        : filter.equipmentCategory === 'ALL'
          ? ''
          : filter.equipmentCategory
    );
    window.setTimeout(() => {
      eqInputRef.current?.focus();
      if (!clearDraft) {
        eqInputRef.current?.select();
      }
    }, 0);
  };

  const enterManualFreqMode = (clearDraft: boolean) => {
    setFreqMode('manual');
    setManualFreqDraft(
      clearDraft ? '' : filter.frequency === 'ALL' ? '' : filter.frequency
    );
    window.setTimeout(() => {
      freqInputRef.current?.focus();
      if (!clearDraft) {
        freqInputRef.current?.select();
      }
    }, 0);
  };

  const handleApplyManualEq = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = manualEqDraft.trim();
    if (!trimmed) return;
    onEquipmentChange(trimmed);
  };

  const handleApplyManualFreq = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = manualFreqDraft.trim();
    if (!trimmed) return;
    onFrequencyChange(trimmed);
  };

  return (
    <section
      id="filter-tugas"
      aria-label="Filter peralatan dan aksi cepat"
      className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4"
    >
      {/* Primary Big Dropdowns OR Manual Inputs for Technicians */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
        {/* 1. EQUIPMENT CATEGORY */}
        <div className="md:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <label
              htmlFor={
                eqMode === 'manual'
                  ? 'input-manual-equipment'
                  : 'select-equipment-category'
              }
              className="block text-sm font-bold text-slate-800"
            >
              1. Equipment Category (Sistem Peralatan)
            </label>

            <div
              role="group"
              aria-label="Mode pilih atau isi manual Equipment Category"
              className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg shrink-0"
            >
              <button
                type="button"
                onClick={() => setEqMode('select')}
                aria-pressed={eqMode === 'select'}
                className={`min-h-[30px] px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer ${
                  eqMode === 'select'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Pilih Daftar</span>
              </button>
              <button
                type="button"
                onClick={() => enterManualEqMode(false)}
                aria-pressed={eqMode === 'manual'}
                className={`min-h-[30px] px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer ${
                  eqMode === 'manual'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PenLine className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Isi Manual</span>
              </button>
            </div>
          </div>

          {eqMode === 'manual' ? (
            <form onSubmit={handleApplyManualEq} className="flex items-stretch gap-2">
              <div className="relative flex-1">
                <PenLine
                  className="w-4 h-4 text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  ref={eqInputRef}
                  id="input-manual-equipment"
                  type="text"
                  value={manualEqDraft}
                  onChange={(e) => setManualEqDraft(e.target.value)}
                  placeholder="Ketik nama peralatan (misal: Genset 1500 kVA)..."
                  className="w-full min-h-[50px] pl-10 pr-10 py-2.5 rounded-xl border-2 border-blue-500 bg-blue-50/20 focus:bg-white text-base font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                />
                {manualEqDraft && (
                  <button
                    type="button"
                    onClick={() => {
                      setManualEqDraft('');
                      eqInputRef.current?.focus();
                    }}
                    aria-label="Kosongkan Equipment Category manual"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={!manualEqDraft.trim()}
                className="min-h-[50px] px-4 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm inline-flex items-center gap-1.5 shrink-0 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>Pakai</span>
              </button>
            </form>
          ) : (
            <div className="relative">
              <select
                id="select-equipment-category"
                value={filter.equipmentCategory}
                onChange={(e) => {
                  if (e.target.value === MANUAL_OPTION_VALUE) {
                    enterManualEqMode(true);
                    return;
                  }
                  onEquipmentChange(e.target.value);
                }}
                className="w-full min-h-[50px] pl-4 pr-11 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-base font-bold text-slate-900 appearance-none focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 cursor-pointer truncate"
              >
                {hasCustomActiveEq && (
                  <option value={filter.equipmentCategory}>
                    {filter.equipmentCategory} (Manual · 0 tugas)
                  </option>
                )}
                {equipmentCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat} ({equipmentCounts[cat] ?? 0} tugas)
                  </option>
                ))}
                <option value="ALL">
                  Semua Peralatan (
                  {Object.values(equipmentCounts).reduce((a, b) => a + b, 0)} tugas)
                </option>
                <option value={MANUAL_OPTION_VALUE}>
                  ✎ Isi Manual (Ketik Peralatan Sendiri)...
                </option>
              </select>
              <ChevronDown
                className="w-5 h-5 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
            </div>
          )}
        </div>

        {/* 2. FREQUENCY */}
        <div className="md:col-span-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <label
              htmlFor={
                freqMode === 'manual' ? 'input-manual-frequency' : 'select-frequency'
              }
              className="block text-sm font-bold text-slate-800"
            >
              2. Frequency (Jadwal Inspeksi)
            </label>

            <div
              role="group"
              aria-label="Mode pilih atau isi manual Frequency"
              className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg shrink-0"
            >
              <button
                type="button"
                onClick={() => setFreqMode('select')}
                aria-pressed={freqMode === 'select'}
                className={`min-h-[30px] px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer ${
                  freqMode === 'select'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Pilih Daftar</span>
              </button>
              <button
                type="button"
                onClick={() => enterManualFreqMode(false)}
                aria-pressed={freqMode === 'manual'}
                className={`min-h-[30px] px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer ${
                  freqMode === 'manual'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PenLine className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Isi Manual</span>
              </button>
            </div>
          </div>

          {freqMode === 'manual' ? (
            <form onSubmit={handleApplyManualFreq} className="flex items-stretch gap-2">
              <div className="relative flex-1">
                <PenLine
                  className="w-4 h-4 text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  ref={freqInputRef}
                  id="input-manual-frequency"
                  type="text"
                  value={manualFreqDraft}
                  onChange={(e) => setManualFreqDraft(e.target.value)}
                  placeholder="Ketik jadwal (misal: Daily, Insidental)..."
                  className="w-full min-h-[50px] pl-10 pr-10 py-2.5 rounded-xl border-2 border-blue-500 bg-blue-50/20 focus:bg-white text-base font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                />
                {manualFreqDraft && (
                  <button
                    type="button"
                    onClick={() => {
                      setManualFreqDraft('');
                      freqInputRef.current?.focus();
                    }}
                    aria-label="Kosongkan Frequency manual"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={!manualFreqDraft.trim()}
                className="min-h-[50px] px-4 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm inline-flex items-center gap-1.5 shrink-0 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>Pakai</span>
              </button>
            </form>
          ) : (
            <div className="relative">
              <select
                id="select-frequency"
                value={filter.frequency}
                onChange={(e) => {
                  if (e.target.value === MANUAL_OPTION_VALUE) {
                    enterManualFreqMode(true);
                    return;
                  }
                  onFrequencyChange(e.target.value as Frequency | 'ALL');
                }}
                className="w-full min-h-[50px] pl-4 pr-11 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-base font-bold text-slate-900 appearance-none focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 cursor-pointer"
              >
                <option value="ALL">Semua Frekuensi</option>
                {hasCustomActiveFreq && (
                  <option value={filter.frequency}>
                    {filter.frequency} (Manual · 0 tugas)
                  </option>
                )}
                {allFrequencies.map((freq) => {
                  const hasItems = availableFrequencies.includes(freq);
                  return (
                    <option key={freq} value={freq}>
                      {freq}
                      {!hasItems && filter.equipmentCategory !== 'ALL' ? ' (0 tugas)' : ''}
                    </option>
                  );
                })}
                <option value={MANUAL_OPTION_VALUE}>
                  ✎ Isi Manual (Ketik Frekuensi Sendiri)...
                </option>
              </select>
              <ChevronDown
                className="w-5 h-5 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
            </div>
          )}
        </div>
      </div>

      {/* Secondary Search + Status Filter + Action Buttons */}
      <div className="pt-3.5 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Cari tugas pengecekan"
              value={filter.searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari tugas (leak, bearing, volt)..."
              className="w-full min-h-[46px] pl-10 pr-10 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-colors"
            />
            {filter.searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Hapus pencarian"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label="Filter status pengecekan"
            className="inline-flex items-center p-1 bg-slate-100 rounded-xl shrink-0"
          >
            {(
              [
                { id: 'ALL', label: 'Semua' },
                { id: 'UNFILLED', label: 'Belum Diisi' },
                { id: 'ISSUES', label: 'Temuan' },
              ] as const
            ).map((tab) => {
              const active = filter.statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onStatusFilterChange(tab.id)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Technician Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onSetAllOk}
            disabled={visibleCount === 0}
            className="flex-1 sm:flex-initial min-h-[46px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 active:scale-[0.98] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all whitespace-nowrap cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            <CheckCheck className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>Set Semua OK</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddModal}
            className="flex-1 sm:flex-initial min-h-[46px] px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-[0.98] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <Plus className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>Tambah Item Checklist</span>
          </button>
        </div>
      </div>
    </section>
  );
}
