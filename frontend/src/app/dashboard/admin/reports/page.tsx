'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/format';
import { paymentAPI } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/apiError';
import { SubscriptionReportViewModel } from '@/types/subscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { PieChart } from '@/components/charts/PieChart';
import { BarChart } from '@/components/charts/BarChart';
import {
  Users, CreditCard, Wallet, Undo2, TrendingUp, Download,
  RefreshCw, Search, AlertCircle, CheckCircle, Clock, XCircle,
} from 'lucide-react';

/** Chart/table colors per channel — kept in sync with the Excel fills. */
const CHANNEL_COLORS: Record<string, string> = {
  instapay: '#3B82F6',
  vodafone: '#EF4444',
  cash: '#22C55E',
  visa: '#8B5CF6',
  unknown: '#9CA3AF',
};

export default function AdminReportsPage() {
  const { t, lang } = useI18n() as { t: (k: string, f?: string) => string; lang: string };
  const { showToast } = useToast();

  const [report, setReport] = useState<SubscriptionReportViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const channelLabel = useCallback(
    (channel?: string | null) => {
      const key = channel || 'unknown';
      return t(`pages.admin.reports.channels.${key}`, key);
    },
    [t],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await paymentAPI.getSubscriptionReport();
      setReport(data);
    } catch (error) {
      showToast({
        type: 'error',
        title: t('pages.admin.reports.errors.loadFailed', 'Failed to load report'),
        message: getApiErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredDetails = useMemo(() => {
    if (!report) return [];
    const term = search.trim().toLowerCase();
    return report.details.filter((d) => {
      const matchesSearch = !term
        || (d.studentName || '').toLowerCase().includes(term)
        || (d.studentEmail || '').toLowerCase().includes(term)
        || (d.planName || '').toLowerCase().includes(term)
        || (d.paymentReferenceCode || '').toLowerCase().includes(term);
      const matchesChannel = channelFilter === 'all' || (d.paymentChannel || 'unknown') === channelFilter;
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
      return matchesSearch && matchesChannel && matchesStatus;
    });
  }, [report, search, channelFilter, statusFilter]);

  const handleExport = async () => {
    if (!report) return;
    try {
      setExporting(true);
      const { exportSubscriptionReport } = await import('@/lib/exportSubscriptionReport');
      await exportSubscriptionReport({
        report,
        lang,
        labels: {
          reportTitle: t('pages.admin.reports.excel.reportTitle', 'El Renad — Subscriptions Report'),
          generatedAt: t('pages.admin.reports.excel.generatedAt', 'Generated at'),
          summarySheet: t('pages.admin.reports.excel.summarySheet', 'Summary'),
          detailsSheet: t('pages.admin.reports.excel.detailsSheet', 'Details'),
          // Filesystem identifier, deliberately not translated.
          fileNamePrefix: 'subscriptions-report',
          subscribedStudents: t('pages.admin.reports.stats.subscribedStudents', 'Subscribed students'),
          totalStudents: t('pages.admin.reports.stats.totalStudents', 'Total students'),
          accepted: t('pages.admin.reports.stats.accepted', 'Accepted payments'),
          pending: t('pages.admin.reports.stats.pending', 'Pending payments'),
          rejected: t('pages.admin.reports.stats.rejected', 'Rejected payments'),
          refunded: t('pages.admin.reports.stats.refunded', 'Refunded payments'),
          gross: t('pages.admin.reports.stats.gross', 'Gross amount'),
          refunds: t('pages.admin.reports.stats.refunds', 'Refunds'),
          net: t('pages.admin.reports.stats.net', 'Net amount'),
          channel: t('pages.admin.reports.channels.channel', 'Channel'),
          students: t('pages.admin.reports.channels.students', 'Students'),
          payments: t('pages.admin.reports.channels.payments', 'Payments'),
          netAmount: t('pages.admin.reports.channels.net', 'Net'),
          total: t('pages.admin.reports.channels.total', 'Total'),
          channelNames: {
            instapay: channelLabel('instapay'),
            vodafone: channelLabel('vodafone'),
            cash: channelLabel('cash'),
            visa: channelLabel('visa'),
            unknown: channelLabel('unknown'),
          },
          index: t('pages.admin.reports.details.index', '#'),
          student: t('pages.admin.reports.details.student', 'Student'),
          email: t('pages.admin.reports.details.email', 'Email'),
          academicNumber: t('pages.admin.reports.details.academicNumber', 'Academic No.'),
          department: t('pages.admin.reports.details.department', 'Department'),
          plan: t('pages.admin.reports.details.plan', 'Plan'),
          amount: t('pages.admin.reports.details.amount', 'Amount'),
          method: t('pages.admin.reports.details.method', 'Method'),
          status: t('pages.admin.reports.details.status', 'Status'),
          reference: t('pages.admin.reports.details.reference', 'Reference'),
          createdAt: t('pages.admin.reports.details.createdAt', 'Created'),
          reviewedAt: t('pages.admin.reports.details.reviewedAt', 'Reviewed'),
          refundAmount: t('pages.admin.reports.details.refundAmount', 'Refund'),
        },
      });
      showToast({
        type: 'success',
        title: t('pages.admin.reports.exportSuccess', 'Export ready'),
        message: t('pages.admin.reports.exportSuccessMessage', 'The Excel file has been downloaded.'),
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: t('pages.admin.reports.exportError', 'Export failed'),
        message: getApiErrorMessage(error),
      });
    } finally {
      setExporting(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'Accepted':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />{status}</Badge>;
      case 'Pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />{status}</Badge>;
      case 'Rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />{status}</Badge>;
      case 'Refunded':
        return <Badge className="bg-indigo-100 text-indigo-800"><Undo2 className="w-3 h-3 mr-1" />{status}</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="p-6">{t('pages.admin.reports.loading', 'Loading report...')}</div>;
  }

  if (!report) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-3">
            <AlertCircle className="w-12 h-12 text-gray-400" />
            <p className="text-gray-500">{t('pages.admin.reports.empty', 'No report data available.')}</p>
            <Button variant="outline" onClick={load}>{t('pages.admin.reports.refresh', 'Refresh')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totals = report.totals;
  const grandChannelCount = report.byChannel.reduce((s, c) => s + c.acceptedCount, 0);

  const tiles = [
    { icon: Users, label: t('pages.admin.reports.stats.subscribedStudents', 'Subscribed students'), value: String(totals.subscribedStudents) },
    { icon: CheckCircle, label: t('pages.admin.reports.stats.accepted', 'Accepted payments'), value: String(totals.acceptedCount) },
    { icon: Clock, label: t('pages.admin.reports.stats.pending', 'Pending payments'), value: String(totals.pendingCount) },
    { icon: Undo2, label: t('pages.admin.reports.stats.refunded', 'Refunded payments'), value: String(totals.refundedCount) },
    { icon: Wallet, label: t('pages.admin.reports.stats.gross', 'Gross amount'), value: formatCurrency(lang, totals.grossAmount) },
    { icon: Undo2, label: t('pages.admin.reports.stats.refunds', 'Refunds'), value: formatCurrency(lang, totals.refundedAmount) },
    { icon: TrendingUp, label: t('pages.admin.reports.stats.net', 'Net amount'), value: formatCurrency(lang, totals.netAmount) },
    { icon: CreditCard, label: t('pages.admin.reports.stats.totalStudents', 'Total students'), value: String(totals.totalStudents) },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">
              {t('pages.admin.reports.title', 'Subscription Reports')}
            </h1>
            <p className="text-text-secondary mt-1">
              {t('pages.admin.reports.subtitle', 'Subscribed students, payment channels and revenue')}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {t('pages.admin.reports.generatedAt', 'Generated')}: {formatDate(lang, report.generatedAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={load} disabled={exporting}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('pages.admin.reports.refresh', 'Refresh')}
            </Button>
            <Button onClick={handleExport} disabled={exporting} className="bg-green-600 hover:bg-green-700 text-white">
              <Download className="w-4 h-4 mr-2" />
              {exporting
                ? t('pages.admin.reports.exporting', 'Exporting...')
                : t('pages.admin.reports.export', 'Export to Excel')}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-xl border bg-white/70 backdrop-blur p-4 flex items-center gap-3">
              <tile.icon className="w-5 h-5 text-blue-600 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-text-secondary truncate">{tile.label}</div>
                <div className="text-lg font-bold text-text-primary truncate">{tile.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Channel breakdown */}
      <Card className="rounded-xl border bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {t('pages.admin.reports.channels.title', 'Payments by channel')}
          </CardTitle>
          <CardDescription>
            {t('pages.admin.reports.channels.description', 'Accepted payments grouped by how the student paid')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[560px] lg:min-w-0">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('pages.admin.reports.channels.channel', 'Channel')}</TableHead>
                    <TableHead>{t('pages.admin.reports.channels.students', 'Students')}</TableHead>
                    <TableHead>{t('pages.admin.reports.channels.payments', 'Payments')}</TableHead>
                    <TableHead>{t('pages.admin.reports.channels.gross', 'Gross')}</TableHead>
                    <TableHead>{t('pages.admin.reports.channels.net', 'Net')}</TableHead>
                    <TableHead>%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.byChannel.map((c) => (
                    <TableRow key={c.channel}>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHANNEL_COLORS[c.channel] }} />
                          <span className="font-medium">{channelLabel(c.channel)}</span>
                        </span>
                      </TableCell>
                      <TableCell>{c.studentCount}</TableCell>
                      <TableCell>{c.acceptedCount}</TableCell>
                      <TableCell>{formatCurrency(lang, c.grossAmount)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(lang, c.netAmount)}</TableCell>
                      <TableCell>
                        {grandChannelCount > 0 ? Math.round((c.acceptedCount / grandChannelCount) * 100) : 0}%
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-gray-50 font-bold">
                    <TableCell>{t('pages.admin.reports.channels.total', 'Total')}</TableCell>
                    <TableCell>{totals.subscribedStudents}</TableCell>
                    <TableCell>{totals.acceptedCount}</TableCell>
                    <TableCell>{formatCurrency(lang, totals.grossAmount)}</TableCell>
                    <TableCell>{formatCurrency(lang, totals.netAmount)}</TableCell>
                    <TableCell>100%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <PieChart
                title={t('pages.admin.reports.charts.countsTitle', 'Payments per channel')}
                height={260}
                data={{
                  labels: report.byChannel.map((c) => channelLabel(c.channel)),
                  datasets: [{
                    label: t('pages.admin.reports.channels.payments', 'Payments'),
                    data: report.byChannel.map((c) => c.acceptedCount),
                    backgroundColor: report.byChannel.map((c) => CHANNEL_COLORS[c.channel]),
                  }],
                }}
              />
              <BarChart
                title={t('pages.admin.reports.charts.amountsTitle', 'Net amount per channel')}
                height={260}
                data={{
                  labels: report.byChannel.map((c) => channelLabel(c.channel)),
                  datasets: [{
                    label: t('pages.admin.reports.channels.net', 'Net'),
                    data: report.byChannel.map((c) => c.netAmount),
                    backgroundColor: report.byChannel.map((c) => CHANNEL_COLORS[c.channel]),
                  }],
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <Card className="rounded-xl border bg-white">
        <CardHeader>
          <CardTitle>{t('pages.admin.reports.details.title', 'Payment details')}</CardTitle>
          <CardDescription>
            {filteredDetails.length} {t('pages.admin.reports.details.rows', 'record(s)')}
          </CardDescription>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                className="pl-10"
                placeholder={t('pages.admin.reports.details.searchPlaceholder', 'Search students, plans...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
              <option value="all">{t('pages.admin.reports.details.allChannels', 'All channels')}</option>
              {report.byChannel.map((c) => (
                <option key={c.channel} value={c.channel}>{channelLabel(c.channel)}</option>
              ))}
            </Select>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">{t('pages.admin.reports.details.allStatuses', 'All statuses')}</option>
              {['Accepted', 'Pending', 'Rejected', 'Refunded', 'Cancelled', 'Expired'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[900px] sm:min-w-0">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('pages.admin.reports.details.student', 'Student')}</TableHead>
                  <TableHead>{t('pages.admin.reports.details.plan', 'Plan')}</TableHead>
                  <TableHead>{t('pages.admin.reports.details.amount', 'Amount')}</TableHead>
                  <TableHead>{t('pages.admin.reports.channels.channel', 'Channel')}</TableHead>
                  <TableHead>{t('pages.admin.reports.details.status', 'Status')}</TableHead>
                  <TableHead>{t('pages.admin.reports.details.createdAt', 'Created')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDetails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      {t('pages.admin.reports.details.empty', 'No matching records.')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDetails.map((d) => (
                    <TableRow key={d.paymentId}>
                      <TableCell>
                        <div className="font-medium">{d.studentName || '—'}</div>
                        <div className="text-sm text-gray-500">{d.studentEmail || ''}</div>
                      </TableCell>
                      <TableCell>{d.planName || '—'}</TableCell>
                      <TableCell className="font-medium text-green-600">
                        {formatCurrency(lang, d.amount)}
                        {d.refundAmount != null && (
                          <div className="text-xs text-indigo-600">
                            -{formatCurrency(lang, d.refundAmount)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: CHANNEL_COLORS[d.paymentChannel || 'unknown'] }}
                          />
                          {channelLabel(d.paymentChannel)}
                        </span>
                      </TableCell>
                      <TableCell>{statusBadge(d.status)}</TableCell>
                      <TableCell className="text-sm">
                        {d.createdAt ? formatDate(lang, d.createdAt) : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
