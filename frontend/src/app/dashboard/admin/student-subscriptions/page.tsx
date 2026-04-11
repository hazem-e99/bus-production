'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useI18n } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/Toast';
import { studentAPI, paymentAPI, subscriptionPlansAPI } from '@/lib/api';
import { PaymentMethod, PaymentStatus, ReviewPaymentDTO } from '@/types/subscription';
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle, XCircle, Clock, AlertCircle, Users, CreditCard, Search, Activity, Filter, X } from 'lucide-react';
import { Select } from '@/components/ui/Select';

// Updated interfaces based on Swagger schemas
interface Student {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  nationalId?: string;
  profilePictureUrl?: string;
  status: string;
  role: string;
  studentProfileId: number;
  studentAcademicNumber?: string;
  department?: string;
  yearOfStudy?: number;
  emergencyContact?: string;
  emergencyPhone?: string;
}

interface Payment {
  id: number;
  studentId: number;
  tripId?: number;
  amount: number;
  subscriptionPlanId: number;
  subscriptionPlanName?: string;
  subscriptionCode?: string;
  paymentMethod: PaymentMethod;
  paymentMethodText?: string;
  paymentReferenceCode?: string;
  status: PaymentStatus;
  statusText?: string;
  adminReviewedById?: number;
  adminReviewedByName?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt?: string;
  studentName?: string;
  studentEmail?: string;
}

interface SubscriptionPlan {
  id: number;
  name: string;
  description?: string;
  price: number;
  durationInDays: number;
  isActive: boolean;
}

