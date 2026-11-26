import {
  ALL_FREQUENCIES,
  ChecklistItemOverride,
  ChecklistItemWithResponse,
  ChecklistProgress,
  ChecklistResponse,
  ChecklistStatus,
  ChecklistTemplateItem,
  FilterState,
  Frequency,
  InspectionMeta,
  PersistedChecklistState,
} from '../types/checklist';

export const STORAGE_KEY = 'pm_checklist_facility_v1';
export const STORAGE_VERSION = 1;

export function getTodayIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createDefaultMeta(now: Date = new Date()): InspectionMeta {
  return {
    technicianName: '',
    inspectionDate: getTodayIsoDate(now),
    unitLocation: '',
    supervisorName: '',
  };
}

export function applyItemOverrides(
  baseItems: ChecklistTemplateItem[],
  overrides: Record<string, ChecklistItemOverride>
): ChecklistTemplateItem[] {
  return baseItems.map((item) => {
    const patch = overrides[item.id];
    if (!patch) return item;
    return {
      ...item,
      equipmentCategory: patch.equipmentCategory,
      frequency: patch.frequency,
      category: patch.category,
      taskDescription: patch.taskDescription,
    };
  });
}

export function getUniqueEquipmentCategories(items: ChecklistTemplateItem[]): string[] {
  const seen = new Set<string>();
  const categories: string[] = [];
  for (const item of items) {
    if (!seen.has(item.equipmentCategory)) {
      seen.add(item.equipmentCategory);
      categories.push(item.equipmentCategory);
    }
  }
  return categories;
}

export function getUniqueTaskCategories(items: ChecklistTemplateItem[]): string[] {
  const seen = new Set<string>();
  const categories: string[] = [];
  for (const item of items) {
    if (item.category && !seen.has(item.category)) {
      seen.add(item.category);
      categories.push(item.category);
    }
  }
  return categories;
}

export function getAllFrequenciesList(items: ChecklistTemplateItem[]): Frequency[] {
  const list: Frequency[] = [...ALL_FREQUENCIES];
  const seen = new Set<string>(ALL_FREQUENCIES);
  for (const item of items) {
    if (item.frequency && !seen.has(item.frequency)) {
      seen.add(item.frequency);
      list.push(item.frequency);
    }
  }
  return list;
}

export function getAvailableFrequencies(
  items: ChecklistTemplateItem[],
  equipmentCategory: string
): Frequency[] {
  const found = new Set<string>();
  for (const item of items) {
    if (equipmentCategory === 'ALL' || item.equipmentCategory === equipmentCategory) {
      found.add(item.frequency);
    }
  }
  const orderedStandard = ALL_FREQUENCIES.filter((freq) => found.has(freq));
  const customExtras: Frequency[] = [];
  for (const freq of found) {
    if (!ALL_FREQUENCIES.includes(freq as (typeof ALL_FREQUENCIES)[number])) {
      customExtras.push(freq);
    }
  }
  return [...orderedStandard, ...customExtras];
}

export function mergeItemsWithResponses(
  items: ChecklistTemplateItem[],
  responses: Record<string, ChecklistResponse>
): ChecklistItemWithResponse[] {
  return items.map((item) => {
    const resp = responses[item.id];
    return {
      ...item,
      status: resp?.status ?? '',
      remarks: resp?.remarks ?? '',
    };
  });
}

export function requiresRemarksWarning(status: ChecklistStatus, remarks: string): boolean {
  return (status === 'MINOR' || status === 'CRITICAL') && remarks.trim().length === 0;
}

