import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ChecklistItemWithResponse,
  ChecklistTemplateItem,
  Frequency,
  InspectionMeta,
} from '../types/checklist';
import { calculateProgress, sanitizeFilename } from './checklistLogic';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const [y, m, d] = parts;
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  const monthIdx = Number(m) - 1;
  if (Number.isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) return isoDate;
  return `${Number(d)} ${months[monthIdx]} ${y}`;
}

export function buildDocumentNumber(inspectionDate: string): string {
  const cleanDate = (inspectionDate || new Date().toISOString().slice(0, 10)).replace(
    /[^0-9]/g,
    ''
  );
  return `PM-CHK-${cleanDate || 'REPORT'}`;
}

export function getFrequencyPrintColors(frequency: Frequency): { bg: string; text: string } {
  switch (frequency) {
    case 'Weekly':
      return { bg: '#F8FAFC', text: '#0F172A' };
    case 'Bi-Weekly':
      return { bg: '#E2E8F0', text: '#0F172A' };
    case 'Monthly':
      return { bg: '#0284C7', text: '#FFFFFF' };
    case 'Quarterly':
      return { bg: '#F59E0B', text: '#0F172A' };
    case 'Semi-Annually':
      return { bg: '#DC2626', text: '#FFFFFF' };
    case 'Annually':
      return { bg: '#991B1B', text: '#FFFFFF' };
    default:
      return { bg: '#E0E7FF', text: '#1E3A8A' };
  }
}

