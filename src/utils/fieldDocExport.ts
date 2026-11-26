import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import { DEFAULT_FIELDDOC_ORG, FIELDDOC_PER_PAGE } from '../data/fieldDocAssets.ts';
import type { FieldDocReport, FieldDocSlot } from '../types/fielddoc.ts';
import {
  estimateWrappedLineCount,
  formatIndonesianFullDay,
  sanitizeFieldDocFilename,
  wrapCanvasLines,
} from './fieldDocLogic.ts';
import { coverImageCanvas } from './fieldDocWatermark.ts';

const PDF_FONT =
  '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

function base64DataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || '';
  const binStr = atob(base64);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }
  return bytes;
}

function getBase64Body(dataUrl: string): string {
  return dataUrl.split(',')[1] || '';
}

export function triggerFieldDocDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 6000);
}

/**
 * Splits any unusually long unbroken token (> maxChunk chars) with zero-width / space boundaries
 * so Word tables with FIXED column width never clip or expand horizontally.
 */
function normalizeDocxLines(text: string, maxChunk = 34): string[] {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) =>
      line.replace(new RegExp(`([^\\s]{${maxChunk}})`, 'g'), '$1\u200B')
    );
}

export async function buildFieldDocDocxBlob(
  report: FieldDocReport
): Promise<Blob> {
  const np = Math.max(1, Math.ceil(report.slots.length / FIELDDOC_PER_PAGE));
  const kids: Array<Paragraph | Table> = [];
  const cellBorder = { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' };
  const colWidthDxa = 3468; // 3 * 3468 = 10404 dxa matching 11906 - 750*2 = 10406 dxa
  const headerOrgText =
    (report.org || DEFAULT_FIELDDOC_ORG).trim() || DEFAULT_FIELDDOC_ORG;
  const authorLine =
    (report.author || 'M. Salman. A') + (report.email ? ` (${report.email})` : '');

  const run = (text: string, opts: Record<string, unknown> = {}) =>
    new TextRun({ text, font: 'Calibri', size: 18, color: '0F172A', ...opts });
  const runMuted = (text: string, opts: Record<string, unknown> = {}) =>
    new TextRun({ text, font: 'Calibri', size: 16, color: '475569', ...opts });

  for (let p = 0; p < np; p++) {
    kids.push(
      new Paragraph({
        pageBreakBefore: p > 0,
        spacing: { before: 0, after: 40 },
        children: [runMuted(headerOrgText, { bold: true, size: 16, color: '1E40AF' })],
      }),
      new Paragraph({
        spacing: { after: 60 },
        children: [
          run(report.title || 'Laporan Dokumentasi Pekerjaan', {
            bold: true,
            size: 28,
            color: '0F172A',
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 160 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: '1E40AF' } },
        children: [
          runMuted(
            `Tanggal: ${formatIndonesianFullDay(report.date)}   |   Lokasi: ${report.wmLoc || '-'}   |   Pelapor: ${authorLine}`
          ),
        ],
      })
    );

    const rows: TableRow[] = [];
    const start = p * FIELDDOC_PER_PAGE;
    const end = Math.min(start + FIELDDOC_PER_PAGE, report.slots.length);
    const pageSlots = report.slots.slice(start, end);
    const rowCount = Math.ceil(pageSlots.length / 3);

    for (let r = 0; r < rowCount; r++) {
      const cells: TableCell[] = [];
      for (let c = 0; c < 3; c++) {
        const idx = r * 3 + c;
        const globalIdx = start + idx;
        const s = pageSlots[idx];
        const children: Paragraph[] = [];

        if (s) {
          children.push(
            new Paragraph({
              shading: { fill: 'EFF6FF' },
              spacing: { before: 20, after: 80 },
              children: [
                run(`FOTO DOKUMENTASI #${globalIdx + 1}`, {
                  bold: true,
                  size: 16,
                  color: '1E40AF',
                }),
              ],
            })
          );

          if (s.img) {
            const cv = await coverImageCanvas(s.img, 640, 480);
            children.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 20, after: 100 },
                children: [
                  new ImageRun({
                    type: 'jpg',
                    data: base64DataUrlToUint8Array(cv.toDataURL('image/jpeg', 0.86)),
                    transformation: { width: 174, height: 130 },
                  }),
                ],
              })
            );
          } else {
            children.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 160, after: 160 },
                children: [runMuted('[ Tanpa Foto ]', { italics: true, size: 15 })],
              })
            );
          }

          const descText = (s.desc || 'Tidak ada catatan deskripsi.').trim();
          normalizeDocxLines(descText).forEach((line) => {
            children.push(
              new Paragraph({
                spacing: { before: 20, after: 30, line: 250 },
                children: [run(line, { size: 17, color: '1E293B' })],
              })
            );
          });
        } else {
          children.push(new Paragraph({ children: [run('')] }));
        }

        cells.push(
          new TableCell({
            width: { size: colWidthDxa, type: WidthType.DXA },
            margins: { top: 110, bottom: 110, left: 110, right: 110 },
            shading: { fill: s ? 'FFFFFF' : 'F8FAFC' },
            borders: {
              top: cellBorder,
              bottom: cellBorder,
              left: cellBorder,
              right: cellBorder,
            },
            children,
          })
        );
      }
      rows.push(new TableRow({ cantSplit: true, children: cells }));
    }

    kids.push(
      new Table({
        layout: TableLayoutType.FIXED,
        width: { size: colWidthDxa * 3, type: WidthType.DXA },
        columnWidths: [colWidthDxa, colWidthDxa, colWidthDxa],
        rows,
      })
    );

    await new Promise((r) => setTimeout(r, 10));
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 18 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 750, bottom: 750, left: 750, right: 750, footer: 360 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  runMuted(`${headerOrgText}  |  Halaman `),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: 'Calibri',
                    size: 16,
                    color: '475569',
                  }),
                ],
              }),
            ],
          }),
        },
        children: kids,
      },
    ],
  });

  return Packer.toBlob(doc);
}

