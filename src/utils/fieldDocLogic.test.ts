import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCloudShareUrl,
  buildItemsList,
  createFreshFieldDocReport,
  filterArchiveReports,
  filterAssetItems,
  formatIndonesianDate,
  formatIndonesianFullDay,
  parseCloudAutoConnectParam,
  sanitizeFieldDocFilename,
  sanitizeLocalReports,
  wrapCanvasLines,
} from './fieldDocLogic.ts';
import { buildFieldDocDocxBlob } from './fieldDocExport.ts';

test('buildItemsList includes 20 systems and prepends optional site prefix to asset tags', () => {
  const withoutPrefix = buildItemsList('');
  assert.ok(withoutPrefix.length > 300);
  const fcuWithout = withoutPrefix.find((i) => i.n === 'CL-1.01-FCU-11.1 A');
  assert.ok(fcuWithout);
  assert.equal(fcuWithout.r, 'TRAFO ROOM A');

  const withPrefix = buildItemsList('CGK3A');
  const fcuWith = withPrefix.find((i) => i.n === 'CGK3A-CL-1.01-FCU-11.1 A');
  assert.ok(fcuWith);
  assert.match(fcuWith.t, /CGK3A-CL-1\.01-FCU-11\.1 A/);
});

test('filterAssetItems supports multi-token search and manual fallback tracking', () => {
  const items = buildItemsList('');
  const { matches } = filterAssetItems(items, 'chwp chiller');
  assert.ok(matches.length >= 2);
  assert.ok(matches.every((m) => m.l.includes('chwp') && m.l.includes('chiller')));
});

test('Indonesian date formatters render expected strings', () => {
  assert.equal(formatIndonesianDate('2026-11-26'), '26 November 2026');
  assert.equal(formatIndonesianFullDay('2026-11-26'), 'Kamis, 26 November 2026');
});

test('sanitizeFieldDocFilename normalizes title and extension safely', () => {
  assert.equal(
    sanitizeFieldDocFilename('Chilled Water Pump / CHWP-01', '2026-11-26', 'docx'),
    'Laporan_Dokumentasi_Chilled_Water_Pump_CHWP-01_2026-11-26.docx'
  );
  assert.equal(
    sanitizeFieldDocFilename('', '2026-11-26', 'pdf'),
    'Laporan_Dokumentasi_Teknis_2026-11-26.pdf'
  );
});

test('sanitizeLocalReports handles corrupt JSON and deduplicates missing/duplicate IDs', () => {
  const corrupt = sanitizeLocalReports('{bad json');
  assert.equal(corrupt.reports.length, 0);

  const duped = sanitizeLocalReports(
    JSON.stringify([
      { id: 'r1', title: 'Job A', date: '2026-11-25', updated: 100 },
      { id: 'r1', title: 'Job B', date: '2026-11-26', updated: 200 },
      { title: 'Job C', date: '2026-11-24', updated: 50 },
    ])
  );
  assert.equal(duped.mutated, true);
  assert.equal(duped.reports.length, 3);
  const ids = new Set(duped.reports.map((r) => r.id));
  assert.equal(ids.size, 3);
  assert.equal(duped.reports[0].title, 'Job B');
});

test('filterArchiveReports searches title, room, date, and author case-insensitively', () => {
  const r1 = {
    ...createFreshFieldDocReport({ title: 'FCU Trafo A', wmLoc: 'Trafo Room A', author: 'Budi' }),
    id: '1',
  };
  const r2 = {
    ...createFreshFieldDocReport({ title: 'CHWP-01', wmLoc: 'Chiller Room', author: 'Salman' }),
    id: '2',
  };
  assert.equal(filterArchiveReports([r1, r2], 'trafo').length, 1);
  assert.equal(filterArchiveReports([r1, r2], 'salman')[0]?.id, '2');
});

test('buildCloudShareUrl and parseCloudAutoConnectParam round-trip cloud config cleanly', () => {
  const url = buildCloudShareUrl('https://example.app', '/portal', {
    apiKey: 'AIzaTestKey123',
    projectId: 'my-facility-proj',
    room: 'tim_cgk',
  });
  const parsedUrl = new URL(url);
  const decoded = parseCloudAutoConnectParam(parsedUrl.search);
  assert.deepEqual(decoded, {
    apiKey: 'AIzaTestKey123',
    projectId: 'my-facility-proj',
    room: 'tim_cgk',
    consent: true,
  });
});

test('wrapCanvasLines wraps long strings cleanly within max width', () => {
  const lines = wrapCanvasLines((t) => t.length * 8, 'Pengecekan unit pompa chiller lantai basement gedung utama', 160);
  assert.ok(lines.length >= 2);
});

test('buildFieldDocDocxBlob produces valid OOXML docx zip archive', async () => {
  const report = createFreshFieldDocReport({
    title: 'Inspeksi Visual CHWP-01',
    wmLoc: 'Chiller Room Basement',
    author: 'M. Salman. A',
    email: 'teknisi@facility.local',
    date: '2026-11-26',
  });
  report.slots[0].desc = 'Kondisi unit pompa bersih dan tidak ada kebocoran.';
  const blob = await buildFieldDocDocxBlob(report);
  assert.ok(blob.size > 3000, `Expected docx > 3KB, got ${blob.size}`);
  const header = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  assert.equal(header[0], 0x50); // 'P'
  assert.equal(header[1], 0x4b); // 'K' (ZIP magic header)
});