function hexToArgb(hex: string): string {
  return `FF${hex.replace('#', '').toUpperCase()}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function getStatusPrintColors(status: string): { bg: string; text: string } {
  switch (status) {
    case 'OK':
      return { bg: '#DCFCE7', text: '#166534' };
    case 'OBSERVATION':
      return { bg: '#DBEAFE', text: '#1E40AF' };
    case 'MINOR':
      return { bg: '#FEF3C7', text: '#92400E' };
    case 'CRITICAL':
      return { bg: '#FEE2E2', text: '#991B1B' };
    case 'N/A':
      return { bg: '#E2E8F0', text: '#334155' };
    default:
      return { bg: '#FFFFFF', text: '#0F172A' };
  }
}

function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function estimateRowHeight(
  equipment: string,
  category: string,
  description: string,
  remarks: string
): number {
  const lines = Math.max(
    1,
    Math.ceil(equipment.length / 24),
    Math.ceil(category.length / 18),
    Math.ceil(description.length / 44),
    Math.ceil((remarks || '').length / 30)
  );
  return Math.max(22, lines * 14.5 + 8);
}

/**
 * Builds a print-ready, fully styled ExcelJS Workbook (A4 Landscape, Fit-to-1-Page-Wide,
 * repeating headers, semantic status highlights, dynamic row heights, and bordered signature boxes).
 */
export async function buildExcelWorkbook(
  items: ChecklistItemWithResponse[],
  meta: InspectionMeta,
  equipmentLabel: string,
  frequencyLabel: string
): Promise<ExcelJS.Workbook> {
  const progress = calculateProgress(items);
  const equipText = equipmentLabel === 'ALL' ? 'Semua Peralatan' : equipmentLabel;
  const freqText = frequencyLabel === 'ALL' ? 'Semua Frekuensi' : frequencyLabel;
  const docNo = buildDocumentNumber(meta.inspectionDate);
  const displayDate = formatDisplayDate(meta.inspectionDate);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = meta.technicianName || 'Facility Maintenance Team';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Checklist PM', {
    views: [{ state: 'frozen', ySplit: 9, showGridLines: true }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.4,
        bottom: 0.55,
        header: 0.2,
        footer: 0.25,
      },
      printTitlesRow: '8:9',
    },
    headerFooter: {
      oddFooter: `&LChecklist Preventive Maintenance Report (${docNo})&CDokumen Inspeksi Resmi&RHalaman &P dari &N`,
    },
  });

  // 11 Columns A..K sized cleanly for A4 Landscape
  ws.columns = [
    { key: 'no', width: 5.5 },
    { key: 'equipment', width: 25 },
    { key: 'frequency', width: 13.5 },
    { key: 'category', width: 18.5 },
    { key: 'description', width: 45 },
    { key: 'ok', width: 6.5 },
    { key: 'obs', width: 7.5 },
    { key: 'min', width: 6.8 },
    { key: 'crit', width: 6.8 },
    { key: 'na', width: 6.5 },
    { key: 'remarks', width: 32 },
  ];

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF94A3B8' } },
    left: { style: 'thin', color: { argb: 'FF94A3B8' } },
    bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
    right: { style: 'thin', color: { argb: 'FF94A3B8' } },
  };

  const headerBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'medium', color: { argb: 'FF0F172A' } },
    left: { style: 'thin', color: { argb: 'FF475569' } },
    bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
    right: { style: 'thin', color: { argb: 'FF475569' } },
  };

  // --- ROW 1-2: Official Corporate Kop Banner ---
  ws.mergeCells('A1:I1');
  ws.mergeCells('J1:K1');
  ws.mergeCells('A2:I2');
  ws.mergeCells('J2:K2');

  ws.getRow(1).height = 28;
  ws.getRow(2).height = 19;

  const titleCell = ws.getCell('A1');
  titleCell.value = 'PREVENTIVE MAINTENANCE CHECKLIST REPORT';
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };

  const docCell = ws.getCell('J1');
  docCell.value = `NO. DOK: ${docNo}`;
  docCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFE2E8F0' } };
  docCell.alignment = { vertical: 'middle', horizontal: 'right' };
  docCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };

  const subCell = ws.getCell('A2');
  subCell.value = 'Laporan Inspeksi Pemeliharaan Preventif Fasilitas & Gedung — Siap Cetak (A4 Landscape)';
  subCell.font = { name: 'Calibri', size: 9.5, italic: true, color: { argb: 'FFCBD5E1' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

  const statusTagCell = ws.getCell('J2');
  statusTagCell.value = `Progres: ${progress.percentage}% (${progress.completed}/${progress.total})`;
  statusTagCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF93C5FD' } };
  statusTagCell.alignment = { vertical: 'middle', horizontal: 'right' };
  statusTagCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

  // Spacer row 3
  ws.getRow(3).height = 6;

  // --- ROW 4-6: Metadata & KPI Summary Box ---
  ws.mergeCells('A4:B4');
  ws.mergeCells('C4:E4');
  ws.mergeCells('F4:H4');
  ws.mergeCells('I4:K4');

  ws.mergeCells('A5:B5');
  ws.mergeCells('C5:E5');
  ws.mergeCells('F5:H5');
  ws.mergeCells('I5:K5');

  ws.mergeCells('A6:B6');
  ws.mergeCells('C6:E6');

  ws.getRow(4).height = 21;
  ws.getRow(5).height = 21;
  ws.getRow(6).height = 22;

  const setMetaPair = (labelRef: string, valRef: string, label: string, val: string) => {
    const l = ws.getCell(labelRef);
    l.value = label;
    l.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF334155' } };
    l.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    l.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    const v = ws.getCell(valRef);
    v.value = val;
    v.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    v.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    v.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
  };

  setMetaPair('A4', 'C4', 'Nama Teknisi / Petugas', meta.technicianName || '-');
  setMetaPair('F4', 'I4', 'Tanggal Inspeksi', displayDate);
  setMetaPair('A5', 'C5', 'Lokasi / Kode Unit', meta.unitLocation || '-');
  setMetaPair('F5', 'I5', 'Equipment & Frequency', `${equipText} (${freqText})`);
  setMetaPair(
    'A6',
    'C6',
    'Ringkasan Progres',
    `Selesai ${progress.completed} dari ${progress.total} Tugas (${progress.percentage}%)`
  );

  // KPI pills on Row 6 (F6..K6)
  const kpiCells: Array<{ ref: string; text: string; bg: string; color: string }> = [
    { ref: 'F6', text: `OK: ${progress.okCount}`, bg: 'FFDCFCE7', color: 'FF166534' },
    { ref: 'G6', text: `OBS: ${progress.observationCount}`, bg: 'FFDBEAFE', color: 'FF1E40AF' },
    { ref: 'H6', text: `MIN: ${progress.minorCount}`, bg: 'FFFEF3C7', color: 'FF92400E' },
    { ref: 'I6', text: `CRIT: ${progress.criticalCount}`, bg: 'FFFEE2E2', color: 'FF991B1B' },
    { ref: 'J6', text: `N/A: ${progress.naCount}`, bg: 'FFF1F5F9', color: 'FF334155' },
    {
      ref: 'K6',
      text: `Supervisor: ${meta.supervisorName || '-'}`,
      bg: 'FFF8FAFC',
      color: 'FF334155',
    },
  ];
  kpiCells.forEach(({ ref, text, bg, color }) => {
    const c = ws.getCell(ref);
    c.value = text;
    c.font = { name: 'Calibri', size: 9, bold: true, color: { argb: color } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    c.alignment = {
      vertical: 'middle',
      horizontal: ref === 'K6' ? 'left' : 'center',
      indent: ref === 'K6' ? 1 : 0,
    };
  });

  // Apply crisp borders to metadata block rows 4..6
  for (let r = 4; r <= 6; r++) {
    for (let c = 1; c <= 11; c++) {
      ws.getCell(r, c).border = thinBorder;
    }
  }

  // --- ROW 7: Status Legend ---
  ws.mergeCells('A7:K7');
  ws.getRow(7).height = 18;
  const legendCell = ws.getCell('A7');
  legendCell.value =
    'Keterangan Status:   ✓ OK = Kondisi Normal   |   ✓ OBS = Perlu Pantauan   |   ✓ MIN = Minor (Perlu Perbaikan)   |   ✓ CRIT = Kritis (Segera Ditangani)   |   ✓ N/A = Tidak Berlaku';
  legendCell.font = { name: 'Calibri', size: 8.5, italic: true, color: { argb: 'FF475569' } };
  legendCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  legendCell.alignment = { vertical: 'middle', horizontal: 'center' };
  for (let c = 1; c <= 11; c++) {
    ws.getCell(7, c).border = thinBorder;
  }

  // --- ROW 8-9: 2-Tier Repeating Table Header ---
  ws.mergeCells('A8:E8');
  ws.mergeCells('F8:J8');
  ws.mergeCells('K8:K9');

  ws.getRow(8).height = 22;
  ws.getRow(9).height = 21;

  const groupHeaders: Array<{ ref: string; title: string }> = [
    { ref: 'A8', title: 'CHECKLIST MAINTENANCE' },
    { ref: 'F8', title: 'STATUS' },
    { ref: 'K8', title: 'REMARKS / CATATAN LAPANGAN' },
  ];
  groupHeaders.forEach(({ ref, title }) => {
    const cell = ws.getCell(ref);
    cell.value = title;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  const subHeaders: Array<{ col: number; label: string; bg?: string; color?: string }> = [
    { col: 1, label: 'No' },
    { col: 2, label: 'EQUIPMENT CATEGORY' },
    { col: 3, label: 'Frequency' },
    { col: 4, label: 'Category' },
    { col: 5, label: 'Task Description' },
    { col: 6, label: 'OK', bg: 'FFDCFCE7', color: 'FF166534' },
    { col: 7, label: 'OBS', bg: 'FFDBEAFE', color: 'FF1E40AF' },
    { col: 8, label: 'MIN', bg: 'FFFEF3C7', color: 'FF92400E' },
    { col: 9, label: 'CRIT', bg: 'FFFEE2E2', color: 'FF991B1B' },
    { col: 10, label: 'N/A', bg: 'FFE2E8F0', color: 'FF334155' },
  ];
  subHeaders.forEach(({ col, label, bg, color }) => {
    const cell = ws.getCell(9, col);
    cell.value = label;
    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: color || 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg || 'FFE2E8F0' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  for (let r = 8; r <= 9; r++) {
    for (let c = 1; c <= 11; c++) {
      ws.getCell(r, c).border = headerBorder;
    }
  }

  // --- DATA ROWS (Row 10+) ---
  const statusCols: Array<{ col: number; key: ChecklistItemWithResponse['status'] }> = [
    { col: 6, key: 'OK' },
    { col: 7, key: 'OBSERVATION' },
    { col: 8, key: 'MINOR' },
    { col: 9, key: 'CRITICAL' },
    { col: 10, key: 'N/A' },
  ];

  items.forEach((item, idx) => {
    const rowNum = 10 + idx;
    const row = ws.getRow(rowNum);
    row.height = estimateRowHeight(
      item.equipmentCategory,
      item.category,
      item.taskDescription,
      item.remarks
    );

    const isZebra = idx % 2 === 1;
    const rowBaseBg = isZebra ? 'FFF8FAFC' : 'FFFFFFFF';
    const freqColors = getFrequencyPrintColors(item.frequency);
    const isIssue = item.status === 'MINOR' || item.status === 'CRITICAL';

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = item.equipmentCategory;
    row.getCell(3).value = item.frequency;
    row.getCell(4).value = item.category;
    row.getCell(5).value = item.taskDescription;
    row.getCell(11).value = item.remarks || '';

    for (let c = 1; c <= 11; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder;
      cell.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF0F172A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBaseBg } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: c === 1 ? 'center' : 'left',
        wrapText: true,
      };
    }

    // Styled Frequency cell
    const freqCell = row.getCell(3);
    freqCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    freqCell.font = {
      name: 'Calibri',
      size: 9,
      bold: true,
      color: { argb: hexToArgb(freqColors.text) },
    };
    freqCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: hexToArgb(freqColors.bg) },
    };

    // Styled Status checkmark cells
    statusCols.forEach(({ col, key }) => {
      const sCell = row.getCell(col);
      sCell.alignment = { vertical: 'middle', horizontal: 'center' };
      if (item.status === key) {
        const sc = getStatusPrintColors(key);
        sCell.value = '✓';
        sCell.font = {
          name: 'Calibri',
          size: 12,
          bold: true,
          color: { argb: hexToArgb(sc.text) },
        };
        sCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: hexToArgb(sc.bg) },
        };
      } else {
        sCell.value = '';
      }
    });

    // Highlight remarks cell on MINOR / CRITICAL findings
    if (isIssue) {
      const rCell = row.getCell(11);
      rCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: item.status === 'CRITICAL' ? 'FFFEF2F2' : 'FFFFFBEB' },
      };
      rCell.font = {
        name: 'Calibri',
        size: 9.5,
        bold: true,
        color: { argb: item.status === 'CRITICAL' ? 'FF991B1B' : 'FF92400E' },
      };
    }
  });

  let cursorRow = 10 + items.length + 1;

  // --- OPTIONAL FINDINGS SUMMARY BLOCK (when MINOR or CRITICAL exist) ---
  const findings = items.filter((i) => i.status === 'MINOR' || i.status === 'CRITICAL');
  if (findings.length > 0) {
    ws.getRow(cursorRow - 1).height = 8;
    ws.mergeCells(`A${cursorRow}:K${cursorRow}`);
    ws.getRow(cursorRow).height = 21;
    const fHead = ws.getCell(`A${cursorRow}`);
    fHead.value = `RINGKASAN TEMUAN YANG MEMERLUKAN TINDAK LANJUT (${findings.length} ITEM)`;
    fHead.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF991B1B' } };
    fHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    fHead.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    for (let c = 1; c <= 11; c++) {
      ws.getCell(cursorRow, c).border = thinBorder;
    }
    cursorRow += 1;

    findings.forEach((f, fIdx) => {
      ws.mergeCells(`A${cursorRow}:B${cursorRow}`);
      ws.mergeCells(`C${cursorRow}:E${cursorRow}`);
      ws.mergeCells(`F${cursorRow}:K${cursorRow}`);
      ws.getRow(cursorRow).height = Math.max(
        20,
        Math.ceil((f.taskDescription.length + (f.remarks || '').length) / 70) * 14 + 8
      );

      const badge = ws.getCell(`A${cursorRow}`);
      badge.value = `${fIdx + 1}. [${f.status}] ${f.equipmentCategory}`;
      badge.font = {
        name: 'Calibri',
        size: 9,
        bold: true,
        color: { argb: f.status === 'CRITICAL' ? 'FF991B1B' : 'FF92400E' },
      };
      badge.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: f.status === 'CRITICAL' ? 'FFFEF2F2' : 'FFFFFBEB' },
      };
      badge.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };

      const taskC = ws.getCell(`C${cursorRow}`);
      taskC.value = f.taskDescription;
      taskC.font = { name: 'Calibri', size: 9, color: { argb: 'FF0F172A' } };
      taskC.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };

      const remC = ws.getCell(`F${cursorRow}`);
      remC.value = f.remarks ? `Catatan: ${f.remarks}` : 'Catatan: (Belum diisi)';
      remC.font = { name: 'Calibri', size: 9, italic: !f.remarks, color: { argb: 'FF334155' } };
      remC.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };

      for (let c = 1; c <= 11; c++) {
        ws.getCell(cursorRow, c).border = thinBorder;
      }
      cursorRow += 1;
    });
    cursorRow += 1;
  }

  // --- OFFICIAL SIGNATURE APPROVAL BLOCK ---
  ws.getRow(cursorRow - 1).height = 10;
  const sigHeaderRow = cursorRow;
  const sigSpaceRow = cursorRow + 1;
  const sigNameRow = cursorRow + 2;

  ws.mergeCells(`A${sigHeaderRow}:E${sigHeaderRow}`);
  ws.mergeCells(`F${sigHeaderRow}:K${sigHeaderRow}`);
  ws.mergeCells(`A${sigSpaceRow}:E${sigSpaceRow}`);
  ws.mergeCells(`F${sigSpaceRow}:K${sigSpaceRow}`);
  ws.mergeCells(`A${sigNameRow}:E${sigNameRow}`);
  ws.mergeCells(`F${sigNameRow}:K${sigNameRow}`);

  ws.getRow(sigHeaderRow).height = 22;
  ws.getRow(sigSpaceRow).height = 54;
  ws.getRow(sigNameRow).height = 30;

  const techHead = ws.getCell(`A${sigHeaderRow}`);
  techHead.value = 'DIBUAT OLEH (TEKNISI LAPANGAN)';
  techHead.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
  techHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  techHead.alignment = { vertical: 'middle', horizontal: 'center' };

  const supHead = ws.getCell(`F${sigHeaderRow}`);
  supHead.value = 'DIPERIKSA & DISETUJUI OLEH (SUPERVISOR)';
  supHead.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
  supHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  supHead.alignment = { vertical: 'middle', horizontal: 'center' };

  const techName = ws.getCell(`A${sigNameRow}`);
  techName.value = `( ${meta.technicianName || '........................................'} )\nTanggal: ${displayDate}`;
  techName.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
  techName.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  const supName = ws.getCell(`F${sigNameRow}`);
  supName.value = `( ${meta.supervisorName || '........................................'} )\nTanggal: ..............................`;
  supName.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
  supName.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  for (let r = sigHeaderRow; r <= sigNameRow; r++) {
    for (let c = 1; c <= 11; c++) {
      ws.getCell(r, c).border = thinBorder;
    }
  }

  return workbook;
}

export async function exportToExcel(
  items: ChecklistItemWithResponse[],
  meta: InspectionMeta,
  equipmentLabel: string,
  frequencyLabel: string
): Promise<string> {
  const datePart = meta.inspectionDate || new Date().toISOString().slice(0, 10);
  const equipPart = sanitizeFilename(
    equipmentLabel === 'ALL' ? 'Semua_Peralatan' : equipmentLabel
  );
  const filename = `PM_Checklist_${equipPart}_${datePart}.xlsx`;

  const workbook = await buildExcelWorkbook(items, meta, equipmentLabel, frequencyLabel);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerFileDownload(blob, filename);
  return filename;
}

type PdfDocWithTable = jsPDF & { lastAutoTable?: { finalY: number } };

/**
 * Generates a print-ready, true-vector A4 Landscape PDF report via jsPDF + autoTable:
 * - Corporate Kop Banner + Document ID + Progress
 * - Metadata grid + color-coded KPI strip + legend
 * - 2-tier repeating header across all pages
 * - Vector checkmarks centered inside tinted status cells (crisp at any zoom)
 * - Auto Findings Follow-Up table for MINOR / CRITICAL items
 * - Protected bordered approval signature block + Halaman X dari Y footer
 */
export function buildPdfDocument(
  items: ChecklistItemWithResponse[],
  meta: InspectionMeta,
  equipmentLabel: string,
  frequencyLabel: string
): jsPDF {
  const progress = calculateProgress(items);
  const equipText = equipmentLabel === 'ALL' ? 'Semua Peralatan' : equipmentLabel;
  const freqText = frequencyLabel === 'ALL' ? 'Semua Frekuensi' : frequencyLabel;
  const docNo = buildDocumentNumber(meta.inspectionDate);
  const displayDate = formatDisplayDate(meta.inspectionDate);
  const findings = items.filter((i) => i.status === 'MINOR' || i.status === 'CRITICAL');

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  }) as PdfDocWithTable;

  doc.setProperties({
    title: `Checklist Maintenance Report - ${docNo}`,
    subject: `Preventive Maintenance Inspection (${equipText})`,
    author: meta.technicianName || 'Facility Maintenance Team',
    creator: 'Checklist Preventive Maintenance SPA',
  });

  const marginX = 10;
  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const contentWidth = pageWidth - marginX * 2; // 277mm

  // --- 1. Corporate Kop Header Banner ---
  const leftBannerWidth = 202;
  const rightBannerWidth = contentWidth - leftBannerWidth; // 75mm
  doc.setFillColor(15, 23, 42); // #0F172A
  doc.rect(marginX, 10, leftBannerWidth, 16, 'F');
  doc.setFillColor(30, 41, 59); // #1E293B
  doc.rect(marginX + leftBannerWidth, 10, rightBannerWidth, 16, 'F');
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.35);
  doc.rect(marginX, 10, contentWidth, 16, 'S');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.text('CHECKLIST MAINTENANCE REPORT', marginX + 4, 17);

  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.text(
    'Preventive Maintenance Inspection Record - Fasilitas & Gedung',
    marginX + 4,
    22.5
  );

  const rightX = pageWidth - marginX - 3.5;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`No. Dok: ${docNo}`, rightX, 14.8, { align: 'right' });

  doc.setTextColor(226, 232, 240);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Format: A4 Landscape (Siap Cetak)', rightX, 19.2, { align: 'right' });

  doc.setTextColor(147, 197, 253);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(
    `Progres: ${progress.completed}/${progress.total} (${progress.percentage}%)`,
    rightX,
    23.6,
    { align: 'right' }
  );

  // --- 2. Inspection Metadata Table (277mm) ---
  autoTable(doc, {
    startY: 28,
    margin: { left: marginX, right: marginX },
    tableWidth: contentWidth,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: { top: 1.8, right: 2.5, bottom: 1.8, left: 2.5 },
      lineColor: [148, 163, 184],
      lineWidth: 0.25,
      valign: 'middle',
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { cellWidth: 46, fillColor: [241, 245, 249], fontStyle: 'bold', textColor: [51, 65, 85] },
      1: { cellWidth: 92.5, fillColor: [255, 255, 255], fontStyle: 'bold' },
      2: { cellWidth: 46, fillColor: [241, 245, 249], fontStyle: 'bold', textColor: [51, 65, 85] },
      3: { cellWidth: 92.5, fillColor: [255, 255, 255], fontStyle: 'bold' },
    },
    body: [
      [
        'Nama Teknisi / Petugas',
        meta.technicianName || '-',
        'Tanggal Inspeksi',
        displayDate,
      ],
      [
        'Lokasi / Kode Unit',
        meta.unitLocation || '-',
        'Equipment & Frequency',
        `${equipText} (${freqText})`,
      ],
    ],
  });

  // --- 3. Color-Coded KPI Summary Strip + Legend (277mm) ---
  autoTable(doc, {
    startY: (doc.lastAutoTable?.finalY ?? 42) + 1.8,
    margin: { left: marginX, right: marginX },
    tableWidth: contentWidth,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.8,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: { top: 1.6, right: 2, bottom: 1.6, left: 2 },
      lineColor: [203, 213, 225],
      lineWidth: 0.25,
    },
    columnStyles: {
      0: { cellWidth: 61, fillColor: [248, 250, 252], textColor: [15, 23, 42] },
      1: { cellWidth: 41, fillColor: [220, 252, 231], textColor: [22, 101, 52] },
      2: { cellWidth: 48, fillColor: [219, 234, 254], textColor: [30, 64, 175] },
      3: { cellWidth: 42, fillColor: [254, 243, 199], textColor: [146, 64, 14] },
      4: { cellWidth: 45, fillColor: [254, 226, 226], textColor: [153, 27, 27] },
      5: { cellWidth: 40, fillColor: [241, 245, 249], textColor: [51, 65, 85] },
    },
    body: [
      [
        `Selesai: ${progress.completed}/${progress.total} (${progress.percentage}%)`,
        `OK: ${progress.okCount}`,
        `OBSERVATION: ${progress.observationCount}`,
        `MINOR: ${progress.minorCount}`,
        `CRITICAL: ${progress.criticalCount}`,
        `N/A: ${progress.naCount}`,
      ],
      [
        {
          content:
            'Keterangan Status:   OK = Normal   |   OBS = Perlu Pantauan   |   MIN = Minor (Perlu Perbaikan)   |   CRIT = Kritis (Segera Ditangani)   |   N/A = Tidak Berlaku',
          colSpan: 6,
          styles: {
            fillColor: [248, 250, 252],
            textColor: [71, 85, 105],
            fontStyle: 'normal',
            fontSize: 7.2,
            halign: 'center',
          },
        },
      ],
    ],
  });

  // --- 4. Main 2-Tier Repeating Checklist Table (277mm) ---
  const statusKeys = ['OK', 'OBSERVATION', 'MINOR', 'CRITICAL', 'N/A'] as const;

  autoTable(doc, {
    startY: (doc.lastAutoTable?.finalY ?? 56) + 2.2,
    margin: { top: 12, left: marginX, right: marginX, bottom: 16 },
    tableWidth: contentWidth,
    theme: 'grid',
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    styles: {
      font: 'helvetica',
      fontSize: 7.8,
      cellPadding: { top: 2, right: 2.2, bottom: 2, left: 2.2 },
      lineColor: [71, 85, 105],
      lineWidth: 0.22,
      valign: 'middle',
      textColor: [15, 23, 42],
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 43, halign: 'left' },
      2: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 33, halign: 'left' },
      4: { cellWidth: 76, halign: 'left' },
      5: { cellWidth: 9, halign: 'center' },
      6: { cellWidth: 10, halign: 'center' },
      7: { cellWidth: 9, halign: 'center' },
      8: { cellWidth: 9.5, halign: 'center' },
      9: { cellWidth: 8.5, halign: 'center' },
      10: { cellWidth: 45, halign: 'left' },
    },
    head: [
      [
        {
          content: 'CHECKLIST MAINTENANCE',
          colSpan: 5,
          styles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 8.2,
          },
        },
        {
          content: 'STATUS',
          colSpan: 5,
          styles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 8.2,
          },
        },
        {
          content: 'REMARKS / CATATAN',
          rowSpan: 2,
          styles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            fontSize: 8.2,
          },
        },
      ],
      [
        {
          content: 'No',
          styles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'center' },
        },
        {
          content: 'EQUIPMENT CATEGORY',
          styles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'left' },
        },
        {
          content: 'Frequency',
          styles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'center' },
        },
        {
          content: 'Category',
          styles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'left' },
        },
        {
          content: 'Task Description',
          styles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'left' },
        },
        {
          content: 'OK',
          styles: { fillColor: [220, 252, 231], textColor: [22, 101, 52], fontStyle: 'bold', halign: 'center' },
        },
        {
          content: 'OBS',
          styles: { fillColor: [219, 234, 254], textColor: [30, 64, 175], fontStyle: 'bold', halign: 'center' },
        },
        {
          content: 'MIN',
          styles: { fillColor: [254, 243, 199], textColor: [146, 64, 14], fontStyle: 'bold', halign: 'center' },
        },
        {
          content: 'CRIT',
          styles: { fillColor: [254, 226, 226], textColor: [153, 27, 27], fontStyle: 'bold', halign: 'center' },
        },
        {
          content: 'N/A',
          styles: { fillColor: [226, 232, 240], textColor: [51, 65, 85], fontStyle: 'bold', halign: 'center' },
        },
      ],
    ],
    body: items.map((item, idx) => [
      idx + 1,
      item.equipmentCategory,
      item.frequency,
      item.category,
      item.taskDescription,
      '',
      '',
      '',
      '',
      '',
      item.remarks || '',
    ]),
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const item = items[data.row.index];
      if (!item) return;

      // Subtle zebra striping
      if (data.row.index % 2 === 1) {
        data.cell.styles.fillColor = [248, 250, 252];
      } else {
        data.cell.styles.fillColor = [255, 255, 255];
      }

      // Frequency column semantic tint
      if (data.column.index === 2) {
        const fc = getFrequencyPrintColors(item.frequency);
        data.cell.styles.fillColor = hexToRgb(fc.bg);
        data.cell.styles.textColor = hexToRgb(fc.text);
      }

      // Status columns fill tint when selected
      if (data.column.index >= 5 && data.column.index <= 9) {
        const colStatus = statusKeys[data.column.index - 5];
        if (item.status === colStatus) {
          const sc = getStatusPrintColors(colStatus);
          data.cell.styles.fillColor = hexToRgb(sc.bg);
        }
      }

      // Remarks column highlight on MINOR / CRITICAL
      if (data.column.index === 10) {
        if (item.status === 'CRITICAL') {
          data.cell.styles.fillColor = [254, 242, 242];
          data.cell.styles.textColor = [153, 27, 27];
          data.cell.styles.fontStyle = 'bold';
        } else if (item.status === 'MINOR') {
          data.cell.styles.fillColor = [255, 251, 235];
          data.cell.styles.textColor = [146, 64, 14];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    didDrawCell: (data) => {
      if (data.section !== 'body') return;
      if (data.column.index < 5 || data.column.index > 9) return;
      const item = items[data.row.index];
      if (!item) return;

      const colStatus = statusKeys[data.column.index - 5];
      if (item.status !== colStatus) return;

      // Draw crisp vector checkmark centered inside status cell
      const sc = getStatusPrintColors(colStatus);
      const [r, g, b] = hexToRgb(sc.text);
      const cx = data.cell.x + data.cell.width / 2;
      const cy = data.cell.y + data.cell.height / 2;

      doc.setDrawColor(r, g, b);
      doc.setLineWidth(0.55);
      doc.line(cx - 1.4, cy + 0.1, cx - 0.3, cy + 1.2);
      doc.line(cx - 0.3, cy + 1.2, cx + 1.6, cy - 1.1);
    },
  });

  // --- 5. Findings Summary Block (when MINOR or CRITICAL exist) ---
  if (findings.length > 0) {
    const afterTableY = doc.lastAutoTable?.finalY ?? 75;
    if (pageHeight - 16 - afterTableY < 26) {
      doc.addPage();
    }
    const startFindingsY =
      pageHeight - 16 - afterTableY < 26 ? 12 : afterTableY + 4;

    autoTable(doc, {
      startY: startFindingsY,
      margin: { top: 12, left: marginX, right: marginX, bottom: 16 },
      tableWidth: contentWidth,
      theme: 'grid',
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
      styles: {
        font: 'helvetica',
        fontSize: 7.6,
        cellPadding: { top: 1.8, right: 2.5, bottom: 1.8, left: 2.5 },
        lineColor: [252, 165, 165],
        lineWidth: 0.25,
        valign: 'top',
        textColor: [15, 23, 42],
      },
      columnStyles: {
        0: { cellWidth: 66, fontStyle: 'bold' },
        1: { cellWidth: 111 },
        2: { cellWidth: 100 },
      },
      head: [
        [
          {
            content: `RINGKASAN TEMUAN YANG MEMERLUKAN TINDAK LANJUT (${findings.length} ITEM)`,
            colSpan: 3,
            styles: {
              fillColor: [254, 226, 226],
              textColor: [153, 27, 27],
              fontStyle: 'bold',
              halign: 'left',
              fontSize: 8,
            },
          },
        ],
      ],
      body: findings.map((f, idx) => [
        `${idx + 1}. [${f.status}] ${f.equipmentCategory}`,
        f.taskDescription,
        f.remarks || '(Catatan belum diisi)',
      ]),
      didParseCell: (data) => {
        if (data.section !== 'body' || data.column.index !== 0) return;
        const f = findings[data.row.index];
        if (!f) return;
        if (f.status === 'CRITICAL') {
          data.cell.styles.fillColor = [254, 242, 242];
          data.cell.styles.textColor = [153, 27, 27];
        } else {
          data.cell.styles.fillColor = [255, 251, 235];
          data.cell.styles.textColor = [146, 64, 14];
        }
      },
    });
  }

  // --- 6. Protected Bordered Signature Approval Block ---
  const beforeSigY = doc.lastAutoTable?.finalY ?? 80;
  const sigNeededHeight = 36;
  let sigStartY = beforeSigY + 5;
  if (pageHeight - 16 - sigStartY < sigNeededHeight) {
    doc.addPage();
    sigStartY = 14;
  }

  autoTable(doc, {
    startY: sigStartY,
    margin: { left: marginX, right: marginX, bottom: 16 },
    tableWidth: contentWidth,
    theme: 'grid',
    rowPageBreak: 'avoid',
    styles: {
      font: 'helvetica',
      fontSize: 8.2,
      lineColor: [71, 85, 105],
      lineWidth: 0.25,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: contentWidth / 2 },
      1: { cellWidth: contentWidth / 2 },
    },
    head: [
      [
        {
          content: 'DIBUAT OLEH (TEKNISI)',
          styles: {
            fillColor: [241, 245, 249],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            cellPadding: 2.2,
          },
        },
        {
          content: 'DIPERIKSA OLEH (SUPERVISOR)',
          styles: {
            fillColor: [241, 245, 249],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            cellPadding: 2.2,
          },
        },
      ],
    ],
    body: [
      [
        { content: '', styles: { minCellHeight: 27, fillColor: [255, 255, 255] } },
        { content: '', styles: { minCellHeight: 27, fillColor: [255, 255, 255] } },
      ],
    ],
    didDrawCell: (data) => {
      if (data.section !== 'body') return;
      const cx = data.cell.x + data.cell.width / 2;
      const lineY = data.cell.y + data.cell.height - 9.5;
      const lineHalf = data.cell.width * 0.34;

      doc.setDrawColor(51, 65, 85);
      doc.setLineWidth(0.3);
      doc.line(cx - lineHalf, lineY, cx + lineHalf, lineY);

      const isTech = data.column.index === 0;
      const nameText = isTech
        ? meta.technicianName || '........................................'
        : meta.supervisorName || '........................................';
      const roleDateText = isTech
        ? `Teknisi Lapangan  |  Tanggal: ${displayDate}`
        : 'Supervisor Maintenance  |  Tanggal: ..............................';

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(nameText, cx, lineY + 4, { align: 'center' });

      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.text(roleDateText, cx, lineY + 7.6, { align: 'center' });
    },
  });

  // --- 7. Running Footer on Every Page ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.line(marginX, pageHeight - 11.5, pageWidth - marginX, pageHeight - 11.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.3);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Preventive Maintenance Checklist Report - ${docNo}`,
      marginX,
      pageHeight - 7
    );

    doc.text(
      `${equipText} (${freqText})`,
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' }
    );

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(
      `Halaman ${p} dari ${totalPages}`,
      pageWidth - marginX,
      pageHeight - 7,
      { align: 'right' }
    );
  }

  return doc;
}