export function filterChecklistItems(
  items: ChecklistItemWithResponse[],
  filter: FilterState
): ChecklistItemWithResponse[] {
  const query = filter.searchQuery.trim().toLowerCase();

  return items.filter((item) => {
    if (
      filter.equipmentCategory !== 'ALL' &&
      item.equipmentCategory !== filter.equipmentCategory
    ) {
      return false;
    }

    if (filter.frequency !== 'ALL' && item.frequency !== filter.frequency) {
      return false;
    }

    if (filter.statusFilter === 'UNFILLED' && item.status !== '') {
      return false;
    } else if (
      filter.statusFilter === 'ISSUES' &&
      item.status !== 'MINOR' &&
      item.status !== 'CRITICAL' &&
      item.status !== 'OBSERVATION'
    ) {
      return false;
    } else if (
      filter.statusFilter !== 'ALL' &&
      filter.statusFilter !== 'UNFILLED' &&
      filter.statusFilter !== 'ISSUES' &&
      item.status !== filter.statusFilter
    ) {
      return false;
    }

    if (query) {
      const haystack = `${item.equipmentCategory} ${item.frequency} ${item.category} ${item.taskDescription} ${item.remarks}`.toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    return true;
  });
}

export function calculateProgress(items: ChecklistItemWithResponse[]): ChecklistProgress {
  let completed = 0;
  let okCount = 0;
  let observationCount = 0;
  let minorCount = 0;
  let criticalCount = 0;
  let naCount = 0;
  let missingRemarksCount = 0;

  for (const item of items) {
    if (item.status !== '') {
      completed += 1;
    }
    switch (item.status) {
      case 'OK':
        okCount += 1;
        break;
      case 'OBSERVATION':
        observationCount += 1;
        break;
      case 'MINOR':
        minorCount += 1;
        break;
      case 'CRITICAL':
        criticalCount += 1;
        break;
      case 'N/A':
        naCount += 1;
        break;
      default:
        break;
    }
    if (requiresRemarksWarning(item.status, item.remarks)) {
      missingRemarksCount += 1;
    }
  }

  const total = items.length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return {
    total,
    completed,
    percentage,
    okCount,
    observationCount,
    minorCount,
    criticalCount,
    naCount,
    missingRemarksCount,
  };
}

export function applySetAllOk(
  visibleItems: ChecklistItemWithResponse[],
  existingResponses: Record<string, ChecklistResponse>,
  onlyEmpty: boolean = false,
  timestamp: string = new Date().toISOString()
): Record<string, ChecklistResponse> {
  const next = { ...existingResponses };
  for (const item of visibleItems) {
    const current = next[item.id];
    if (onlyEmpty && current && current.status !== '') {
      continue;
    }
    next[item.id] = {
      status: 'OK',
      remarks: current?.remarks ?? '',
      updatedAt: timestamp,
    };
  }
  return next;
}

export interface NewItemInput {
  equipmentCategory: string;
  frequency: Frequency;
  category: string;
  taskDescription: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof NewItemInput, string>>;
}

export function validateNewChecklistItem(input: NewItemInput): ValidationResult {
  const errors: Partial<Record<keyof NewItemInput, string>> = {};

  if (!input.equipmentCategory.trim()) {
    errors.equipmentCategory = 'Pilih atau ketik kategori peralatan.';
  }
  if (!input.frequency.trim()) {
    errors.frequency = 'Pilih atau ketik frekuensi inspeksi (contoh: Monthly, Harian, Insidental).';
  }
  if (!input.category.trim()) {
    errors.category = 'Pilih atau ketik kategori pengecekan (contoh: Visual & Physical).';
  }
  if (input.taskDescription.trim().length < 4) {
    errors.taskDescription = 'Deskripsi tugas minimal 4 karakter.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function createManualChecklistItem(
  input: NewItemInput,
  idSuffix: string = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
): ChecklistTemplateItem {
  return {
    id: `custom-${idSuffix}`,
    equipmentCategory: input.equipmentCategory.trim(),
    frequency: input.frequency.trim(),
    category: input.category.trim(),
    taskDescription: input.taskDescription.trim(),
    isCustom: true,
  };
}

export function parsePersistedState(raw: string | null): PersistedChecklistState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedChecklistState>;
    if (!parsed || typeof parsed !== 'object') return null;

    const defaultMeta = createDefaultMeta();
    const meta: InspectionMeta = {
      technicianName:
        typeof parsed.meta?.technicianName === 'string' ? parsed.meta.technicianName : '',
      inspectionDate:
        typeof parsed.meta?.inspectionDate === 'string' && parsed.meta.inspectionDate
          ? parsed.meta.inspectionDate
          : defaultMeta.inspectionDate,
      unitLocation:
        typeof parsed.meta?.unitLocation === 'string' ? parsed.meta.unitLocation : '',
      supervisorName:
        typeof parsed.meta?.supervisorName === 'string' ? parsed.meta.supervisorName : '',
    };

    const responses: Record<string, ChecklistResponse> = {};
    if (parsed.responses && typeof parsed.responses === 'object') {
      for (const [key, val] of Object.entries(parsed.responses)) {
        if (val && typeof val === 'object') {
          responses[key] = {
            status: typeof val.status === 'string' ? (val.status as ChecklistStatus) : '',
            remarks: typeof val.remarks === 'string' ? val.remarks : '',
            updatedAt: typeof val.updatedAt === 'string' ? val.updatedAt : undefined,
          };
        }
      }
    }

    const customItems: ChecklistTemplateItem[] = Array.isArray(parsed.customItems)
      ? parsed.customItems.filter(
          (item): item is ChecklistTemplateItem =>
            Boolean(
              item &&
                typeof item.id === 'string' &&
                typeof item.equipmentCategory === 'string' &&
                typeof item.frequency === 'string' &&
                typeof item.category === 'string' &&
                typeof item.taskDescription === 'string'
            )
        )
      : [];

    const itemOverrides: Record<string, ChecklistItemOverride> = {};
    if (parsed.itemOverrides && typeof parsed.itemOverrides === 'object') {
      for (const [key, val] of Object.entries(parsed.itemOverrides)) {
        if (
          val &&
          typeof val === 'object' &&
          typeof val.equipmentCategory === 'string' &&
          typeof val.frequency === 'string' &&
          typeof val.category === 'string' &&
          typeof val.taskDescription === 'string'
        ) {
          itemOverrides[key] = {
            equipmentCategory: val.equipmentCategory,
            frequency: val.frequency,
            category: val.category,
            taskDescription: val.taskDescription,
          };
        }
      }
    }

    return {
      version: STORAGE_VERSION,
      meta,
      responses,
      customItems,
      itemOverrides,
      selectedEquipment:
        typeof parsed.selectedEquipment === 'string' && parsed.selectedEquipment
          ? parsed.selectedEquipment
          : 'Chilled Water Pump',
      selectedFrequency:
        typeof parsed.selectedFrequency === 'string' && parsed.selectedFrequency
          ? parsed.selectedFrequency
          : 'Monthly',
      lastSavedAt:
        typeof parsed.lastSavedAt === 'string' ? parsed.lastSavedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function sanitizeFilename(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9\-_\s]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 60) || 'Checklist_Maintenance';
}
