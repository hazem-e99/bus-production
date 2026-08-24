import type { SubscriptionReportViewModel } from '@/types/subscription';

/**
 * Builds and downloads a styled two-sheet .xlsx of the subscription report.
 *
 * exceljs is imported dynamically inside the function so it lands in its own lazy
 * chunk and never weighs down the page's initial bundle.
 *
 * All user-facing strings arrive pre-translated via `labels` — the app's t() has
 * no interpolation, so translation stays in the calling component.
 */

/** Fixed per-channel accent colors, kept in sync with the charts on the page. */
const CHANNEL_FILL: Record<string, string> = {
  instapay: 'FFDBEAFE',
  vodafone: 'FFFEE2E2',
  cash: 'FFDCFCE7',
  visa: 'FFEDE9FE',
  unknown: 'FFF3F4F6',
};

const STATUS_FILL: Record<string, string> = {
  Accepted: 'FFDCFCE7',
  Pending: 'FFFEF3C7',
  Rejected: 'FFFEE2E2',
  Refunded: 'FFE0E7FF',
};

const BRAND = 'FF1E3A8A';
const MONEY_FMT = '#,##0.00';

export interface ExportLabels {
  reportTitle: string;
  generatedAt: string;
  summarySheet: string;
  detailsSheet: string;
  fileNamePrefix: string;
  // KPI labels
  subscribedStudents: string;
  totalStudents: string;
  accepted: string;
  pending: string;
  rejected: string;
  refunded: string;
  gross: string;
  refunds: string;
  net: string;
  // channel table
  channel: string;
  students: string;
  payments: string;
  netAmount: string;
  total: string;
  channelNames: Record<string, string>;
  // details columns
  index: string;
  student: string;
  email: string;
  academicNumber: string;
  department: string;
  plan: string;
  amount: string;
  method: string;
  status: string;
  reference: string;
  createdAt: string;
  reviewedAt: string;
  refundAmount: string;
}

