import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StudentSubscription, StudentSubscriptionDocument } from './student-subscription.schema';
import { User, UserDocument } from '../users/user.schema';
import { SubscriptionPlan, SubscriptionPlanDocument } from '../subscription-plan/subscription-plan.schema';
import { createApiResponse, ApiResponse } from '../../common/interfaces/api-response.interface';

@Injectable()
export class StudentSubscriptionService {
  constructor(
    @InjectModel(StudentSubscription.name) private subModel: Model<StudentSubscriptionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(SubscriptionPlan.name) private planModel: Model<SubscriptionPlanDocument>,
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
      createdAt: (sub as any).createdAt,
      updatedAt: (sub as any).updatedAt || null,
    };
  }

  private async findSubByNumericId(id: number): Promise<StudentSubscriptionDocument | null> {
    return this.subModel.findOne({ numericId: id }).exec();
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
    await this.subModel.findByIdAndUpdate(sub._id, { isActive: true, status: 'Active' });
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
}
