import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BusLocation, BusLocationDocument } from './bus-location.schema';
import { UpdateBusLocationDto } from './dto/update-bus-location.dto';
import { createApiResponse, createErrorResponse } from '../../common/interfaces/api-response.interface';

@Injectable()
export class BusTrackingService {
  constructor(
    @InjectModel(BusLocation.name)
    private busLocationModel: Model<BusLocationDocument>,
  ) {}

  async updateLocation(dto: UpdateBusLocationDto, driverId: string) {
    const location = await this.busLocationModel.findOneAndUpdate(
      { busId: dto.busId },
      {
        busId: dto.busId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        speed: dto.speed || 0,
        driverId,
        isTracking: true,
        timestamp: new Date(),
      },
      { upsert: true, new: true },
    );

    return createApiResponse(location, 'Location updated successfully');
  }

  async getLocationByBusId(busId: number) {
    const location = await this.busLocationModel.findOne({ busId }).exec();
    if (!location) {
      return createErrorResponse('No location data found for this bus');
    }
    return createApiResponse(location);
  }

  async getAllLocations() {
    const locations = await this.busLocationModel
      .find({ isTracking: true })
      .sort({ timestamp: -1 })
      .exec();
    return createApiResponse(locations, null, true, locations.length);
  }

  async getAllLocationsIncludingInactive() {
    const locations = await this.busLocationModel
      .find()
      .sort({ timestamp: -1 })
      .exec();
    return createApiResponse(locations, null, true, locations.length);
  }

  async stopTracking(busId: number, driverId: string) {
    const location = await this.busLocationModel.findOne({ busId }).exec();
    if (location && location.driverId !== driverId) {
      throw new ForbiddenException('You can only stop tracking for your own bus');
    }

    await this.busLocationModel.findOneAndUpdate(
      { busId },
      { isTracking: false, timestamp: new Date() },
    );

    return createApiResponse(null, 'Tracking stopped');
  }
}
