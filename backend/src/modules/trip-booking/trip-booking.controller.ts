import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, HttpCode } from '@nestjs/common';
import { TripBookingService } from './trip-booking.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/TripBooking')
export class TripBookingController {
  constructor(private readonly bookingService: TripBookingService) {}

  @Post()
  async create(@Body() dto: any) {
    return this.bookingService.create(dto);
  }

  @Post('search')
  @HttpCode(200)
  async search(@Body() searchDto: any) {
    return this.bookingService.search(searchDto);
  }

  @Get('by-trip/:tripId')
  async getByTrip(@Param('tripId') tripId: string) {
    return this.bookingService.getByTrip(parseInt(tripId));
  }

  @Get('by-student/:studentId')
  async getByStudent(@Param('studentId') studentId: string) {
    return this.bookingService.getByStudent(parseInt(studentId));
  }

  @Get('by-date/:date')
  async getByDate(@Param('date') date: string) {
    return this.bookingService.getByDate(date);
  }

  @Get('check-eligibility')
  async checkEligibility(
    @Query('tripId') tripId: string,
    @Query('studentId') studentId: string,
  ) {
    return this.bookingService.checkEligibility(parseInt(tripId), parseInt(studentId));
  }

  @Get('has-booked/:tripId')
  async hasBooked(
    @Param('tripId') tripId: string,
    @CurrentUser('numericId') userId: number,
  ) {
    return this.bookingService.hasBooked(parseInt(tripId), userId);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.bookingService.getById(parseInt(id));
  }

  @Put('update-trip-pickup/:id')
  async updatePickupLocation(@Param('id') id: string, @Body() dto: any) {
    return this.bookingService.updatePickupLocation(parseInt(id), dto);
  }

  @Patch(':bookId/cancel')
  async cancel(@Param('bookId') bookId: string) {
    return this.bookingService.cancel(parseInt(bookId));
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.bookingService.delete(parseInt(id));
  }
}
