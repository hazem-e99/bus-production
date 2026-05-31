import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TripBooking, TripBookingDocument } from '../trip-booking/trip-booking.schema';

@Controller('api/Bookings')
export class BookingsController {
  constructor(
    @InjectModel(TripBooking.name) private bookingModel: Model<TripBookingDocument>,
  ) {}

  private getNumericId(doc: any): number {
    return parseInt((doc._id as any).toString().slice(-8), 16) % 100000;
  }

  @Get()
  async getAll(@Query('studentId') studentId?: string, @Query('tripId') tripId?: string) {
    const filter: any = {};
    if (studentId) filter.studentId = parseInt(studentId);
    if (tripId) filter.tripId = parseInt(tripId);
    const bookings = await this.bookingModel.find(filter).exec();
    return bookings.map((b) => ({
      id: this.getNumericId(b),
      tripId: b.tripId,
      studentId: b.studentId,
      pickupStopLocationId: b.pickupStopLocationId,
      status: b.status,
      bookingDate: b.bookingDate,
    }));
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const numId = parseInt(id);
    return this.bookingModel.findOne({ numericId: numId }).exec();
  }

  @Post()
  async create(@Body() dto: any) {
    const booking = await this.bookingModel.create(dto);
    return { id: this.getNumericId(booking), ...dto };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    const numId = parseInt(id);
    const booking = await this.bookingModel.findOneAndUpdate(
      { numericId: numId },
      { $set: dto },
      { new: true }
    ).exec();
    if (!booking) return { success: false, message: 'Not found' };
    return { success: true };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const numId = parseInt(id);
    const booking = await this.bookingModel.findOneAndDelete({ numericId: numId }).exec();
    if (!booking) return { success: false, message: 'Not found' };
    return { success: true };
  }
}
