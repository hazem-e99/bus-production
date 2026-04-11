import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TripBookingController } from './trip-booking.controller';
import { TripBookingService } from './trip-booking.service';
import { TripBooking, TripBookingSchema } from './trip-booking.schema';
import { Trip, TripSchema } from '../trips/trip.schema';
import { User, UserSchema } from '../users/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TripBooking.name, schema: TripBookingSchema },
      { name: Trip.name, schema: TripSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [TripBookingController],
  providers: [TripBookingService],
  exports: [TripBookingService],
})
export class TripBookingModule {}
