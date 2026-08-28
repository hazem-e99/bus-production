import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { YearOfStudy, YearOfStudyDocument } from './year-of-study.schema';
import { createApiResponse, ApiResponse } from '../../common/interfaces/api-response.interface';
import { CreateYearOfStudyDto } from './dto/create-year-of-study.dto';
import { UpdateYearOfStudyDto } from './dto/update-year-of-study.dto';

@Injectable()
export class YearOfStudyService {
  constructor(
    @InjectModel(YearOfStudy.name) private yearModel: Model<YearOfStudyDocument>,
  ) {}

  private getNumericId(doc: any): number {
    return parseInt((doc._id as any).toString().slice(-8), 16) % 100000;
  }

  private toViewModel(year: YearOfStudyDocument): any {
    return {
      id: this.getNumericId(year),
      name: year.name,
      isActive: year.isActive,
    };
  }

  private async findByNumericId(id: number): Promise<YearOfStudyDocument | null> {
    return this.yearModel.findOne({ numericId: id }).exec();
  }

  async getAll(): Promise<ApiResponse<any[]>> {
    const years = await this.yearModel.find().sort({ name: 1 }).exec();
    const data = years.map((y) => this.toViewModel(y));
    return createApiResponse(data, null, true, data.length);
  }

  async getActive(): Promise<ApiResponse<any[]>> {
    const years = await this.yearModel.find({ isActive: true }).sort({ name: 1 }).exec();
    const data = years.map((y) => this.toViewModel(y));
    return createApiResponse(data, null, true, data.length);
  }

  async getById(id: number): Promise<ApiResponse<any>> {
    const year = await this.findByNumericId(id);
    if (!year) throw new NotFoundException('Year of study not found');
    return createApiResponse(this.toViewModel(year));
  }

  async create(dto: CreateYearOfStudyDto): Promise<ApiResponse<boolean>> {
    await this.yearModel.create(dto);
    return createApiResponse(true, 'Year of study created successfully');
  }

  async update(id: number, dto: UpdateYearOfStudyDto): Promise<ApiResponse<boolean>> {
    const year = await this.findByNumericId(id);
    if (!year) throw new NotFoundException('Year of study not found');
    await this.yearModel.findByIdAndUpdate(year._id, { $set: dto });
    return createApiResponse(true, 'Year of study updated successfully');
  }

  async delete(id: number): Promise<ApiResponse<boolean>> {
    const year = await this.findByNumericId(id);
    if (!year) throw new NotFoundException('Year of study not found');
    await this.yearModel.findByIdAndDelete(year._id);
    return createApiResponse(true, 'Year of study deleted');
  }

  async activate(id: number): Promise<ApiResponse<boolean>> {
    const year = await this.findByNumericId(id);
    if (!year) throw new NotFoundException('Year of study not found');
    await this.yearModel.findByIdAndUpdate(year._id, { isActive: true });
    return createApiResponse(true, 'Year of study activated');
  }

  async deactivate(id: number): Promise<ApiResponse<boolean>> {
    const year = await this.findByNumericId(id);
    if (!year) throw new NotFoundException('Year of study not found');
    await this.yearModel.findByIdAndUpdate(year._id, { isActive: false });
    return createApiResponse(true, 'Year of study deactivated');
  }
}
