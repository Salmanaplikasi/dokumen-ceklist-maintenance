import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCloudShareUrl,
  buildItemsList,
  clampFieldDocReportForCloud,
  createFreshFieldDocReport,
  filterArchiveReports,
  filterAssetItems,
  formatIndonesianDate,
  formatIndonesianFullDay,
  mergeLocalAndCloudReports,
  parseCloudAutoConnectParam,
  sanitizeFieldDocFilename,
  sanitizeLocalReports,
  wrapCanvasLines,
} from './fieldDocLogic.ts';
import {
  buildFieldDocDocxBlob,
  buildFieldDocExcelBlob,
} from './fieldDocExport.ts';

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
  assert.equal(duped.reports[0].syncStatus, 'local-only');
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

test('wrapCanvasLines wraps long strings and splits unbroken tokens strictly within max width', () => {
  const lines = wrapCanvasLines(
    (t) => t.length * 8,
    'Pengecekan unit pompa chiller lantai basement gedung utama',
    160
  );
  assert.ok(lines.length >= 2);

  const unbroken = 'CHWP-SERIALNUMBER-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-END';
  const splitLines = wrapCanvasLines((t) => t.length * 8, unbroken, 120);
  assert.ok(splitLines.length >= 3);
  assert.ok(splitLines.every((l) => l.length * 8 <= 120));
});

test('buildFieldDocDocxBlob produces valid OOXML docx zip archive even with long multi-line descriptions', async () => {
  const report = createFreshFieldDocReport({
    title: 'Inspeksi Visual CHWP-01',
    wmLoc: 'Chiller Room Basement',
    author: 'M. Salman. A',
    email: 'teknisi@facility.local',
    date: '2026-11-26',
  });
  report.slots[0].desc =
    'Kondisi unit pompa bersih dan tidak ada kebocoran.\nSerialCode: SN-99887766554433221100AABBCCDDEEFFGGHHIIJJKKLLMMNNOOPPQQRRSSTT\nCatatan tambahan inspeksi suhu bearing pompa 48C.';
  const blob = await buildFieldDocDocxBlob(report);
  assert.ok(blob.size > 3000, `Expected docx > 3KB, got ${blob.size}`);
  const header = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  assert.equal(header[0], 0x50); // 'P'
  assert.equal(header[1], 0x4b); // 'K' (ZIP magic header)
});

test('buildFieldDocExcelBlob generates valid print-ready .xlsx archive with long photo descriptions', async () => {
  const report = createFreshFieldDocReport({
    title: 'Dokumentasi FCU-11.1 Trafo A',
    wmLoc: 'Trafo Room A',
    author: 'M. Salman. A',
    email: 'teknisi@facility.local',
    date: '2026-11-26',
  });
  report.slots[0].desc =
    'Baris 1: Filter udara dibersihkan.\nBaris 2: Pengecekan drain pan lancar.\nBaris 3: Amperemeter normal 2.4A dengan nomor seri UNIT-FCU-TRAFO-A-2026-000111222333444555.';
  const blob = await buildFieldDocExcelBlob(report);
  assert.ok(blob.size > 3000, `Expected xlsx > 3KB, got ${blob.size}`);
  const header = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  assert.equal(header[0], 0x50); // 'P'
  assert.equal(header[1], 0x4b); // 'K'
});

