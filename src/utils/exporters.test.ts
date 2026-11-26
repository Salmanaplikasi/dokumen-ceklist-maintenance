import test from 'node:test';
import assert from 'node:assert/strict';
import { checklistData } from '../data/checklistData';
import {
  buildDocumentNumber,
  buildExcelWorkbook,
  buildPdfDocument,
  buildStandaloneHtmlString,
  buildWordDocumentHtml,
  escapeHtml,
  formatDisplayDate,
} from './exporters';
import { mergeItemsWithResponses } from './checklistLogic';

test('buildPdfDocument generates valid A4 landscape vector PDF with findings & multi-page pagination', () => {
  const sample = mergeItemsWithResponses(checklistData.slice(0, 28), {
    [checklistData[0].id]: { status: 'OK', remarks: 'Tekanan normal 4.2 Bar' },
    [checklistData[1].id]: { status: 'OBSERVATION', remarks: 'Suara halus pada coupling' },
    [checklistData[2].id]: { status: 'MINOR', remarks: 'Bearing hangat 58C' },
    [checklistData[3].id]: { status: 'CRITICAL', remarks: 'Seal bocor, perlu ganti segera' },
    [checklistData[4].id]: { status: 'N/A', remarks: '' },
  });

  const doc = buildPdfDocument(
    sample,
    {
      technicianName: 'Budi Santoso',
      inspectionDate: '2026-11-25',
      unitLocation: 'CHWP-01 Basement',
      supervisorName: 'Andi Wijaya',
    },
    'Chilled Water Pump',
    'Monthly'
  );

  // Check page geometry (A4 landscape = 297 x 210 mm) and multi-page pagination
  assert.ok(doc.getNumberOfPages() >= 2, '28 items should paginate across multiple A4 landscape pages');
  assert.ok(Math.abs(doc.internal.pageSize.getWidth() - 297) < 0.5);
  assert.ok(Math.abs(doc.internal.pageSize.getHeight() - 210) < 0.5);

  const bytes = new Uint8Array(doc.output('arraybuffer'));
  const header = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4]);
  assert.equal(header, '%PDF-');
  assert.ok(bytes.byteLength > 5000);
});

test('escapeHtml neutralizes HTML special characters', () => {
  assert.equal(
    escapeHtml('<script>alert("x")</script> & \'ok\''),
    '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;ok&#39;'
  );
});

test('formatDisplayDate formats ISO date into Indonesian readable date', () => {
  assert.equal(formatDisplayDate('2026-11-22'), '22 November 2026');
  assert.equal(formatDisplayDate('2026-07-07'), '7 Juli 2026');
});

test('buildDocumentNumber formats deterministic report ID from ISO date', () => {
  assert.equal(buildDocumentNumber('2026-11-23'), 'PM-CHK-20261123');
});

test('buildExcelWorkbook generates print-ready A4 landscape styled workbook with repeating headers and valid xlsx bytes', async () => {
  const sample = mergeItemsWithResponses(checklistData.slice(0, 3), {
    [checklistData[0].id]: { status: 'OK', remarks: 'Normal' },
    [checklistData[1].id]: { status: 'MINOR', remarks: 'Getaran ringan pada bearing' },
    [checklistData[2].id]: { status: 'CRITICAL', remarks: 'Suhu housing 85C, segera cek' },
  });

  const wb = await buildExcelWorkbook(
    sample,
    {
      technicianName: 'Budi Santoso',
      inspectionDate: '2026-11-23',
      unitLocation: 'CHWP-01 Basement',
      supervisorName: 'Andi Wijaya',
    },
    'Chilled Water Pump',
    'Monthly'
  );

  const ws = wb.getWorksheet('Checklist PM');
  assert.ok(ws, 'Worksheet Checklist PM should exist');
  assert.equal(ws.pageSetup.paperSize, 9); // A4
  assert.equal(ws.pageSetup.orientation, 'landscape');
  assert.equal(ws.pageSetup.fitToPage, true);
  assert.equal(ws.pageSetup.fitToWidth, 1);
  assert.equal(ws.pageSetup.fitToHeight, 0);
  assert.equal(ws.pageSetup.printTitlesRow, '8:9');

  // Verify title banner, styled checkmarks, and findings summary
  assert.equal(ws.getCell('A1').value, 'PREVENTIVE MAINTENANCE CHECKLIST REPORT');
  assert.equal(ws.getCell('F10').value, '✓'); // Row 10 = OK
  assert.equal(ws.getCell('H11').value, '✓'); // Row 11 = MINOR
  assert.equal(ws.getCell('I12').value, '✓'); // Row 12 = CRITICAL
  assert.ok(ws.getRow(10).height && ws.getRow(10).height >= 22);

  // Verify valid XLSX zip binary output (PK header)
  const rawBuffer = await wb.xlsx.writeBuffer();
  const bytes = new Uint8Array(rawBuffer as ArrayBuffer);
  assert.equal(bytes[0], 0x50); // 'P'
  assert.equal(bytes[1], 0x4b); // 'K'
  assert.ok(bytes.byteLength > 4000);
});

test('buildWordDocumentHtml produces print-ready Word HTML with Kop banner, KPI strip, findings, checkmarks, and signatures', () => {
  const sample = mergeItemsWithResponses(checklistData.slice(0, 2), {
    [checklistData[0].id]: { status: 'OK', remarks: 'Normal' },
    [checklistData[1].id]: { status: 'CRITICAL', remarks: '<Overheat> 85C' },
  });

  const html = buildWordDocumentHtml(
    sample,
    {
      technicianName: 'Budi Santoso',
      inspectionDate: '2026-11-22',
      unitLocation: 'CHWP-01 Basement',
      supervisorName: 'Andi Wijaya',
    },
    'Chilled Water Pump',
    'Monthly'
  );

  assert.ok(html.includes('CHECKLIST MAINTENANCE REPORT'));
  assert.ok(html.includes('PM-CHK-20261122'));
  assert.ok(html.includes('Budi Santoso'));
  assert.ok(html.includes('Andi Wijaya'));
  assert.ok(html.includes('Dibuat oleh (Teknisi)'));
  assert.ok(html.includes('Diperiksa oleh (Supervisor)'));
  assert.ok(html.includes('RINGKASAN TEMUAN YANG MEMERLUKAN TINDAK LANJUT (1 ITEM)'));
  assert.ok(html.includes('&lt;Overheat&gt; 85C'));
  assert.ok(html.includes('&#10004;'));
  assert.ok(html.includes('mso-page-orientation: landscape'));
  assert.ok(html.includes('display: table-header-group'));
});

test('buildStandaloneHtmlString embeds checklistData and CDN dependencies cleanly', () => {
  const html = buildStandaloneHtmlString(checklistData.slice(0, 5));
  assert.ok(html.includes('https://cdn.tailwindcss.com'));
  assert.ok(html.includes('https://cdn.sheetjs.com'));
  assert.ok(html.includes('const checklistData = ['));
  assert.ok(html.includes('Visually check for leaks.'));
});
