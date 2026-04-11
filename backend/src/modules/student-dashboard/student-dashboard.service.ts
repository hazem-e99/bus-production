import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TripBooking, TripBookingDocument } from '../trip-booking/trip-booking.schema';
import { Trip, TripDocument } from '../trips/trip.schema';
import { Payment, PaymentDocument } from '../payment/payment.schema';
import { StudentSubscription, StudentSubscriptionDocument } from '../student-subscription/student-subscription.schema';

@Injectable()
export class StudentDashboardService {
  constructor(
    @InjectModel(TripBooking.name) private bookingModel: Model<TripBookingDocument>,
    @InjectModel(Trip.name) private tripModel: Model<TripDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(StudentSubscription.name) private subModel: Model<StudentSubscriptionDocument>,
  ) {}

  async getStats(studentId: number) {
    const bookings = await this.bookingModel.find({ studentId }).exec();
    const payments = await this.paymentModel.find({ studentId }).exec();
    const activeSub = await this.subModel.findOne({ studentId, isActive: true }).exec();

    return {
      totalTrips: bookings.length,
      completedTrips: bookings.filter((b) => b.status === 'Completed').length,
      cancelledTrips: bookings.filter((b) => b.status === 'Cancelled').length,
      upcomingTrips: bookings.filter((b) => b.status === 'Confirmed').length,
      totalPayments: payments.length,
      pendingPayments: payments.filter((p) => p.status === 'Pending').length,
      hasActiveSubscription: !!activeSub,
      subscriptionStatus: activeSub?.status || 'None',
    };
  }

  async getRecentTrips(studentId: number) {
    const bookings = await this.bookingModel
      .find({ studentId })
      .sort({ bookingDate: -1 })
      .limit(5)
      .exec();
    return bookings;
  }

  async getUpcomingTrips(studentId: number) {
    const today = new Date().toISOString().split('T')[0];
    const bookings = await this.bookingModel
      .find({ studentId, status: 'Confirmed' })
      .exec();
    return bookings;
  }

  async getPayments(studentId: number) {
    return this.paymentModel
      .find({ studentId })
      .sort({ createdAt: -1 })
      .limit(10)
      .exec();
  }
}
