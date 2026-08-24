import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from './payment.schema';
import { User, UserDocument } from '../users/user.schema';
import { SubscriptionPlan, SubscriptionPlanDocument } from '../subscription-plan/subscription-plan.schema';
import { StudentSubscription, StudentSubscriptionDocument } from '../student-subscription/student-subscription.schema';
import { createApiResponse, ApiResponse } from '../../common/interfaces/api-response.interface';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';

/** Report bucket keys. 'unknown' covers legacy payments saved before paymentChannel existed. */
export const PAYMENT_CHANNELS = ['instapay', 'vodafone', 'cash', 'visa'] as const;
export const REPORT_CHANNEL_KEYS = ['instapay', 'vodafone', 'cash', 'visa', 'unknown'] as const;

/** Which paymentMethod each channel is only valid with. */
const CHANNEL_METHOD: Record<string, string> = {
  instapay: 'Online',
  vodafone: 'Online',
  cash: 'Offline',
  visa: 'Offline',
};

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(SubscriptionPlan.name) private planModel: Model<SubscriptionPlanDocument>,
    @InjectModel(StudentSubscription.name) private subModel: Model<StudentSubscriptionDocument>,
  ) {}

  private getNumericId(doc: any): number {
    return parseInt((doc._id as any).toString().slice(-8), 16) % 100000;
  }

  private async toViewModel(payment: PaymentDocument): Promise<any> {
    const id = this.getNumericId(payment);
    const student = await this.findByNumericId(this.userModel, payment.studentId);
    const plan = await this.findByNumericId(this.planModel, payment.subscriptionPlanId);
    const reviewer = payment.adminReviewedById
      ? await this.findByNumericId(this.userModel, payment.adminReviewedById)
      : null;
    const refunder = payment.refundedBy
      ? await this.findByNumericId(this.userModel, payment.refundedBy)
      : null;

    return {
      id,
      studentId: payment.studentId,
      studentName: student ? `${student.firstName} ${student.lastName}` : null,
      studentEmail: student?.email || null,
      subscriptionPlanId: payment.subscriptionPlanId,
      subscriptionPlanName: plan?.name || null,
      amount: payment.amount,
      subscriptionCode: payment.subscriptionCode || null,
      paymentMethod: payment.paymentMethod,
      paymentMethodText: payment.paymentMethod,
      paymentChannel: payment.paymentChannel || null,
      paymentReferenceCode: payment.paymentReferenceCode || null,
      status: payment.status,
      statusText: payment.status,
      adminReviewedById: payment.adminReviewedById || null,
      adminReviewedByName: reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : null,
      reviewedAt: payment.reviewedAt?.toISOString() || null,
      refundAmount: payment.refundAmount ?? null,
      refundedAt: payment.refundedAt?.toISOString() || null,
      refundedByName: refunder ? `${refunder.firstName} ${refunder.lastName}` : null,
      refundReason: payment.refundReason || null,
      createdAt: (payment as any).createdAt,
      updatedAt: (payment as any).updatedAt || null,
    };
  }

  private async findByNumericId(model: Model<any>, numericId: number): Promise<any> {
    return model.findOne({ numericId }).exec();
  }

  async getAll(): Promise<ApiResponse<any[]>> {
    const payments = await this.paymentModel.find().sort({ createdAt: -1 }).exec();
    const vms = await Promise.all(payments.map((p) => this.toViewModel(p)));
    return createApiResponse(vms, null, true, vms.length);
  }

  async getById(id: number): Promise<ApiResponse<any>> {
    const payment = await this.paymentModel.findOne({ numericId: id }).exec();
    if (!payment) throw new NotFoundException('Payment not found');
    return createApiResponse(await this.toViewModel(payment));
  }

  async create(dto: any, userId: number): Promise<ApiResponse<boolean>> {
    const plan = await this.findByNumericId(this.planModel, dto.subscriptionPlanId);
    if (!plan) {
      throw new NotFoundException('The selected subscription plan could not be found.');
    }

    // A channel implies its payment method — reject incoherent combinations rather
    // than silently storing a channel that contradicts the method.
    if (dto.paymentChannel) {
      const expectedMethod = CHANNEL_METHOD[dto.paymentChannel];
      if (expectedMethod && dto.paymentMethod && expectedMethod !== dto.paymentMethod) {
        throw new AppException(
          400,
          ErrorCodes.VALIDATION_ERROR,
          'The selected payment channel does not match the payment method.',
        );
      }
    }

    await this.paymentModel.create({
      ...dto,
      studentId: userId,
      amount: plan.price || 0,
      status: 'Pending',
    });
    return createApiResponse(true, 'Payment created successfully');
  }

  async delete(id: number): Promise<ApiResponse<boolean>> {
    const payment = await this.paymentModel.findOne({ numericId: id }).exec();
    if (!payment) throw new NotFoundException('Payment not found');
    await this.paymentModel.findByIdAndDelete(payment._id);
    return createApiResponse(true, 'Payment deleted');
  }

  async review(id: number, dto: any, adminId: number): Promise<ApiResponse<boolean>> {
    const payment = await this.paymentModel.findOne({ numericId: id }).exec();
    if (!payment) throw new NotFoundException('Payment not found');
    await this.paymentModel.findByIdAndUpdate(payment._id, {
      status: dto.status,
      subscriptionCode: dto.subscriptionCode,
      reviewNotes: dto.reviewNotes,
      adminReviewedById: adminId,
      reviewedAt: new Date(),
    });

    if (dto.status === 'Accepted') {
      const plan = await this.findByNumericId(this.planModel, payment.subscriptionPlanId);
      const durationDays = plan?.durationInDays || 30;
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + durationDays);

      const existing = await this.subModel.findOne({
        studentId: payment.studentId,
        isActive: true,
        status: 'Active',
      }).exec();

      if (!existing) {
        await this.subModel.create({
          studentId: payment.studentId,
          subscriptionPlanId: payment.subscriptionPlanId,
          startDate,
          endDate,
          isActive: true,
          status: 'Active',
          paymentMethod: payment.paymentMethod,
          paymentReferenceCode: payment.paymentReferenceCode || dto.subscriptionCode || null,
          cancellationStatus: 'None',
        });
      } else {
        // Reusing an existing subscription row: clear any prior cancellation state,
        // otherwise a re-subscribed student inherits a stale Approved/Rejected flag.
        await this.subModel.findByIdAndUpdate(existing._id, {
          subscriptionPlanId: payment.subscriptionPlanId,
          startDate,
          endDate,
          isActive: true,
          status: 'Active',
          paymentMethod: payment.paymentMethod,
          cancellationStatus: 'None',
          cancellationReason: null,
          cancellationRequestedAt: null,
          cancellationReviewedById: null,
          cancellationReviewedAt: null,
          cancellationReviewNotes: null,
          cancelledPaymentId: null,
        });
      }
    }

    return createApiResponse(true, 'Payment reviewed');
  }

  async getMyPayments(userId: number): Promise<ApiResponse<any[]>> {
    const payments = await this.paymentModel.find({ studentId: userId }).sort({ createdAt: -1 }).exec();
    const vms = await Promise.all(payments.map((p) => this.toViewModel(p)));
    return createApiResponse(vms, null, true, vms.length);
  }

  async getByStatus(status: string): Promise<ApiResponse<any[]>> {
    const payments = await this.paymentModel.find({ status }).exec();
    const vms = await Promise.all(payments.map((p) => this.toViewModel(p)));
    return createApiResponse(vms, null, true, vms.length);
  }

  async getPending(): Promise<ApiResponse<any[]>> {
    return this.getByStatus('Pending');
  }

  async getByStudent(studentId: number): Promise<ApiResponse<any[]>> {
    const payments = await this.paymentModel.find({ studentId }).exec();
    const vms = await Promise.all(payments.map((p) => this.toViewModel(p)));
    return createApiResponse(vms, null, true, vms.length);
  }

  async getBySubscriptionPlan(planId: number): Promise<ApiResponse<any[]>> {
    const payments = await this.paymentModel.find({ subscriptionPlanId: planId }).exec();
    const vms = await Promise.all(payments.map((p) => this.toViewModel(p)));
    return createApiResponse(vms, null, true, vms.length);
  }

  async getStatistics(): Promise<ApiResponse<any>> {
    const all = await this.paymentModel.find().exec();
    const stats = {
      totalPayments: all.length,
      pendingPayments: all.filter((p) => p.status === 'Pending').length,
      acceptedPayments: all.filter((p) => p.status === 'Accepted').length,
      rejectedPayments: all.filter((p) => p.status === 'Rejected').length,
      totalAmount: all.reduce((sum, p) => sum + p.amount, 0),
      pendingAmount: all.filter((p) => p.status === 'Pending').reduce((sum, p) => sum + p.amount, 0),
      paymentsByMonth: [],
    };
    return createApiResponse(stats);
  }

  /**
   * Admin subscription/revenue report. Loads each collection once and resolves
   * student/plan names through in-memory Maps rather than the per-row lookups
   * toViewModel does, so it stays a fixed 3 queries regardless of payment count.
   *
   * "Subscribed students" counts DISTINCT studentIds holding an Accepted payment —
   * a student who upgraded has two Accepted rows but is one subscriber.
   */
  async getSubscriptionReport(): Promise<ApiResponse<any>> {
    const [payments, students, plans] = await Promise.all([
      this.paymentModel.find().sort({ createdAt: -1 }).exec(),
      this.userModel.find({ role: 'Student' }).select('-password').exec(),
      this.planModel.find().exec(),
    ]);

    const studentMap = new Map<number, any>(students.map((s) => [s.numericId, s]));
    const planMap = new Map<number, any>(plans.map((p) => [p.numericId, p]));

    const channelOf = (p: PaymentDocument) => p.paymentChannel || 'unknown';
    const accepted = payments.filter((p) => p.status === 'Accepted');
    const refunded = payments.filter((p) => p.status === 'Refunded');

    const byChannel = REPORT_CHANNEL_KEYS.map((channel) => {
      const channelAccepted = accepted.filter((p) => channelOf(p) === channel);
      const channelRefunded = refunded.filter((p) => channelOf(p) === channel);
      const grossAmount = channelAccepted.reduce((sum, p) => sum + (p.amount || 0), 0);
      const refundedAmount = channelRefunded.reduce((sum, p) => sum + (p.refundAmount ?? p.amount ?? 0), 0);
      return {
        channel,
        acceptedCount: channelAccepted.length,
        studentCount: new Set(channelAccepted.map((p) => p.studentId)).size,
        refundedCount: channelRefunded.length,
        grossAmount,
        refundedAmount,
        netAmount: grossAmount - refundedAmount,
      };
    });

    const byPlan = plans.map((plan) => {
      const planAccepted = accepted.filter((p) => p.subscriptionPlanId === plan.numericId);
      return {
        planId: plan.numericId,
        planName: plan.name,
        price: plan.price || 0,
        acceptedCount: planAccepted.length,
        studentCount: new Set(planAccepted.map((p) => p.studentId)).size,
        grossAmount: planAccepted.reduce((sum, p) => sum + (p.amount || 0), 0),
      };
    });

    const grossAmount = accepted.reduce((sum, p) => sum + (p.amount || 0), 0);
    const refundedAmount = refunded.reduce((sum, p) => sum + (p.refundAmount ?? p.amount ?? 0), 0);

    const totals = {
      totalStudents: students.length,
      subscribedStudents: new Set(accepted.map((p) => p.studentId)).size,
      totalPayments: payments.length,
      acceptedCount: accepted.length,
      pendingCount: payments.filter((p) => p.status === 'Pending').length,
      rejectedCount: payments.filter((p) => p.status === 'Rejected').length,
      refundedCount: refunded.length,
      grossAmount,
      pendingAmount: payments.filter((p) => p.status === 'Pending').reduce((sum, p) => sum + (p.amount || 0), 0),
      refundedAmount,
      netAmount: grossAmount - refundedAmount,
    };

    const details = payments.map((p) => {
      const student = studentMap.get(p.studentId);
      const plan = planMap.get(p.subscriptionPlanId);
      return {
        paymentId: p.numericId,
        studentId: p.studentId,
        studentName: student ? `${student.firstName} ${student.lastName}` : null,
        studentEmail: student?.email || null,
        studentAcademicNumber: student?.studentAcademicNumber || null,
        department: student?.department || null,
        planName: plan?.name || null,
        amount: p.amount || 0,
        paymentMethod: p.paymentMethod,
        paymentChannel: p.paymentChannel || null,
        status: p.status,
        paymentReferenceCode: p.paymentReferenceCode || null,
        refundAmount: p.refundAmount ?? null,
        createdAt: (p as any).createdAt || null,
        reviewedAt: p.reviewedAt || null,
      };
    });

    return createApiResponse({ totals, byChannel, byPlan, details, generatedAt: new Date().toISOString() });
  }
}
