import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubscriptionPlan, SubscriptionPlanDocument } from './subscription-plan.schema';
import { createApiResponse, ApiResponse } from '../../common/interfaces/api-response.interface';

@Injectable()
export class SubscriptionPlanService {
  constructor(
    @InjectModel(SubscriptionPlan.name) private planModel: Model<SubscriptionPlanDocument>,
  ) {}

  private getNumericId(doc: any): number {
    return parseInt((doc._id as any).toString().slice(-8), 16) % 100000;
  }

  private toViewModel(plan: SubscriptionPlanDocument): any {
    return {
      id: this.getNumericId(plan),
      name: plan.name,
      description: plan.description,
      price: plan.price,
      maxNumberOfRides: plan.maxNumberOfRides,
      durationInDays: plan.durationInDays,
      isActive: plan.isActive,
    };
  }

  private async findByNumericId(id: number): Promise<SubscriptionPlanDocument | null> {
    return this.planModel.findOne({ numericId: id }).exec();
  }

  async getAll(): Promise<ApiResponse<any[]>> {
    const plans = await this.planModel.find().exec();
    const data = plans.map((p) => this.toViewModel(p));
    return createApiResponse(data, null, true, data.length);
  }

  async getActive(): Promise<ApiResponse<any[]>> {
    const plans = await this.planModel.find({ isActive: true }).exec();
    const data = plans.map((p) => this.toViewModel(p));
    return createApiResponse(data, null, true, data.length);
  }

  async getById(id: number): Promise<ApiResponse<any>> {
    const plan = await this.findByNumericId(id);
    if (!plan) throw new NotFoundException('Subscription plan not found');
    return createApiResponse(this.toViewModel(plan));
  }

  async create(dto: any): Promise<ApiResponse<boolean>> {
    await this.planModel.create(dto);
    return createApiResponse(true, 'Plan created successfully');
  }

  async update(id: number, dto: any): Promise<ApiResponse<boolean>> {
    const plan = await this.findByNumericId(id);
    if (!plan) throw new NotFoundException('Subscription plan not found');
    await this.planModel.findByIdAndUpdate(plan._id, { $set: dto });
    return createApiResponse(true, 'Plan updated successfully');
  }

  async delete(id: number): Promise<ApiResponse<boolean>> {
    const plan = await this.findByNumericId(id);
    if (!plan) throw new NotFoundException('Subscription plan not found');
    await this.planModel.findByIdAndDelete(plan._id);
    return createApiResponse(true, 'Plan deleted');
  }

  async activate(id: number): Promise<ApiResponse<boolean>> {
    const plan = await this.findByNumericId(id);
    if (!plan) throw new NotFoundException('Subscription plan not found');
    await this.planModel.findByIdAndUpdate(plan._id, { isActive: true });
    return createApiResponse(true, 'Plan activated');
  }

  async deactivate(id: number): Promise<ApiResponse<boolean>> {
    const plan = await this.findByNumericId(id);
    if (!plan) throw new NotFoundException('Subscription plan not found');
    await this.planModel.findByIdAndUpdate(plan._id, { isActive: false });
    return createApiResponse(true, 'Plan deactivated');
  }

  async getByPriceRange(minPrice?: number, maxPrice?: number): Promise<ApiResponse<any[]>> {
    const query: any = {};
    if (minPrice !== undefined) query.price = { ...query.price, $gte: minPrice };
    if (maxPrice !== undefined) query.price = { ...query.price, $lte: maxPrice };
    const plans = await this.planModel.find(query).exec();
    const data = plans.map((p) => this.toViewModel(p));
    return createApiResponse(data, null, true, data.length);
  }

  async getByDuration(durationInDays?: number): Promise<ApiResponse<any[]>> {
    const query: any = {};
    if (durationInDays !== undefined) query.durationInDays = durationInDays;
    const plans = await this.planModel.find(query).exec();
    const data = plans.map((p) => this.toViewModel(p));
    return createApiResponse(data, null, true, data.length);
  }
}
