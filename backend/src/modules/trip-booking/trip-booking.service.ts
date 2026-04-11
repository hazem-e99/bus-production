import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TripBooking, TripBookingDocument } from './trip-booking.schema';
import { Trip, TripDocument } from '../trips/trip.schema';
import { User, UserDocument } from '../users/user.schema';
import { createApiResponse, ApiResponse } from '../../common/interfaces/api-response.interface';

@Injectable()
export class TripBookingService {
  constructor(
    @InjectModel(TripBooking.name) private bookingModel: Model<TripBookingDocument>,
    @InjectModel(Trip.name) private tripModel: Model<TripDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  private getNumericId(doc: any): number {
    return parseInt((doc._id as any).toString().slice(-8), 16) % 100000;
  }

  private async toViewModel(booking: TripBookingDocument): Promise<any> {
    const id = this.getNumericId(booking);
    const student = await this.findEntityByNumericId(this.userModel, booking.studentId);
    const trip = await this.findEntityByNumericId(this.tripModel, booking.tripId);

    return {
      id,
      tripId: booking.tripId,
      studentId: booking.studentId,
      studentName: student ? `${student.firstName} ${student.lastName}` : null,
      studentEmail: student?.email || null,
      pickupStopLocationId: booking.pickupStopLocationId,
      pickupStopName: null,
      userSubscriptionId: booking.userSubscriptionId,
      status: booking.status,
      bookingDate: booking.bookingDate?.toISOString() || null,
      cancellationDate: booking.cancellationDate?.toISOString() || null,
      tripDate: trip?.tripDate || null,
      departureTime: trip?.departureTimeOnly || null,
      arrivalTime: trip?.arrivalTimeOnly || null,
    };
  }

  private async findEntityByNumericId(model: Model<any>, numericId: number): Promise<any> {
    const docs = await model.find().exec();
    return docs.find((d) => this.getNumericId(d) === numericId) || null;
  }

  async create(dto: any): Promise<ApiResponse<boolean>> {
    await this.bookingModel.create(dto);
    const trip = await this.findEntityByNumericId(this.tripModel, dto.tripId);
    if (trip) {
      await this.tripModel.findByIdAndUpdate(trip._id, { $inc: { bookedSeats: 1 } });
    }
    return createApiResponse(true, 'Booking created successfully');
  }

  async getById(id: number): Promise<ApiResponse<any>> {
    const booking = await this.findByNumericId(id);
    if (!booking) throw new NotFoundException('Booking not found');
    const vm = await this.toViewModel(booking);
    return createApiResponse(vm);
  }

  async delete(id: number): Promise<ApiResponse<boolean>> {
    const booking = await this.findByNumericId(id);
    if (!booking) throw new NotFoundException('Booking not found');
    await this.bookingModel.findByIdAndDelete(booking._id);
    return createApiResponse(true, 'Booking deleted');
  }

  async cancel(bookId: number): Promise<ApiResponse<boolean>> {
    const booking = await this.findByNumericId(bookId);
    if (!booking) throw new NotFoundException('Booking not found');
    await this.bookingModel.findByIdAndUpdate(booking._id, {
      status: 'Cancelled',
      cancellationDate: new Date(),
    });
    const trip = await this.findEntityByNumericId(this.tripModel, booking.tripId);
    if (trip) {
      await this.tripModel.findByIdAndUpdate(trip._id, { $inc: { bookedSeats: -1 } });
    }
    return createApiResponse(true, 'Booking cancelled');
  }

  async updatePickupLocation(id: number, dto: any): Promise<ApiResponse<boolean>> {
    const booking = await this.findByNumericId(id);
    if (!booking) throw new NotFoundException('Booking not found');
    await this.bookingModel.findByIdAndUpdate(booking._id, {
      pickupStopLocationId: dto.pickupStopLocationId,
    });
    return createApiResponse(true, 'Pickup location updated');
  }

  async search(searchDto: any): Promise<ApiResponse<any[]>> {
    const query: any = {};
    if (searchDto.tripId) query.tripId = searchDto.tripId;
    if (searchDto.studentId) query.studentId = searchDto.studentId;
    if (searchDto.status) query.status = searchDto.status;
    if (searchDto.tripDate) {
      const trip = await this.tripModel.find({ tripDate: searchDto.tripDate }).exec();
      const tripIds = trip.map((t) => this.getNumericId(t));
      query.tripId = { $in: tripIds };
    }

    const bookings = await this.bookingModel.find(query).exec();
    const viewModels = await Promise.all(bookings.map((b) => this.toViewModel(b)));
    return createApiResponse(viewModels, null, true, viewModels.length);
  }

  async getByTrip(tripId: number): Promise<ApiResponse<any[]>> {
    const bookings = await this.bookingModel.find({ tripId }).exec();
    const viewModels = await Promise.all(bookings.map((b) => this.toViewModel(b)));
    return createApiResponse(viewModels, null, true, viewModels.length);
  }

  async getByStudent(studentId: number): Promise<ApiResponse<any[]>> {
    const bookings = await this.bookingModel.find({ studentId }).exec();
    const viewModels = await Promise.all(bookings.map((b) => this.toViewModel(b)));
    return createApiResponse(viewModels, null, true, viewModels.length);
  }

  async getByDate(date: string): Promise<ApiResponse<any[]>> {
    const trips = await this.tripModel.find({ tripDate: date }).exec();
    const tripIds = trips.map((t) => this.getNumericId(t));
    const bookings = await this.bookingModel.find({ tripId: { $in: tripIds } }).exec();
    const viewModels = await Promise.all(bookings.map((b) => this.toViewModel(b)));
    return createApiResponse(viewModels, null, true, viewModels.length);
  }

  async checkEligibility(tripId: number, studentId: number): Promise<ApiResponse<boolean>> {
    const existing = await this.bookingModel.findOne({
      tripId,
      studentId,
      status: { $ne: 'Cancelled' },
    }).exec();
    return createApiResponse(!existing, existing ? 'Already booked' : 'Eligible');
  }

  async hasBooked(tripId: number, userId: number): Promise<ApiResponse<boolean>> {
    const existing = await this.bookingModel.findOne({
      tripId,
      studentId: userId,
      status: { $ne: 'Cancelled' },
    }).exec();
    return createApiResponse(!!existing);
  }

  private async findByNumericId(numericId: number): Promise<TripBookingDocument | null> {
    const bookings = await this.bookingModel.find().exec();
    return bookings.find((b) => this.getNumericId(b) === numericId) || null;
  }
}
