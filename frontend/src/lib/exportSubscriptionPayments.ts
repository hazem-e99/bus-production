/**
 * Builds and downloads a styled single-sheet .xlsx of the "Subscription
 * Payments" table (one row per payment) shown in the admin
 * StudentSubscriptionsPanel.
 *
 * exceljs is imported dynamically inside the function so it lands in its own
 * lazy chunk and never weighs down the page's initial bundle — same pattern
 * as exportSubscriptionReport.ts / exportStudentsOverview.ts.
 *
 * All user-facing strings arrive pre-translated via `labels` — the app's t()
 * has no interpolation, so translation stays in the calling component.
 */

/** Row shape matches StudentSubscriptionsPanel.tsx's `studentSubscriptions` memo. */
export interface SubscriptionPaymentExportRow {
  paymentId?: number;
  studentName: string;
  studentEmail: string;
  planName: string;
  planDuration: number;
  paymentMethodText?: string;
  paymentChannel?: string | null;
  paymentReferenceCode?: string;
  status: string;
  amount: number;
  createdAt: string;
  reviewedAt?: string;
}

const STATUS_FILL: Record<string, string> = {
  Accepted: 'FFDCFCE7',
  Pending: 'FFFEF3C7',
  Rejected: 'FFFEE2E2',
  Cancelled: 'FFF3F4F6',
  Expired: 'FFFFEDD5',
  Refunded: 'FFE0E7FF',
};

const BRAND = 'FF1E3A8A';
const MONEY_FMT = '#,##0.00';
const DATE_FMT = 'yyyy-mm-dd';

export interface ExportPaymentsLabels {
  reportTitle: string;
  generatedAt: string;
  sheetName: string;
  fileNamePrefix: string;
  student: string;
  email: string;
  plan: string;
  amount: string;
  method: string;
  channel: string;
  reference: string;
  status: string;
  date: string;
  reviewedDate: string;
  channelNames: Record<string, string>;
  days: string;
}

export async function exportSubscriptionPayments(opts: {
  rows: SubscriptionPaymentExportRow[];
  lang: string;
  labels: ExportPaymentsLabels;
}): Promise<void> {
  const { rows, lang, labels } = opts;
  const ExcelJS = (await import('exceljs')).default;

  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  const isRtl = lang === 'ar';

  const sheet = workbook.addWorksheet(labels.sheetName, {
    views: [{ state: 'frozen', ySplit: 1, rightToLeft: isRtl }],
  });

  sheet.columns = [
    { header: labels.student, key: 'student', width: 24 },
    { header: labels.email, key: 'email', width: 28 },
    { header: labels.plan, key: 'plan', width: 22 },
    { header: labels.amount, key: 'amount', width: 14 },
    { header: labels.method, key: 'method', width: 14 },
    { header: labels.channel, key: 'channel', width: 16 },
    { header: labels.reference, key: 'reference', width: 20 },
    { header: labels.status, key: 'status', width: 14 },
    { header: labels.date, key: 'date', width: 14 },
    { header: labels.reviewedDate, key: 'reviewedDate', width: 14 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 22;

  rows.forEach((r, idx) => {
    const planWithDuration = r.planDuration
      ? `${r.planName} (${r.planDuration} ${labels.days})`
      : r.planName || '—';

    const added = sheet.addRow({
      student: r.studentName || '—',
      email: r.studentEmail || '—',
      plan: planWithDuration,
      amount: r.amount ?? 0,
      method: r.paymentMethodText || '—',
      channel: labels.channelNames[r.paymentChannel || 'unknown'] || r.paymentChannel || '—',
      reference: r.paymentReferenceCode || '—',
      status: r.status,
      // Real Date objects so Excel sorts/filters them as dates, not strings.
      date: r.createdAt ? new Date(r.createdAt) : null,
      reviewedDate: r.reviewedAt ? new Date(r.reviewedAt) : null,
    });

    added.getCell('amount').numFmt = MONEY_FMT;
    added.getCell('date').numFmt = DATE_FMT;
    added.getCell('reviewedDate').numFmt = DATE_FMT;

    const statusFill = STATUS_FILL[r.status];
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

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } };

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
