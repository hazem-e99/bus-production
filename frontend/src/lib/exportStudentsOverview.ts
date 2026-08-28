import type { StudentOverviewRow } from '@/types/subscription';

/**
 * Builds and downloads a styled single-sheet .xlsx of the students overview
 * table (registration + subscription + payment, one row per student).
 *
 * exceljs is imported dynamically inside the function so it lands in its own
 * lazy chunk and never weighs down the page's initial bundle — same pattern
 * as exportSubscriptionReport.ts.
 *
 * All user-facing strings arrive pre-translated via `labels` — the app's t()
 * has no interpolation, so translation stays in the calling component.
 */

const STATUS_FILL: Record<string, string> = {
  Active: 'FFDCFCE7',
  Accepted: 'FFDCFCE7',
  Pending: 'FFFEF3C7',
  PendingActivation: 'FFFEF3C7',
  PendingPayment: 'FFFEF3C7',
  Rejected: 'FFFEE2E2',
  Cancelled: 'FFFEE2E2',
  Suspended: 'FFFEE2E2',
  Refunded: 'FFE0E7FF',
  Expired: 'FFFFEDD5',
};

const BRAND = 'FF1E3A8A';
const MONEY_FMT = '#,##0.00';
const DATE_FMT = 'yyyy-mm-dd';

export interface ExportStudentsLabels {
  reportTitle: string;
  generatedAt: string;
  sheetName: string;
  fileNamePrefix: string;
  student: string;
  email: string;
  phone: string;
  nationalId: string;
  department: string;
  preferredArea: string;
  yearOfStudy: string;
  academicNumber: string;
  accountStatus: string;
  plan: string;
  subscriptionStatus: string;
  paymentMethod: string;
  paymentChannel: string;
  amountPaid: string;
  paymentStatus: string;
  registeredOn: string;
  paymentDate: string;
}

export async function exportStudentsOverview(opts: {
  rows: StudentOverviewRow[];
  lang: string;
  labels: ExportStudentsLabels;
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
    { header: labels.phone, key: 'phone', width: 16 },
    { header: labels.nationalId, key: 'nationalId', width: 18 },
    { header: labels.department, key: 'department', width: 22 },
    { header: labels.preferredArea, key: 'preferredArea', width: 18 },
    { header: labels.yearOfStudy, key: 'yearOfStudy', width: 14 },
    { header: labels.academicNumber, key: 'academicNumber', width: 16 },
    { header: labels.accountStatus, key: 'accountStatus', width: 14 },
    { header: labels.plan, key: 'plan', width: 18 },
    { header: labels.subscriptionStatus, key: 'subscriptionStatus', width: 16 },
    { header: labels.paymentMethod, key: 'paymentMethod', width: 14 },
    { header: labels.paymentChannel, key: 'paymentChannel', width: 16 },
    { header: labels.amountPaid, key: 'amountPaid', width: 14 },
    { header: labels.paymentStatus, key: 'paymentStatus', width: 14 },
    { header: labels.registeredOn, key: 'registeredOn', width: 14 },
    { header: labels.paymentDate, key: 'paymentDate', width: 18 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 22;

  rows.forEach((r, idx) => {
    const added = sheet.addRow({
      student: r.fullName || '—',
      email: r.email || '—',
      phone: r.phoneNumber || '—',
      nationalId: r.nationalId || '—',
      department: r.department || '—',
      preferredArea: r.preferredArea || '—',
      yearOfStudy: r.yearOfStudy || '—',
      academicNumber: r.studentAcademicNumber || '—',
      accountStatus: r.status,
      plan: r.subscriptionPlanName || '—',
      subscriptionStatus: r.subscriptionStatus || '—',
      paymentMethod: r.paymentMethod || '—',
      paymentChannel: r.paymentChannel || '—',
      amountPaid: r.paymentAmount ?? null,
      paymentStatus: r.paymentStatus || '—',
      // Real Date objects so Excel sorts/filters them as dates, not strings.
      registeredOn: r.registeredAt ? new Date(r.registeredAt) : null,
      paymentDate: (r.paymentDate || r.subscriptionStartDate) ? new Date((r.paymentDate || r.subscriptionStartDate) as string) : null,
    });

    added.getCell('amountPaid').numFmt = MONEY_FMT;
    added.getCell('registeredOn').numFmt = DATE_FMT;
    added.getCell('paymentDate').numFmt = DATE_FMT;

    const accountFill = STATUS_FILL[r.status];
    if (accountFill) {
      added.getCell('accountStatus').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accountFill } };
      added.getCell('accountStatus').font = { bold: true };
    }
    const subFill = r.subscriptionStatus ? STATUS_FILL[r.subscriptionStatus] : undefined;
    if (subFill) {
      added.getCell('subscriptionStatus').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: subFill } };
      added.getCell('subscriptionStatus').font = { bold: true };
    }
    const paymentFill = r.paymentStatus ? STATUS_FILL[r.paymentStatus] : undefined;
    if (paymentFill) {
      added.getCell('paymentStatus').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: paymentFill } };
      added.getCell('paymentStatus').font = { bold: true };
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
