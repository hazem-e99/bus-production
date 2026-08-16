import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminSystemController } from './admin-system.controller';
import { AdminSystemService } from './admin-system.service';

import { User, UserSchema } from '../users/user.schema';
import { Bus, BusSchema } from '../buses/bus.schema';
import { Trip, TripSchema } from '../trips/trip.schema';
import { TripBooking, TripBookingSchema } from '../trip-booking/trip-booking.schema';
import { Payment, PaymentSchema } from '../payment/payment.schema';
import { Notification, NotificationSchema } from '../notifications/notification.schema';
import { SubscriptionPlan, SubscriptionPlanSchema } from '../subscription-plan/subscription-plan.schema';
import { StudentSubscription, StudentSubscriptionSchema } from '../student-subscription/student-subscription.schema';
import { TripRoute, TripRouteSchema } from '../routes/route.schema';
import { Attendance, AttendanceSchema } from '../attendance/attendance.schema';
import { VotingSurvey, VotingSurveySchema, VoteResponse, VoteResponseSchema } from '../voting/voting.schema';
import { BusLocation, BusLocationSchema } from '../bus-tracking/bus-location.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Bus.name, schema: BusSchema },
      { name: Trip.name, schema: TripSchema },
      { name: TripBooking.name, schema: TripBookingSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: StudentSubscription.name, schema: StudentSubscriptionSchema },
      { name: TripRoute.name, schema: TripRouteSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: VotingSurvey.name, schema: VotingSurveySchema },
      { name: VoteResponse.name, schema: VoteResponseSchema },
      { name: BusLocation.name, schema: BusLocationSchema },
    ]),
  ],
  controllers: [AdminSystemController],
  providers: [AdminSystemService],
})
export class AdminSystemModule {}
