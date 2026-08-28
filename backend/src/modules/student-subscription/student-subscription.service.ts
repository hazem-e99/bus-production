import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StudentSubscription, StudentSubscriptionDocument } from './student-subscription.schema';
import { User, UserDocument } from '../users/user.schema';
import { SubscriptionPlan, SubscriptionPlanDocument } from '../subscription-plan/subscription-plan.schema';
import { Payment, PaymentDocument } from '../payment/payment.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { createApiResponse, ApiResponse } from '../../common/interfaces/api-response.interface';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';
import { RequestCancellationDto, ReviewCancellationDto } from './dto/cancellation.dto';

@Injectable()
export class StudentSubscriptionService {
  private readonly logger = new Logger(StudentSubscriptionService.name);

  constructor(
    @InjectModel(StudentSubscription.name) private subModel: Model<StudentSubscriptionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(SubscriptionPlan.name) private planModel: Model<SubscriptionPlanDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private getNumericId(doc: any): number {
    return parseInt((doc._id as any).toString().slice(-8), 16) % 100000;
  }

  private async findByNumericId(model: Model<any>, id: number): Promise<any> {
    return model.findOne({ numericId: id }).exec();
  }

  private async toViewModel(sub: StudentSubscriptionDocument): Promise<any> {
    const id = this.getNumericId(sub);
    const student = await this.findByNumericId(this.userModel, sub.studentId);
    const plan = await this.findByNumericId(this.planModel, sub.subscriptionPlanId);
    return {
      id,
      studentId: sub.studentId,
      studentName: student ? `${student.firstName} ${student.lastName}` : null,
      studentEmail: student?.email || null,
      subscriptionPlanId: sub.subscriptionPlanId,
      subscriptionPlanName: plan?.name || null,
      subscriptionPlanPrice: plan?.price || 0,
      durationInDays: plan?.durationInDays || 0,
      startDate: sub.startDate?.toISOString(),
      endDate: sub.endDate?.toISOString(),
      isActive: sub.isActive,
      status: sub.status,
      paymentMethod: sub.paymentMethod || null,
      paymentReferenceCode: sub.paymentReferenceCode || null,
      // Legacy documents predate these fields — normalise to 'None'.
      cancellationStatus: sub.cancellationStatus ?? 'None',
      cancellationReason: sub.cancellationReason || null,
      cancellationRequestedAt: sub.cancellationRequestedAt?.toISOString() || null,
      cancellationReviewedAt: sub.cancellationReviewedAt?.toISOString() || null,
      cancellationReviewNotes: sub.cancellationReviewNotes || null,
      cancelledPaymentId: sub.cancelledPaymentId ?? null,
      createdAt: (sub as any).createdAt,
      updatedAt: (sub as any).updatedAt || null,
    };
  }

  private async findSubByNumericId(id: number): Promise<StudentSubscriptionDocument | null> {
    return this.subModel.findOne({ numericId: id }).exec();
  }

  /** Best-effort notification — never let a notification failure fail the caller's action. */
  private async notifySafely(userIds: number[], title: string, message: string, type = 'Alert'): Promise<void> {
    // broadcast() with an empty userIds list fans out to EVERY user — never call it empty.
    if (!userIds.length) return;
    try {
      await this.notificationsService.broadcast({ userIds, title, message, type });
    } catch (error) {
      this.logger.error(`Failed to send notification: ${(error as Error)?.message}`, (error as Error)?.stack);
    }
  }

  async getMyActiveSubscription(userId: number): Promise<ApiResponse<any>> {
    const sub = await this.subModel.findOne({
      studentId: userId,
      isActive: true,
      status: 'Active',
    }).exec();
    if (!sub) return createApiResponse(null, 'No active subscription', true);
    return createApiResponse(await this.toViewModel(sub));
  }

  async getMySubscriptions(userId: number): Promise<ApiResponse<any[]>> {
    const subs = await this.subModel.find({ studentId: userId }).sort({ createdAt: -1 }).exec();
    const vms = await Promise.all(subs.map((s) => this.toViewModel(s)));
    return createApiResponse(vms, null, true, vms.length);
  }

  /** Admin: all subscriptions across all students (building block for cross-cutting admin views). */
  async getAll(): Promise<ApiResponse<any[]>> {
    const subs = await this.subModel.find().sort({ createdAt: -1 }).exec();
    const vms = await Promise.all(subs.map((s) => this.toViewModel(s)));
    return createApiResponse(vms, null, true, vms.length);
  }

  async getById(id: number): Promise<ApiResponse<any>> {
    const sub = await this.findSubByNumericId(id);
    if (!sub) throw new NotFoundException('Subscription not found');
    return createApiResponse(await this.toViewModel(sub));
  }

  async getByStudent(studentId: number): Promise<ApiResponse<any[]>> {
    const subs = await this.subModel.find({ studentId }).exec();
    const vms = await Promise.all(subs.map((s) => this.toViewModel(s)));
    return createApiResponse(vms, null, true, vms.length);
  }

  async getByPlan(planId: number): Promise<ApiResponse<any[]>> {
    const subs = await this.subModel.find({ subscriptionPlanId: planId }).exec();
    const vms = await Promise.all(subs.map((s) => this.toViewModel(s)));
    return createApiResponse(vms, null, true, vms.length);
  }

  async getByStatus(status: string): Promise<ApiResponse<any[]>> {
    const subs = await this.subModel.find({ status }).exec();
    const vms = await Promise.all(subs.map((s) => this.toViewModel(s)));
    return createApiResponse(vms, null, true, vms.length);
  }

  async getExpiringSoon(): Promise<ApiResponse<any[]>> {
    const soon = new Date();
    soon.setDate(soon.getDate() + 7);
    const subs = await this.subModel.find({
      isActive: true,
      endDate: { $lte: soon, $gte: new Date() },
    }).exec();
    const vms = await Promise.all(subs.map((s) => this.toViewModel(s)));
    return createApiResponse(vms, null, true, vms.length);
  }

  async getExpired(): Promise<ApiResponse<any[]>> {
    const subs = await this.subModel.find({
      endDate: { $lt: new Date() },
    }).exec();
    const vms = await Promise.all(subs.map((s) => this.toViewModel(s)));
    return createApiResponse(vms, null, true, vms.length);
  }

  async activate(id: number): Promise<ApiResponse<boolean>> {
    const sub = await this.findSubByNumericId(id);
    if (!sub) throw new NotFoundException('Subscription not found');
    // Re-activating clears any prior cancellation state so the record doesn't
    // stay flagged as cancelled while being active again.
    await this.subModel.findByIdAndUpdate(sub._id, {
      isActive: true,
      status: 'Active',
      cancellationStatus: 'None',
      cancellationReason: null,
      cancellationRequestedAt: null,
      cancellationReviewedById: null,
      cancellationReviewedAt: null,
      cancellationReviewNotes: null,
      cancelledPaymentId: null,
    });
    return createApiResponse(true, 'Subscription activated');
  }

  async suspend(id: number, dto: any): Promise<ApiResponse<boolean>> {
    const sub = await this.findSubByNumericId(id);
    if (!sub) throw new NotFoundException('Subscription not found');
    await this.subModel.findByIdAndUpdate(sub._id, {
      isActive: false,
      status: 'Suspended',
      suspendReason: dto.reason,
    });
    return createApiResponse(true, 'Subscription suspended');
  }

  /**
   * Admin action: clears whatever is currently blocking a student from picking
   * a subscription plan again — their active subscription (if any) and any
   * payment still awaiting review (e.g. they picked the wrong package).
   * Neither is deleted: the subscription is marked Cancelled and the payment
   * Rejected, so payment/financial history and the admin audit trail
   * (payment.reviewNotes, adminReviewedById, reviewedAt) are fully preserved —
   * only the fields that gate re-selection are changed.
   */
  async resetForStudent(studentId: number, adminId: number): Promise<ApiResponse<{ subscriptionsReset: number; paymentsReset: number }>> {
    const student = await this.userModel.findOne({ numericId: studentId, role: 'Student' }).exec();
    if (!student) throw new NotFoundException('Student not found');

    const subsResult = await this.subModel.updateMany(
      { studentId, isActive: true },
      { $set: { isActive: false, status: 'Cancelled', suspendReason: 'Reset by admin' } },
    ).exec();

    const pendingResult = await this.paymentModel.updateMany(
      { studentId, status: 'Pending' },
      {
        $set: {
          status: 'Rejected',
          reviewNotes: 'Reset by admin: student allowed to select a plan again',
          adminReviewedById: adminId,
          reviewedAt: new Date(),
        },
      },
    ).exec();

    // Also downgrade any still-Accepted payment(s) that funded the subscription
    // just reset above. Leaving them Accepted would orphan them from reality on
    // two fronts: the student-facing subscription page treats an Accepted
    // payment as proof of an active plan (it has no other way to know the
    // subscription was reset out from under it), and the admin revenue report
    // sums Accepted payments as gross revenue — both would stay wrong forever
    // for a subscription that no longer exists. 'Cancelled' (not 'Refunded'):
    // this is an administrative data fix, not a financial transaction, so no
    // refund fields are set.
    const acceptedResult = await this.paymentModel.updateMany(
      { studentId, status: 'Accepted' },
      {
        $set: {
          status: 'Cancelled',
          reviewNotes: 'Reset by admin: associated subscription was cancelled',
          adminReviewedById: adminId,
          reviewedAt: new Date(),
        },
      },
    ).exec();

    return createApiResponse(
      {
        subscriptionsReset: subsResult.modifiedCount ?? 0,
        paymentsReset: (pendingResult.modifiedCount ?? 0) + (acceptedResult.modifiedCount ?? 0),
      },
      'Subscription reset successfully. The student can select a plan again.',
    );
  }

  /**
   * Student asks to cancel their own active subscription. Nothing is cancelled
   * here — the request is queued for admin review. A reason is mandatory.
   */
  async requestCancellation(studentId: number, dto: RequestCancellationDto): Promise<ApiResponse<boolean>> {
    const sub = await this.subModel.findOne({
      studentId,
      isActive: true,
      status: 'Active',
    }).exec();

    if (!sub) {
      throw new AppException(
        404,
        ErrorCodes.RESOURCE_NOT_FOUND,
        'You do not have an active subscription to cancel.',
      );
    }

    if ((sub.cancellationStatus ?? 'None') === 'Pending') {
      throw new AppException(
        409,
        ErrorCodes.CONFLICT,
        'A cancellation request is already pending review.',
      );
    }

    await this.subModel.findByIdAndUpdate(sub._id, {
      cancellationStatus: 'Pending',
      cancellationReason: dto.reason.trim(),
      cancellationRequestedAt: new Date(),
      cancellationReviewedById: null,
      cancellationReviewedAt: null,
      cancellationReviewNotes: null,
    });

    const student = await this.findByNumericId(this.userModel, studentId);
    const admins = await this.userModel.find({ role: 'Admin' }).exec();
    const studentName = student ? `${student.firstName} ${student.lastName}` : `Student #${studentId}`;
    await this.notifySafely(
      admins.map((a) => a.numericId).filter((n) => typeof n === 'number'),
      'Subscription cancellation request',
      `${studentName} requested to cancel their subscription. Reason: ${dto.reason.trim()}`,
      'Alert',
    );

    return createApiResponse(true, 'Cancellation request submitted. An administrator will review it shortly.');
  }

  /**
   * Admin approves or rejects a pending cancellation request.
   *
   * On approval the payment is written FIRST, so that a mid-way failure leaves the
   * subscription still Active (a retryable state) rather than cancelled-without-refund.
   * Records are never deleted — the payment becomes 'Refunded' with a full audit trail.
   */
  async reviewCancellation(
    subscriptionId: number,
    dto: ReviewCancellationDto,
    adminId: number,
  ): Promise<ApiResponse<any>> {
    const sub = await this.findSubByNumericId(subscriptionId);
    if (!sub) throw new NotFoundException('Subscription not found');

    if ((sub.cancellationStatus ?? 'None') !== 'Pending') {
      throw new AppException(
        409,
        ErrorCodes.CONFLICT,
        'This cancellation request has already been reviewed.',
      );
    }

    const now = new Date();

    if (dto.status === 'Rejected') {
      await this.subModel.findByIdAndUpdate(sub._id, {
        cancellationStatus: 'Rejected',
        cancellationReviewedById: adminId,
        cancellationReviewedAt: now,
        cancellationReviewNotes: dto.reviewNotes || null,
      });

      await this.notifySafely(
        [sub.studentId],
        'Cancellation request rejected',
        dto.reviewNotes
          ? `Your subscription cancellation request was rejected. Note: ${dto.reviewNotes}`
          : 'Your subscription cancellation request was rejected. Your subscription remains active.',
        'Alert',
      );

      return createApiResponse({ refunded: false, refundAmount: 0 }, 'Cancellation request rejected.');
    }

    // --- Approved ---
    // Prefer the Accepted payment for this subscription's plan; fall back to the
    // student's most recent Accepted payment.
    let payment = await this.paymentModel
      .findOne({ studentId: sub.studentId, status: 'Accepted', subscriptionPlanId: sub.subscriptionPlanId })
      .sort({ createdAt: -1 })
      .exec();
    if (!payment) {
      payment = await this.paymentModel
        .findOne({ studentId: sub.studentId, status: 'Accepted' })
        .sort({ createdAt: -1 })
        .exec();
    }

    let refundAmount = 0;
    if (payment) {
      refundAmount = dto.refundAmount ?? payment.amount ?? 0;
      await this.paymentModel.findByIdAndUpdate(payment._id, {
        status: 'Refunded',
        refundAmount,
        refundedAt: now,
        refundedBy: adminId,
        refundReason: [sub.cancellationReason, dto.reviewNotes].filter(Boolean).join(' | ') || null,
      });
    }

    // Parity with resetForStudent: clear anything still awaiting review so the
    // student isn't blocked by a stale pending payment.
    await this.paymentModel.updateMany(
      { studentId: sub.studentId, status: 'Pending' },
      {
        $set: {
          status: 'Rejected',
          reviewNotes: 'Subscription cancellation approved',
          adminReviewedById: adminId,
          reviewedAt: now,
        },
      },
    ).exec();

    await this.subModel.findByIdAndUpdate(sub._id, {
      isActive: false,
      status: 'Cancelled',
      suspendReason: `Cancellation approved: ${sub.cancellationReason || 'no reason given'}`,
      cancellationStatus: 'Approved',
      cancellationReviewedById: adminId,
      cancellationReviewedAt: now,
      cancellationReviewNotes: dto.reviewNotes || null,
      cancelledPaymentId: payment?.numericId ?? null,
    });

    await this.notifySafely(
      [sub.studentId],
      'Subscription cancelled',
      'Your subscription cancellation was approved. You can now choose a new plan.',
      'Alert',
    );

    return createApiResponse(
      { refunded: !!payment, refundAmount, paymentId: payment?.numericId ?? null },
      'Cancellation approved. The student can select a new plan.',
    );
  }

  /**
   * Admin queue of cancellation requests. Enriched with the matching Accepted
   * payment so the admin can see (and adjust) the refundable amount.
   */
  async getCancellationRequests(status = 'Pending'): Promise<ApiResponse<any[]>> {
    const subs = await this.subModel
      .find({ cancellationStatus: status })
      .sort({ cancellationRequestedAt: -1 })
      .exec();

    if (!subs.length) return createApiResponse([], null, true, 0);

    const studentIds = [...new Set(subs.map((s) => s.studentId))];
    const planIds = [...new Set(subs.map((s) => s.subscriptionPlanId))];
    const [students, plans, acceptedPayments] = await Promise.all([
      this.userModel.find({ numericId: { $in: studentIds } }).select('-password').exec(),
      this.planModel.find({ numericId: { $in: planIds } }).exec(),
      this.paymentModel.find({ studentId: { $in: studentIds }, status: 'Accepted' }).sort({ createdAt: -1 }).exec(),
    ]);

    const studentMap = new Map<number, any>(students.map((s) => [s.numericId, s]));
    const planMap = new Map<number, any>(plans.map((p) => [p.numericId, p]));

    const data = subs.map((sub) => {
      const student = studentMap.get(sub.studentId);
      const plan = planMap.get(sub.subscriptionPlanId);
      const payment =
        acceptedPayments.find((p) => p.studentId === sub.studentId && p.subscriptionPlanId === sub.subscriptionPlanId) ||
        acceptedPayments.find((p) => p.studentId === sub.studentId) ||
        null;

      return {
        id: sub.numericId,
        studentId: sub.studentId,
        studentName: student ? `${student.firstName} ${student.lastName}` : null,
        studentEmail: student?.email || null,
        subscriptionPlanId: sub.subscriptionPlanId,
        subscriptionPlanName: plan?.name || null,
        subscriptionPlanPrice: plan?.price || 0,
        startDate: sub.startDate?.toISOString() || null,
        endDate: sub.endDate?.toISOString() || null,
        status: sub.status,
        cancellationStatus: sub.cancellationStatus ?? 'None',
        cancellationReason: sub.cancellationReason || null,
        cancellationRequestedAt: sub.cancellationRequestedAt?.toISOString() || null,
        paymentId: payment?.numericId ?? null,
        paidAmount: payment?.amount ?? null,
        paymentChannel: payment?.paymentChannel || null,
      };
    });

    return createApiResponse(data, null, true, data.length);
  }
}
