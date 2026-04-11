import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from './payment.schema';
import { User, UserDocument } from '../users/user.schema';
import { SubscriptionPlan, SubscriptionPlanDocument } from '../subscription-plan/subscription-plan.schema';
import { StudentSubscription, StudentSubscriptionDocument } from '../student-subscription/student-subscription.schema';
import { createApiResponse, ApiResponse } from '../../common/interfaces/api-response.interface';

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
      paymentReferenceCode: payment.paymentReferenceCode || null,
      status: payment.status,
      statusText: payment.status,
      adminReviewedById: payment.adminReviewedById || null,
      adminReviewedByName: reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : null,
      reviewedAt: payment.reviewedAt?.toISOString() || null,
      createdAt: (payment as any).createdAt,
      updatedAt: (payment as any).updatedAt || null,
    };
  }

  private async findByNumericId(model: Model<any>, numericId: number): Promise<any> {
    const docs = await model.find().exec();
    return docs.find((d) => this.getNumericId(d) === numericId) || null;
  }

  async getAll(): Promise<ApiResponse<any[]>> {
    const payments = await this.paymentModel.find().sort({ createdAt: -1 }).exec();
    const vms = await Promise.all(payments.map((p) => this.toViewModel(p)));
    return createApiResponse(vms, null, true, vms.length);
  }

  async getById(id: number): Promise<ApiResponse<any>> {
    const payments = await this.paymentModel.find().exec();
    const payment = payments.find((p) => this.getNumericId(p) === id);
    if (!payment) throw new NotFoundException('Payment not found');
    return createApiResponse(await this.toViewModel(payment));
  }

  async create(dto: any, userId: number): Promise<ApiResponse<boolean>> {
    const plan = await this.findByNumericId(this.planModel, dto.subscriptionPlanId);
    await this.paymentModel.create({
      ...dto,
      studentId: userId,
      amount: plan?.price || 0,
      status: 'Pending',
    });
    return createApiResponse(true, 'Payment created successfully');
  }

  async delete(id: number): Promise<ApiResponse<boolean>> {
    const payments = await this.paymentModel.find().exec();
    const payment = payments.find((p) => this.getNumericId(p) === id);
    if (!payment) throw new NotFoundException('Payment not found');
    await this.paymentModel.findByIdAndDelete(payment._id);
    return createApiResponse(true, 'Payment deleted');
  }

  async review(id: number, dto: any, adminId: number): Promise<ApiResponse<boolean>> {
    const payments = await this.paymentModel.find().exec();
    const payment = payments.find((p) => this.getNumericId(p) === id);
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
        });
      } else {
        await this.subModel.findByIdAndUpdate(existing._id, {
          subscriptionPlanId: payment.subscriptionPlanId,
          startDate,
          endDate,
          isActive: true,
          status: 'Active',
          paymentMethod: payment.paymentMethod,
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
}
