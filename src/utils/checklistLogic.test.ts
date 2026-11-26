import test from 'node:test';
import assert from 'node:assert/strict';
import { checklistData } from '../data/checklistData';
import {
  applyItemOverrides,
  applySetAllOk,
  calculateProgress,
  createManualChecklistItem,
  filterChecklistItems,
  getAllFrequenciesList,
  getAvailableFrequencies,
  getUniqueEquipmentCategories,
  mergeItemsWithResponses,
  parsePersistedState,
  requiresRemarksWarning,
  sanitizeFilename,
  validateNewChecklistItem,
} from './checklistLogic';

test('dataset includes all 22 equipment categories from the schedule', () => {
  const categories = getUniqueEquipmentCategories(checklistData);
  assert.equal(categories.length, 22);
  assert.ok(categories.includes('Chilled Water Pump'));
  assert.ok(categories.includes('Fire Pump (Jockey Pump, Electric Pump & Diesel Pump)'));
  assert.ok(categories.includes('Panel DB (Electrical System)'));
  assert.ok(categories.includes('WWP, SWP, RWP, CWP, KWP, dan FUEL DRAIN'));
  assert.ok(checklistData.length >= 500);
});

test('filtering by equipment category and frequency returns exact matching items', () => {
  const merged = mergeItemsWithResponses(checklistData, {});
  const chwpMonthly = filterChecklistItems(merged, {
    equipmentCategory: 'Chilled Water Pump',
    frequency: 'Monthly',
    searchQuery: '',
    statusFilter: 'ALL',
  });
  assert.equal(chwpMonthly.length, 10);
  assert.ok(chwpMonthly.every((i) => i.equipmentCategory === 'Chilled Water Pump' && i.frequency === 'Monthly'));

  const chwpWeekly = filterChecklistItems(merged, {
    equipmentCategory: 'Chilled Water Pump',
    frequency: 'Weekly',
    searchQuery: '',
    statusFilter: 'ALL',
  });
  assert.equal(chwpWeekly.length, 0);

  const avail = getAvailableFrequencies(checklistData, 'Chilled Water Pump');
  assert.deepEqual(avail, ['Monthly', 'Semi-Annually', 'Annually']);
});

test('custom manual frequencies and equipment categories work across validation and filters', () => {
  const validCustom = validateNewChecklistItem({
    equipmentCategory: 'Genset 1500 kVA',
    frequency: 'Daily / Harian',
    category: 'Fuel & Radiator',
    taskDescription: 'Periksa level air radiator dan solar harian.',
  });
  assert.equal(validCustom.valid, true);

  const customItem = createManualChecklistItem(
    {
      equipmentCategory: 'Genset 1500 kVA',
      frequency: 'Daily / Harian',
      category: 'Fuel & Radiator',
      taskDescription: 'Periksa level air radiator dan solar harian.',
    },
    'genset-1'
  );

  const combined = [...checklistData, customItem];
  const allFreqs = getAllFrequenciesList(combined);
  assert.ok(allFreqs.includes('Daily / Harian'));
  const avail = getAvailableFrequencies(combined, 'Genset 1500 kVA');
  assert.deepEqual(avail, ['Daily / Harian']);
});

test('applyItemOverrides updates built-in item fields without mutating original array', () => {
  const firstId = checklistData[0].id;
  const patched = applyItemOverrides(checklistData.slice(0, 2), {
    [firstId]: {
      equipmentCategory: 'Chilled Water Pump',
      frequency: 'Insidental',
      category: 'Custom Inspection',
      taskDescription: 'Cek kebocoran pasca perbaikan seal.',
    },
  });
  assert.equal(patched[0].frequency, 'Insidental');
  assert.equal(patched[0].category, 'Custom Inspection');
  assert.equal(patched[0].taskDescription, 'Cek kebocoran pasca perbaikan seal.');
  assert.equal(checklistData[0].frequency, 'Monthly');
});

test('requiresRemarksWarning flags MINOR and CRITICAL items without remarks', () => {
  assert.equal(requiresRemarksWarning('MINOR', ''), true);
  assert.equal(requiresRemarksWarning('CRITICAL', '   '), true);
  assert.equal(requiresRemarksWarning('MINOR', 'Seal sedikit merembes'), false);
  assert.equal(requiresRemarksWarning('CRITICAL', 'Bearing bunyi kasar'), false);
  assert.equal(requiresRemarksWarning('OK', ''), false);
  assert.equal(requiresRemarksWarning('OBSERVATION', ''), false);
  assert.equal(requiresRemarksWarning('N/A', ''), false);
});