export function exportToPdf(
  items: ChecklistItemWithResponse[],
  meta: InspectionMeta,
  equipmentLabel: string,
  frequencyLabel: string
): string {
  const datePart = meta.inspectionDate || new Date().toISOString().slice(0, 10);
  const equipPart = sanitizeFilename(
    equipmentLabel === 'ALL' ? 'Semua_Peralatan' : equipmentLabel
  );
  const filename = `PM_Checklist_${equipPart}_${datePart}.pdf`;

  const doc = buildPdfDocument(items, meta, equipmentLabel, frequencyLabel);
  const blob = doc.output('blob');
  triggerFileDownload(blob, filename);
  return filename;
}

export function buildWordDocumentHtml(
  items: ChecklistItemWithResponse[],
  meta: InspectionMeta,
  equipmentLabel: string,
  frequencyLabel: string
): string {
  const progress = calculateProgress(items);
  const equipText = equipmentLabel === 'ALL' ? 'Semua Peralatan' : equipmentLabel;
  const freqText = frequencyLabel === 'ALL' ? 'Semua Frekuensi' : frequencyLabel;
  const docNo = buildDocumentNumber(meta.inspectionDate);
  const displayDate = formatDisplayDate(meta.inspectionDate);
  const findings = items.filter((i) => i.status === 'MINOR' || i.status === 'CRITICAL');

  const tableRows = items
    .map((item, idx) => {
      const freqStyle = getFrequencyPrintColors(item.frequency);
      const rowBg = idx % 2 === 1 ? '#F8FAFC' : '#FFFFFF';
      const isCritical = item.status === 'CRITICAL';
      const isMinor = item.status === 'MINOR';

      const checkCell = (val: string) => {
        if (item.status !== val) {
          return `<td style="text-align:center;background-color:${rowBg};">&nbsp;</td>`;
        }
        const sc = getStatusPrintColors(val);
        return `<td style="text-align:center;font-weight:bold;font-size:11pt;background-color:${sc.bg};color:${sc.text};">&#10004;</td>`;
      };

      const remarksBg = isCritical ? '#FEF2F2' : isMinor ? '#FFFBEB' : rowBg;
      const remarksColor = isCritical ? '#991B1B' : isMinor ? '#92400E' : '#0F172A';
      const remarksWeight = isCritical || isMinor ? 'bold' : 'normal';

      return `
        <tr>
          <td style="text-align:center;background-color:${rowBg};">${idx + 1}</td>
          <td style="background-color:${rowBg};">${escapeHtml(item.equipmentCategory)}</td>
          <td style="text-align:center;font-weight:bold;background-color:${freqStyle.bg};color:${freqStyle.text};">${escapeHtml(item.frequency)}</td>
          <td style="background-color:${rowBg};">${escapeHtml(item.category)}</td>
          <td style="background-color:${rowBg};">${escapeHtml(item.taskDescription)}</td>
          ${checkCell('OK')}
          ${checkCell('OBSERVATION')}
          ${checkCell('MINOR')}
          ${checkCell('CRITICAL')}
          ${checkCell('N/A')}
          <td style="background-color:${remarksBg};color:${remarksColor};font-weight:${remarksWeight};">${escapeHtml(item.remarks || '')}</td>
        </tr>
      `;
    })
    .join('');

  const findingsHtml =
    findings.length > 0
      ? `
      <table class="findings-table">
        <thead>
          <tr>
            <th colspan="3" style="background-color:#FEE2E2;color:#991B1B;text-align:left;padding:5pt 7pt;font-size:8.5pt;">
              RINGKASAN TEMUAN YANG MEMERLUKAN TINDAK LANJUT (${findings.length} ITEM)
            </th>
          </tr>
        </thead>
        <tbody>
          ${findings
            .map(
              (f, idx) => `
            <tr>
              <td style="width:24%;font-weight:bold;background-color:${f.status === 'CRITICAL' ? '#FEF2F2' : '#FFFBEB'};color:${f.status === 'CRITICAL' ? '#991B1B' : '#92400E'};">
                ${idx + 1}. [${escapeHtml(f.status)}] ${escapeHtml(f.equipmentCategory)}
              </td>
              <td style="width:40%;">${escapeHtml(f.taskDescription)}</td>
              <td style="width:36%;">${escapeHtml(f.remarks || '(Catatan belum diisi)')}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `
      : '';

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>Checklist Maintenance Report — ${escapeHtml(docNo)}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 29.7cm 21.0cm;
      mso-page-orientation: landscape;
      margin: 1.0cm 1.0cm 1.35cm 1.0cm;
      mso-footer: f1;
      mso-paper-source: 0;
    }
    div.Section1 { page: Section1; }
    body {
      font-family: Calibri, Arial, Helvetica, sans-serif;
      font-size: 9pt;
      color: #0F172A;
      margin: 0;
      padding: 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    .kop-table {
      margin-bottom: 8pt;
      border: 1.5pt solid #0F172A;
    }
    .kop-table td {
      padding: 7pt 10pt;
      vertical-align: middle;
    }
    .meta-table {
      margin-bottom: 6pt;
      font-size: 8.5pt;
    }
    .meta-table td {
      border: 0.75pt solid #94A3B8;
      padding: 4pt 6pt;
      vertical-align: middle;
    }
    .meta-label {
      background-color: #F1F5F9;
      font-weight: bold;
      color: #334155;
      width: 17%;
    }
    .kpi-table {
      margin-bottom: 6pt;
      font-size: 8.5pt;
    }
    .kpi-table td {
      border: 0.75pt solid #CBD5E1;
      padding: 4pt 6pt;
      text-align: center;
      font-weight: bold;
    }
    .legend-bar {
      background-color: #F8FAFC;
      border: 0.75pt solid #CBD5E1;
      padding: 4pt 8pt;
      font-size: 8pt;
      color: #475569;
      text-align: center;
      margin-bottom: 7pt;
    }
    .checklist-table {
      font-size: 8.2pt;
      table-layout: fixed;
    }
    .checklist-table thead {
      display: table-header-group;
    }
    .checklist-table tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .checklist-table th,
    .checklist-table td {
      border: 0.75pt solid #475569;
      padding: 4pt 5pt;
      vertical-align: middle;
      word-wrap: break-word;
    }
    .findings-table {
      margin-top: 9pt;
      font-size: 8.2pt;
      page-break-inside: avoid;
    }
    .findings-table th,
    .findings-table td {
      border: 0.75pt solid #FCA5A5;
      padding: 4pt 6pt;
      vertical-align: top;
    }
    .sign-table {
      margin-top: 12pt;
      font-size: 8.8pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sign-table th {
      background-color: #F1F5F9;
      border: 0.75pt solid #475569;
      padding: 5pt 8pt;
      text-align: center;
      font-weight: bold;
      color: #0F172A;
      width: 50%;
    }
    .sign-table td {
      border: 0.75pt solid #475569;
      text-align: center;
      vertical-align: bottom;
      padding: 6pt 10pt;
      width: 50%;
    }
    .sign-space {
      height: 46pt;
    }
    p.MsoFooter {
      margin: 0;
      font-size: 7.5pt;
      color: #64748B;
    }
  </style>
</head>
<body>
<div class="Section1">
  <!-- Official Corporate Kop Header -->
  <table class="kop-table">
    <tr>
      <td style="background-color:#0F172A;color:#FFFFFF;width:72%;">
        <div style="font-size:13.5pt;font-weight:bold;letter-spacing:0.4pt;">CHECKLIST MAINTENANCE REPORT</div>
        <div style="font-size:8.5pt;color:#CBD5E1;margin-top:2pt;">Preventive Maintenance Inspection Record &mdash; Fasilitas &amp; Gedung</div>
      </td>
      <td style="background-color:#1E293B;color:#E2E8F0;width:28%;text-align:right;font-size:8pt;line-height:1.45;">
        <div><b>No. Dok:</b> ${escapeHtml(docNo)}</div>
        <div><b>Format:</b> A4 Landscape (Siap Cetak)</div>
        <div><b>Progres:</b> ${progress.completed}/${progress.total} (${progress.percentage}%)</div>
      </td>
    </tr>
  </table>

  <!-- Inspection Info Grid -->
  <table class="meta-table">
    <tr>
      <td class="meta-label">Nama Teknisi / Petugas</td>
      <td style="width:33%;font-weight:bold;">${escapeHtml(meta.technicianName || '-')}</td>
      <td class="meta-label">Tanggal Inspeksi</td>
      <td style="width:33%;font-weight:bold;">${escapeHtml(displayDate)}</td>
    </tr>
    <tr>
      <td class="meta-label">Lokasi / Kode Unit</td>
      <td style="font-weight:bold;">${escapeHtml(meta.unitLocation || '-')}</td>
      <td class="meta-label">Equipment &amp; Frequency</td>
      <td style="font-weight:bold;">${escapeHtml(equipText)} (${escapeHtml(freqText)})</td>
    </tr>
  </table>

  <!-- KPI Summary Strip -->
  <table class="kpi-table">
    <tr>
      <td style="background-color:#F8FAFC;color:#0F172A;width:22%;">Selesai: ${progress.completed}/${progress.total} (${progress.percentage}%)</td>
      <td style="background-color:#DCFCE7;color:#166534;width:15%;">OK: ${progress.okCount}</td>
      <td style="background-color:#DBEAFE;color:#1E40AF;width:17%;">OBSERVATION: ${progress.observationCount}</td>
      <td style="background-color:#FEF3C7;color:#92400E;width:15%;">MINOR: ${progress.minorCount}</td>
      <td style="background-color:#FEE2E2;color:#991B1B;width:16%;">CRITICAL: ${progress.criticalCount}</td>
      <td style="background-color:#F1F5F9;color:#334155;width:15%;">N/A: ${progress.naCount}</td>
    </tr>
  </table>

  <!-- Status Legend -->
  <div class="legend-bar">
    <b>Keterangan Status:</b> &nbsp;
    &#10004; <b>OK</b> = Normal &nbsp;|&nbsp;
    &#10004; <b>OBS</b> = Perlu Pantauan &nbsp;|&nbsp;
    &#10004; <b>MIN</b> = Minor (Perlu Perbaikan) &nbsp;|&nbsp;
    &#10004; <b>CRIT</b> = Kritis (Segera Ditangani) &nbsp;|&nbsp;
    &#10004; <b>N/A</b> = Tidak Berlaku
  </div>

  <!-- Official Checklist Table -->
  <table class="checklist-table">
    <colgroup>
      <col style="width:3.5%;" />
      <col style="width:15.5%;" />
      <col style="width:8.5%;" />
      <col style="width:12%;" />
      <col style="width:27.5%;" />
      <col style="width:3.2%;" />
      <col style="width:3.6%;" />
      <col style="width:3.2%;" />
      <col style="width:3.4%;" />
      <col style="width:3.1%;" />
      <col style="width:16.5%;" />
    </colgroup>
    <thead>
      <tr>
        <th colspan="5" style="background-color:#0F172A;color:#FFFFFF;text-align:center;font-size:9pt;">CHECKLIST MAINTENANCE</th>
        <th colspan="5" style="background-color:#0F172A;color:#FFFFFF;text-align:center;font-size:9pt;">STATUS</th>
        <th rowspan="2" style="background-color:#0F172A;color:#FFFFFF;text-align:center;font-size:9pt;">REMARKS / CATATAN</th>
      </tr>
      <tr>
        <th style="background-color:#E2E8F0;color:#0F172A;text-align:center;">No</th>
        <th style="background-color:#E2E8F0;color:#0F172A;text-align:left;">EQUIPMENT CATEGORY</th>
        <th style="background-color:#E2E8F0;color:#0F172A;text-align:center;">Frequency</th>
        <th style="background-color:#E2E8F0;color:#0F172A;text-align:left;">Category</th>
        <th style="background-color:#E2E8F0;color:#0F172A;text-align:left;">Task Description</th>
        <th style="background-color:#DCFCE7;color:#166534;text-align:center;">OK</th>
        <th style="background-color:#DBEAFE;color:#1E40AF;text-align:center;">OBS</th>
        <th style="background-color:#FEF3C7;color:#92400E;text-align:center;">MIN</th>
        <th style="background-color:#FEE2E2;color:#991B1B;text-align:center;">CRIT</th>
        <th style="background-color:#E2E8F0;color:#334155;text-align:center;">N/A</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  ${findingsHtml}

  <!-- Official Bordered Approval / Signature Block -->
  <table class="sign-table">
    <tr>
      <th>Dibuat oleh (Teknisi)</th>
      <th>Diperiksa oleh (Supervisor)</th>
    </tr>
    <tr>
      <td>
        <div class="sign-space">&nbsp;</div>
        <div style="font-weight:bold;border-top:0.75pt solid #334155;padding-top:3pt;width:72%;margin:0 auto;">
          ${escapeHtml(meta.technicianName || '........................................')}
        </div>
        <div style="font-size:7.8pt;color:#475569;margin-top:2pt;">Teknisi Lapangan &nbsp;|&nbsp; Tanggal: ${escapeHtml(displayDate)}</div>
      </td>
      <td>
        <div class="sign-space">&nbsp;</div>
        <div style="font-weight:bold;border-top:0.75pt solid #334155;padding-top:3pt;width:72%;margin:0 auto;">
          ${escapeHtml(meta.supervisorName || '........................................')}
        </div>
        <div style="font-size:7.8pt;color:#475569;margin-top:2pt;">Supervisor Maintenance &nbsp;|&nbsp; Tanggal: ..............................</div>
      </td>
    </tr>
  </table>

  <!-- Native Word Running Footer -->
  <div style="mso-element:footer" id="f1">
    <p class="MsoFooter">
      <table style="width:100%;border:none;border-top:0.5pt solid #CBD5E1;padding-top:3pt;">
        <tr>
          <td style="border:none;font-size:7.5pt;color:#64748B;text-align:left;">
            Preventive Maintenance Checklist Report &mdash; ${escapeHtml(docNo)}
          </td>
          <td style="border:none;font-size:7.5pt;color:#475569;text-align:right;">
            Halaman <span style="mso-field-code:' PAGE '">1</span> dari <span style="mso-field-code:' NUMPAGES '">1</span>
          </td>
        </tr>
      </table>
    </p>
  </div>
</div>
</body>
</html>`;
}

