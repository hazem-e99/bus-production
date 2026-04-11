import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookingsController } from './bookings.controller';
import { TripBooking, TripBookingSchema } from '../trip-booking/trip-booking.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: TripBooking.name, schema: TripBookingSchema }]),
  ],
  controllers: [BookingsController],
})
export class BookingsModule {}
