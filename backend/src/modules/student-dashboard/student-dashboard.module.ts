import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StudentDashboardController } from './student-dashboard.controller';
import { StudentDashboardService } from './student-dashboard.service';
import { TripBooking, TripBookingSchema } from '../trip-booking/trip-booking.schema';
import { Trip, TripSchema } from '../trips/trip.schema';
import { Payment, PaymentSchema } from '../payment/payment.schema';
import { StudentSubscription, StudentSubscriptionSchema } from '../student-subscription/student-subscription.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TripBooking.name, schema: TripBookingSchema },
      { name: Trip.name, schema: TripSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: StudentSubscription.name, schema: StudentSubscriptionSchema },
    ]),
  ],
  controllers: [StudentDashboardController],
  providers: [StudentDashboardService],
})
export class StudentDashboardModule {}
