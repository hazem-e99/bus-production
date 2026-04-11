import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

import { AuthenticationModule } from './modules/authentication/authentication.module';
import { UsersModule } from './modules/users/users.module';
import { BusesModule } from './modules/buses/buses.module';
import { TripsModule } from './modules/trips/trips.module';
import { TripBookingModule } from './modules/trip-booking/trip-booking.module';
import { PaymentModule } from './modules/payment/payment.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SubscriptionPlanModule } from './modules/subscription-plan/subscription-plan.module';
import { StudentSubscriptionModule } from './modules/student-subscription/student-subscription.module';
import { RoutesModule } from './modules/routes/routes.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { StudentDashboardModule } from './modules/student-dashboard/student-dashboard.module';
import { SettingsModule } from './modules/settings/settings.module';
import { FormsModule } from './modules/forms/forms.module';
import { TripRoutesModule } from './modules/trip-routes/trip-routes.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { BusTrackingModule } from './modules/bus-tracking/bus-tracking.module';
import { VotingModule } from './modules/voting/voting.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    AuthenticationModule,
    UsersModule,
    BusesModule,
    TripsModule,
    TripBookingModule,
    PaymentModule,
    NotificationsModule,
    SubscriptionPlanModule,
    StudentSubscriptionModule,
    RoutesModule,
    TripRoutesModule,
    AttendanceModule,
    StudentDashboardModule,
    SettingsModule,
    FormsModule,
    BookingsModule,
    BusTrackingModule,
    VotingModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
