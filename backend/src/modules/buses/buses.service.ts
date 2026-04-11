import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Bus, BusDocument } from './bus.schema';
import { createApiResponse, ApiResponse } from '../../common/interfaces/api-response.interface';

@Injectable()
export class BusesService {
  constructor(@InjectModel(Bus.name) private busModel: Model<BusDocument>) {}

  private toViewModel(bus: BusDocument) {
    const id = parseInt((bus._id as any).toString().slice(-8), 16) % 100000;
    return {
      id,
      busNumber: bus.busNumber,
      speed: bus.speed,
      capacity: bus.capacity,
      status: bus.status,
      fuelLevel: bus.fuelLevel,
      location: bus.location,
      updatedAt: (bus as any).updatedAt,
    };
  }

  async getAll(params?: any): Promise<ApiResponse<any[]>> {
    const query: any = {};
    if (params?.busNumber) query.busNumber = new RegExp(params.busNumber, 'i');
    if (params?.status) query.status = params.status;
    if (params?.minSpeed > 0) query.speed = { ...query.speed, $gte: params.minSpeed };
    if (params?.maxSpeed > 0) query.speed = { ...query.speed, $lte: params.maxSpeed };
    if (params?.minCapacity > 0) query.capacity = { ...query.capacity, $gte: params.minCapacity };
    if (params?.maxCapacity > 0) query.capacity = { ...query.capacity, $lte: params.maxCapacity };

    const page = params?.page || 0;
    const pageSize = params?.pageSize || 1000;

    const buses = await this.busModel
      .find(query)
      .skip(page * pageSize)
      .limit(pageSize)
      .exec();

    const data = buses.map((b) => this.toViewModel(b));
    const total = await this.busModel.countDocuments(query);
    return createApiResponse(data, 'Buses retrieved successfully', true, total);
  }

  async getById(id: number): Promise<ApiResponse<any>> {
    const bus = await this.findByNumericId(id);
    if (!bus) throw new NotFoundException('Bus not found');
    return createApiResponse(this.toViewModel(bus));
  }

  async create(busData: any): Promise<ApiResponse<any>> {
    try {
      const bus = await this.busModel.create(busData);
      return createApiResponse(this.toViewModel(bus), 'Bus created successfully', true);
    } catch (error: any) {
      if (error.code === 11000) {
        return createApiResponse(null, 'Bus number already exists', false);
      }
      throw error;
    }
  }

  async update(id: number, busData: any): Promise<ApiResponse<any>> {
    const bus = await this.findByNumericId(id);
    if (!bus) throw new NotFoundException('Bus not found');
    const updated = await this.busModel
      .findByIdAndUpdate(bus._id, { $set: busData }, { new: true })
      .exec();
    return createApiResponse(this.toViewModel(updated!), 'Bus updated successfully');
  }

  async delete(id: number): Promise<ApiResponse<null>> {
    const bus = await this.findByNumericId(id);
    if (!bus) throw new NotFoundException('Bus not found');
    await this.busModel.findByIdAndDelete(bus._id);
    return createApiResponse(null, 'Bus deleted successfully');
  }

  async findByNumericId(numericId: number): Promise<BusDocument | null> {
    const buses = await this.busModel.find().exec();
    return buses.find((b) => {
      const bid = parseInt((b._id as any).toString().slice(-8), 16) % 100000;
      return bid === numericId;
    }) || null;
  }
}