export async function exportSubscriptionReport(opts: {
  report: SubscriptionReportViewModel;
  lang: string;
  labels: ExportLabels;
}): Promise<void> {
  const { report, lang, labels } = opts;
  const ExcelJS = (await import('exceljs')).default;

  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  const isRtl = lang === 'ar';

  // ---------------------------------------------------------------- Summary
  const summary = workbook.addWorksheet(labels.summarySheet, {
    views: [{ rightToLeft: isRtl }],
  });
  summary.columns = [
    { width: 32 }, { width: 16 }, { width: 14 }, { width: 16 }, { width: 16 }, { width: 16 },
  ];

  summary.mergeCells('A1:F1');
  const titleCell = summary.getCell('A1');
  titleCell.value = labels.reportTitle;
  titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summary.getRow(1).height = 28;

  summary.mergeCells('A2:F2');
  const genCell = summary.getCell('A2');
  genCell.value = `${labels.generatedAt}: ${new Date(report.generatedAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB')}`;
  genCell.font = { italic: true, size: 10, color: { argb: 'FF6B7280' } };
  genCell.alignment = { horizontal: 'center' };

  const t = report.totals;
  const kpis: Array<[string, number, boolean]> = [
    [labels.subscribedStudents, t.subscribedStudents, false],
    [labels.totalStudents, t.totalStudents, false],
    [labels.accepted, t.acceptedCount, false],
    [labels.pending, t.pendingCount, false],
    [labels.rejected, t.rejectedCount, false],
    [labels.refunded, t.refundedCount, false],
    [labels.gross, t.grossAmount, true],
    [labels.refunds, t.refundedAmount, true],
    [labels.net, t.netAmount, true],
  ];

  let row = 4;
  kpis.forEach(([label, value, isMoney], idx) => {
    const isLast = idx === kpis.length - 1;
    const labelCell = summary.getCell(`A${row}`);
    const valueCell = summary.getCell(`B${row}`);
    labelCell.value = label;
    labelCell.font = { bold: true };
    valueCell.value = value;
    if (isMoney) valueCell.numFmt = MONEY_FMT;
    if (isLast) {
      labelCell.font = { bold: true, size: 12 };
      valueCell.font = { bold: true, size: 12 };
      labelCell.border = { top: { style: 'double' } };
      valueCell.border = { top: { style: 'double' } };
    }
    row += 1;
  });

  row += 1;
  const channelHeaderRow = row;
  const channelHeaders = [
    labels.channel, labels.students, labels.payments, labels.gross, labels.refunds, labels.netAmount,
  ];
  channelHeaders.forEach((header, i) => {
    const cell = summary.getCell(channelHeaderRow, i + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
    cell.alignment = { horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' },
    };
  });

  row += 1;
  report.byChannel.forEach((c) => {
    const values = [
      labels.channelNames[c.channel] || c.channel,
      c.studentCount, c.acceptedCount, c.grossAmount, c.refundedAmount, c.netAmount,
    ];
    values.forEach((v, i) => {
      const cell = summary.getCell(row, i + 1);
      cell.value = v as string | number;
      if (i >= 3) cell.numFmt = MONEY_FMT;
      if (i === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CHANNEL_FILL[c.channel] || CHANNEL_FILL.unknown } };
        cell.font = { bold: true };
      }
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });
    row += 1;
  });

  const totalsValues = [
    labels.total,
    report.byChannel.reduce((s, c) => s + c.studentCount, 0),
    report.byChannel.reduce((s, c) => s + c.acceptedCount, 0),
    t.grossAmount, t.refundedAmount, t.netAmount,
  ];
  totalsValues.forEach((v, i) => {
    const cell = summary.getCell(row, i + 1);
    cell.value = v as string | number;
    if (i >= 3) cell.numFmt = MONEY_FMT;
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    cell.border = { top: { style: 'double' }, bottom: { style: 'thin' } };
  });

  // ---------------------------------------------------------------- Details
  const details = workbook.addWorksheet(labels.detailsSheet, {
    views: [{ state: 'frozen', ySplit: 1, rightToLeft: isRtl }],
  });

  details.columns = [
    { header: labels.index, key: 'i', width: 6 },
    { header: labels.student, key: 'student', width: 26 },
    { header: labels.email, key: 'email', width: 28 },
    { header: labels.academicNumber, key: 'academic', width: 16 },
    { header: labels.department, key: 'department', width: 22 },
    { header: labels.plan, key: 'plan', width: 18 },
    { header: labels.amount, key: 'amount', width: 14 },
    { header: labels.method, key: 'method', width: 12 },
    { header: labels.channel, key: 'channel', width: 16 },
    { header: labels.status, key: 'status', width: 14 },
    { header: labels.reference, key: 'reference', width: 20 },
    { header: labels.refundAmount, key: 'refund', width: 14 },
    { header: labels.createdAt, key: 'created', width: 14 },
    { header: labels.reviewedAt, key: 'reviewed', width: 14 },
  ];

  const headerRow = details.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 22;

  report.details.forEach((d, idx) => {
    const added = details.addRow({
      i: idx + 1,
      student: d.studentName || '—',
      email: d.studentEmail || '—',
      academic: d.studentAcademicNumber || '—',
      department: d.department || '—',
      plan: d.planName || '—',
      amount: d.amount ?? 0,
      method: d.paymentMethod || '—',
      channel: labels.channelNames[d.paymentChannel || 'unknown'] || d.paymentChannel || '—',
      status: d.status,
      reference: d.paymentReferenceCode || '—',
      refund: d.refundAmount ?? null,
      // Real Date objects so Excel sorts/filters them as dates, not strings.
      created: d.createdAt ? new Date(d.createdAt) : null,
      reviewed: d.reviewedAt ? new Date(d.reviewedAt) : null,
    });

    added.getCell('amount').numFmt = MONEY_FMT;
    added.getCell('refund').numFmt = MONEY_FMT;
    added.getCell('created').numFmt = 'yyyy-mm-dd';
    added.getCell('reviewed').numFmt = 'yyyy-mm-dd';

    const statusFill = STATUS_FILL[d.status];
    if (statusFill) {
      added.getCell('status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusFill } };
      added.getCell('status').font = { bold: true };
    }
    if (idx % 2 === 1) {
      added.eachCell((cell) => {
        if (!cell.fill || (cell.fill as { pattern?: string }).pattern !== 'solid') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } };
        }
      });
    }
  });

  details.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: details.columns.length } };

  // ---------------------------------------------------------------- Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${labels.fileNamePrefix}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