export default function StudentSubscriptionsPage() {
  const { t } = useI18n();
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | 'all'>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [amountFilter, setAmountFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const { showToast } = useToast();
  const tRef = useRef(t);
  const toastRef = useRef(showToast);
  useEffect(() => { tRef.current = t; toastRef.current = showToast; }, [t, showToast]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading admin student subscriptions data...');
      
      const [studentsData, paymentsData, plansData] = await Promise.all([
        studentAPI.getAll().catch((error) => {
          console.error('❌ Students API Error:', error);
          return [];
        }),
        paymentAPI.getAll().catch((error) => {
          console.error('❌ Payments API Error:', error);
          return [];
        }),
        subscriptionPlansAPI.getAll().catch((error) => {
          console.error('❌ Plans API Error:', error);
          return [];
        })
      ]);

      console.log('📊 Students data:', studentsData);
      console.log('💳 Payments data:', paymentsData);
      console.log('📋 Plans data:', plansData);

      setStudents(studentsData || []);
      setPayments(paymentsData || []);
      setPlans(plansData || []);

    // Show success message if data loaded successfully
      if (paymentsData && paymentsData.length > 0) {
        console.log('✅ Data loaded successfully!');
        showToast({ 
          type: 'success', 
      title: tRef.current('pages.admin.studentSubscriptions.toasts.loadSuccess', 'Data Loaded Successfully'), 
      message: `${tRef.current('pages.admin.studentSubscriptions.toasts.found', 'Found')} ${paymentsData.length} ${tRef.current('pages.admin.studentSubscriptions.toasts.paymentRecords', 'payment records')}` 
        });
      } else {
        console.warn('⚠️ No payment data received');
        showToast({ 
          type: 'warning', 
      title: tRef.current('pages.admin.studentSubscriptions.toasts.noPaymentData', 'No payment data'), 
      message: tRef.current('pages.admin.studentSubscriptions.toasts.noPaymentRecords', 'No payment records found in the system') 
        });
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
    showToast({ type: 'error', title: tRef.current('pages.admin.studentSubscriptions.errors.loadFailed', 'Failed to load data'), message: tRef.current('pages.admin.studentSubscriptions.errors.tryAgain', 'Please try again') });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Get subscription payments (payments without tripId)
  const subscriptionPayments = useMemo(() => {
    console.log('🔍 All payments:', payments);
    const filtered = payments.filter(p => !p.tripId);
    console.log('🔍 Subscription payments (filtered):', filtered);
    return filtered;
  }, [payments]);

  // Create a map of plans for quick lookup
  const plansMap = useMemo(() => {
    const map = new Map<number, SubscriptionPlan>();
    plans.forEach(plan => map.set(plan.id, plan));
    return map;
  }, [plans]);

  // Get unique plan names for filter
  const planOptions = useMemo(() => {
    const uniquePlans = new Set<string>();
    subscriptionPayments.forEach(payment => {
      const planDetails = payment.subscriptionPlanId ? plansMap.get(payment.subscriptionPlanId) : null;
      const planName = planDetails?.name || payment.subscriptionPlanName || 'No Plan';
      uniquePlans.add(planName);
    });
    return Array.from(uniquePlans).sort();
  }, [subscriptionPayments, plansMap]);

  // Filter by date range
  const getDateRange = useCallback((filter: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filter) {
      case 'today':
        return { from: today, to: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { from: weekStart, to: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000) };
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return { from: monthStart, to: monthEnd };
      case 'custom':
        return {
          from: customDateFrom ? new Date(customDateFrom) : null,
          to: customDateTo ? new Date(customDateTo + 'T23:59:59') : null
        };
      default:
        return { from: null, to: null };
    }
  }, [customDateFrom, customDateTo]);

  // Filter by amount range
  const getAmountRange = useCallback((filter: string) => {
    switch (filter) {
      case 'low':
        return { min: 0, max: 100 };
      case 'medium':
        return { min: 100, max: 500 };
      case 'high':
        return { min: 500, max: Infinity };
      default:
        return { min: 0, max: Infinity };
    }
  }, []);

  const studentSubscriptions = useMemo(() => {
    console.log('🔄 Processing subscription payments with filters:', {
      search, statusFilter, methodFilter, planFilter, dateFilter, amountFilter
    });
    
    const dateRange = getDateRange(dateFilter);
    const amountRange = getAmountRange(amountFilter);
    
    return subscriptionPayments.map(payment => {
      const planDetails = payment.subscriptionPlanId ? plansMap.get(payment.subscriptionPlanId) : null;
      
      const result = {
        paymentId: payment.id,
        studentId: payment.studentId,
        studentName: payment.studentName || 'Unknown Student',
        studentEmail: payment.studentEmail || '',
        planName: planDetails?.name || payment.subscriptionPlanName || 'No Plan',
        planPrice: planDetails?.price || 0,
        planDuration: planDetails?.durationInDays || 0,
        paymentMethod: payment.paymentMethod,
        paymentMethodText: payment.paymentMethodText || '',
        paymentReferenceCode: payment.paymentReferenceCode || '',
        status: payment.status,
        amount: payment.amount,
        createdAt: payment.createdAt,
        reviewedAt: payment.reviewedAt || '',
        adminReviewedBy: payment.adminReviewedByName || '',
        subscriptionCode: payment.subscriptionCode || ''
      };
      
      return result;
    }).filter(row => {
      // Search filter
      const matchesSearch = !search || 
        row.studentName.toLowerCase().includes(search.toLowerCase()) ||
        row.studentEmail.toLowerCase().includes(search.toLowerCase()) ||
        row.planName.toLowerCase().includes(search.toLowerCase()) ||
        row.paymentReferenceCode.toLowerCase().includes(search.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      
      // Method filter
      const matchesMethod = methodFilter === 'all' || row.paymentMethod === methodFilter;
      
      // Plan filter
      const matchesPlan = planFilter === 'all' || row.planName === planFilter;
      
      // Date filter
      const paymentDate = new Date(row.createdAt);
      const matchesDate = !dateRange.from || !dateRange.to || 
        (paymentDate >= dateRange.from && paymentDate < dateRange.to);
      
      // Amount filter
      const matchesAmount = row.amount >= amountRange.min && row.amount <= amountRange.max;
      
      return matchesSearch && matchesStatus && matchesMethod && matchesPlan && matchesDate && matchesAmount;
    });
  }, [subscriptionPayments, plansMap, search, statusFilter, methodFilter, planFilter, dateFilter, amountFilter, getDateRange, getAmountRange]);

  const reviewPayment = async (paymentId: number, status: PaymentStatus, reviewNotes?: string) => {
    try {
      console.log('🔍 Reviewing payment:', { paymentId, status, reviewNotes });
      
      const reviewData: ReviewPaymentDTO = {
        status: status,
        reviewNotes: reviewNotes || null,
        subscriptionCode: null // Will be generated by backend if needed
      };

      const result = await paymentAPI.review(paymentId, reviewData);
      
      if (result?.success) {
        showToast({ 
          type: 'success', 
          title: 'Payment reviewed successfully',
          message: `Payment ${status === 'Accepted' ? 'accepted' : status === 'Rejected' ? 'rejected' : 'updated'}`
        });
        await load(); // Refresh data
      } else {
        throw new Error(result?.message || 'Review failed');
      }
    } catch (error) {
      console.error('❌ Error reviewing payment:', error);
      showToast({ 
        type: 'error', 
        title: 'Failed to review payment',
        message: 'Please try again'
      });
    }
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'Accepted':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />{t('pages.admin.studentSubscriptions.status.accepted', 'Accepted')}</Badge>;
      case 'Rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />{t('pages.admin.studentSubscriptions.status.rejected', 'Rejected')}</Badge>;
      case 'Pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />{t('pages.admin.studentSubscriptions.status.pending', 'Pending')}</Badge>;
      case 'Cancelled':
        return <Badge className="bg-gray-100 text-gray-800"><XCircle className="w-3 h-3 mr-1" />{t('pages.admin.studentSubscriptions.status.cancelled', 'Cancelled')}</Badge>;
      case 'Expired':
        return <Badge className="bg-orange-100 text-orange-800"><AlertCircle className="w-3 h-3 mr-1" />{t('pages.admin.studentSubscriptions.status.expired', 'Expired')}</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getPaymentMethodDisplay = (method: PaymentMethod | null) => {
    switch (method) {
      case 'Online':
        return t('pages.admin.studentSubscriptions.paymentMethod.online', 'InstaPay');
      case 'Offline':
        return t('pages.admin.studentSubscriptions.paymentMethod.offline', 'Offline');
      default:
        return method || t('common.na', 'N/A');
    }
  };

  const getRowClassName = (status: PaymentStatus) => {
    switch (status) {
      case 'Accepted':
        return 'bg-green-50/60';
      case 'Rejected':
        return 'bg-red-50/60';
      case 'Pending':
        return 'bg-yellow-50/60';
      case 'Cancelled':
        return 'bg-gray-50/60';
      case 'Expired':
        return 'bg-orange-50/60';
      default:
        return 'bg-white';
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setMethodFilter('all');
    setPlanFilter('all');
    setDateFilter('all');
    setCustomDateFrom('');
    setCustomDateTo('');
    setAmountFilter('all');
  };

  // Check if any filters are active
  const hasActiveFilters = search || statusFilter !== 'all' || methodFilter !== 'all' || 
    planFilter !== 'all' || dateFilter !== 'all' || amountFilter !== 'all';

  if (loading) return <div className="p-6">{t('pages.admin.studentSubscriptions.loading', 'Loading...')}</div>;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Creative Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">{t('pages.admin.studentSubscriptions.title', 'Student Subscriptions Management')}</h1>
            <p className="text-text-secondary mt-1">{t('pages.admin.studentSubscriptions.subtitle', 'Manage student subscription payments and review payment status')}</p>
          </div>
          <div className="w-full sm:w-64">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input 
                placeholder={t('pages.admin.studentSubscriptions.searchPlaceholder', 'Search students, plans...')} 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-white/70 backdrop-blur p-4 flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-text-secondary">{t('pages.admin.studentSubscriptions.stats.totalStudents', 'Total Students')}</p>
              <p className="font-semibold">{students.length}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-white/70 backdrop-blur p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm text-text-secondary">{t('pages.admin.studentSubscriptions.stats.activeSubscriptions', 'Active Subscriptions')}</p>
              <p className="font-semibold">{subscriptionPayments.filter(p => p.status === 'Accepted').length}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-white/70 backdrop-blur p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-sm text-text-secondary">{t('pages.admin.studentSubscriptions.stats.pendingReviews', 'Pending Reviews')}</p>
              <p className="font-semibold">{subscriptionPayments.filter(p => p.status === 'Pending').length}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-white/70 backdrop-blur p-4 flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-sm text-text-secondary">{t('pages.admin.studentSubscriptions.stats.totalPayments', 'Total Payments')}</p>
              <p className="font-semibold">{subscriptionPayments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <Card className="rounded-xl border bg-white">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              <CardTitle>{t('pages.admin.studentSubscriptions.filters.title', 'Advanced Filters')}</CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4 mr-1" />
                  {t('pages.admin.studentSubscriptions.filters.clearAll', 'Clear All')}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? t('pages.admin.studentSubscriptions.filters.hideFilters', 'Hide Filters') : t('pages.admin.studentSubscriptions.filters.showFilters', 'Show Filters')}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t('pages.admin.studentSubscriptions.filters.status', 'Status')}</label>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | 'all')}
                >
                  <option value="all">{t('pages.admin.studentSubscriptions.filters.allStatus', 'All Status')}</option>
                  <option value="Pending">{t('pages.admin.studentSubscriptions.status.pending', 'Pending')}</option>
                  <option value="Accepted">{t('pages.admin.studentSubscriptions.status.accepted', 'Accepted')}</option>
                  <option value="Rejected">{t('pages.admin.studentSubscriptions.status.rejected', 'Rejected')}</option>
                  <option value="Cancelled">{t('pages.admin.studentSubscriptions.status.cancelled', 'Cancelled')}</option>
                  <option value="Expired">{t('pages.admin.studentSubscriptions.status.expired', 'Expired')}</option>
                </Select>
              </div>

              {/* Payment Method Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t('pages.admin.studentSubscriptions.filters.paymentMethod', 'Payment Method')}</label>
                <Select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value as PaymentMethod | 'all')}
                >
                  <option value="all">{t('pages.admin.studentSubscriptions.filters.allMethods', 'All Methods')}</option>
                  <option value="Online">{t('pages.admin.studentSubscriptions.paymentMethod.online', 'InstaPay')}</option>
                  <option value="Offline">{t('pages.admin.studentSubscriptions.paymentMethod.offline', 'Offline')}</option>
                </Select>
              </div>

              {/* Plan Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t('pages.admin.studentSubscriptions.filters.plan', 'Subscription Plan')}</label>
                <Select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                >
                  <option value="all">{t('pages.admin.studentSubscriptions.filters.allPlans', 'All Plans')}</option>
                  {planOptions.map(plan => (
                    <option key={plan} value={plan}>{plan}</option>
                  ))}
                </Select>
              </div>

              {/* Date Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t('pages.admin.studentSubscriptions.filters.dateRange', 'Date Range')}</label>
                <Select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                >
                  <option value="all">{t('pages.admin.studentSubscriptions.filters.allTime', 'All Time')}</option>
                  <option value="today">{t('pages.admin.studentSubscriptions.filters.today', 'Today')}</option>
                  <option value="week">{t('pages.admin.studentSubscriptions.filters.thisWeek', 'This Week')}</option>
                  <option value="month">{t('pages.admin.studentSubscriptions.filters.thisMonth', 'This Month')}</option>
                  <option value="custom">{t('pages.admin.studentSubscriptions.filters.customRange', 'Custom Range')}</option>
                </Select>
              </div>

              {/* Amount Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t('pages.admin.studentSubscriptions.filters.amountRange', 'Amount Range')}</label>
                <Select
                  value={amountFilter}
                  onChange={(e) => setAmountFilter(e.target.value as any)}
                >
                  <option value="all">{t('pages.admin.studentSubscriptions.filters.allAmounts', 'All Amounts')}</option>
                  <option value="low">{t('pages.admin.studentSubscriptions.filters.low', 'Low ($0 - $100)')}</option>
                  <option value="medium">{t('pages.admin.studentSubscriptions.filters.medium', 'Medium ($100 - $500)')}</option>
                  <option value="high">{t('pages.admin.studentSubscriptions.filters.high', 'High ($500+)')}</option>
                </Select>
              </div>

              {/* Custom Date Range */}
              {dateFilter === 'custom' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{t('pages.admin.studentSubscriptions.filters.customRange', 'Custom Range')}</label>
                  <div className="space-y-2">
                    <Input
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                      placeholder={t('pages.admin.studentSubscriptions.filters.fromDate', 'From Date')}
                    />
                    <Input
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                      placeholder={t('pages.admin.studentSubscriptions.filters.toDate', 'To Date')}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Subscription Payments Table */}
      <Card className="rounded-xl border bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            {t('pages.admin.studentSubscriptions.table.title', 'Subscription Payments')}
            {hasActiveFilters && (
              <Badge variant="outline" className="ml-2">
                {studentSubscriptions.length} {t('pages.admin.studentSubscriptions.table.filtered', 'filtered')}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {studentSubscriptions.length} {t('pages.admin.studentSubscriptions.table.payments', 'payment(s)')} {t('pages.admin.studentSubscriptions.table.fromApi', 'from /api/Payment endpoint')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
          <Table className="min-w-[900px] sm:min-w-0">
            <TableHeader>
              <TableRow>
                <TableHead>{t('pages.admin.studentSubscriptions.table.student', 'Student')}</TableHead>
                <TableHead>{t('pages.admin.studentSubscriptions.table.plan', 'Plan')}</TableHead>
                <TableHead>{t('pages.admin.studentSubscriptions.table.amount', 'Amount')}</TableHead>
                <TableHead>{t('pages.admin.studentSubscriptions.table.paymentMethod', 'Payment Method')}</TableHead>
                <TableHead>{t('pages.admin.studentSubscriptions.table.status', 'Status')}</TableHead>
                <TableHead>{t('pages.admin.studentSubscriptions.table.date', 'Date')}</TableHead>
                <TableHead>{t('pages.admin.studentSubscriptions.table.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentSubscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2">
                      <AlertCircle className="w-12 h-12 text-gray-400" />
                      <div className="text-lg font-medium text-gray-500">{t('pages.admin.studentSubscriptions.empty.noData', 'No Payment Data')}</div>
                      <div className="text-sm text-gray-400">
                        {payments.length === 0 
                          ? t('pages.admin.studentSubscriptions.empty.noDataAvailable', 'No payment data available. Please check if you are logged in as admin.')
                          : t('pages.admin.studentSubscriptions.empty.noSubscriptionPayments', 'No subscription payments found in the system.')
                        }
                      </div>
                      <Button 
                        onClick={load} 
                        variant="outline" 
                        className="mt-2"
                      >
                        {t('pages.admin.studentSubscriptions.empty.refresh', 'Refresh Data')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                studentSubscriptions.map(row => (
                  <TableRow key={row.paymentId} className={getRowClassName(row.status)}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{row.studentName}</div>
                        <div className="text-sm text-gray-500">{row.studentEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{row.planName}</div>
                        <div className="text-sm text-gray-500">
                          {row.planDuration} {t('pages.admin.studentSubscriptions.labels.days', 'days')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-green-600">
                        ${row.amount?.toFixed(2) || '0.00'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{getPaymentMethodDisplay(row.paymentMethod)}</div>
                        {row.paymentReferenceCode && (
                          <div className="text-sm text-gray-500">
                            {t('pages.admin.studentSubscriptions.labels.ref', 'Ref:')} {row.paymentReferenceCode}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(row.status)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm">
                          {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : t('common.na', 'N/A')}
                        </div>
                        {row.reviewedAt && (
                          <div className="text-xs text-gray-500">
                            {t('pages.admin.studentSubscriptions.labels.reviewed', 'Reviewed:')} {new Date(row.reviewedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.paymentId && row.status === 'Pending' && (
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => reviewPayment(row.paymentId!, PaymentStatus.Accepted, t('pages.admin.studentSubscriptions.reviewNotes.accept', 'Payment approved by admin'))}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {t('pages.admin.studentSubscriptions.actions.accept', 'Accept')}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => reviewPayment(row.paymentId!, PaymentStatus.Rejected, t('pages.admin.studentSubscriptions.reviewNotes.reject', 'Payment rejected by admin'))}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            {t('pages.admin.studentSubscriptions.actions.reject', 'Reject')}
                          </Button>
                        </div>
                      )}
                      {row.status === 'Accepted' && (
                        <div className="text-sm text-green-600 font-medium">
                          ✓ {t('pages.admin.studentSubscriptions.labels.active', 'Active')}
                        </div>
                      )}
                      {row.status === 'Rejected' && (
                        <div className="text-sm text-red-600 font-medium">
                          ✗ {t('pages.admin.studentSubscriptions.status.rejected', 'Rejected')}
                        </div>
                      )}
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


