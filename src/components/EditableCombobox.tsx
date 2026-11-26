import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ListFilter, PenLine, X } from 'lucide-react';

interface EditableComboboxProps {
  id: string;
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  manualPlaceholder?: string;
  helperText?: string;
  error?: string;
  onChange: (value: string) => void;
}

/**
 * Hybrid select + explicit manual-input field tailored for field technicians:
 * - Clear "Pilih Daftar" | "Isi Manual" toggle right on the label row.
 * - In "Pilih Daftar" mode: searchable dropdown with an explicit "Isi Manual (Ketik Sendiri)" action.
 * - In "Isi Manual" mode: dedicated free-text input with clear visual cue so technicians know they can type anything.
 */
export function EditableCombobox({
  id,
  label,
  value,
  options,
  placeholder,
  manualPlaceholder,
  helperText,
  error,
  onChange,
}: EditableComboboxProps) {
  const isValueInOptions = useMemo(() => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return true;
    return options.some((opt) => opt.toLowerCase() === trimmed);
  }, [options, value]);

  const [mode, setMode] = useState<'select' | 'manual'>(() =>
    isValueInOptions ? 'select' : 'manual'
  );
  const [isOpen, setIsOpen] = useState(false);
  const [showAllOnToggle, setShowAllOnToggle] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowAllOnToggle(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredOptions = useMemo(() => {
    const trimmed = value.trim().toLowerCase();
    if (showAllOnToggle || !trimmed) {
      return options;
    }
    return options.filter((opt) => opt.toLowerCase().includes(trimmed));
  }, [options, value, showAllOnToggle]);

  const handleSelectOption = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setShowAllOnToggle(false);
  };

  const switchToManual = (clearValue = false) => {
    setMode('manual');
    setIsOpen(false);
    setShowAllOnToggle(false);
    if (clearValue) {
      onChange('');
    }
    window.setTimeout(() => {
      inputRef.current?.focus();
      if (!clearValue) {
        inputRef.current?.select();
      }
    }, 0);
  };

  const switchToSelect = () => {
    setMode('select');
    setShowAllOnToggle(true);
    setIsOpen(true);
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
        <label htmlFor={id} className="block text-sm font-bold text-slate-800">
          {label}
        </label>

        <div
          role="group"
          aria-label={`Mode input ${label}`}
          className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg shrink-0"
        >
          <button
            type="button"
            onClick={switchToSelect}
            aria-pressed={mode === 'select'}
            className={`min-h-[30px] px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer ${
              mode === 'select'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Pilih Daftar</span>
          </button>
          <button
            type="button"
            onClick={() => switchToManual(false)}
            aria-pressed={mode === 'manual'}
            className={`min-h-[30px] px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer ${
              mode === 'manual'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PenLine className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Isi Manual</span>
          </button>
        </div>
      </div>

      {mode === 'manual' ? (
        <div className="relative flex items-center">
          <PenLine
            className="w-4 h-4 text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            id={id}
            type="text"
            role="combobox"
            aria-expanded={false}
            aria-controls={listboxId}
            aria-autocomplete="none"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={manualPlaceholder || `Ketik ${label} secara manual...`}
            autoComplete="off"
            className={`w-full min-h-[48px] pl-10 pr-11 py-2.5 rounded-xl border-2 bg-blue-50/30 focus:bg-white text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
              error
                ? 'border-red-400 focus:border-red-600 focus:ring-red-500/20'
                : 'border-blue-500 focus:border-blue-600 focus:ring-blue-600/20'
            }`}
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                inputRef.current?.focus();
              }}
              aria-label={`Kosongkan ${label}`}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            id={id}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-autocomplete="list"
            value={value}
            onFocus={() => {
              setShowAllOnToggle(true);
              setIsOpen(true);
            }}
            onChange={(e) => {
              onChange(e.target.value);
              setShowAllOnToggle(false);
              setIsOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsOpen(false);
              }
            }}
            placeholder={placeholder}
            autoComplete="off"
            className={`w-full min-h-[48px] pl-4 pr-20 py-2.5 rounded-xl border bg-white text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
              error
                ? 'border-red-400 focus:border-red-600 focus:ring-red-500/20'
                : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/20'
            }`}
          />

          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setShowAllOnToggle(true);
                  setIsOpen(true);
                  inputRef.current?.focus();
                }}
                aria-label={`Kosongkan ${label}`}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowAllOnToggle(true);
                setIsOpen((prev) => !prev);
              }}
              aria-label={`Buka pilihan ${label}`}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            >
              <ChevronDown
                className={`w-5 h-5 transition-transform duration-150 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {!error && (
        <p className="text-xs text-slate-500 mt-1">
          {mode === 'manual'
            ? 'Mode isi manual aktif — ketik bebas sesuai kebutuhan lapangan.'
            : helperText}
        </p>
      )}
      {error && <p className="text-sm font-semibold text-red-700 mt-1">{error}</p>}

      {mode === 'select' && isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={`Daftar pilihan ${label}`}
          className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-slate-300 rounded-xl shadow-xl max-h-60 overflow-y-auto py-1.5"
        >
          {!isValueInOptions && value.trim() && (
            <li role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => handleSelectOption(value.trim())}
                className="w-full text-left px-4 py-2.5 text-sm font-bold text-blue-700 bg-blue-50/70 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                Gunakan input manual: &ldquo;{value.trim()}&rdquo;
              </button>
            </li>
          )}

          {filteredOptions.length === 0 ? (
            <li className="px-4 py-2.5 text-sm text-slate-500">
              Tidak ada di daftar bawaan — lanjutkan ketik manual.
            </li>
          ) : (
            filteredOptions.map((option) => {
              const selected = option.toLowerCase() === value.trim().toLowerCase();
              return (
                <li key={option} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => handleSelectOption(option)}
                    className={`w-full text-left px-4 py-2.5 text-sm sm:text-base flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      selected
                        ? 'bg-blue-50 text-blue-900 font-bold'
                        : 'text-slate-800 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    <span className="truncate">{option}</span>
                    {selected && (
                      <Check className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
                    )}
                  </button>
                </li>
              );
            })
          )}

          <li className="border-t border-slate-100 mt-1 pt-1 px-1.5">
            <button
              type="button"
              onClick={() => switchToManual(true)}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold text-blue-700 hover:bg-blue-50 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <PenLine className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Isi Manual (Ketik Sendiri)...</span>
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
