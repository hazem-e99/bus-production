import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PreferredArea, PreferredAreaDocument } from './preferred-area.schema';
import { createApiResponse, ApiResponse } from '../../common/interfaces/api-response.interface';
import { CreatePreferredAreaDto } from './dto/create-preferred-area.dto';
import { UpdatePreferredAreaDto } from './dto/update-preferred-area.dto';

@Injectable()
export class PreferredAreaService {
  constructor(
    @InjectModel(PreferredArea.name) private areaModel: Model<PreferredAreaDocument>,
  ) {}

  private getNumericId(doc: any): number {
    return parseInt((doc._id as any).toString().slice(-8), 16) % 100000;
  }

  private toViewModel(area: PreferredAreaDocument): any {
    return {
      id: this.getNumericId(area),
      name: area.name,
      isActive: area.isActive,
    };
  }

  private async findByNumericId(id: number): Promise<PreferredAreaDocument | null> {
    return this.areaModel.findOne({ numericId: id }).exec();
  }

  async getAll(): Promise<ApiResponse<any[]>> {
    const areas = await this.areaModel.find().sort({ name: 1 }).exec();
    const data = areas.map((a) => this.toViewModel(a));
    return createApiResponse(data, null, true, data.length);
  }

  async getActive(): Promise<ApiResponse<any[]>> {
    const areas = await this.areaModel.find({ isActive: true }).sort({ name: 1 }).exec();
    const data = areas.map((a) => this.toViewModel(a));
    return createApiResponse(data, null, true, data.length);
  }

  async getById(id: number): Promise<ApiResponse<any>> {
    const area = await this.findByNumericId(id);
    if (!area) throw new NotFoundException('Preferred area not found');
    return createApiResponse(this.toViewModel(area));
  }

  async create(dto: CreatePreferredAreaDto): Promise<ApiResponse<boolean>> {
    await this.areaModel.create(dto);
    return createApiResponse(true, 'Preferred area created successfully');
  }

  async update(id: number, dto: UpdatePreferredAreaDto): Promise<ApiResponse<boolean>> {
    const area = await this.findByNumericId(id);
    if (!area) throw new NotFoundException('Preferred area not found');
    await this.areaModel.findByIdAndUpdate(area._id, { $set: dto });
    return createApiResponse(true, 'Preferred area updated successfully');
  }

  async delete(id: number): Promise<ApiResponse<boolean>> {
    const area = await this.findByNumericId(id);
    if (!area) throw new NotFoundException('Preferred area not found');
    await this.areaModel.findByIdAndDelete(area._id);
    return createApiResponse(true, 'Preferred area deleted');
  }

  async activate(id: number): Promise<ApiResponse<boolean>> {
    const area = await this.findByNumericId(id);
    if (!area) throw new NotFoundException('Preferred area not found');
    await this.areaModel.findByIdAndUpdate(area._id, { isActive: true });
    return createApiResponse(true, 'Preferred area activated');
  }

  async deactivate(id: number): Promise<ApiResponse<boolean>> {
    const area = await this.findByNumericId(id);
    if (!area) throw new NotFoundException('Preferred area not found');
    await this.areaModel.findByIdAndUpdate(area._id, { isActive: false });
    return createApiResponse(true, 'Preferred area deactivated');
  }
}
