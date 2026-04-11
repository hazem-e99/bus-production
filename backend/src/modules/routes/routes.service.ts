import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TripRoute, TripRouteDocument } from './route.schema';
import { Trip, TripDocument } from '../trips/trip.schema';
import { createApiResponse, ApiResponse } from '../../common/interfaces/api-response.interface';

@Injectable()
export class RoutesService {
  constructor(
    @InjectModel(TripRoute.name) private routeModel: Model<TripRouteDocument>,
    @InjectModel(Trip.name) private tripModel: Model<TripDocument>,
  ) {}

  private getNumericId(doc: any): number {
    return parseInt((doc._id as any).toString().slice(-8), 16) % 100000;
  }

  private toViewModel(route: TripRouteDocument): any {
    const id = this.getNumericId(route);
    return {
      id,
      name: route.name,
      startLocation: route.startLocation,
      endLocation: route.endLocation,
      distance: route.distance,
      estimatedTime: route.estimatedTime,
      stopLocations: route.stopLocations || [],
      stopLocationsCount: route.stopLocations?.length || 0,
      createdAt: (route as any).createdAt,
      updatedAt: (route as any).updatedAt,
    };
  }

  private async findByNumericId(id: number): Promise<TripRouteDocument | null> {
    const routes = await this.routeModel.find().exec();
    return routes.find((r) => this.getNumericId(r) === id) || null;
  }

  async getAll(): Promise<any[]> {
    const routes = await this.routeModel.find().exec();
    return routes.map((r) => this.toViewModel(r));
  }

  async getById(id: number): Promise<any> {
    const route = await this.findByNumericId(id);
    if (!route) throw new NotFoundException('Route not found');
    return this.toViewModel(route);
  }

  async create(dto: any): Promise<any> {
    const route = await this.routeModel.create(dto);
    return this.toViewModel(route);
  }

  async update(id: number, dto: any): Promise<any> {
    const route = await this.findByNumericId(id);
    if (!route) throw new NotFoundException('Route not found');
    const updated = await this.routeModel
      .findByIdAndUpdate(route._id, { $set: dto }, { new: true })
      .exec();
    return this.toViewModel(updated!);
  }

  async delete(id: number): Promise<any> {
    const route = await this.findByNumericId(id);
    if (!route) throw new NotFoundException('Route not found');
    await this.routeModel.findByIdAndDelete(route._id);
    return { success: true, message: 'Route deleted' };
  }
}
