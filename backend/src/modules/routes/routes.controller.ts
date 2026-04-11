import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { RoutesService } from './routes.service';

@Controller('api/Routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get()
  async getAll() {
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
