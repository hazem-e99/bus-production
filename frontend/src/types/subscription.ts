// Subscription Plan Types based on Swagger Schema

export interface SubscriptionPlanViewModel {
  id: number;
  name: string | null;
  description: string | null;
  price: number;
  maxNumberOfRides: number;
  durationInDays: number;
  isActive: boolean;
}

export interface CreateSubscriptionPlanDTO {
  name: string; // 3-100 chars, required
  description?: string | null; // 0-500 chars, optional
  price: number; // minimum 0.01
  maxNumberOfRides: number; // 1 - 1000
  durationInDays: number; // 1 - 365
  isActive: boolean; // required
}

export interface UpdateSubscriptionPlanDTO {
  name?: string | null;
  description?: string | null;
  price?: number | null; // minimum 0.01
  maxNumberOfRides?: number | null; // 1 - 1000
  durationInDays?: number | null; // 1 - 365
  isActive?: boolean | null;
}

// API Response Types
export interface SubscriptionPlanViewModelApiResponse {
  data: SubscriptionPlanViewModel;
  count?: number | null;
  message?: string | null;
  success: boolean;
  timestamp: string;
  errorCode?: any;
  requestId?: string | null;
}

export interface SubscriptionPlanViewModelIEnumerableApiResponse {
  data: SubscriptionPlanViewModel[] | null;
  count?: number | null;
  message?: string | null;
  success: boolean;
  timestamp: string;
  errorCode?: any;
  requestId?: string | null;
}

export interface BooleanApiResponse {
  data: boolean;
  count?: number | null;
  message?: string | null;
  success: boolean;
  timestamp: string;
  errorCode?: any;
  requestId?: string | null;
}

// Payment Types based on Swagger Schema
export enum PaymentMethod {
  Offline = "Offline",
  Online = "Online"
}

export enum PaymentStatus {
  Pending = "Pending",
  Accepted = "Accepted", 
  Rejected = "Rejected",
  Cancelled = "Cancelled",
  Expired = "Expired",
  Refunded = "Refunded"
}

/**
 * The specific channel a payment was made through. Stored alongside
 * paymentMethod ('Online' | 'Offline'), which it must stay coherent with:
 * InstaPay/Vodafone are Online, Cash/Visa are Offline. Payments created before
 * this field existed have no channel and report under "unknown".
 */
export enum PaymentChannel {
  InstaPay = "instapay",
  Vodafone = "vodafone",
  Cash = "cash",
  Visa = "visa"
}

export interface CreatePaymentDTO {
  subscriptionPlanId: number;
  paymentMethod: PaymentMethod;
  paymentReferenceCode?: string | null; // 3-100 chars, optional
  paymentChannel?: PaymentChannel | null;
}

export interface ReviewPaymentDTO {
  status: PaymentStatus;
  subscriptionCode?: string | null;
  reviewNotes?: string | null;
}