/**
 * Generates a print-ready A4 Portrait ExcelJS Workbook (.xlsx) with embedded 4:3 JPEG photos,
 * strict fixed column widths, and dynamically computed row heights so photo descriptions never clip.
 */
export async function buildFieldDocExcelBlob(
  report: FieldDocReport
): Promise<Blob> {
  const headerOrgText =
    (report.org || DEFAULT_FIELDDOC_ORG).trim() || DEFAULT_FIELDDOC_ORG;
  const authorLine =
    (report.author || 'M. Salman. A') + (report.email ? ` (${report.email})` : '');
  const titleText = report.title.trim() || 'Laporan Dokumentasi Pekerjaan';

  const wb = new ExcelJS.Workbook();
  wb.creator = report.author || 'FieldDoc Utility';
  wb.created = new Date();

  const ws = wb.addWorksheet('Dokumentasi Foto', {
    views: [{ showGridLines: true }],
    pageSetup: {
      paperSize: 9, // A4 Portrait
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: {
        left: 0.35,
        right: 0.35,
        top: 0.4,
        bottom: 0.5,
        header: 0.2,
        footer: 0.25,
      },
    },
    headerFooter: {
      oddFooter: `&L${headerOrgText.slice(0, 60)}&RHalaman &P dari &N`,
    },
  });

  // 3 equal wide photo columns sized cleanly for A4 Portrait
  ws.columns = [
    { key: 'col1', width: 34 },
    { key: 'col2', width: 34 },
    { key: 'col3', width: 34 },
  ];

  const cardBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  // --- Row 1: Org Banner ---
  ws.mergeCells('A1:C1');
  ws.getRow(1).height = 22;
  const orgCell = ws.getCell('A1');
  orgCell.value = headerOrgText.toUpperCase();
  orgCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF93C5FD' } };
  orgCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2942' } };
  orgCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };

  // --- Row 2: Job Title Banner ---
  ws.mergeCells('A2:C2');
  ws.getRow(2).height = Math.max(26, estimateWrappedLineCount(titleText, 64) * 16 + 8);
  const titleCell = ws.getCell('A2');
  titleCell.value = titleText;
  titleCell.font = { name: 'Calibri', size: 13.5, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };

  // --- Row 3: Metadata Bar ---
  ws.mergeCells('A3:C3');
  const metaText = `Tanggal: ${formatIndonesianFullDay(report.date)}   |   Lokasi: ${report.wmLoc || '-'}   |   Pelapor: ${authorLine}`;
  ws.getRow(3).height = Math.max(22, estimateWrappedLineCount(metaText, 86) * 14 + 8);
  const metaCell = ws.getCell('A3');
  metaCell.value = metaText;
  metaCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF334155' } };
  metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  metaCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
  for (let c = 1; c <= 3; c++) {
    ws.getCell(3, c).border = cardBorder;
  }

  // Row 4 Spacer
  ws.getRow(4).height = 8;

  let cursorRow = 5;
  const totalRows = Math.ceil(report.slots.length / 3);

  for (let r = 0; r < totalRows; r++) {
    const hdrRowNum = cursorRow;
    const photoRowNum = cursorRow + 1;
    const descRowNum = cursorRow + 2;
    const spacerRowNum = cursorRow + 3;

    const hdrRow = ws.getRow(hdrRowNum);
    const photoRow = ws.getRow(photoRowNum);
    const descRow = ws.getRow(descRowNum);

    hdrRow.height = 20;
    photoRow.height = 148;

    let maxDescLines = 2;

    for (let c = 0; c < 3; c++) {
      const globalIdx = r * 3 + c;
      const slot = report.slots[globalIdx];
      const colNumber = c + 1;

      const hCell = hdrRow.getCell(colNumber);
      const pCell = photoRow.getCell(colNumber);
      const dCell = descRow.getCell(colNumber);

      if (!slot) {
        hCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        pCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        dCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        hCell.border = cardBorder;
        pCell.border = cardBorder;
        dCell.border = cardBorder;
        continue;
      }

      // 1. Header Cell
      hCell.value = `FOTO DOKUMENTASI #${globalIdx + 1}`;
      hCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF1E40AF' } };
      hCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
      hCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      hCell.border = cardBorder;

      // 2. Photo Cell
      pCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      pCell.border = cardBorder;
      if (slot.img && typeof document !== 'undefined') {
        const cv = await coverImageCanvas(slot.img, 640, 480);
        const jpegBase64 = getBase64Body(cv.toDataURL('image/jpeg', 0.86));
        const imgId = wb.addImage({
          base64: jpegBase64,
          extension: 'jpeg',
        });
        ws.addImage(imgId, {
          tl: { col: c + 0.035, row: photoRowNum - 1 + 0.04 },
          ext: { width: 224, height: 168 },
          editAs: 'oneCell',
        });
      } else if (slot.img && slot.img.startsWith('data:image/')) {
        const ext = slot.img.includes('image/png') ? 'png' : 'jpeg';
        const imgId = wb.addImage({
          base64: getBase64Body(slot.img),
          extension: ext,
        });
        ws.addImage(imgId, {
          tl: { col: c + 0.035, row: photoRowNum - 1 + 0.04 },
          ext: { width: 224, height: 168 },
          editAs: 'oneCell',
        });
      } else {
        pCell.value = '[ Tanpa Foto ]';
        pCell.font = { name: 'Calibri', size: 9.5, italic: true, color: { argb: 'FF94A3B8' } };
        pCell.alignment = { vertical: 'middle', horizontal: 'center' };
      }

      // 3. Description Cell (strictly wrapped + dynamic row height)
      const descText = (slot.desc || 'Tidak ada catatan deskripsi.').trim();
      dCell.value = descText;
      dCell.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF1E293B' } };
      dCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      dCell.alignment = {
        vertical: 'top',
        horizontal: 'left',
        wrapText: true,
      };
      dCell.border = cardBorder;

      const lineCount = estimateWrappedLineCount(descText, 30);
      if (lineCount > maxDescLines) {
        maxDescLines = lineCount;
      }
    }

    descRow.height = Math.max(46, maxDescLines * 14.5 + 14);
    ws.getRow(spacerRowNum).height = 8;
    cursorRow += 4;

    await new Promise((res) => setTimeout(res, 5));
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Generates an A4 Portrait PDF where every 3-column photo card's height dynamically expands
 * to strictly contain its wrapped description lines inside the card border, paginating safely
 * before touching the page footer.
 */
export async function buildFieldDocPdfBlob(report: FieldDocReport): Promise<Blob> {
  const K = 2;
  const PW = 794;
  const PH = 1123;
  const M = 42;
  const FOOTER_SAFE_Y = PH - 46;
  const gap = 8;
  const cw = (PW - 2 * M - gap * 2) / 3;
  const iw = cw - 12;
  const ih = iw * 0.75; // ~164.5 px
  const CARD_HDR_H = 19;
  const IMG_TOP_GAP = 5;
  const DESC_LINE_H = 12;
  const DESC_TOP_GAP = 14;
  const CARD_BOTTOM_PAD = 10;

  const headerOrgText =
    (report.org || DEFAULT_FIELDDOC_ORG).trim() || DEFAULT_FIELDDOC_ORG;
  const authorLine =
    (report.author || 'M. Salman. A') + (report.email ? ` (${report.email})` : '');
  const metaString = `Tanggal: ${formatIndonesianFullDay(report.date)}   |   Lokasi: ${report.wmLoc || '-'}   |   Pelapor: ${authorLine}`;

  const renderedPages: HTMLCanvasElement[] = [];

  const createPageCanvas = (): {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    gridStartY: number;
  } => {
    const c = document.createElement('canvas');
    c.width = PW * K;
    c.height = PH * K;
    const x = c.getContext('2d');
    if (!x) throw new Error('Canvas 2D tidak tersedia.');
    x.scale(K, K);

    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, PW, PH);

    // Top accent bar
    x.fillStyle = '#1e40af';
    x.fillRect(M, M - 8, PW - 2 * M, 4);

    // Org Header (up to 2 lines)
    x.fillStyle = '#1e40af';
    x.font = `bold 9.5px ${PDF_FONT}`;
    const orgLines = wrapCanvasLines(
      (txt) => x.measureText(txt).width,
      headerOrgText,
      PW - 2 * M
    ).slice(0, 2);
    orgLines.forEach((l, i) => x.fillText(l, M, M + 10 + i * 12));

    // Title (up to 2 lines)
    const yTitleStart = M + 16 + orgLines.length * 12;
    x.fillStyle = '#0f172a';
    x.font = `bold 15.5px ${PDF_FONT}`;
    const titleLines = wrapCanvasLines(
      (txt) => x.measureText(txt).width,
      report.title || 'Laporan Dokumentasi Pekerjaan',
      PW - 2 * M
    ).slice(0, 2);
    titleLines.forEach((l, i) => x.fillText(l, M, yTitleStart + i * 19));

    // Dynamic-height Metadata Box (wraps cleanly inside PW - 2*M)
    const yMetaBoxTop = yTitleStart + titleLines.length * 19 - 4;
    x.font = `bold 8.6px ${PDF_FONT}`;
    const metaLines = wrapCanvasLines(
      (txt) => x.measureText(txt).width,
      metaString,
      PW - 2 * M - 16
    );
    const metaBoxH = Math.max(22, metaLines.length * 12.5 + 9);

    x.fillStyle = '#f1f5f9';
    x.fillRect(M, yMetaBoxTop, PW - 2 * M, metaBoxH);
    x.strokeStyle = '#cbd5e1';
    x.lineWidth = 0.8;
    x.strokeRect(M, yMetaBoxTop, PW - 2 * M, metaBoxH);

    x.fillStyle = '#334155';
    metaLines.forEach((l, i) => x.fillText(l, M + 8, yMetaBoxTop + 14 + i * 12.5));

    return {
      canvas: c,
      ctx: x,
      gridStartY: yMetaBoxTop + metaBoxH + 12,
    };
  };

  let pageObj = createPageCanvas();
  let curY = pageObj.gridStartY;

  // Group slots into rows of 3
  const slotRows: Array<Array<{ slot: FieldDocSlot; globalIdx: number }>> = [];
  for (let i = 0; i < report.slots.length; i += 3) {
    slotRows.push(
      report.slots.slice(i, i + 3).map((slot, offset) => ({
        slot,
        globalIdx: i + offset,
      }))
    );
  }

  for (const row of slotRows) {
    // Pre-wrap description lines for every card in this 3-column row
    pageObj.ctx.font = `9px ${PDF_FONT}`;
    const rowWrapped = row.map(({ slot }) =>
      wrapCanvasLines(
        (txt) => pageObj.ctx.measureText(txt).width,
        (slot.desc || 'Tidak ada catatan deskripsi.').trim(),
        iw - 6
      )
    );

    const maxAvailableBodyH = FOOTER_SAFE_Y - pageObj.gridStartY;
    const maxLinesFitOnBlankPage = Math.max(
      2,
      Math.floor(
        (maxAvailableBodyH - (CARD_HDR_H + IMG_TOP_GAP + ih + DESC_TOP_GAP + CARD_BOTTOM_PAD)) /
          DESC_LINE_H
      ) + 1
    );

    const rawMaxLines = Math.max(2, ...rowWrapped.map((lines) => lines.length));
    const cappedMaxLines = Math.min(rawMaxLines, maxLinesFitOnBlankPage);
    const rowHeight =
      CARD_HDR_H +
      IMG_TOP_GAP +
      ih +
      DESC_TOP_GAP +
      (cappedMaxLines - 1) * DESC_LINE_H +
      CARD_BOTTOM_PAD;

    // Move to a fresh page if this row wouldn't fit safely above the footer
    if (curY + rowHeight > FOOTER_SAFE_Y && curY > pageObj.gridStartY) {
      renderedPages.push(pageObj.canvas);
      pageObj = createPageCanvas();
      curY = pageObj.gridStartY;
    }

    const x = pageObj.ctx;
    for (let k = 0; k < row.length; k++) {
      const { slot, globalIdx } = row[k];
      const x0 = M + k * (cw + gap);
      const y0 = curY;

      // Card Shell & Header
      x.fillStyle = '#ffffff';
      x.fillRect(x0, y0, cw, rowHeight);
      x.fillStyle = '#eff6ff';
      x.fillRect(x0, y0, cw, CARD_HDR_H);
      x.strokeStyle = '#cbd5e1';
      x.lineWidth = 1;
      x.strokeRect(x0, y0, cw, rowHeight);

      x.fillStyle = '#1e40af';
      x.font = `bold 8.5px ${PDF_FONT}`;
      x.fillText(`FOTO DOKUMENTASI #${globalIdx + 1}`, x0 + 6, y0 + 13);

      // 4:3 Image Box
      const imgY = y0 + CARD_HDR_H + IMG_TOP_GAP;
      if (slot.img) {
        const cv = await coverImageCanvas(
          slot.img,
          Math.round(iw * K),
          Math.round(ih * K)
        );
        x.drawImage(cv, x0 + 6, imgY, iw, ih);
        x.strokeStyle = '#e2e8f0';
        x.strokeRect(x0 + 6, imgY, iw, ih);
      } else {
        x.fillStyle = '#f8fafc';
        x.fillRect(x0 + 6, imgY, iw, ih);
        x.strokeStyle = '#e2e8f0';
        x.strokeRect(x0 + 6, imgY, iw, ih);
        x.fillStyle = '#94a3b8';
        x.font = `italic 9px ${PDF_FONT}`;
        x.textAlign = 'center';
        x.fillText('[ Tanpa Foto ]', x0 + cw / 2, imgY + ih / 2 + 3);
        x.textAlign = 'left';
      }

      // Wrapped Description strictly clipped inside card inner bounds
      x.save();
      x.beginPath();
      x.rect(x0 + 4, imgY + ih + 2, cw - 8, rowHeight - (CARD_HDR_H + IMG_TOP_GAP + ih + 6));
      x.clip();

      x.fillStyle = '#1e293b';
      x.font = `9px ${PDF_FONT}`;
      const descY = imgY + ih + DESC_TOP_GAP;
      const linesToDraw = rowWrapped[k].slice(0, cappedMaxLines);
      if (rowWrapped[k].length > cappedMaxLines && linesToDraw.length > 0) {
        const lastIdx = linesToDraw.length - 1;
        linesToDraw[lastIdx] = `${linesToDraw[lastIdx].slice(0, -3)}...`;
      }
      linesToDraw.forEach((l, i) => x.fillText(l, x0 + 7, descY + i * DESC_LINE_H));
      x.restore();
    }

    curY += rowHeight + 10;
    await new Promise((r) => setTimeout(r, 5));
  }

  renderedPages.push(pageObj.canvas);

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const totalPages = renderedPages.length;

  renderedPages.forEach((canvas, idx) => {
    const x = canvas.getContext('2d');
    if (x) {
      x.strokeStyle = '#cbd5e1';
      x.lineWidth = 0.8;
      x.beginPath();
      x.moveTo(M, PH - 34);
      x.lineTo(PW - M, PH - 34);
      x.stroke();

      x.fillStyle = '#64748b';
      x.font = `9px ${PDF_FONT}`;
      x.textAlign = 'left';
      x.fillText(headerOrgText.slice(0, 72), M, PH - 20);
      x.textAlign = 'right';
      x.fillText(`Halaman ${idx + 1} dari ${totalPages}`, PW - M, PH - 20);
      x.textAlign = 'left';
    }

    if (idx > 0) pdf.addPage();
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.88), 'JPEG', 0, 0, 210, 297);
  });

  return pdf.output('blob');
}

export async function exportFieldDocFile(
  report: FieldDocReport,
  kind: 'docx' | 'pdf' | 'xlsx'
): Promise<string> {
  const filename = sanitizeFieldDocFilename(report.title, report.date, kind);
  const blob =
    kind === 'docx'
      ? await buildFieldDocDocxBlob(report)
      : kind === 'xlsx'
        ? await buildFieldDocExcelBlob(report)
        : await buildFieldDocPdfBlob(report);
  triggerFieldDocDownload(blob, filename);
  return filename;
}
