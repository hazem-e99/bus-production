import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/Payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  async getAll() {
    return this.paymentService.getAll();
  }

  @Get('my-payments')
  async getMyPayments(@CurrentUser('numericId') userId: number) {
    return this.paymentService.getMyPayments(userId);
  }

  @Get('pending')
  async getPending() {
    return this.paymentService.getPending();
  }

  @Get('statistics')
  async getStatistics() {
    return this.paymentService.getStatistics();
  }

  @Get('by-status/:status')
  async getByStatus(@Param('status') status: string) {
    return this.paymentService.getByStatus(status);
  }

  @Get('by-student/:studentId')
  async getByStudent(@Param('studentId') studentId: string) {
    return this.paymentService.getByStudent(parseInt(studentId));
  }

  @Get('by-subscription-plan/:planId')
  async getBySubscriptionPlan(@Param('planId') planId: string) {
    return this.paymentService.getBySubscriptionPlan(parseInt(planId));
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.paymentService.getById(parseInt(id));
  }

  @Post()
  async create(
    @Body() dto: any,
    @CurrentUser('numericId') userId: number,
  ) {
    return this.paymentService.create(dto, userId);
  }

  @Put(':id/review')
  async review(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser('numericId') adminId: number,
  ) {
    return this.paymentService.review(parseInt(id), dto, adminId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.paymentService.delete(parseInt(id));
  }
}
