import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { SubscriptionPlanService } from './subscription-plan.service';

@Controller('api/SubscriptionPlan')
export class SubscriptionPlanController {
  constructor(private readonly planService: SubscriptionPlanService) {}

  @Get()
  async getAll() {
    return this.planService.getAll();
  }

  @Get('active')
  async getActive() {
    return this.planService.getActive();
  }

  @Get('by-price-range')
  async getByPriceRange(
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
  ) {
    return this.planService.getByPriceRange(
      minPrice ? parseFloat(minPrice) : undefined,
      maxPrice ? parseFloat(maxPrice) : undefined,
    );
  }

  @Get('by-duration')
  async getByDuration(@Query('durationInDays') durationInDays?: string) {
    return this.planService.getByDuration(durationInDays ? parseInt(durationInDays) : undefined);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.planService.getById(parseInt(id));
  }

  @Post()
  async create(@Body() dto: any) {
    return this.planService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.planService.update(parseInt(id), dto);
  }

  @Put(':id/activate')
  async activate(@Param('id') id: string) {
    return this.planService.activate(parseInt(id));
  }

  @Put(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    return this.planService.deactivate(parseInt(id));
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.planService.delete(parseInt(id));
  }
}