export function exportToWord(
  items: ChecklistItemWithResponse[],
  meta: InspectionMeta,
  equipmentLabel: string,
  frequencyLabel: string
): string {
  const html = buildWordDocumentHtml(items, meta, equipmentLabel, frequencyLabel);
  const datePart = meta.inspectionDate || new Date().toISOString().slice(0, 10);
  const equipPart = sanitizeFilename(
    equipmentLabel === 'ALL' ? 'Semua_Peralatan' : equipmentLabel
  );
  const filename = `PM_Checklist_${equipPart}_${datePart}.doc`;

  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword;charset=utf-8',
  });
  triggerFileDownload(blob, filename);
  return filename;
}

export function buildStandaloneHtmlString(allTemplateItems: ChecklistTemplateItem[]): string {
  const serializedData = JSON.stringify(
    allTemplateItems.map((item) => ({
      id: item.id,
      equipmentCategory: item.equipmentCategory,
      frequency: item.frequency,
      category: item.category,
      taskDescription: item.taskDescription,
    })),
    null,
    2
  ).replace(/<\/script>/gi, '<\\/script>');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Checklist Preventive Maintenance — Standalone SPA</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js"></script>
  <style>
    @media print {
      @page { size: A4 landscape; margin: 10mm 10mm 14mm 10mm; }
      .no-print { display: none !important; }
      .print-only { display: block !important; }
      body { background: #fff !important; color: #000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      table.print-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
      table.print-table thead { display: table-header-group; }
      table.print-table tr { break-inside: avoid; page-break-inside: avoid; }
      table.print-table th, table.print-table td { border: 1px solid #334155; padding: 4px 6px; }
    }
    @media screen { .print-only { display: none; } }
  </style>
</head>
<body class="bg-slate-100 text-slate-900 min-h-screen font-sans">
  <div id="app" class="no-print max-w-5xl mx-auto px-4 py-6 pb-28"></div>
  <div id="print-area" class="print-only"></div>

  <script>
    // =========================================================================
    // DATABASE CHECKLIST PREVENTIVE MAINTENANCE
    // Anda dapat menambah atau mengedit item tugas langsung pada array di bawah:
    // Format objek: { id, equipmentCategory, frequency, category, taskDescription }
    // =========================================================================
    const checklistData = ${serializedData};

    const STORAGE_KEY = 'pm_checklist_standalone_v1';
    const FREQUENCIES = ['Weekly', 'Bi-Weekly', 'Monthly', 'Quarterly', 'Semi-Annually', 'Annually'];
    const STATUSES = [
      { key: 'OK', label: 'OK', active: 'bg-emerald-600 text-white border-emerald-700', idle: 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50' },
      { key: 'OBSERVATION', label: 'OBSERVATION', active: 'bg-blue-600 text-white border-blue-700', idle: 'bg-white text-blue-800 border-blue-300 hover:bg-blue-50' },
      { key: 'MINOR', label: 'MINOR', active: 'bg-amber-500 text-white border-amber-600', idle: 'bg-white text-amber-800 border-amber-300 hover:bg-amber-50' },
      { key: 'CRITICAL', label: 'CRITICAL', active: 'bg-red-600 text-white border-red-700', idle: 'bg-white text-red-800 border-red-300 hover:bg-red-50' },
      { key: 'N/A', label: 'N/A', active: 'bg-slate-600 text-white border-slate-700', idle: 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100' },
    ];

    function todayISO() {
      const d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function esc(s) {
      return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    let state = {
      meta: { technicianName: '', inspectionDate: todayISO(), unitLocation: '', supervisorName: '' },
      responses: {},
      customItems: [],
      equipment: 'Chilled Water Pump',
      frequency: 'Monthly',
    };

    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && typeof saved === 'object') state = Object.assign(state, saved);
    } catch {}

    function save() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
    }

    function getAllItems() {
      return checklistData.concat(state.customItems || []);
    }

    function getVisibleItems() {
      return getAllItems().filter(function(item) {
        if (state.equipment !== 'ALL' && item.equipmentCategory !== state.equipment) return false;
        if (state.frequency !== 'ALL' && item.frequency !== state.frequency) return false;
        return true;
      });
    }

    function setStatus(id, status) {
      if (!state.responses[id]) state.responses[id] = { status: '', remarks: '' };
      state.responses[id].status = status;
      save();
      render();
    }

    function setRemarks(id, val) {
      if (!state.responses[id]) state.responses[id] = { status: '', remarks: '' };
      state.responses[id].remarks = val;
      save();
      const warn = document.getElementById('warn-' + id);
      if (warn) {
        const st = state.responses[id].status;
        warn.style.display = ((st === 'MINOR' || st === 'CRITICAL') && !val.trim()) ? 'block' : 'none';
      }
    }

    function setAllOk() {
      getVisibleItems().forEach(function(item) {
        if (!state.responses[item.id]) state.responses[item.id] = { status: 'OK', remarks: '' };
        else if (!state.responses[item.id].status) state.responses[item.id].status = 'OK';
      });
      save();
      render();
    }

    function resetCurrent() {
      if (!confirm('Hapus semua status & catatan pada tampilan saat ini?')) return;
      getVisibleItems().forEach(function(item) { delete state.responses[item.id]; });
      save();
      render();
    }

    function addManualItem(e) {
      e.preventDefault();
      const eq = document.getElementById('new-eq').value.trim();
      const fr = document.getElementById('new-freq').value.trim();
      const cat = document.getElementById('new-cat').value.trim();
      const desc = document.getElementById('new-desc').value.trim();
      if (!eq || !fr || !cat || !desc) return;
      state.customItems.push({
        id: 'custom-' + Date.now(),
        equipmentCategory: eq,
        frequency: fr,
        category: cat,
        taskDescription: desc,
      });
      state.equipment = eq;
      state.frequency = fr;
      save();
      document.getElementById('add-modal').classList.add('hidden');
      render();
    }

    function downloadExcel() {
      const items = getVisibleItems();
      const rows = [
        ['CHECKLIST MAINTENANCE REPORT'],
        ['Nama Teknisi', state.meta.technicianName || '-'],
        ['Tanggal Inspeksi', state.meta.inspectionDate || '-'],
        ['Lokasi / Kode Unit', state.meta.unitLocation || '-'],
        [],
        ['No', 'EQUIPMENT CATEGORY', 'Frequency', 'Category', 'Task Description', 'OK', 'OBS', 'MIN', 'CRIT', 'N/A', 'Remarks'],
      ];
      items.forEach(function(it, i) {
        const r = state.responses[it.id] || { status: '', remarks: '' };
        rows.push([
          i + 1, it.equipmentCategory, it.frequency, it.category, it.taskDescription,
          r.status === 'OK' ? '✓' : '', r.status === 'OBSERVATION' ? '✓' : '',
          r.status === 'MINOR' ? '✓' : '', r.status === 'CRITICAL' ? '✓' : '',
          r.status === 'N/A' ? '✓' : '', r.remarks || ''
        ]);
      });
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{wch:5},{wch:28},{wch:14},{wch:20},{wch:48},{wch:6},{wch:6},{wch:6},{wch:6},{wch:6},{wch:32}];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Checklist PM');
      XLSX.writeFile(wb, 'PM_Checklist_' + (state.meta.inspectionDate || todayISO()) + '.xlsx');
    }

    function buildPrintableHtml() {
      const items = getVisibleItems();
      const rows = items.map(function(it, i) {
        const r = state.responses[it.id] || { status: '', remarks: '' };
        const bg = i % 2 === 1 ? '#F8FAFC' : '#FFFFFF';
        return '<tr style="background:' + bg + '"><td style="text-align:center">' + (i + 1) + '</td><td>' + esc(it.equipmentCategory) + '</td><td style="text-align:center;font-weight:bold">' + esc(it.frequency) + '</td><td>' + esc(it.category) + '</td><td>' + esc(it.taskDescription) + '</td>'
          + '<td style="text-align:center;font-weight:bold;color:#166534">' + (r.status === 'OK' ? '&#10004;' : '') + '</td>'
          + '<td style="text-align:center;font-weight:bold;color:#1E40AF">' + (r.status === 'OBSERVATION' ? '&#10004;' : '') + '</td>'
          + '<td style="text-align:center;font-weight:bold;color:#92400E">' + (r.status === 'MINOR' ? '&#10004;' : '') + '</td>'
          + '<td style="text-align:center;font-weight:bold;color:#991B1B">' + (r.status === 'CRITICAL' ? '&#10004;' : '') + '</td>'
          + '<td style="text-align:center;font-weight:bold;color:#334155">' + (r.status === 'N/A' ? '&#10004;' : '') + '</td>'
          + '<td>' + esc(r.remarks) + '</td></tr>';
      }).join('');
      return '<div style="background:#0F172A;color:#FFF;padding:10px 14px;margin-bottom:10px"><h1 style="margin:0;font-size:15pt;font-weight:bold">CHECKLIST MAINTENANCE REPORT</h1><div style="font-size:9pt;color:#CBD5E1;margin-top:2px">Preventive Maintenance Inspection Record &mdash; Fasilitas &amp; Gedung</div></div>'
        + '<table class="print-table" style="margin-bottom:10px"><tr><td><b>Nama Teknisi</b></td><td>' + esc(state.meta.technicianName || '-') + '</td><td><b>Tanggal</b></td><td>' + esc(state.meta.inspectionDate || '-') + '</td></tr>'
        + '<tr><td><b>Lokasi / Kode Unit</b></td><td>' + esc(state.meta.unitLocation || '-') + '</td><td><b>Equipment / Freq</b></td><td>' + esc(state.equipment) + ' (' + esc(state.frequency) + ')</td></tr></table>'
        + '<table class="print-table"><thead><tr style="background:#0F172A;color:#FFF"><th colspan="5">CHECKLIST MAINTENANCE</th><th colspan="5">STATUS</th><th rowspan="2">Remarks</th></tr>'
        + '<tr style="background:#E2E8F0"><th>No</th><th>EQUIPMENT CATEGORY</th><th>Frequency</th><th>Category</th><th>Task Description</th><th>OK</th><th>OBS</th><th>MIN</th><th>CRIT</th><th>N/A</th></tr></thead><tbody>' + rows + '</tbody></table>'
        + '<table style="width:100%;margin-top:20px;border-collapse:collapse;page-break-inside:avoid"><tr><th style="width:50%;border:1px solid #334155;background:#F1F5F9;padding:6px">Dibuat oleh (Teknisi)</th><th style="width:50%;border:1px solid #334155;background:#F1F5F9;padding:6px">Diperiksa oleh (Supervisor)</th></tr>'
        + '<tr><td style="border:1px solid #334155;text-align:center;padding:8px"><div style="height:56px"></div><b>' + esc(state.meta.technicianName || '........................') + '</b></td>'
        + '<td style="border:1px solid #334155;text-align:center;padding:8px"><div style="height:56px"></div><b>' + esc(state.meta.supervisorName || '........................') + '</b></td></tr></table>';
    }

    function downloadWord() {
      const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page{size:29.7cm 21cm;margin:1cm;}body{font-family:Calibri,Arial,sans-serif;font-size:9pt}table{width:100%;border-collapse:collapse}th,td{border:1px solid #334155;padding:4px 5px}</style></head><body>' + buildPrintableHtml() + '</body></html>';
      const blob = new Blob(['\\ufeff', html], { type: 'application/msword;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'PM_Checklist_' + (state.meta.inspectionDate || todayISO()) + '.doc';
      a.click();
    }

    function printPdf() {
      if (window.jspdf && window.jspdf.jsPDF) {
        const items = getVisibleItems();
        const doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        doc.setFillColor(15, 23, 42);
        doc.rect(10, 10, 277, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('CHECKLIST MAINTENANCE REPORT', 14, 17);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Teknisi: ' + (state.meta.technicianName || '-') + ' | Tanggal: ' + (state.meta.inspectionDate || '-') + ' | Unit: ' + (state.meta.unitLocation || '-'), 14, 22);
        doc.autoTable({
          startY: 28,
          margin: { left: 10, right: 10, bottom: 14 },
          head: [['No', 'EQUIPMENT CATEGORY', 'Frequency', 'Category', 'Task Description', 'STATUS', 'Remarks']],
          body: items.map(function(it, i) {
            const r = state.responses[it.id] || { status: '', remarks: '' };
            return [i + 1, it.equipmentCategory, it.frequency, it.category, it.taskDescription, r.status || '-', r.remarks || ''];
          }),
          styles: { fontSize: 8, lineColor: [71, 85, 105], lineWidth: 0.2 },
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
        });
        doc.save('PM_Checklist_' + (state.meta.inspectionDate || todayISO()) + '.pdf');
        return;
      }
      document.getElementById('print-area').innerHTML = buildPrintableHtml();
      window.print();
    }

    function render() {
      const all = getAllItems();
      const categories = Array.from(new Set(all.map(function(i) { return i.equipmentCategory; })));
      const allFreqs = Array.from(new Set(FREQUENCIES.concat(all.map(function(i) { return i.frequency; }))));
      const allTaskCats = Array.from(new Set(all.map(function(i) { return i.category; })));
      const items = getVisibleItems();
      const done = items.filter(function(i) { return state.responses[i.id] && state.responses[i.id].status; }).length;
      const pct = items.length ? Math.round((done / items.length) * 100) : 0;

      const cardsHtml = items.length === 0
        ? '<div class="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-600">Tidak ada tugas pada kombinasi Equipment &amp; Frequency ini.</div>'
        : items.map(function(item, idx) {
            const r = state.responses[item.id] || { status: '', remarks: '' };
            const needsWarn = (r.status === 'MINOR' || r.status === 'CRITICAL') && !r.remarks.trim();
            const btns = STATUSES.map(function(st) {
              const cls = r.status === st.key ? st.active : st.idle;
              return '<button type="button" onclick="setStatus(\\'' + item.id + '\\',\\'' + st.key + '\\')" class="min-h-[48px] px-3 py-2 rounded-full border-2 font-bold text-sm transition ' + cls + '">' + st.label + '</button>';
            }).join('');
            return '<div class="bg-white border ' + (needsWarn ? 'border-red-400 bg-red-50/30' : 'border-slate-200') + ' rounded-2xl p-5 space-y-4">'
              + '<div class="text-xs font-semibold text-slate-500">No. ' + String(idx + 1).padStart(2, '0') + ' &middot; ' + esc(item.frequency) + ' &middot; ' + esc(item.category) + '</div>'
              + '<div class="text-lg font-bold text-slate-900 leading-snug">' + esc(item.taskDescription) + '</div>'
              + '<div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5">' + btns + '</div>'
              + '<div id="warn-' + item.id + '" style="display:' + (needsWarn ? 'block' : 'none') + '" class="text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">Perhatian: Status ' + esc(r.status) + ' dipilih. Mohon isi catatan temuan di kolom Remarks.</div>'
              + '<input type="text" value="' + esc(r.remarks) + '" oninput="setRemarks(\\'' + item.id + '\\', this.value)" placeholder="Catatan lapangan / Remarks (opsional, wajib untuk MINOR & CRITICAL)..." class="w-full min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-300 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" />'
              + '</div>';
          }).join('');

      document.getElementById('app').innerHTML =
        '<header class="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200 mb-6">'
        + '<h1 class="text-2xl font-extrabold text-slate-900">Checklist Preventive Maintenance</h1>'
        + '<button onclick="printPdf()" class="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm">Cetak / Simpan PDF</button>'
        + '</header>'
        + '<section class="bg-white border border-slate-200 rounded-2xl p-5 mb-5 grid grid-cols-1 sm:grid-cols-3 gap-4">'
        + '<div><label class="block text-sm font-bold text-slate-700 mb-1.5">Nama Teknisi / Petugas</label><input id="meta-tech" type="text" value="' + esc(state.meta.technicianName) + '" class="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 text-base" placeholder="Contoh: Budi Santoso" /></div>'
        + '<div><label class="block text-sm font-bold text-slate-700 mb-1.5">Tanggal Inspeksi</label><input id="meta-date" type="date" value="' + esc(state.meta.inspectionDate) + '" class="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 text-base" /></div>'
        + '<div><label class="block text-sm font-bold text-slate-700 mb-1.5">Lokasi / Kode Unit</label><input id="meta-loc" type="text" value="' + esc(state.meta.unitLocation) + '" class="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 text-base" placeholder="Contoh: CHWP-01 Basement" /></div>'
        + '</section>'
        + '<section class="bg-white border border-slate-200 rounded-2xl p-5 mb-5 space-y-4">'
        + '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">'
        + '<div><label class="block text-sm font-bold text-slate-700 mb-1.5">Equipment Category (Pilih atau Ketik Manual)</label><input id="flt-eq" list="flt-dl-eq" value="' + esc(state.equipment === 'ALL' ? '' : state.equipment) + '" placeholder="Pilih dari daftar atau ketik manual (kosong = Semua)" class="w-full min-h-[50px] px-4 rounded-xl border border-slate-300 text-base font-semibold bg-white" /><datalist id="flt-dl-eq"><option value="ALL">Semua Peralatan</option>' + categories.map(function(c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist></div>'
        + '<div><label class="block text-sm font-bold text-slate-700 mb-1.5">Frequency (Pilih atau Ketik Manual)</label><input id="flt-fr" list="flt-dl-fr" value="' + esc(state.frequency === 'ALL' ? '' : state.frequency) + '" placeholder="Pilih dari daftar atau ketik manual (kosong = Semua)" class="w-full min-h-[50px] px-4 rounded-xl border border-slate-300 text-base font-semibold bg-white" /><datalist id="flt-dl-fr"><option value="ALL">Semua Frekuensi</option>' + allFreqs.map(function(f) { return '<option value="' + esc(f) + '">'; }).join('') + '</datalist></div>'
        + '</div>'
        + '<div class="flex flex-wrap items-center justify-between gap-3 pt-2">'
        + '<div class="text-base font-bold text-slate-800">Selesai: ' + done + ' dari ' + items.length + ' Tugas (' + pct + '%)</div>'
        + '<div class="flex flex-wrap gap-2">'
        + '<button onclick="setAllOk()" class="min-h-[46px] px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm">Set Semua OK</button>'
        + '<button onclick="document.getElementById(\\'add-modal\\').classList.remove(\\'hidden\\')" class="min-h-[46px] px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm">+ Tambah Item Checklist</button>'
        + '</div></div>'
        + '<div class="w-full h-3 bg-slate-200 rounded-full overflow-hidden"><div class="h-full bg-blue-600 transition-all" style="width:' + pct + '%"></div></div>'
        + '</section>'
        + '<section class="space-y-4">' + cardsHtml + '</section>'
        + '<section class="mt-8 bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">'
        + '<div class="flex flex-wrap gap-3">'
        + '<button onclick="downloadExcel()" class="min-h-[48px] px-5 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-sm">Download Excel (.xlsx)</button>'
        + '<button onclick="downloadWord()" class="min-h-[48px] px-5 py-2.5 rounded-xl bg-blue-700 text-white font-bold text-sm">Download Word (.doc)</button>'
        + '<button onclick="printPdf()" class="min-h-[48px] px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm">Cetak / Simpan PDF</button>'
        + '</div>'
        + '<button onclick="resetCurrent()" class="min-h-[48px] px-4 py-2.5 rounded-xl border border-red-300 text-red-700 font-bold text-sm">Reset / Mulai Baru</button>'
        + '</section>'
        + '<div id="add-modal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><form onsubmit="addManualItem(event)" class="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4">'
        + '<h2 class="text-xl font-bold">Tambah Item Checklist (Pilih atau Ketik Manual)</h2>'
        + '<div><label class="block text-sm font-bold mb-1">EQUIPMENT CATEGORY</label><input id="new-eq" list="dl-eq" required value="' + esc(state.equipment === 'ALL' ? 'Chilled Water Pump' : state.equipment) + '" placeholder="Pilih atau ketik peralatan baru..." class="w-full min-h-[44px] px-3 rounded-xl border border-slate-300" /><datalist id="dl-eq">' + categories.map(function(c){ return '<option value="' + esc(c) + '">'; }).join('') + '</datalist></div>'
        + '<div><label class="block text-sm font-bold mb-1">Frequency</label><input id="new-freq" list="dl-freq" required value="' + esc(state.frequency === 'ALL' ? 'Monthly' : state.frequency) + '" placeholder="Pilih atau ketik frekuensi..." class="w-full min-h-[44px] px-3 rounded-xl border border-slate-300" /><datalist id="dl-freq">' + allFreqs.map(function(f){ return '<option value="' + esc(f) + '">'; }).join('') + '</datalist></div>'
        + '<div><label class="block text-sm font-bold mb-1">Category</label><input id="new-cat" list="dl-cat" required placeholder="Pilih atau ketik kategori..." class="w-full min-h-[44px] px-3 rounded-xl border border-slate-300" /><datalist id="dl-cat">' + allTaskCats.map(function(c){ return '<option value="' + esc(c) + '">'; }).join('') + '</datalist></div>'
        + '<div><label class="block text-sm font-bold mb-1">Task Description</label><textarea id="new-desc" required rows="3" placeholder="Ketik deskripsi tugas pengecekan..." class="w-full p-3 rounded-xl border border-slate-300"></textarea></div>'
        + '<div class="flex justify-end gap-2"><button type="button" onclick="document.getElementById(\\'add-modal\\').classList.add(\\'hidden\\')" class="min-h-[44px] px-4 rounded-xl border border-slate-300 font-bold">Batal</button><button type="submit" class="min-h-[44px] px-5 rounded-xl bg-blue-600 text-white font-bold">Simpan Item</button></div>'
        + '</form></div>';

      document.getElementById('meta-tech').oninput = function(e) { state.meta.technicianName = e.target.value; save(); };
      document.getElementById('meta-date').oninput = function(e) { state.meta.inspectionDate = e.target.value; save(); };
      document.getElementById('meta-loc').oninput = function(e) { state.meta.unitLocation = e.target.value; save(); };
      document.getElementById('flt-eq').onchange = function(e) { var v = e.target.value.trim(); state.equipment = v || 'ALL'; save(); render(); };
      document.getElementById('flt-fr').onchange = function(e) { var v = e.target.value.trim(); state.frequency = v || 'ALL'; save(); render(); };
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    render();
  </script>
</body>
</html>`;
}

export function exportStandaloneHtml(allTemplateItems: ChecklistTemplateItem[]): string {
  const html = buildStandaloneHtmlString(allTemplateItems);
  const filename = 'Preventive_Maintenance_Checklist_Standalone.html';
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  triggerFileDownload(blob, filename);
  return filename;
}
