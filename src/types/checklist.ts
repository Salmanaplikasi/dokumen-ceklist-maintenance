export type StandardFrequency =
  | 'Weekly'
  | 'Bi-Weekly'
  | 'Monthly'
  | 'Quarterly'
  | 'Semi-Annually'
  | 'Annually';

export type Frequency = StandardFrequency | (string & {});

export type ChecklistStatus =
  | ''
  | 'OK'
  | 'OBSERVATION'
  | 'MINOR'
  | 'CRITICAL'
  | 'N/A';

export interface ChecklistTemplateItem {
  id: string;
  equipmentCategory: string;
  frequency: Frequency;
  category: string;
  taskDescription: string;
  isCustom?: boolean;
}

export type ChecklistItemOverride = Pick<
  ChecklistTemplateItem,
  'equipmentCategory' | 'frequency' | 'category' | 'taskDescription'
>;

export interface ChecklistResponse {
  status: ChecklistStatus;
  remarks: string;
  updatedAt?: string;
}

export interface ChecklistItemWithResponse extends ChecklistTemplateItem {
  status: ChecklistStatus;
  remarks: string;
}

export interface InspectionMeta {
  technicianName: string;
  inspectionDate: string; // YYYY-MM-DD
  unitLocation: string;
  supervisorName: string;
}

export interface FilterState {
  equipmentCategory: string;
  frequency: Frequency | 'ALL';
  searchQuery: string;
  statusFilter: 'ALL' | 'UNFILLED' | 'ISSUES' | ChecklistStatus;
}

export interface ChecklistProgress {
  total: number;
  completed: number;
  percentage: number;
  okCount: number;
  observationCount: number;
  minorCount: number;
  criticalCount: number;
  naCount: number;
  missingRemarksCount: number;
}

export interface PersistedChecklistState {
  version: number;
  meta: InspectionMeta;
  responses: Record<string, ChecklistResponse>;
  customItems: ChecklistTemplateItem[];
  itemOverrides: Record<string, ChecklistItemOverride>;
  selectedEquipment: string;
  selectedFrequency: Frequency | 'ALL';
  lastSavedAt: string;
}

export const ALL_FREQUENCIES: StandardFrequency[] = [
  'Weekly',
  'Bi-Weekly',
  'Monthly',
  'Quarterly',
  'Semi-Annually',
  'Annually',
];

export const STATUS_OPTIONS: Exclude<ChecklistStatus, ''>[] = [
  'OK',
  'OBSERVATION',
  'MINOR',
  'CRITICAL',
  'N/A',
];
