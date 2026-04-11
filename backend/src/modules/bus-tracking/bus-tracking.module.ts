import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BusTrackingController } from './bus-tracking.controller';
import { BusTrackingService } from './bus-tracking.service';
import { BusTrackingGateway } from './bus-tracking.gateway';
import { BusLocation, BusLocationSchema } from './bus-location.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BusLocation.name, schema: BusLocationSchema },
    ]),
  ],
  controllers: [BusTrackingController],
  providers: [BusTrackingService, BusTrackingGateway],
  exports: [BusTrackingService, BusTrackingGateway],
})
export class BusTrackingModule {}
