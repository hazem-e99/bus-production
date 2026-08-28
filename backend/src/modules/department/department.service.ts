import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Department, DepartmentDocument } from './department.schema';
import { createApiResponse, ApiResponse } from '../../common/interfaces/api-response.interface';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectModel(Department.name) private departmentModel: Model<DepartmentDocument>,
  ) {}

  private getNumericId(doc: any): number {
    return parseInt((doc._id as any).toString().slice(-8), 16) % 100000;
  }

  private toViewModel(department: DepartmentDocument): any {
    return {
      id: this.getNumericId(department),
      name: department.name,
      isActive: department.isActive,
    };
  }

  private async findByNumericId(id: number): Promise<DepartmentDocument | null> {
    return this.departmentModel.findOne({ numericId: id }).exec();
  }

  async getAll(): Promise<ApiResponse<any[]>> {
    const departments = await this.departmentModel.find().sort({ name: 1 }).exec();
    const data = departments.map((d) => this.toViewModel(d));
    return createApiResponse(data, null, true, data.length);
  }

  async getActive(): Promise<ApiResponse<any[]>> {
    const departments = await this.departmentModel.find({ isActive: true }).sort({ name: 1 }).exec();
    const data = departments.map((d) => this.toViewModel(d));
    return createApiResponse(data, null, true, data.length);
  }

  async getById(id: number): Promise<ApiResponse<any>> {
    const department = await this.findByNumericId(id);
    if (!department) throw new NotFoundException('Department not found');
    return createApiResponse(this.toViewModel(department));
  }

  async create(dto: CreateDepartmentDto): Promise<ApiResponse<boolean>> {
    await this.departmentModel.create(dto);
    return createApiResponse(true, 'Department created successfully');
  }

  async update(id: number, dto: UpdateDepartmentDto): Promise<ApiResponse<boolean>> {
    const department = await this.findByNumericId(id);
    if (!department) throw new NotFoundException('Department not found');
    await this.departmentModel.findByIdAndUpdate(department._id, { $set: dto });
    return createApiResponse(true, 'Department updated successfully');
  }

  async delete(id: number): Promise<ApiResponse<boolean>> {
    const department = await this.findByNumericId(id);
    if (!department) throw new NotFoundException('Department not found');
    await this.departmentModel.findByIdAndDelete(department._id);
    return createApiResponse(true, 'Department deleted');
  }

  async activate(id: number): Promise<ApiResponse<boolean>> {
    const department = await this.findByNumericId(id);
    if (!department) throw new NotFoundException('Department not found');
    await this.departmentModel.findByIdAndUpdate(department._id, { isActive: true });
    return createApiResponse(true, 'Department activated');
  }

  async deactivate(id: number): Promise<ApiResponse<boolean>> {
    const department = await this.findByNumericId(id);
    if (!department) throw new NotFoundException('Department not found');
    await this.departmentModel.findByIdAndUpdate(department._id, { isActive: false });
    return createApiResponse(true, 'Department deactivated');
  }
}
