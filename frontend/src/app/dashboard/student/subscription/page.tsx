'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/contexts/LanguageContext';
import { formatCurrency, formatDate } from '@/lib/format';
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
// import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { paymentAPI, subscriptionPlansAPI, studentSubscriptionAPI } from '@/lib/api';
import { PaymentMethod, PaymentStatus, CreatePaymentDTO, StudentSubscriptionViewModel, SubscriptionStatus } from '@/types/subscription';
import { CheckCircle, CreditCard, Crown, Shield, Bell, Smartphone, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';

// Define proper types for the data
interface StudentProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  year: number;
  studentId: string;
  avatar?: string | null;
  createdAt: string;
  updatedAt: string;
  subscriptionStatus?: string;
  subscriptionPlan?: any;
}

interface Payment {
  id: number;
  studentId: number;
  tripId?: number;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  date?: string;
  createdAt: string;
  updatedAt?: string;
  description?: string;
  // New fields from PaymentViewModel
  studentName?: string;
  studentEmail?: string;
  subscriptionPlanId: number;
  subscriptionPlanName?: string;
  subscriptionCode?: string;
  paymentMethodText?: string;
  paymentReferenceCode?: string;
  statusText?: string;
  adminReviewedById?: number;
  adminReviewedByName?: string;
  reviewedAt?: string;
}

interface Plan {
  id: number;
  name: string;
  type?: string;
  description?: string;
  price: number;
  duration?: string;
  recommended?: boolean;
  maxNumberOfRides?: number;
  durationInDays?: number;
  isActive?: boolean;
}