test('mergeLocalAndCloudReports preserves local-only items, newest local edits, and cached photos', () => {
  const localOnly = {
    ...createFreshFieldDocReport({ title: 'Arsip Lokal Lama', author: 'Salman' }),
    id: 'local_1',
    updated: 1000,
    slots: [{ img: 'data:image/jpeg;base64,ABC', desc: 'Foto lokal' }],
    syncStatus: 'local-only' as const,
  };
  const sharedLocalNewer = {
    ...createFreshFieldDocReport({ title: 'Edit Lokal Terbaru', author: 'Salman' }),
    id: 'shared_1',
    updated: 5000,
    slots: [{ img: 'data:image/jpeg;base64,NEWLOCAL', desc: 'Baru' }],
    syncStatus: 'local-only' as const,
  };
  const sharedCloudOlder = {
    ...createFreshFieldDocReport({ title: 'Versi Cloud Lama', author: 'Salman' }),
    id: 'shared_1',
    updated: 3000,
    ownerUid: 'uid_123',
    slots: [{ img: '', desc: '' }],
    syncStatus: 'synced' as const,
  };
  const cachedWithLocalImgs = {
    ...createFreshFieldDocReport({ title: 'Cached Photos', author: 'Budi' }),
    id: 'shared_2',
    updated: 2000,
    slots: [{ img: 'data:image/jpeg;base64,CACHED', desc: 'Foto tersimpan lokal' }],
    syncStatus: 'synced' as const,
  };
  const cloudSummaryNewer = {
    ...createFreshFieldDocReport({ title: 'Cached Photos', author: 'Budi' }),
    id: 'shared_2',
    updated: 4000,
    slotCount: 1,
    filledCount: 1,
    slots: [{ img: '', desc: '' }],
    syncStatus: 'synced' as const,
  };

  const merged = mergeLocalAndCloudReports(
    [localOnly, sharedLocalNewer, cachedWithLocalImgs],
    [sharedCloudOlder, cloudSummaryNewer]
  );

  assert.equal(merged.length, 3);
  const keptLocal = merged.find((r) => r.id === 'local_1');
  assert.ok(keptLocal);
  assert.equal(keptLocal.syncStatus, 'local-only');
  assert.equal(keptLocal.slots[0].img, 'data:image/jpeg;base64,ABC');

  const keptNewer = merged.find((r) => r.id === 'shared_1');
  assert.ok(keptNewer);
  assert.equal(keptNewer.title, 'Edit Lokal Terbaru');
  assert.equal(keptNewer.ownerUid, 'uid_123');
  assert.equal(keptNewer.syncStatus, 'local-only');

  const keptImgs = merged.find((r) => r.id === 'shared_2');
  assert.ok(keptImgs);
  assert.equal(keptImgs.syncStatus, 'synced');
  assert.equal(keptImgs.slots[0].img, 'data:image/jpeg;base64,CACHED');
});

test('clampFieldDocReportForCloud clamps oversized fields and IDs strictly inside blueprint bounds', () => {
  const longDesc = 'x'.repeat(5000);
  const hugeImg = `data:image/jpeg;base64,${'A'.repeat(460000)}`;
  const report = {
    ...createFreshFieldDocReport({
      org: 'O'.repeat(300),
      site: 'S'.repeat(100),
      title: 'T'.repeat(400),
      wmLoc: 'L'.repeat(300),
      wmGps: 'G'.repeat(250),
      author: 'A'.repeat(200),
      email: 'E'.repeat(200),
    }),
    id: 'rep/invalid id!@#',
    slots: [
      { img: hugeImg, desc: longDesc },
      { img: 'data:image/jpeg;base64,VALID', desc: 'Normal' },
    ],
  };

  const clamped = clampFieldDocReportForCloud(report, 'uid/test user');
  assert.match(clamped.id, /^[a-zA-Z0-9_-]{1,128}$/);
  assert.match(clamped.ownerUid, /^[a-zA-Z0-9_-]{1,128}$/);
  assert.equal(clamped.org.length, 200);
  assert.equal(clamped.site.length, 64);
  assert.equal(clamped.title.length, 250);
  assert.equal(clamped.wmLoc.length, 200);
  assert.equal(clamped.wmGps.length, 160);
  assert.equal(clamped.author.length, 120);
  assert.equal(clamped.roleLabel.length, 120);
  assert.equal(clamped.slots[0].img, ''); // Oversized image dropped safely rather than failing batch
  assert.equal(clamped.slots[0].desc.length, 4000);
  assert.equal(clamped.slots[1].img, 'data:image/jpeg;base64,VALID');
  assert.equal(clamped.filledCount, 1);
  assert.equal(clamped.slotCount, 2);
});

