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
  Expired = "Expired"
}

export interface CreatePaymentDTO {
  subscriptionPlanId: number;
  paymentMethod: PaymentMethod;
  paymentReferenceCode?: string | null; // 3-100 chars, optional
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
  paymentReferenceCode?: string | null;
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