export default function StudentSubscriptionPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const { t, lang } = useI18n() as any;
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<StudentSubscriptionViewModel | null>(null);
  const [loading, setLoading] = useState(true);

  const [methodModalOpen, setMethodModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.Online);
  const [submitting, setSubmitting] = useState(false);
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [paymentReferenceCode, setPaymentReferenceCode] = useState('');
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  // Distinguish between online channels: 'instapay' or 'vodafone'
  const [onlineChannel, setOnlineChannel] = useState<'instapay' | 'vodafone'>('instapay');
  // Distinguish between offline channels: 'offline' (cash/manual) or 'visa'
  const [offlineChannel, setOfflineChannel] = useState<'offline' | 'visa'>('offline');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        console.log('🔍 Fetching data for user:', user.id);
        
        const [paymentsRes, plansRes, activeSubscriptionRes] = await Promise.all([
          paymentAPI.getByStudent(user.id.toString()),
          subscriptionPlansAPI.getActive().catch(() => []),
          studentSubscriptionAPI.getMyActiveSubscription().catch(() => null)
        ]);

        console.log('💳 Payments response:', paymentsRes);
        console.log('📋 Plans response:', plansRes);
        console.log('🎯 Active subscription response:', activeSubscriptionRes);

        // Use user data as profile since profile page is removed
        if (user) {
          setProfile({
            id: user.id.toString(),
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            year: (user as any).year || 1,
            studentId: (user as any).studentId || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } as StudentProfile);
        }
        if (paymentsRes) {
          setPayments(paymentsRes as Payment[]);
        }
        if (plansRes) {
          setPlans(plansRes as Plan[]);
        }
        if (activeSubscriptionRes) {
          setActiveSubscription(activeSubscriptionRes);
        }
      } catch (error) {
        console.error('❌ Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const lastSubscriptionPayment = useMemo(() => {
    const subscriptionPayments = (payments || []).filter((x: Payment) => !x.tripId);
    console.log('🔍 Subscription payments:', subscriptionPayments);
    
    const sorted = subscriptionPayments.sort((a: Payment, b: Payment) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    const last = sorted[0];
    console.log('📅 Last subscription payment:', last);
    return last;
  }, [payments]);

  // Get current plan details from active subscription or last payment
  const currentPlanDetails = useMemo(() => {
    console.log('🔍 Active subscription:', activeSubscription);
    console.log('🔍 Looking for plan with ID:', activeSubscription?.subscriptionPlanId || lastSubscriptionPayment?.subscriptionPlanId);
    console.log('📋 Available plans:', plans);
    
    const planId = activeSubscription?.subscriptionPlanId || lastSubscriptionPayment?.subscriptionPlanId;
    if (planId) {
      const found = plans.find(plan => plan.id === planId);
      console.log('✅ Found plan:', found);
      return found;
    }
    return null;
  }, [activeSubscription, lastSubscriptionPayment, plans]);

  const currentPlan = activeSubscription?.subscriptionPlanName || currentPlanDetails?.name || lastSubscriptionPayment?.subscriptionPlanName || profile?.subscriptionPlan || null;
  const currentMethod = activeSubscription?.paymentMethod || lastSubscriptionPayment?.paymentMethod || null;
  const currentStatus = activeSubscription?.status || lastSubscriptionPayment?.status || profile?.subscriptionStatus || 'inactive';
  
  // Map subscription status to display status
  const status = useMemo(() => {
    // Handle SubscriptionStatus enum values
    if (currentStatus === SubscriptionStatus.Active || currentStatus === 'Active') return 'active';
    if (currentStatus === SubscriptionStatus.PendingActivation || currentStatus === SubscriptionStatus.PendingPayment || 
        currentStatus === 'PendingActivation' || currentStatus === 'PendingPayment') return 'pending';
    if (currentStatus === SubscriptionStatus.Expired || currentStatus === SubscriptionStatus.Cancelled || 
        currentStatus === SubscriptionStatus.Suspended || currentStatus === 'Expired' || 
        currentStatus === 'Cancelled' || currentStatus === 'Suspended') return 'inactive';
    
    // Handle legacy payment status values
    if (currentStatus === 'Accepted' || currentStatus === 'completed') return 'active';
    if (currentStatus === 'Pending' || currentStatus === 'pending') return 'pending';
    if (currentStatus === 'Rejected' || currentStatus === 'failed') return 'inactive';
    
    return 'inactive';
  }, [currentStatus]);

  // Debug final values
  console.log('🎯 Final values:', {
    currentPlan,
    currentMethod,
    currentStatus,
    status,
    currentPlanDetails,
    lastSubscriptionPayment,
    activeSubscription,
    paymentsCount: payments?.length || 0,
    plansCount: plans?.length || 0
  });

  const handleChoosePlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setPaymentMethod(PaymentMethod.Online);
    setOnlineChannel('instapay');
    setOfflineChannel('offline');
    setPaymentReferenceCode('');
    setMethodModalOpen(true);
  };

  const handleUpgradeClick = () => {
    console.log('🔍 Upgrade clicked - Current subscription:', activeSubscription);
    console.log('🔍 Current plan name:', currentPlan);
    console.log('🔍 Available plans:', plans);
    
    // Filter out the current plan and show only upgrade options
    const upgradeOptions = (plans || []).filter((plan: Plan) => {
      const currentPlanName = activeSubscription?.subscriptionPlanName || currentPlan;
      const currentPlanId = activeSubscription?.subscriptionPlanId;
      
      console.log('🔍 Checking plan:', plan.name, 'vs current:', currentPlanName, 'ID:', plan.id, 'vs current ID:', currentPlanId);
      
      // Filter by both name and ID to be more precise
      const isDifferentPlan = plan.name !== currentPlanName && 
                             plan.type !== currentPlanName && 
                             plan.id !== currentPlanId;
      
      console.log('🔍 Is different plan:', isDifferentPlan);
      return isDifferentPlan;
    });
    
    console.log('🎯 Upgrade options found:', upgradeOptions);
    setAvailablePlans(upgradeOptions);
    setUpgradeModalOpen(true);
  };

  const handleSelectUpgradePlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setPaymentMethod(PaymentMethod.Online);
    setOnlineChannel('instapay');
    setOfflineChannel('offline');
    setPaymentReferenceCode('');
    setUpgradeModalOpen(false);
    setMethodModalOpen(true);
  };

  const handleSubscribe = async () => {
    if (!user || !selectedPlan) {
      console.error('❌ Missing user or selected plan:', { user: !!user, selectedPlan });
      return;
    }
    
    console.log('🚀 Starting subscription process:', {
      user: user.id,
      selectedPlan: selectedPlan.name,
      planId: selectedPlan.id,
      paymentMethod,
      paymentReferenceCode: paymentReferenceCode ? '***' : 'none'
    });
    
    // Validation for online payment (InstaPay only)
    if (paymentMethod === PaymentMethod.Online && onlineChannel === 'instapay' && !paymentReferenceCode.trim()) {
      showToast({
        type: 'error',
        title: t('pages.student.subscription.validationError', 'Validation Error'),
        message: t('pages.student.subscription.refRequired', 'Payment reference code is required for InstaPay transactions')
      });
      return;
    }

    // Validation for reference code length (InstaPay only)
    if (paymentMethod === PaymentMethod.Online && onlineChannel === 'instapay' && paymentReferenceCode.trim().length < 3) {
      showToast({
        type: 'error',
        title: t('pages.student.subscription.validationError', 'Validation Error'),
        message: t('pages.student.subscription.refMin', 'Payment reference code must be at least 3 characters long')
      });
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Create payment using the new API
      const paymentData: CreatePaymentDTO = {
        subscriptionPlanId: selectedPlan.id,
        paymentMethod: paymentMethod,
        paymentReferenceCode: (paymentMethod === PaymentMethod.Online && onlineChannel === 'instapay') ? paymentReferenceCode.trim() : null
      };

      console.log('📤 Sending payment data:', paymentData);

      const res = await paymentAPI.create(paymentData);
      
      console.log('📥 Payment API response:', res);

      if (res?.success) {
  // Determine if this is an upgrade (not used directly here, kept for potential future logic)
  // const isUpgrade = activeSubscription && selectedPlan.id !== activeSubscription.subscriptionPlanId;
  // const actionText = isUpgrade ? 'upgraded' : 'subscribed';
        
        showToast({
          type: 'success',
          title: t('pages.student.subscription.successTitle', 'Success!'),
          message: paymentMethod === PaymentMethod.Online
            ? t('pages.student.subscription.paymentSubmitted', 'Payment submitted successfully') + ` — ${selectedPlan.name}`
            : t('pages.student.subscription.paymentPending', 'Payment pending admin approval') + ` — ${selectedPlan.name}`
        });
        
        console.log('✅ Payment successful, refreshing data...');
        
        // Refresh data
        const [paymentsRes, activeSubscriptionRes] = await Promise.all([
          paymentAPI.getByStudent(user.id.toString()),
          studentSubscriptionAPI.getMyActiveSubscription().catch(() => null)
        ]);

        console.log('🔄 Data refresh results:', {
          payments: paymentsRes?.length || 0,
          activeSubscription: !!activeSubscriptionRes
        });

        // Update profile with current user data
        if (user) {
          setProfile({
            id: user.id.toString(),
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            year: (user as any).year || 1,
            studentId: (user as any).studentId || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } as StudentProfile);
        }
        if (paymentsRes) {
          setPayments(paymentsRes as Payment[]);
        }
        if (activeSubscriptionRes) {
          setActiveSubscription(activeSubscriptionRes);
        }
        
        setMethodModalOpen(false);
        
        // Show pending modal for offline payments
        if (paymentMethod === PaymentMethod.Offline) {
          setPendingModalOpen(true);
        }
      } else {
        console.error('❌ Payment failed:', res);
        throw new Error(res?.message || 'Payment failed');
      }
    } catch (error) {
      console.error('❌ Payment error details:', error);
      
      // More detailed error message
  let errorMessage = t('pages.student.subscription.errors.processFailed', 'Failed to process payment. Please try again.');
      
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          errorMessage = t('pages.student.subscription.errors.authFailed', 'Authentication failed. Please log in again.');
        } else if (error.message.includes('400')) {
          errorMessage = t('pages.student.subscription.errors.invalidData', 'Invalid payment data. Please check your information.');
        } else if (error.message.includes('500')) {
          errorMessage = t('pages.student.subscription.errors.serverError', 'Server error. Please try again later.');
        } else if (error.message.includes('network')) {
          errorMessage = t('pages.student.subscription.errors.network', 'Network error. Please check your connection.');
        } else {
          errorMessage = error.message || errorMessage;
        }
      }
      
      showToast({
        type: 'error',
        title: t('common.error', 'Error'),
        message: errorMessage
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-4 sm:p-6">{t('common.loading', 'Loading...')}</div>;

  return (
    <div className="p-4 sm:p-6 space-y-8">
      {/* Current Subscription Card - Redesigned */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <Card className={`relative overflow-hidden border-2 shadow-lg transition-all duration-300 ${
          status === 'active' 
            ? 'border-orange-200 bg-gradient-to-br from-orange-50 to-orange-50' 
            : status === 'pending'
            ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50'
            : 'border-gray-200 bg-gradient-to-br from-gray-50 to-slate-50'
        }`}>
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-current rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-current rounded-full translate-y-12 -translate-x-12"></div>
          </div>

          <CardHeader className="relative z-10 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${
                  status === 'active' 
                    ? 'bg-green-100 text-green-600' 
                    : status === 'pending'
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <Shield className="w-6 h-6" />
                </div>
            <div>
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    {t('pages.student.subscription.currentTitle', 'Current Subscription')}
                  </CardTitle>
                  <CardDescription className="text-gray-600 mt-1">
                    {t('pages.student.subscription.currentSubtitle', 'Your subscription status and plan details')}
                  </CardDescription>
                </div>
            </div>
              
              {/* Status Badge */}
              <div className="flex sm:flex-col items-start sm:items-end gap-2">
              {status === 'active' && (
                  <Badge className="bg-green-100 text-green-800 border-green-200 px-4 py-2 text-sm font-semibold">
                    <CheckCircle className="w-4 h-4 mr-2" /> 
                    {t('pages.student.subscription.status.active', 'Active')}
                </Badge>
              )}
              {status === 'pending' && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 px-4 py-2 text-sm font-semibold">
                    <Bell className="w-4 h-4 mr-2" />
                    {t('pages.student.subscription.status.pending', 'Pending Approval')}
                  </Badge>
              )}
              {status !== 'active' && status !== 'pending' && (
                  <Badge variant="outline" className="px-4 py-2 text-sm font-semibold border-gray-300 text-gray-600">
                    {t('pages.student.subscription.status.noActive', 'No Active Plan')}
                  </Badge>
              )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="relative z-10 pt-0">
            {status === 'active' && (activeSubscription || currentPlanDetails) ? (
              /* Active Subscription Layout */
              <div className="space-y-6">
                {/* Main Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Plan Info */}
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Crown className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{t('pages.student.subscription.planDetails', 'Plan Details')}</h3>
                        <p className="text-sm text-gray-600">{t('pages.student.subscription.currentPlan', 'Your current plan')}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
              <div>
                        <div className="text-sm text-gray-500 mb-1">{t('pages.student.subscription.planName', 'Plan Name')}</div>
                        <div className="text-xl font-bold text-gray-900">
                          {activeSubscription?.subscriptionPlanName || currentPlanDetails?.name || '—'}
                        </div>
                   </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-gray-500 mb-1">{t('pages.student.subscription.price', 'Price')}</div>
                          <div className="text-lg font-semibold text-green-600">
                            {formatCurrency(lang, activeSubscription?.subscriptionPlanPrice ?? currentPlanDetails?.price)}
                   </div>
              </div>
              <div>
                          <div className="text-sm text-gray-500 mb-1">{t('pages.student.subscription.duration', 'Duration')}</div>
                          <div className="text-lg font-semibold text-gray-900">
                            {activeSubscription?.durationInDays || currentPlanDetails?.durationInDays || '—'} {t('pages.student.subscription.days','days')}
                          </div>
                        </div>
                 </div>
                   </div>
                   </div>

                  {/* Payment Info */}
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                        <h3 className="font-semibold text-gray-900">{t('pages.student.subscription.paymentInfo', 'Payment Info')}</h3>
                        <p className="text-sm text-gray-600">{t('pages.student.subscription.paymentInfoDesc', 'Payment method & reference')}</p>
                      </div>
                   </div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-gray-500 mb-1">{t('pages.student.subscription.method', 'Method')}</div>
                        <div className="text-lg font-semibold text-gray-900 capitalize">
                          {currentMethod === 'Online' 
                            ? t('pages.student.subscription.methodOnlineName','InstaPay') 
                            : currentMethod === 'Offline' 
                              ? t('pages.student.subscription.methodOffline','Cash') 
                              : currentMethod || '—'}
                   </div>
              </div>
                      {(activeSubscription?.paymentReferenceCode || lastSubscriptionPayment?.paymentReferenceCode) && (
              <div>
                          <div className="text-sm text-gray-500 mb-1">{t('pages.student.subscription.referenceCode', 'Reference Code')}</div>
                          <div className="text-sm font-mono bg-gray-100 px-3 py-2 rounded-lg text-gray-800">
                            {activeSubscription?.paymentReferenceCode || lastSubscriptionPayment?.paymentReferenceCode}
                   </div>
                   </div>
                 )}
               </div>
             </div>
            
                  {/* Status & Dates */}
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{t('pages.student.subscription.statusDates', 'Status & Dates')}</h3>
                        <p className="text-sm text-gray-600">{t('pages.student.subscription.timeline', 'Subscription timeline')}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-gray-500 mb-1">{t('pages.student.subscription.statusLabel', 'Status')}</div>
                        <div className="text-lg font-semibold text-green-600 capitalize">
                          {activeSubscription?.isActive 
                            ? t('pages.student.subscription.status.active','Active') 
                            : t('pages.student.subscription.status.inactive','Inactive')}
                        </div>
                      </div>
                      {activeSubscription && (
                        <>
                          <div>
                            <div className="text-sm text-gray-500 mb-1">{t('pages.student.subscription.startDate', 'Start Date')}</div>
                            <div className="text-sm font-semibold text-gray-900">
                              {formatDate(lang, activeSubscription.startDate)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500 mb-1">{t('pages.student.subscription.endDate', 'End Date')}</div>
                            <div className="text-sm font-semibold text-gray-900">
                              {formatDate(lang, activeSubscription.endDate)}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress Bar for Active Subscription */}
                {activeSubscription && (
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/50">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">{t('pages.student.subscription.progress', 'Subscription Progress')}</h3>
                      <span className="text-sm text-gray-600">
                        {Math.round(((new Date().getTime() - new Date(activeSubscription.startDate).getTime()) / 
                        (new Date(activeSubscription.endDate).getTime() - new Date(activeSubscription.startDate).getTime())) * 100)}% {t('pages.student.subscription.used', 'Used')}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-orange-400 to-orange-600 h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(0, ((new Date().getTime() - new Date(activeSubscription.startDate).getTime()) / 
                          (new Date(activeSubscription.endDate).getTime() - new Date(activeSubscription.startDate).getTime())) * 100))}%`
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>{t('pages.student.subscription.startShort', 'Start')}: {formatDate(lang, activeSubscription.startDate)}</span>
                      <span>{t('pages.student.subscription.endShort', 'End')}: {formatDate(lang, activeSubscription.endDate)}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* No Active Subscription Layout */
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                  <Shield className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('pages.student.subscription.noActiveTitle', 'No Active Subscription')}</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {t('pages.student.subscription.noActiveDesc', "You don't have an active subscription plan. Choose a plan below to get started with our bus service.")}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-white/50">
                    <div className="text-sm text-gray-500 mb-1">{t('pages.student.subscription.lastPayment', 'Last Payment')}</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {lastSubscriptionPayment?.createdAt ? 
                        formatDate(lang, lastSubscriptionPayment.createdAt) : t('common.na','N/A')}
                    </div>
                  </div>
                  <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-white/50">
                    <div className="text-sm text-gray-500 mb-1">{t('pages.student.subscription.paymentMethod', 'Payment Method')}</div>
                    <div className="text-lg font-semibold text-gray-900 capitalize">
                      {currentMethod === 'Online' 
                        ? t('pages.student.subscription.methodOnlineName','InstaPay') 
                        : currentMethod === 'Offline' 
                          ? t('pages.student.subscription.methodOffline','Cash') 
                          : currentMethod || '—'}
                    </div>
                  </div>
              </div>
            </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Pending Approval Banner for cash */}
  {currentMethod?.toLowerCase() === 'cash' && status !== 'active' && (
        <Card className="border-2 border-amber-200 bg-amber-50">
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-amber-800 text-sm">
      <div className="font-semibold mb-1">{t('pages.student.subscription.cashWaitTitle', 'Wait for confirmation')}</div>
      <div>{t('pages.student.subscription.cashWaitMsg', 'Your payment is cash. Please wait for admin to confirm before accessing bus features.')}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" onClick={() => window.location.reload()} className="w-full sm:w-auto">{t('pages.student.subscription.refresh', 'Refresh')}</Button>
              <Button variant="destructive" onClick={logout} className="w-full sm:w-auto">{t('common.logout', 'Logout')}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans Grid */}
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
          <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Crown className="w-5 h-5 text-secondary" /> {t('pages.student.subscription.yourPlan', 'Your Plan')}
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            {status === 'active' && activeSubscription && (
              <Button 
                onClick={handleUpgradeClick}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
              >
                <Crown className="w-4 h-4 mr-2" />
                {t('pages.student.subscription.upgradePlan', 'Upgrade Plan')}
              </Button>
            )}
            <span className="text-sm text-text-muted">
              {status === 'active' ? t('pages.student.subscription.upgradeHint', 'Upgrade your current plan') : t('pages.student.subscription.selectPlanHint', 'Select a plan and proceed to payment')}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {(((currentPlan && status) ? (plans || []).filter((p: Plan) => {
              const t = String(p.type || p.name || '').toLowerCase();
              const c = String(currentPlan).toLowerCase();
              return t === c;
            }) : (plans || [])) as Plan[]).map((plan) => (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.25 }}>
              <Card className={`relative group rounded-2xl border-2 ${ (currentPlan && (plan.name === currentPlan || plan.type === currentPlan)) ? 'border-secondary/50' : 'border-border'} hover:border-primary/40 shadow-sm hover:shadow-md transition` }>
                {(plan.recommended || plan.type === 'Two Terms' || plan.name?.toLowerCase().includes('two')) && (
                  <div className="absolute -top-3 left-4 text-xs px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/30 flex items-center gap-1">
                    <Crown className="w-3 h-3" /> {t('pages.student.subscription.recommended', 'Recommended')}
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <span className="font-medium">{plan.duration || t('pages.student.subscription.oneTerm', 'One term')}</span>
                    <span className="text-text-muted">•</span>
                    <span className="font-semibold">{typeof plan.price === 'number' ? formatCurrency(lang, plan.price) : '—'}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {[
                      t('pages.student.subscription.feature.routes', 'Access to bus routes'),
                      t('pages.student.subscription.feature.support', 'Priority support'),
                      t('pages.student.subscription.feature.manage', 'Manage bookings')
                    ].map((feat, idx) => (
                      <li key={`${plan.id}-f-${idx}`} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span className="text-text-secondary">{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex gap-3">
                    {(currentPlan && (plan.name === currentPlan || plan.type === currentPlan)) ? (
                      <>
                        <Button className="w-full" disabled>
                          {t('pages.student.subscription.currentPlanBtn', 'Current Plan')}
                        </Button>
                        {String(currentPlan).toLowerCase() === 'term' && (
                          <Button variant="outline" onClick={() => handleChoosePlan(plan)}>
                            {t('pages.student.subscription.upgradeTwoTerms', 'Upgrade to Two Terms')}
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button className="w-full" onClick={() => handleChoosePlan(plan)}>
                        {currentPlan ? t('pages.student.subscription.upgrade', 'Upgrade') : t('pages.student.subscription.choosePlan', 'Choose Plan')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Payment Method Modal */}
  <Modal isOpen={methodModalOpen} onClose={() => setMethodModalOpen(false)} title={t('pages.student.subscription.paymentMethodTitle', 'Payment Method')} size="lg">
        <div className="space-y-3">
          {/* Plan Summary - Compact */}
          {selectedPlan && (
            <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">{selectedPlan.name}</h3>
                    <p className="text-sm text-gray-600">{selectedPlan.duration || t('pages.student.subscription.oneTerm', 'One term')}</p>
                  {activeSubscription && selectedPlan.id !== activeSubscription.subscriptionPlanId && (
                    <div className="flex items-center gap-1 mt-1">
                      <Crown className="w-3 h-3 text-purple-600" />
                      <span className="text-xs text-purple-600 font-medium">{t('pages.student.subscription.upgradeFrom', 'Upgrade from')} {activeSubscription.subscriptionPlanName}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
          <div className="text-2xl font-bold text-primary">{formatCurrency(lang, selectedPlan.price)}</div>
                  {activeSubscription && selectedPlan.id !== activeSubscription.subscriptionPlanId && (
                    <div className="text-xs text-gray-500 mt-1">
            {t('common.current','Current')}: {formatCurrency(lang, activeSubscription.subscriptionPlanPrice)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Payment Methods - Side by Side */}
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-900">{t('pages.student.subscription.choosePaymentMethod', 'Choose Payment Method')}</h4>
            <div className="grid grid-cols-4 gap-3">
              {/* Online Payment Option */}
              <button
                className={`p-3 border-2 rounded-lg text-center transition-all ${
                  paymentMethod === PaymentMethod.Online && onlineChannel === 'instapay'
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-primary/40'
                }`}
                onClick={() => { setPaymentMethod(PaymentMethod.Online); setOnlineChannel('instapay'); }}
              >
                <div className="space-y-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto ${
                    paymentMethod === PaymentMethod.Online && onlineChannel === 'instapay'
                      ? 'bg-primary text-white' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{t('pages.student.subscription.methodOnlineName', 'InstaPay')}</div>
                    <div className="text-xs text-gray-600">{t('pages.student.subscription.methodOnline', 'Online')}</div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 mx-auto ${
                    paymentMethod === PaymentMethod.Online && onlineChannel === 'instapay'
                      ? 'border-primary bg-primary' 
                      : 'border-gray-300'
                  }`}>
                    {paymentMethod === PaymentMethod.Online && onlineChannel === 'instapay' && (
                      <div className="w-1.5 h-1.5 bg-white rounded-full m-0.5"></div>
                    )}
                  </div>
                </div>
              </button>

              {/* Vodafone Cash (treated as Online) */}
              <button
                className={`p-3 border-2 rounded-lg text-center transition-all ${
                  paymentMethod === PaymentMethod.Online && onlineChannel === 'vodafone'
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-primary/40'
                }`}
                onClick={() => { setPaymentMethod(PaymentMethod.Online); setOnlineChannel('vodafone'); }}
              >
                <div className="space-y-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto ${
                    paymentMethod === PaymentMethod.Online && onlineChannel === 'vodafone'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{lang === 'ar' ? 'فودافون كاش' : 'Vodafone Cash'}</div>
                    <div className="text-xs text-gray-600">{t('pages.student.subscription.methodOnline', 'Online')}</div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 mx-auto ${
                    paymentMethod === PaymentMethod.Online && onlineChannel === 'vodafone'
                      ? 'border-primary bg-primary'
                      : 'border-gray-300'
                  }`}>
                    {paymentMethod === PaymentMethod.Online && onlineChannel === 'vodafone' && (
                      <div className="w-1.5 h-1.5 bg-white rounded-full m-0.5"></div>
                    )}
                  </div>
                </div>
              </button>

              {/* Offline Payment Option */}
              <button
                className={`p-3 border-2 rounded-lg text-center transition-all ${
                  paymentMethod === PaymentMethod.Offline && offlineChannel === 'offline'
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-primary/40'
                }`}
                onClick={() => { setPaymentMethod(PaymentMethod.Offline); setOfflineChannel('offline'); }}
              >
                <div className="space-y-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto ${
                    paymentMethod === PaymentMethod.Offline && offlineChannel === 'offline'
                      ? 'bg-primary text-white' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{t('pages.student.subscription.methodOffline', 'Cash')}</div>
                    <div className="text-xs text-gray-600">{t('pages.student.subscription.methodManual', 'Manual')}</div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 mx-auto ${
                    paymentMethod === PaymentMethod.Offline && offlineChannel === 'offline'
                      ? 'border-primary bg-primary' 
                      : 'border-gray-300'
                  }`}>
                    {paymentMethod === PaymentMethod.Offline && offlineChannel === 'offline' && (
                      <div className="w-1.5 h-1.5 bg-white rounded-full m-0.5"></div>
                    )}
                  </div>
                </div>
              </button>

              {/* Visa (treated as Offline with office visit) */}
              <button
                className={`p-3 border-2 rounded-lg text-center transition-all ${
                  paymentMethod === PaymentMethod.Offline && offlineChannel === 'visa'
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-primary/40'
                }`}
                onClick={() => { setPaymentMethod(PaymentMethod.Offline); setOfflineChannel('visa'); }}
              >
                <div className="space-y-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto ${
                    paymentMethod === PaymentMethod.Offline && offlineChannel === 'visa'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{lang === 'ar' ? 'فيزا' : 'Visa'}</div>
                    <div className="text-xs text-gray-600">{t('pages.student.subscription.methodManual', 'Manual')}</div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 mx-auto ${
                    paymentMethod === PaymentMethod.Offline && offlineChannel === 'visa'
                      ? 'border-primary bg-primary'
                      : 'border-gray-300'
                  }`}>
                    {paymentMethod === PaymentMethod.Offline && offlineChannel === 'visa' && (
                      <div className="w-1.5 h-1.5 bg-white rounded-full m-0.5"></div>
                    )}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Bank Account Information - Compact */}
          {paymentMethod === PaymentMethod.Online && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-blue-600">🏦</span>
                <h5 className="font-semibold text-blue-900">
                  {onlineChannel === 'vodafone'
                    ? (lang === 'ar' ? 'معلومات فودافون كاش' : 'Vodafone Cash Info')
                    : t('pages.student.subscription.bankInfo', 'Bank Transfer Info')}
                </h5>
              </div>
              <div className="space-y-2">
                <div className="bg-white p-3 rounded border border-blue-200 space-y-2">
                  {onlineChannel === 'vodafone' ? (
                    <>
                      <div className={`text-sm text-gray-700 ${lang === 'ar' ? 'text-right' : 'text-left'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                        {lang === 'ar' ? 'أرقام التحويل:' : 'Transfer numbers:'}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold text-blue-800 bg-blue-100 px-2 py-1 rounded text-sm">01030019746</span>
                        <button
                          onClick={() => navigator.clipboard.writeText('01030019746')}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                          title={t('pages.student.subscription.copy', 'Copy')}
                        >
                          📋
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold text-blue-800 bg-blue-100 px-2 py-1 rounded text-sm">01050076357</span>
                        <button
                          onClick={() => navigator.clipboard.writeText('01050076357')}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                          title={t('pages.student.subscription.copy', 'Copy')}
                        >
                          📋
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{t('pages.student.subscription.accountNumber', 'Account Number')}:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-blue-800 bg-blue-100 px-2 py-1 rounded text-sm">
                            3640001000011832
                          </span>
                          <button
                            onClick={() => navigator.clipboard.writeText('3640001000011832')}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                            title={t('pages.student.subscription.copy', 'Copy')}
                          >
                            📋
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{t('pages.student.subscription.accountName', 'Account Name')}:</span>
                        <span className="font-semibold text-blue-800 bg-blue-100 px-2 py-1 rounded text-sm">
                          شركه الريناد للتوريدات والنقل
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <div className="bg-amber-50 border border-amber-200 p-2 rounded text-xs text-amber-800">
                  <p className="font-medium">{t('pages.student.subscription.transfer', '⚠️ Transfer')} {formatCurrency(lang, selectedPlan?.price)}</p>
                </div>
                {/* Transfer instructions (InstaPay/Vodafone) */}
                <div className="mt-3 bg-white p-3 rounded border border-blue-200 space-y-2">
                  <p
                    className={`text-sm text-gray-800 ${lang === 'ar' ? 'text-right' : 'text-left'}`}
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  >
                    {lang === 'ar'
                      ? 'برجاء إرفاق صورة من التحويل إلى أحد الأرقام التالية:'
                      : 'Please attach a screenshot of the transfer to one of the following numbers:'}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-mono font-semibold text-blue-800 bg-blue-100 px-2 py-1 rounded">01030019746</span>
                    <button
                      onClick={() => navigator.clipboard.writeText('01030019746')}
                      className="text-blue-600 hover:text-blue-800"
                      title={t('pages.student.subscription.copy', 'Copy')}
                    >
                      📋
                    </button>
                  </div>
                  
                </div>
              </div>
            </div>
          )}

          {/* Payment Reference Code - Compact (InstaPay only) */}
          {paymentMethod === PaymentMethod.Online && onlineChannel === 'instapay' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {t('pages.student.subscription.paymentRefLabel', 'Payment Reference Code')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={paymentReferenceCode}
                onChange={(e) => setPaymentReferenceCode(e.target.value)}
                placeholder={t('pages.student.subscription.paymentRefPlaceholder', 'Enter InstaPay reference code')}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  paymentMethod === PaymentMethod.Online && onlineChannel === 'instapay' && !paymentReferenceCode.trim() 
                    ? 'border-red-300 focus:ring-red-500' 
                    : 'border-gray-300'
                }`}
                maxLength={100}
                minLength={3}
                required
              />
              {paymentMethod === PaymentMethod.Online && onlineChannel === 'instapay' && !paymentReferenceCode.trim() && (
                <p className="text-xs text-red-500">
                  {t('pages.student.subscription.refRequired', 'Reference code is required for InstaPay transactions')}
                </p>
              )}
            </div>
          )}

          {/* Offline payment instructions */}
          {paymentMethod === PaymentMethod.Offline && (
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
              <p
                className={`text-sm text-amber-800 ${lang === 'ar' ? 'text-right' : 'text-left'}`}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
              >
                {offlineChannel === 'visa'
                  ? (lang === 'ar' ? 'برجاء الذهاب للمقر للدفع وتفعيل حسابك.' : 'Please visit the office to pay and activate your account.')
                  : (lang === 'en'
                    ? 'Please visit the office to pay and activate your account.'
                    : 'برجاء الذهاب للمقر للدفع وتفعيل حسابك')}
              </p>
            </div>
          )}

          {/* Action Buttons - Compact */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setMethodModalOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button 
              onClick={handleSubscribe} 
              disabled={
                submitting || 
                !selectedPlan || 
                (paymentMethod === PaymentMethod.Online && onlineChannel === 'instapay' && !paymentReferenceCode.trim())
              }
            >
              {submitting ? t('pages.student.subscription.processing', 'Processing...') : t('pages.student.subscription.confirmPayment', 'Confirm Payment')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Pending Confirmation Modal for offline payments */}
      <Modal isOpen={pendingModalOpen} onClose={() => setPendingModalOpen(false)} title={t('pages.student.subscription.pendingTitle', 'Payment Pending Approval')} size="md">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <Bell className="w-6 h-6 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800">{t('pages.student.subscription.pendingHeader', 'Payment Submitted Successfully!')}</p>
              <p className="text-sm text-amber-700">
                {t('pages.student.subscription.pendingDesc', "Your offline payment is pending admin approval. You will be notified once it's confirmed.")}
              </p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• {t('pages.student.subscription.pendingPoint1', 'Your payment will be reviewed by an administrator')}</p>
            <p>• {t('pages.student.subscription.pendingPoint2', "You'll receive a notification when approved")}</p>
            <p>• {t('pages.student.subscription.pendingPoint3', 'Check your payment status in the dashboard')}</p>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setPendingModalOpen(false)}>
              {t('common.close', 'Close')}
            </Button>
            <Button onClick={() => window.location.reload()}>
              {t('pages.student.subscription.refreshStatus', 'Refresh Status')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Upgrade Plan Modal */}
  <Modal isOpen={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} title={t('pages.student.subscription.upgradeTitle', 'Upgrade Your Plan')} size="lg">
        <div className="space-y-6">
          {/* Current Plan Info */}
          <div className="bg-gradient-to-r from-orange-50 to-orange-50 p-4 rounded-xl border border-orange-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-800">{t('pages.student.subscription.currentPlanTitle', 'Current Plan')}</h3>
                <p className="text-sm text-green-600">{t('pages.student.subscription.activeSub', 'Your active subscription')}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-green-600 mb-1">{t('pages.student.subscription.planName', 'Plan Name')}</div>
                <div className="font-semibold text-green-800">
                  {activeSubscription?.subscriptionPlanName || currentPlan || '—'}
                </div>
              </div>
              <div>
                <div className="text-sm text-green-600 mb-1">{t('pages.student.subscription.price', 'Price')}</div>
                <div className="font-semibold text-green-800">
                  {formatCurrency(lang, activeSubscription?.subscriptionPlanPrice ?? currentPlanDetails?.price)}
                </div>
              </div>
              <div>
                <div className="text-sm text-green-600 mb-1">{t('pages.student.subscription.duration', 'Duration')}</div>
                <div className="font-semibold text-green-800">
                  {activeSubscription?.durationInDays || currentPlanDetails?.durationInDays || '—'} {t('pages.student.subscription.days','days')}
                </div>
              </div>
            </div>
          </div>

          {/* Available Upgrade Plans */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-600" />
              {t('pages.student.subscription.availableUpgrades', 'Available Upgrade Plans')}
            </h3>
            {availablePlans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availablePlans.map((plan) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="relative group"
                  >
                    <Card className="border-2 border-purple-200 hover:border-purple-400 transition-all duration-300 hover:shadow-lg">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg font-semibold text-gray-900">
                            {plan.name}
                          </CardTitle>
                          {(plan.recommended || plan.type === 'Two Terms' || plan.name?.toLowerCase().includes('two')) && (
                            <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
                              <Crown className="w-3 h-3 mr-1" />
                              {t('pages.student.subscription.recommended', 'Recommended')}
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="flex items-center gap-2">
                          <span className="font-medium">{plan.duration || t('pages.student.subscription.oneTerm', 'One term')}</span>
                          <span className="text-gray-400">•</span>
                          <span className="font-semibold text-purple-600">
                            {typeof plan.price === 'number' ? formatCurrency(lang, plan.price) : '—'}
                          </span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <ul className="space-y-2 text-sm mb-4">
                          {[
                            t('pages.student.subscription.feature.routes', 'Access to bus routes'),
                            t('pages.student.subscription.feature.support', 'Priority support'),
                            t('pages.student.subscription.feature.manage', 'Manage bookings')
                          ].map((feat, idx) => (
                            <li key={`${plan.id}-f-${idx}`} className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-purple-500" />
                              <span className="text-gray-600">{feat}</span>
                            </li>
                          ))}
                        </ul>
                        <Button 
                          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                          onClick={() => handleSelectUpgradePlan(plan)}
                        >
                          <Crown className="w-4 h-4 mr-2" />
                          {t('pages.student.subscription.upgradeThisPlan', 'Upgrade to This Plan')}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Crown className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('pages.student.subscription.noUpgradeTitle','No Upgrade Options Available')}</h3>
                <p className="text-gray-600">
                  {t('pages.student.subscription.noUpgradeDesc', "You're already on the highest plan available, or no upgrade options are currently available.")}
                </p>
              </div>
            )}
          </div>

          {/* Upgrade Benefits */}
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-800">{t('pages.student.subscription.upgradeBenefits', 'Upgrade Benefits')}</h3>
                <p className="text-sm text-blue-600">{t('pages.student.subscription.upgradeHappens', 'What happens when you upgrade')}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-blue-700">
              <p>• {t('pages.student.subscription.benefit1', 'Your new plan will be activated immediately after payment confirmation')}</p>
              <p>• {t('pages.student.subscription.benefit2', "You'll get access to all features of the upgraded plan")}</p>
              <p>• {t('pages.student.subscription.benefit3', 'The upgrade will extend your subscription duration')}</p>
              <p>• {t('pages.student.subscription.benefit4', 'You can continue using your current plan until the upgrade is processed')}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setUpgradeModalOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}