export interface PaymentViewModel {
  id: number;
  studentId: number;
  studentName?: string | null;
  studentEmail?: string | null;
  subscriptionPlanId: number;
  subscriptionPlanName?: string | null;
  amount: number;
  subscriptionCode?: string | null;
  paymentMethod: PaymentMethod;
  paymentMethodText?: string | null;
  paymentChannel?: string | null;
  paymentReferenceCode?: string | null;
  refundAmount?: number | null;
  refundedAt?: string | null;
  refundedByName?: string | null;
  refundReason?: string | null;
  status: PaymentStatus;
  statusText?: string | null;
  adminReviewedById?: number | null;
  adminReviewedByName?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface PaymentViewModelApiResponse {
  data: PaymentViewModel;
  count?: number | null;
  message?: string | null;
  success: boolean;
  timestamp: string;
  errorCode?: any;
  requestId?: string | null;
}

export interface PaymentViewModelIEnumerableApiResponse {
  data: PaymentViewModel[] | null;
  count?: number | null;
  message?: string | null;
  success: boolean;
  timestamp: string;
  errorCode?: any;
  requestId?: string | null;
}

export interface MonthlyPaymentSummary {
  year: number;
  month: number;
  monthName?: string | null;
  count: number;
  totalAmount: number;
}

export interface PaymentStatisticsViewModel {
  totalPayments: number;
  pendingPayments: number;
  acceptedPayments: number;
  rejectedPayments: number;
  totalAmount: number;
  pendingAmount: number;
  paymentsByMonth?: MonthlyPaymentSummary[] | null;
}

export interface PaymentStatisticsViewModelApiResponse {
  data: PaymentStatisticsViewModel;
  count?: number | null;
  message?: string | null;
  success: boolean;
  timestamp: string;
  errorCode?: any;
  requestId?: string | null;
}

// Student Subscription Types based on Swagger Schema
export enum SubscriptionStatus {
  Active = "Active",
  Expired = "Expired",
  Cancelled = "Cancelled",
  Suspended = "Suspended",
  PendingActivation = "PendingActivation",
  PendingPayment = "PendingPayment"
}

/** Lifecycle of a student-initiated cancellation request. */
export enum CancellationStatus {
  None = "None",
  Pending = "Pending",
  Approved = "Approved",
  Rejected = "Rejected"
}

export interface StudentSubscriptionViewModel {
  id: number;
  studentId: number;
  studentName?: string | null;
  studentEmail?: string | null;
  subscriptionPlanId: number;
  subscriptionPlanName?: string | null;
  subscriptionPlanPrice: number;
  durationInDays: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  status: SubscriptionStatus;
  paymentMethod?: string | null;
  paymentReferenceCode?: string | null;
  cancellationStatus?: CancellationStatus | string | null;
  cancellationReason?: string | null;
  cancellationRequestedAt?: string | null;
  cancellationReviewedAt?: string | null;
  cancellationReviewNotes?: string | null;
  cancelledPaymentId?: number | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface StudentSubscriptionViewModelApiResponse {
  data: StudentSubscriptionViewModel;
  count?: number | null;
  message?: string | null;
  success: boolean;
  timestamp: string;
  errorCode?: any;
  requestId?: string | null;
}

export interface StudentSubscriptionViewModelIEnumerableApiResponse {
  data: StudentSubscriptionViewModel[] | null;
  count?: number | null;
  message?: string | null;
  success: boolean;
  timestamp: string;
  errorCode?: any;
  requestId?: string | null;
}

export interface SuspendSubscriptionDTO {
  reason: string; // 3-500 chars, required
}

// ==================== Cancellation requests ====================

export interface RequestCancellationDTO {
  reason: string; // 3-500 chars, required
}

export interface ReviewCancellationDTO {
  status: "Approved" | "Rejected";
  reviewNotes?: string | null;
  /** Omitted means "refund the full paid amount". */
  refundAmount?: number | null;
}

/** A pending cancellation request as shown in the admin queue. */
export interface CancellationRequestViewModel {
  id: number;
  studentId: number;
  studentName?: string | null;
  studentEmail?: string | null;
  subscriptionPlanId: number;
  subscriptionPlanName?: string | null;
  subscriptionPlanPrice: number;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  cancellationStatus: string;
  cancellationReason?: string | null;
  cancellationRequestedAt?: string | null;
  paymentId?: number | null;
  paidAmount?: number | null;
  paymentChannel?: string | null;
}

// ==================== Subscription report ====================

export interface ChannelBreakdownRow {
  channel: string; // instapay | vodafone | cash | visa | unknown
  acceptedCount: number;
  studentCount: number;
  refundedCount: number;
  grossAmount: number;
  refundedAmount: number;
  netAmount: number;
}

export interface PlanBreakdownRow {
  planId: number;
  planName?: string | null;
  price: number;
  acceptedCount: number;
  studentCount: number;
  grossAmount: number;
}

export interface ReportDetailRow {
  paymentId: number;
  studentId: number;
  studentName?: string | null;
  studentEmail?: string | null;
  studentAcademicNumber?: string | null;
  department?: string | null;
  planName?: string | null;
  amount: number;
  paymentMethod: string;
  paymentChannel?: string | null;
  status: string;
  paymentReferenceCode?: string | null;
  refundAmount?: number | null;
  createdAt?: string | null;
  reviewedAt?: string | null;
}

export interface SubscriptionReportTotals {
  totalStudents: number;
  subscribedStudents: number;
  totalPayments: number;
  acceptedCount: number;
  pendingCount: number;
  rejectedCount: number;
  refundedCount: number;
  grossAmount: number;
  pendingAmount: number;
  refundedAmount: number;
  netAmount: number;
}

export interface SubscriptionReportViewModel {
  totals: SubscriptionReportTotals;
  byChannel: ChannelBreakdownRow[];
  byPlan: PlanBreakdownRow[];
  details: ReportDetailRow[];
  generatedAt: string;
}

export interface SubscriptionReportApiResponse {
  data: SubscriptionReportViewModel | null;
  count?: number | null;
  message?: string | null;
  success: boolean;
  timestamp: string;
  errorCode?: any;
  requestId?: string | null;
}
