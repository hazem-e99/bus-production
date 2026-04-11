import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { BusTrackingService } from './bus-tracking.service';
import { UpdateBusLocationDto } from './dto/update-bus-location.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BusTrackingGateway } from './bus-tracking.gateway';

@Controller('api/BusTracking')
export class BusTrackingController {
  constructor(
    private readonly busTrackingService: BusTrackingService,
    private readonly busTrackingGateway: BusTrackingGateway,
  ) {}

  @Post('location')
  @Roles('Driver')
  async updateLocation(
    @Body() dto: UpdateBusLocationDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.busTrackingService.updateLocation(dto, user.id);

    this.busTrackingGateway.emitLocationUpdate({
      busId: dto.busId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      speed: dto.speed || 0,
      driverId: user.id,
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  @Get('location/:busId')
  @Roles('Admin', 'MovementManager', 'Driver')
  async getLocation(@Param('busId') busId: string) {
    return this.busTrackingService.getLocationByBusId(parseInt(busId));
  }

  @Get('locations')
  @Roles('Admin', 'MovementManager')
  async getAllLocations() {
    return this.busTrackingService.getAllLocations();
  }

  @Get('locations/all')
  @Roles('Admin')
  async getAllLocationsIncludingInactive() {
    return this.busTrackingService.getAllLocationsIncludingInactive();
  }

  @Post('stop/:busId')
  @Roles('Driver')
  async stopTracking(
    @Param('busId') busId: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.busTrackingService.stopTracking(
      parseInt(busId),
      user.id,
    );

    this.busTrackingGateway.emitTrackingStopped({
      busId: parseInt(busId),
      driverId: user.id,
    });

    return result;
  }
}
