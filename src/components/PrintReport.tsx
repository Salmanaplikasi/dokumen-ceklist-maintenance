import { ChecklistItemWithResponse, ChecklistProgress, InspectionMeta } from '../types/checklist';
import {
  buildDocumentNumber,
  formatDisplayDate,
  getFrequencyPrintColors,
} from '../utils/exporters';

interface PrintReportProps {
  items: ChecklistItemWithResponse[];
  meta: InspectionMeta;
  equipmentLabel: string;
  frequencyLabel: string;
  progress: ChecklistProgress;
  previewOnScreen?: boolean;
}

export function PrintReport({
  items,
  meta,
  equipmentLabel,
  frequencyLabel,
  progress,
  previewOnScreen = false,
}: PrintReportProps) {
  const equipText = equipmentLabel === 'ALL' ? 'Semua Peralatan' : equipmentLabel;
  const freqText = frequencyLabel === 'ALL' ? 'Semua Frekuensi' : frequencyLabel;
  const docNo = buildDocumentNumber(meta.inspectionDate);
  const displayDate = formatDisplayDate(meta.inspectionDate);
  const findings = items.filter((i) => i.status === 'MINOR' || i.status === 'CRITICAL');

  return (
    <div
      className={
        previewOnScreen
          ? 'bg-white text-slate-950 p-6 sm:p-8 shadow-md border border-slate-300 rounded-sm min-w-[980px] text-[11px]'
          : 'print-only bg-white text-slate-950'
      }
    >
      {/* Official Corporate Kop Header */}
      <table className="w-full border-collapse border-2 border-slate-900 mb-3">
        <tbody>
          <tr>
            <td className="bg-slate-900 text-white px-4 py-3 w-[72%] align-middle">
              <h1 className="text-lg font-extrabold tracking-wide uppercase leading-tight">
                CHECKLIST MAINTENANCE REPORT
              </h1>
              <p className="text-[10px] text-slate-300 mt-0.5">
                Preventive Maintenance Inspection Record &mdash; Fasilitas &amp; Gedung
              </p>
            </td>
            <td className="bg-slate-800 text-slate-200 px-3.5 py-2.5 w-[28%] text-right text-[10px] leading-relaxed align-middle">
              <div>
                <span className="font-bold text-white">No. Dok:</span>{' '}
                <span className="font-mono-num">{docNo}</span>
              </div>
              <div>
                <span className="font-bold text-white">Format:</span> A4 Landscape (Siap Cetak)
              </div>
              <div>
                <span className="font-bold text-white">Progres:</span>{' '}
                <span className="font-mono-num">
                  {progress.completed}/{progress.total} ({progress.percentage}%)
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Inspection Metadata Table */}
      <table className="print-table mb-2.5">
        <tbody>
          <tr>
            <td className="font-bold bg-slate-100 text-slate-700 w-[17%]">
              Nama Teknisi / Petugas
            </td>
            <td className="w-[33%] font-bold text-slate-950">
              {meta.technicianName || '-'}
            </td>
            <td className="font-bold bg-slate-100 text-slate-700 w-[17%]">
              Tanggal Inspeksi
            </td>
            <td className="w-[33%] font-bold text-slate-950">{displayDate}</td>
          </tr>
          <tr>
            <td className="font-bold bg-slate-100 text-slate-700">Lokasi / Kode Unit</td>
            <td className="font-bold text-slate-950">{meta.unitLocation || '-'}</td>
            <td className="font-bold bg-slate-100 text-slate-700">
              Equipment &amp; Frequency
            </td>
            <td className="font-bold text-slate-950">
              {equipText} ({freqText})
            </td>
          </tr>
        </tbody>
      </table>

      {/* Color-Coded KPI Summary Strip */}
      <table className="print-table mb-2">
        <tbody>
          <tr className="text-center font-bold text-[10px]">
            <td className="bg-slate-50 text-slate-900 w-[22%]">
              Selesai:{' '}
              <span className="font-mono-num">
                {progress.completed}/{progress.total} ({progress.percentage}%)
              </span>
            </td>
            <td className="bg-emerald-100 text-emerald-900 w-[15%]">
              OK: <span className="font-mono-num">{progress.okCount}</span>
            </td>
            <td className="bg-blue-100 text-blue-900 w-[17%]">
              OBSERVATION:{' '}
              <span className="font-mono-num">{progress.observationCount}</span>
            </td>
            <td className="bg-amber-100 text-amber-900 w-[15%]">
              MINOR: <span className="font-mono-num">{progress.minorCount}</span>
            </td>
            <td className="bg-red-100 text-red-900 w-[16%]">
              CRITICAL: <span className="font-mono-num">{progress.criticalCount}</span>
            </td>
            <td className="bg-slate-100 text-slate-700 w-[15%]">
              N/A: <span className="font-mono-num">{progress.naCount}</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Compact Legend Bar */}
      <div className="border border-slate-300 bg-slate-50 text-slate-600 text-[9.5px] text-center py-1 px-2 mb-2.5">
        <strong className="text-slate-800">Keterangan Status:</strong> &nbsp;
        ✓ <strong>OK</strong> = Normal &nbsp;|&nbsp;
        ✓ <strong>OBS</strong> = Perlu Pantauan &nbsp;|&nbsp;
        ✓ <strong>MIN</strong> = Minor (Perlu Perbaikan) &nbsp;|&nbsp;
        ✓ <strong>CRIT</strong> = Kritis (Segera Ditangani) &nbsp;|&nbsp;
        ✓ <strong>N/A</strong> = Tidak Berlaku
      </div>

      {/* Official Maintenance Table with Repeating Header */}
      <table className="print-table table-fixed">
        <colgroup>
          <col style={{ width: '3.5%' }} />
          <col style={{ width: '15.5%' }} />
          <col style={{ width: '8.5%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '27.5%' }} />
          <col style={{ width: '3.2%' }} />
          <col style={{ width: '3.6%' }} />
          <col style={{ width: '3.2%' }} />
          <col style={{ width: '3.4%' }} />
          <col style={{ width: '3.1%' }} />
          <col style={{ width: '16.5%' }} />
        </colgroup>
        <thead>
          <tr className="bg-slate-900 text-white">
            <th colSpan={5} className="text-center font-extrabold uppercase tracking-wide">
              CHECKLIST MAINTENANCE
            </th>
            <th colSpan={5} className="text-center font-extrabold uppercase tracking-wide">
              STATUS
            </th>
            <th rowSpan={2} className="text-center font-extrabold uppercase">
              REMARKS / CATATAN
            </th>
          </tr>
          <tr className="bg-slate-200 text-slate-900">
            <th className="text-center">No</th>
            <th className="text-left">EQUIPMENT CATEGORY</th>
            <th className="text-center">Frequency</th>
            <th className="text-left">Category</th>
            <th className="text-left">Task Description</th>
            <th className="text-center bg-emerald-100 text-emerald-900">OK</th>
            <th className="text-center bg-blue-100 text-blue-900">OBS</th>
            <th className="text-center bg-amber-100 text-amber-900">MIN</th>
            <th className="text-center bg-red-100 text-red-900">CRIT</th>
            <th className="text-center bg-slate-200 text-slate-800">N/A</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const freqColors = getFrequencyPrintColors(item.frequency);
            const zebraBg = idx % 2 === 1 ? 'bg-slate-50' : 'bg-white';
            const isCritical = item.status === 'CRITICAL';
            const isMinor = item.status === 'MINOR';

            return (
              <tr key={item.id} className={zebraBg}>
                <td className="text-center font-mono-num">{idx + 1}</td>
                <td className="break-words">{item.equipmentCategory}</td>
                <td
                  className="text-center font-bold break-words"
                  style={{
                    backgroundColor: freqColors.bg,
                    color: freqColors.text,
                  }}
                >
                  {item.frequency}
                </td>
                <td className="break-words">{item.category}</td>
                <td className="break-words">{item.taskDescription}</td>
                <td
                  className={`text-center font-extrabold text-[11pt] ${
                    item.status === 'OK' ? 'bg-emerald-100 text-emerald-800' : ''
                  }`}
                >
                  {item.status === 'OK' ? '✓' : ''}
                </td>
                <td
                  className={`text-center font-extrabold text-[11pt] ${
                    item.status === 'OBSERVATION' ? 'bg-blue-100 text-blue-800' : ''
                  }`}
                >
                  {item.status === 'OBSERVATION' ? '✓' : ''}
                </td>
                <td
                  className={`text-center font-extrabold text-[11pt] ${
                    item.status === 'MINOR' ? 'bg-amber-100 text-amber-800' : ''
                  }`}
                >
                  {item.status === 'MINOR' ? '✓' : ''}
                </td>
                <td
                  className={`text-center font-extrabold text-[11pt] ${
                    item.status === 'CRITICAL' ? 'bg-red-100 text-red-800' : ''
                  }`}
                >
                  {item.status === 'CRITICAL' ? '✓' : ''}
                </td>
                <td
                  className={`text-center font-extrabold text-[11pt] ${
                    item.status === 'N/A' ? 'bg-slate-200 text-slate-700' : ''
                  }`}
                >
                  {item.status === 'N/A' ? '✓' : ''}
                </td>
                <td
                  className={`break-words ${
                    isCritical
                      ? 'bg-red-50 text-red-900 font-semibold'
                      : isMinor
                        ? 'bg-amber-50 text-amber-900 font-semibold'
                        : ''
                  }`}
                >
                  {item.remarks || ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Findings Follow-Up Summary (Auto-shown if MINOR or CRITICAL exist) */}
      {findings.length > 0 && (
        <table className="print-table mt-3 print-signatures">
          <thead>
            <tr>
              <th
                colSpan={3}
                className="bg-red-100 text-red-900 text-left font-extrabold uppercase text-[10px] tracking-wide"
              >
                Ringkasan Temuan yang Memerlukan Tindak Lanjut ({findings.length} Item)
              </th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f, idx) => (
              <tr key={`finding-${f.id}`}>
                <td
                  className={`w-[24%] font-bold ${
                    f.status === 'CRITICAL'
                      ? 'bg-red-50 text-red-900'
                      : 'bg-amber-50 text-amber-900'
                  }`}
                >
                  {idx + 1}. [{f.status}] {f.equipmentCategory}
                </td>
                <td className="w-[40%]">{f.taskDescription}</td>
                <td className="w-[36%]">
                  {f.remarks || <span className="italic text-slate-500">(Catatan belum diisi)</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Official Bordered Signature Approval Block */}
      <table className="print-table print-signatures mt-4">
        <thead>
          <tr className="bg-slate-100 text-slate-900">
            <th className="w-1/2 text-center font-extrabold uppercase text-[10px] py-1.5">
              Dibuat oleh (Teknisi)
            </th>
            <th className="w-1/2 text-center font-extrabold uppercase text-[10px] py-1.5">
              Diperiksa oleh (Supervisor)
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="text-center align-bottom py-2.5 px-4">
              <div className="h-14" />
              <div className="border-t border-slate-700 pt-1 font-bold text-slate-950 w-3/4 mx-auto">
                {meta.technicianName || '........................................'}
              </div>
              <div className="text-[9.5px] text-slate-600 mt-0.5">
                Teknisi Lapangan &nbsp;|&nbsp; Tanggal: {displayDate}
              </div>
            </td>
            <td className="text-center align-bottom py-2.5 px-4">
              <div className="h-14" />
              <div className="border-t border-slate-700 pt-1 font-bold text-slate-950 w-3/4 mx-auto">
                {meta.supervisorName || '........................................'}
              </div>
              <div className="text-[9.5px] text-slate-600 mt-0.5">
                Supervisor Maintenance &nbsp;|&nbsp; Tanggal: ..............................
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
