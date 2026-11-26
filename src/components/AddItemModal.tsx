import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Plus, Save, X } from 'lucide-react';
import { ChecklistTemplateItem, Frequency } from '../types/checklist';
import { NewItemInput, validateNewChecklistItem } from '../utils/checklistLogic';
import { EditableCombobox } from './EditableCombobox';

interface AddItemModalProps {
  isOpen: boolean;
  editingItem?: ChecklistTemplateItem | null;
  equipmentCategories: string[];
  allFrequencies: Frequency[];
  taskCategories: string[];
  defaultEquipment: string;
  defaultFrequency: Frequency | 'ALL';
  onClose: () => void;
  onSave: (input: NewItemInput, editingId?: string) => void;
}

const EXTRA_FREQUENCY_SUGGESTIONS = ['Daily', 'Bi-Monthly', 'Insidental / Ad-Hoc'];

export function AddItemModal({
  isOpen,
  editingItem,
  equipmentCategories,
  allFrequencies,
  taskCategories,
  defaultEquipment,
  defaultFrequency,
  onClose,
  onSave,
}: AddItemModalProps) {
  const [equipmentCategory, setEquipmentCategory] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('Monthly');
  const [category, setCategory] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof NewItemInput, string>>>({});

  const frequencyOptions = useMemo(() => {
    const merged = [...allFrequencies];
    for (const extra of EXTRA_FREQUENCY_SUGGESTIONS) {
      if (!merged.some((f) => f.toLowerCase() === extra.toLowerCase())) {
        merged.push(extra);
      }
    }
    return merged;
  }, [allFrequencies]);

  useEffect(() => {
    if (!isOpen) return;
    if (editingItem) {
      setEquipmentCategory(editingItem.equipmentCategory);
      setFrequency(editingItem.frequency);
      setCategory(editingItem.category);
      setTaskDescription(editingItem.taskDescription);
    } else {
      setEquipmentCategory(
        defaultEquipment === 'ALL'
          ? equipmentCategories[0] || 'Chilled Water Pump'
          : defaultEquipment
      );
      setFrequency(defaultFrequency === 'ALL' ? 'Monthly' : defaultFrequency);
      setCategory('Visual & Physical');
      setTaskDescription('');
    }
    setErrors({});
  }, [isOpen, editingItem, defaultEquipment, defaultFrequency, equipmentCategories]);

  if (!isOpen) return null;

  const isEditing = Boolean(editingItem);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const payload: NewItemInput = {
      equipmentCategory,
      frequency,
      category,
      taskDescription,
    };

    const validation = validateNewChecklistItem(payload);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    onSave(payload, editingItem?.id);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-item-modal-title"
      className="no-print fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-20">
          <div>
            <h2
              id="add-item-modal-title"
              className="text-lg sm:text-xl font-extrabold text-slate-900"
            >
              {isEditing ? 'Ubah Item Checklist' : 'Tambah Item Checklist'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Semua kolom di bawah bisa dipilih dari daftar atau diketik manual bebas.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela item checklist"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5">
          {/* 1. EQUIPMENT CATEGORY (Select OR Free Manual Input) */}
          <EditableCombobox
            id="modal-equipment-input"
            label="EQUIPMENT CATEGORY"
            value={equipmentCategory}
            options={equipmentCategories}
            placeholder="Pilih dari daftar atau ketik peralatan baru..."
            helperText="Bisa pilih dari 22 peralatan bawaan atau ketik nama peralatan baru."
            error={errors.equipmentCategory}
            onChange={(val) => {
              setEquipmentCategory(val);
              setErrors((prev) => ({ ...prev, equipmentCategory: undefined }));
            }}
          />

          {/* 2. Frequency & 3. Category (Both Select OR Free Manual Input) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <EditableCombobox
              id="modal-frequency-input"
              label="Frequency"
              value={frequency}
              options={frequencyOptions}
              placeholder="Pilih atau ketik (misal: Daily, Insidental)"
              helperText="Bisa pilih jadwal atau ketik manual."
              error={errors.frequency}
              onChange={(val) => {
                setFrequency(val);
                setErrors((prev) => ({ ...prev, frequency: undefined }));
              }}
            />

            <EditableCombobox
              id="modal-category-input"
              label="Category"
              value={category}
              options={taskCategories}
              placeholder="Pilih atau ketik kategori pengecekan..."
              helperText="Contoh: Visual & Physical, Safety, dll."
              error={errors.category}
              onChange={(val) => {
                setCategory(val);
                setErrors((prev) => ({ ...prev, category: undefined }));
              }}
            />
          </div>

          {/* 4. Task Description (Free Manual Input) */}
          <div>
            <label
              htmlFor="modal-task-description"
              className="block text-sm font-bold text-slate-800 mb-1.5"
            >
              Task Description (Deskripsi Tugas Pengecekan)
            </label>
            <textarea
              id="modal-task-description"
              rows={3}
              value={taskDescription}
              onChange={(e) => {
                setTaskDescription(e.target.value);
                setErrors((prev) => ({ ...prev, taskDescription: undefined }));
              }}
              placeholder="Ketik kegiatan inspeksi sesuai kebutuhan lapangan..."
              className={`w-full px-4 py-3 rounded-xl border text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                errors.taskDescription
                  ? 'border-red-400 focus:border-red-600 focus:ring-red-500/20'
                  : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/20'
              }`}
            />
            {errors.taskDescription && (
              <p className="text-sm font-semibold text-red-700 mt-1">
                {errors.taskDescription}
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-base cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="min-h-[48px] px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
            >
              {isEditing ? (
                <>
                  <Save className="w-5 h-5" aria-hidden="true" />
                  <span>Simpan Perubahan</span>
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" aria-hidden="true" />
                  <span>Simpan Item Baru</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
