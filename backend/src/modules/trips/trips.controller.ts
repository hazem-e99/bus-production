import { Controller, Get, Post, Put, Delete, Param, Body, Query, HttpCode } from '@nestjs/common';
import { TripsService } from './trips.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/Trip')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get()
  async getAll() {
    return this.tripsService.getAll();
  }

  @Get('my-trips')
  async getMyTrips(@CurrentUser('numericId') userId: number) {
    return this.tripsService.getMyTrips(userId);
  }

  @Get('upcoming')
  async getUpcoming() {
    return this.tripsService.getUpcoming();
  }

  @Get('completed')
  async getCompleted() {
    return this.tripsService.getCompleted();
  }

  @Get('search')
  async search(@Query('q') query: string) {
    return this.tripsService.search(query || '');
  }

  @Get('by-date/:date')
  async getByDate(@Param('date') date: string) {
    return this.tripsService.getByDate(date);
  }

  @Get('by-driver/:driverId')
  async getByDriver(@Param('driverId') driverId: string) {
    return this.tripsService.getByDriver(parseInt(driverId));
  }

  @Get('by-bus/:busId')
  async getByBus(@Param('busId') busId: string) {
    return this.tripsService.getByBus(parseInt(busId));
  }

  @Get('status/:status')
  async getByStatus(@Param('status') status: string) {
    return this.tripsService.getByStatus(status);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.tripsService.getById(parseInt(id));
  }

  @Post()
  async create(@Body() tripData: any) {
    return this.tripsService.create(tripData);
  }

  @Post('renew/:id')
  @HttpCode(200)
  async renew(@Param('id') id: string) {
    return this.tripsService.renew(parseInt(id));
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() tripData: any) {
    return this.tripsService.update(parseInt(id), tripData);
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.tripsService.updateStatus(parseInt(id), body.status);
  }

  @Put(':id/driver')
  async assignDriver(@Param('id') id: string, @Body() body: { driverId: number }) {
    return this.tripsService.assignDriver(parseInt(id), body.driverId);
  }

  @Put(':id/bus')
  async assignBus(@Param('id') id: string, @Body() body: { busId: number }) {
    return this.tripsService.assignBus(parseInt(id), body.busId);
  }

  @Put(':id/conductor')
  async assignConductor(@Param('id') id: string, @Body() body: { conductorId: number }) {
    return this.tripsService.assignConductor(parseInt(id), body.conductorId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.tripsService.delete(parseInt(id));
  }
}
