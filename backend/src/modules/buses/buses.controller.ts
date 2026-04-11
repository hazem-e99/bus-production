import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { BusesService } from './buses.service';

@Controller('api/Buses')
export class BusesController {
  constructor(private readonly busesService: BusesService) {}

  @Get()
  async getAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('busNumber') busNumber?: string,
    @Query('status') status?: string,
    @Query('minSpeed') minSpeed?: string,
    @Query('maxSpeed') maxSpeed?: string,
    @Query('minCapacity') minCapacity?: string,
    @Query('maxCapacity') maxCapacity?: string,
  ) {
    return this.busesService.getAll({
      page: page ? parseInt(page) : 0,
      pageSize: pageSize ? parseInt(pageSize) : 1000,
      busNumber: busNumber || '',
      status: status || '',
      minSpeed: minSpeed ? parseInt(minSpeed) : 0,
      maxSpeed: maxSpeed ? parseInt(maxSpeed) : 0,
      minCapacity: minCapacity ? parseInt(minCapacity) : 0,
      maxCapacity: maxCapacity ? parseInt(maxCapacity) : 0,
    });
  }

  @Post()
  async create(@Body() busData: any) {
    return this.busesService.create(busData);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.busesService.getById(parseInt(id));
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() busData: any) {
    return this.busesService.update(parseInt(id), busData);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.busesService.delete(parseInt(id));
  }
}