test('calculateProgress computes counts, percentage, and missing remarks accurately', () => {
  const sample = checklistData.slice(0, 4);
  const responses = {
    [sample[0].id]: { status: 'OK' as const, remarks: '' },
    [sample[1].id]: { status: 'MINOR' as const, remarks: '' },
    [sample[2].id]: { status: 'CRITICAL' as const, remarks: 'Motor overheat 82C' },
  };
  const merged = mergeItemsWithResponses(sample, responses);
  const progress = calculateProgress(merged);

  assert.equal(progress.total, 4);
  assert.equal(progress.completed, 3);
  assert.equal(progress.percentage, 75);
  assert.equal(progress.okCount, 1);
  assert.equal(progress.minorCount, 1);
  assert.equal(progress.criticalCount, 1);
  assert.equal(progress.missingRemarksCount, 1);
});

test('applySetAllOk sets visible items to OK while preserving existing remarks', () => {
  const sample = checklistData.slice(0, 3);
  const initialResponses = {
    [sample[0].id]: { status: 'MINOR' as const, remarks: 'Getaran ringan' },
  };
  const merged = mergeItemsWithResponses(sample, initialResponses);

  const fillEmpty = applySetAllOk(merged, initialResponses, true, '2026-11-22T00:00:00Z');
  assert.equal(fillEmpty[sample[0].id].status, 'MINOR');
  assert.equal(fillEmpty[sample[1].id].status, 'OK');
  assert.equal(fillEmpty[sample[2].id].status, 'OK');

  const fillAll = applySetAllOk(merged, initialResponses, false, '2026-11-22T00:00:00Z');
  assert.equal(fillAll[sample[0].id].status, 'OK');
  assert.equal(fillAll[sample[0].id].remarks, 'Getaran ringan');
  assert.equal(fillAll[sample[1].id].status, 'OK');
});

test('validateNewChecklistItem catches empty fields and accepts valid input', () => {
  const invalid = validateNewChecklistItem({
    equipmentCategory: '',
    frequency: '   ',
    category: '',
    taskDescription: 'abc',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.equipmentCategory);
  assert.ok(invalid.errors.frequency);
  assert.ok(invalid.errors.category);
  assert.ok(invalid.errors.taskDescription);

  const valid = validateNewChecklistItem({
    equipmentCategory: 'Hydrant',
    frequency: 'Monthly',
    category: 'Safety',
    taskDescription: 'Periksa segel pintu lemari hydrant.',
  });
  assert.equal(valid.valid, true);

  const item = createManualChecklistItem(
    {
      equipmentCategory: 'Hydrant',
      frequency: 'Monthly',
      category: 'Safety',
      taskDescription: 'Periksa segel pintu lemari hydrant.',
    },
    'test-1'
  );
  assert.equal(item.id, 'custom-test-1');
  assert.equal(item.isCustom, true);
});

test('parsePersistedState handles corrupt JSON gracefully and restores custom frequency & overrides', () => {
  assert.equal(parsePersistedState('{not-valid-json'), null);
  assert.equal(parsePersistedState(null), null);

  const payload = JSON.stringify({
    version: 1,
    meta: {
      technicianName: 'Budi Santoso',
      inspectionDate: '2026-11-22',
      unitLocation: 'CHWP-01 Basement',
      supervisorName: 'Andi Wijaya',
    },
    responses: {
      'pm-0001': { status: 'OK', remarks: 'Normal' },
    },
    customItems: [],
    itemOverrides: {
      'pm-0001': {
        equipmentCategory: 'Chilled Water Pump',
        frequency: 'Harian',
        category: 'Visual',
        taskDescription: 'Cek cepat kebocoran.',
      },
    },
    selectedEquipment: 'Hydrant',
    selectedFrequency: 'Harian',
    lastSavedAt: '2026-11-22T10:00:00Z',
  });

  const restored = parsePersistedState(payload);
  assert.ok(restored);
  assert.equal(restored.meta.technicianName, 'Budi Santoso');
  assert.equal(restored.selectedEquipment, 'Hydrant');
  assert.equal(restored.selectedFrequency, 'Harian');
  assert.equal(restored.itemOverrides['pm-0001'].frequency, 'Harian');
  assert.equal(restored.responses['pm-0001'].status, 'OK');
});

test('sanitizeFilename produces safe cross-platform filenames', () => {
  assert.equal(sanitizeFilename('CHWP-01 / Lantai Basement!'), 'CHWP-01_Lantai_Basement');
  assert.equal(sanitizeFilename('   '), 'Checklist_Maintenance');
});
