import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { RoutesService } from '../routes/routes.service';

@Controller('api/TripRoutes')
export class TripRoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get()
  async getAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('name') name?: string,
    @Query('startLocation') startLocation?: string,
    @Query('endLocation') endLocation?: string,
  ) {
    return this.routesService.getAll();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.routesService.getById(parseInt(id));
  }

  @Post()
  async create(@Body() dto: any) {
    return this.routesService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.routesService.update(parseInt(id), dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.routesService.delete(parseInt(id));
  }
}
