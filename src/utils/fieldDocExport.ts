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
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { jsPDF } from 'jspdf';
import { DEFAULT_FIELDDOC_ORG, FIELDDOC_PER_PAGE } from '../data/fieldDocAssets.ts';
import type { FieldDocReport } from '../types/fielddoc.ts';
import {
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

export async function buildFieldDocDocxBlob(
  report: FieldDocReport
): Promise<Blob> {
  const np = Math.max(1, Math.ceil(report.slots.length / FIELDDOC_PER_PAGE));
  const kids: Array<Paragraph | Table> = [];
  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };
  const colWidthDxa = 3360;
  const headerOrgText = (report.org || DEFAULT_FIELDDOC_ORG).trim() || DEFAULT_FIELDDOC_ORG;
  const authorLine =
    (report.author || 'M. Salman. A') + (report.email ? ` (${report.email})` : '');

  const run = (text: string, opts: Record<string, unknown> = {}) =>
    new TextRun({ text, font: 'Calibri', size: 18, color: '0F172A', ...opts });
  const runMuted = (text: string, opts: Record<string, unknown> = {}) =>
    new TextRun({ text, font: 'Calibri', size: 16, color: '475569', ...opts });

  for (let p = 0; p < np; p++) {
    kids.push(
      new Paragraph({
        spacing: { before: p > 0 ? 200 : 0, after: 40 },
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
        spacing: { after: 140 },
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
              spacing: { before: 20, after: 60 },
              children: [
                run(`FOTO DOKUMENTASI #${globalIdx + 1}`, {
                  bold: true,
                  size: 15,
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
                spacing: { before: 20, after: 80 },
                children: [
                  new ImageRun({
                    type: 'jpg',
                    data: base64DataUrlToUint8Array(cv.toDataURL('image/jpeg', 0.85)),
                    transformation: { width: 172, height: 129 },
                  }),
                ],
              })
            );
          } else {
            children.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 140, after: 140 },
                children: [runMuted('[ Tanpa Foto ]', { italics: true, size: 15 })],
              })
            );
          }

          const descText = (s.desc || 'Tidak ada catatan deskripsi.').trim();
          descText.split('\n').forEach((line) => {
            children.push(
              new Paragraph({
                spacing: { before: 20, after: 20, line: 240 },
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
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
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

export async function buildFieldDocPdfBlob(report: FieldDocReport): Promise<Blob> {
  const K = 2;
  const PW = 794;
  const PH = 1123;
  const M = 42;
  const np = Math.max(1, Math.ceil(report.slots.length / FIELDDOC_PER_PAGE));
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const headerOrgText = (report.org || DEFAULT_FIELDDOC_ORG).trim() || DEFAULT_FIELDDOC_ORG;
  const authorLine =
    (report.author || 'M. Salman. A') + (report.email ? ` (${report.email})` : '');

  for (let p = 0; p < np; p++) {
    const c = document.createElement('canvas');
    c.width = PW * K;
    c.height = PH * K;
    const x = c.getContext('2d');
    if (!x) throw new Error('Canvas 2D tidak tersedia.');
    x.scale(K, K);

    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, PW, PH);

    x.fillStyle = '#1e40af';
    x.fillRect(M, M - 8, PW - 2 * M, 4);

    x.fillStyle = '#1e40af';
    x.font = `bold 9.5px ${PDF_FONT}`;
    const orgLines = wrapCanvasLines(
      (txt) => x.measureText(txt).width,
      headerOrgText,
      PW - 2 * M
    ).slice(0, 1);
    x.fillText(orgLines[0] || headerOrgText, M, M + 10);

    x.fillStyle = '#0f172a';
    x.font = `bold 16px ${PDF_FONT}`;
    const tl = wrapCanvasLines(
      (txt) => x.measureText(txt).width,
      report.title || 'Laporan Dokumentasi Pekerjaan',
      PW - 2 * M
    ).slice(0, 2);
    tl.forEach((l, i) => x.fillText(l, M, M + 30 + i * 20));

    const yMeta = M + 28 + tl.length * 20;
    x.fillStyle = '#f1f5f9';
    x.fillRect(M, yMeta - 11, PW - 2 * M, 20);
    x.strokeStyle = '#cbd5e1';
    x.lineWidth = 0.8;
    x.strokeRect(M, yMeta - 11, PW - 2 * M, 20);

    x.fillStyle = '#334155';
    x.font = `bold 8.8px ${PDF_FONT}`;
    x.fillText(
      `Tanggal: ${formatIndonesianFullDay(report.date)}   |   Lokasi: ${report.wmLoc || '-'}   |   Pelapor: ${authorLine}`,
      M + 8,
      yMeta + 2
    );

    const gt = yMeta + 20;
    const gap = 8;
    const cw = (PW - 2 * M - gap * 2) / 3;
    const rh = 205;

    const start = p * FIELDDOC_PER_PAGE;
    const end = Math.min(start + FIELDDOC_PER_PAGE, report.slots.length);
    const pageSlots = report.slots.slice(start, end);
    const rowCount = Math.ceil(pageSlots.length / 3);

    for (let r = 0; r < rowCount; r++) {
      for (let k = 0; k < 3; k++) {
        const idx = r * 3 + k;
        const globalIdx = start + idx;
        const s = pageSlots[idx];
        if (!s) continue;

        const x0 = M + k * (cw + gap);
        const y0 = gt + r * (rh + 10);
        const iw = cw - 12;
        const ih = iw * 0.75;

        x.fillStyle = '#ffffff';
        x.fillRect(x0, y0, cw, rh);
        x.fillStyle = '#eff6ff';
        x.fillRect(x0, y0, cw, 18);
        x.strokeStyle = '#cbd5e1';
        x.lineWidth = 1;
        x.strokeRect(x0, y0, cw, rh);

        x.fillStyle = '#1e40af';
        x.font = `bold 8.5px ${PDF_FONT}`;
        x.fillText(`FOTO DOKUMENTASI #${globalIdx + 1}`, x0 + 6, y0 + 12);

        if (s.img) {
          const cv = await coverImageCanvas(s.img, Math.round(iw * K), Math.round(ih * K));
          x.drawImage(cv, x0 + 6, y0 + 23, iw, ih);
          x.strokeStyle = '#e2e8f0';
          x.strokeRect(x0 + 6, y0 + 23, iw, ih);
        } else {
          x.fillStyle = '#f8fafc';
          x.fillRect(x0 + 6, y0 + 23, iw, ih);
          x.strokeStyle = '#e2e8f0';
          x.strokeRect(x0 + 6, y0 + 23, iw, ih);
          x.fillStyle = '#94a3b8';
          x.font = `italic 9px ${PDF_FONT}`;
          x.textAlign = 'center';
          x.fillText('[ Tanpa Foto ]', x0 + cw / 2, y0 + 23 + ih / 2 + 3);
          x.textAlign = 'left';
        }

        x.fillStyle = '#1e293b';
        x.font = `9px ${PDF_FONT}`;
        const descY = y0 + 23 + ih + 13;
        const lines = wrapCanvasLines(
          (txt) => x.measureText(txt).width,
          s.desc || 'Tidak ada catatan deskripsi.',
          iw - 4
        ).slice(0, 4);
        lines.forEach((l, i) => x.fillText(l, x0 + 6, descY + i * 11.5));
      }
    }

    x.strokeStyle = '#cbd5e1';
    x.lineWidth = 0.8;
    x.beginPath();
    x.moveTo(M, PH - 34);
    x.lineTo(PW - M, PH - 34);
    x.stroke();

    x.fillStyle = '#64748b';
    x.font = `9px ${PDF_FONT}`;
    x.fillText(headerOrgText.slice(0, 75), M, PH - 20);
    x.textAlign = 'right';
    x.fillText(`Halaman ${p + 1} dari ${np}`, PW - M, PH - 20);
    x.textAlign = 'left';

    if (p > 0) pdf.addPage();
    pdf.addImage(c.toDataURL('image/jpeg', 0.88), 'JPEG', 0, 0, 210, 297);
    await new Promise((r) => setTimeout(r, 10));
  }

  return pdf.output('blob');
}

export async function exportFieldDocFile(
  report: FieldDocReport,
  kind: 'docx' | 'pdf'
): Promise<string> {
  const filename = sanitizeFieldDocFilename(report.title, report.date, kind);
  const blob =
    kind === 'docx'
      ? await buildFieldDocDocxBlob(report)
      : await buildFieldDocPdfBlob(report);
  triggerFieldDocDownload(blob, filename);
  return filename;
}
