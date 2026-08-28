'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/format';
import { studentAPI } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/apiError';
import { StudentOverviewRow } from '@/types/subscription';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import {
  Eye, Download, RefreshCw, AlertCircle, GraduationCap,
  CheckCircle, XCircle, Clock, Undo2,
} from 'lucide-react';

/** Row background tint per subscription status — mirrors StudentSubscriptionsPanel's convention. */
const SUB_STATUS_ROW_CLASS: Record<string, string> = {
  Active: 'bg-green-50/60',
  Expired: 'bg-orange-50/60',
  Cancelled: 'bg-gray-50/60',
  Suspended: 'bg-red-50/60',
  PendingActivation: 'bg-yellow-50/60',
  PendingPayment: 'bg-yellow-50/60',
};

export default function StudentsOverviewPage() {
  const { t, lang } = useI18n() as { t: (k: string, f?: string) => string; lang: string };
  const { showToast } = useToast();
  const router = useRouter();

  const [rows, setRows] = useState<StudentOverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [accountStatusFilter, setAccountStatusFilter] = useState('all');
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await studentAPI.getOverview();
      setRows(data);
    } catch (error) {
      showToast({
        type: 'error',
        title: t('pages.admin.studentsOverview.errors.loadFailed', 'Failed to load students'),
        message: getApiErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const departmentOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.department).filter((d): d is string => !!d))).sort(),
    [rows],
  );

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchesDepartment = departmentFilter === 'all' || r.department === departmentFilter;
      const matchesAccountStatus = accountStatusFilter === 'all' || r.status === accountStatusFilter;
      const matchesSubStatus = subscriptionStatusFilter === 'all'
        || (subscriptionStatusFilter === 'none' ? !r.subscriptionStatus : r.subscriptionStatus === subscriptionStatusFilter);
      const matchesPaymentStatus = paymentStatusFilter === 'all'
        || (paymentStatusFilter === 'none' ? !r.paymentStatus : r.paymentStatus === paymentStatusFilter);
      return matchesDepartment && matchesAccountStatus && matchesSubStatus && matchesPaymentStatus;
    });
  }, [rows, departmentFilter, accountStatusFilter, subscriptionStatusFilter, paymentStatusFilter]);

  const accountStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge className="bg-green-100 text-green-800">{status}</Badge>;
      case 'Suspended':
        return <Badge className="bg-red-100 text-red-800">{status}</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const subscriptionStatusBadge = (status?: string | null) => {
    if (!status) return <span className="text-gray-400">—</span>;
    switch (status) {
      case 'Active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />{status}</Badge>;
      case 'Cancelled':
      case 'Suspended':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />{status}</Badge>;
      case 'Expired':
        return <Badge className="bg-orange-100 text-orange-800"><AlertCircle className="w-3 h-3 mr-1" />{status}</Badge>;
      case 'PendingActivation':
      case 'PendingPayment':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />{status}</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const paymentStatusBadge = (status?: string | null) => {
    if (!status) return <span className="text-gray-400">—</span>;
    switch (status) {
      case 'Accepted':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />{status}</Badge>;
      case 'Rejected':
      case 'Cancelled':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />{status}</Badge>;
      case 'Pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />{status}</Badge>;
      case 'Expired':
        return <Badge className="bg-orange-100 text-orange-800"><AlertCircle className="w-3 h-3 mr-1" />{status}</Badge>;
      case 'Refunded':
        return <Badge className="bg-indigo-100 text-indigo-800"><Undo2 className="w-3 h-3 mr-1" />{status}</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const paymentChannelLabel = useCallback(
    (channel?: string | null) => {
      if (!channel) return '—';
      return t(`pages.admin.studentsOverview.paymentChannel.${channel}`, channel);
    },
    [t],
  );

  const handleExport = async () => {
    try {
      setExporting(true);
      const { exportStudentsOverview } = await import('@/lib/exportStudentsOverview');
      await exportStudentsOverview({
        rows: filteredRows,
        lang,
        labels: {
          reportTitle: t('pages.admin.studentsOverview.excel.reportTitle', 'El Renad — Students Overview'),
          generatedAt: t('pages.admin.studentsOverview.excel.generatedAt', 'Generated at'),
          sheetName: t('pages.admin.studentsOverview.excel.sheetName', 'Students'),
          fileNamePrefix: 'students-overview',
          student: t('pages.admin.studentsOverview.columns.student', 'Student'),
          email: t('pages.admin.studentsOverview.excel.email', 'Email'),
          phone: t('pages.admin.studentsOverview.columns.phone', 'Phone'),
          nationalId: t('pages.admin.studentsOverview.columns.nationalId', 'National ID'),
          department: t('pages.admin.studentsOverview.columns.department', 'Department'),
          preferredArea: t('pages.admin.studentsOverview.columns.preferredArea', 'Preferred Area'),
          yearOfStudy: t('pages.admin.studentsOverview.columns.yearOfStudy', 'Year of Study'),
          academicNumber: t('pages.admin.studentsOverview.columns.academicNumber', 'Academic No.'),
          accountStatus: t('pages.admin.studentsOverview.columns.accountStatus', 'Account Status'),
          plan: t('pages.admin.studentsOverview.columns.plan', 'Plan'),
          subscriptionStatus: t('pages.admin.studentsOverview.columns.subscriptionStatus', 'Subscription Status'),
          paymentMethod: t('pages.admin.studentsOverview.columns.paymentMethod', 'Payment Method'),
          paymentChannel: t('pages.admin.studentsOverview.columns.paymentChannel', 'Payment Channel'),
          amountPaid: t('pages.admin.studentsOverview.columns.amountPaid', 'Amount Paid'),
          paymentStatus: t('pages.admin.studentsOverview.columns.paymentStatus', 'Payment Status'),
          registeredOn: t('pages.admin.studentsOverview.columns.registeredOn', 'Registered On'),
          paymentDate: t('pages.admin.studentsOverview.columns.paymentDate', 'Subscription/Payment Date'),
        },
      });
      showToast({
        type: 'success',
        title: t('pages.admin.studentsOverview.exportSuccess', 'Export ready'),
        message: t('pages.admin.studentsOverview.exportSuccessMessage', 'The Excel file has been downloaded.'),
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: t('pages.admin.studentsOverview.exportError', 'Export failed'),
        message: getApiErrorMessage(error),
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="p-6">{t('pages.admin.studentsOverview.loading', 'Loading students...')}</div>;
  }

  const columns: ColumnDef<StudentOverviewRow>[] = [
    {
      header: t('pages.admin.studentsOverview.columns.student', 'Student'),
      accessorKey: 'fullName',
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-text-primary">{row.original.fullName}</p>
          <p className="text-sm text-text-secondary">{row.original.email || '—'}</p>
        </div>
      ),
    },
    {
      header: t('pages.admin.studentsOverview.columns.phone', 'Phone'),
      accessorKey: 'phoneNumber',
      cell: ({ getValue }) => getValue<string>() || '—',
    },
    {
      header: t('pages.admin.studentsOverview.columns.nationalId', 'National ID'),
      accessorKey: 'nationalId',
      cell: ({ getValue }) => getValue<string>() || '—',
    },
    {
      header: t('pages.admin.studentsOverview.columns.department', 'Department'),
      accessorKey: 'department',
      cell: ({ getValue }) => getValue<string>() || '—',
    },
    {
      header: t('pages.admin.studentsOverview.columns.preferredArea', 'Preferred Area'),
      accessorKey: 'preferredArea',
      cell: ({ getValue }) => getValue<string>() || '—',
    },
    {
      header: t('pages.admin.studentsOverview.columns.yearOfStudy', 'Year of Study'),
      accessorKey: 'yearOfStudy',
      cell: ({ getValue }) => getValue<string>() || '—',
    },
    {
      header: t('pages.admin.studentsOverview.columns.academicNumber', 'Academic No.'),
      accessorKey: 'studentAcademicNumber',
      cell: ({ getValue }) => getValue<string>() || '—',
    },
    {
      header: t('pages.admin.studentsOverview.columns.accountStatus', 'Account Status'),
      accessorKey: 'status',
      cell: ({ getValue }) => accountStatusBadge(getValue<string>()),
    },
    {
      header: t('pages.admin.studentsOverview.columns.plan', 'Plan'),
      accessorKey: 'subscriptionPlanName',
      cell: ({ getValue }) => getValue<string>() || '—',
    },
    {
      header: t('pages.admin.studentsOverview.columns.subscriptionStatus', 'Subscription Status'),
      accessorKey: 'subscriptionStatus',
      cell: ({ getValue }) => subscriptionStatusBadge(getValue<string>()),
    },
    {
      header: t('pages.admin.studentsOverview.columns.paymentMethod', 'Payment Method'),
      accessorKey: 'paymentMethod',
      cell: ({ getValue }) => getValue<string>() || '—',
    },
    {
      header: t('pages.admin.studentsOverview.columns.paymentChannel', 'Payment Channel'),
      accessorKey: 'paymentChannel',
      cell: ({ getValue }) => paymentChannelLabel(getValue<string>()),
    },
    {
      header: t('pages.admin.studentsOverview.columns.amountPaid', 'Amount Paid'),
      accessorKey: 'paymentAmount',
      cell: ({ getValue }) => {
        const v = getValue<number | null>();
        return v != null ? formatCurrency(lang, v) : '—';
      },
    },
    {
      header: t('pages.admin.studentsOverview.columns.paymentStatus', 'Payment Status'),
      accessorKey: 'paymentStatus',
      cell: ({ getValue }) => paymentStatusBadge(getValue<string>()),
    },
    {
      header: t('pages.admin.studentsOverview.columns.registeredOn', 'Registered On'),
      accessorKey: 'registeredAt',
      cell: ({ getValue }) => {
        const v = getValue<string | null>();
        return v ? formatDate(lang, v) : '—';
      },
    },
    {
      header: t('pages.admin.studentsOverview.columns.paymentDate', 'Subscription/Payment Date'),
      accessorFn: (row) => row.paymentDate || row.subscriptionStartDate,
      id: 'paymentOrSubscriptionDate',
      cell: ({ getValue }) => {
        const v = getValue<string | null>();
        return v ? formatDate(lang, v) : '—';
      },
    },
    {
      header: t('pages.admin.studentsOverview.columns.actions', 'Actions'),
      id: 'actions',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/admin/students/${row.original.id}`)}
          title={t('pages.admin.studentsOverview.viewDetails', 'View full details')}
        >
          <Eye className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">
              {t('pages.admin.studentsOverview.title', 'Students Overview')}
            </h1>
            <p className="text-text-secondary mt-1">
              {t('pages.admin.studentsOverview.subtitle', 'All registered students with their subscription and payment info')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={load} disabled={exporting}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('pages.admin.studentsOverview.refresh', 'Refresh')}
            </Button>
            <Button onClick={handleExport} disabled={exporting} className="bg-green-600 hover:bg-green-700 text-white">
              <Download className="w-4 h-4 mr-2" />
              {exporting
                ? t('pages.admin.studentsOverview.exporting', 'Exporting...')
                : t('pages.admin.studentsOverview.export', 'Export to Excel')}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-white/70 backdrop-blur p-4 flex items-center gap-3">
            <GraduationCap className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <p className="text-xs text-text-secondary">{t('pages.admin.studentsOverview.stats.totalStudents', 'Total Students')}</p>
              <p className="text-lg font-bold text-text-primary">{rows.length}</p>
            </div>
          </div>
          <Select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
            <option value="all">{t('pages.admin.studentsOverview.filters.allDepartments', 'All Departments')}</option>
            {departmentOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
          <Select value={accountStatusFilter} onChange={(e) => setAccountStatusFilter(e.target.value)}>
            <option value="all">{t('pages.admin.studentsOverview.filters.allAccountStatuses', 'All Account Statuses')}</option>
            {['Active', 'Inactive', 'Suspended'].map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={subscriptionStatusFilter} onChange={(e) => setSubscriptionStatusFilter(e.target.value)}>
            <option value="all">{t('pages.admin.studentsOverview.filters.allSubscriptionStatuses', 'All Subscription Statuses')}</option>
            {['Active', 'Expired', 'Cancelled', 'Suspended', 'PendingActivation', 'PendingPayment'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
            <option value="none">{t('pages.admin.studentsOverview.filters.noneStatus', 'None')}</option>
          </Select>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value)}>
            <option value="all">{t('pages.admin.studentsOverview.filters.allPaymentStatuses', 'All Payment Statuses')}</option>
            {['Accepted', 'Pending', 'Rejected', 'Cancelled', 'Expired', 'Refunded'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
            <option value="none">{t('pages.admin.studentsOverview.filters.noneStatus', 'None')}</option>
          </Select>
        </div>
      </div>

      <Card className="rounded-xl border bg-white">
        <CardContent className="p-4 sm:p-6">
          {filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-lg font-semibold text-text-primary">
                {t('pages.admin.studentsOverview.empty', 'No students found.')}
              </p>
              <p className="text-sm text-text-secondary mt-1">
                {t('pages.admin.studentsOverview.noResults', 'Try adjusting your filters.')}
              </p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredRows}
              searchPlaceholder={t('pages.admin.studentsOverview.searchPlaceholder', 'Search students...')}
              getRowClassName={(r) => SUB_STATUS_ROW_CLASS[(r as StudentOverviewRow).subscriptionStatus ?? '']}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
