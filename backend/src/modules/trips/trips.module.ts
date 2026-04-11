import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { Trip, TripSchema } from './trip.schema';
import { Bus, BusSchema } from '../buses/bus.schema';
import { User, UserSchema } from '../users/user.schema';
import { Notification, NotificationSchema } from '../notifications/notification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Trip.name, schema: TripSchema },
      { name: Bus.name, schema: BusSchema },
      { name: User.name, schema: UserSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
