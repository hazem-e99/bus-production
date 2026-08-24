import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

/**
 * Payment endpoints. Everything that reads across students, reviews a payment, or
 * deletes one is Admin-only — the global RolesGuard is permissive when no @Roles()
 * metadata is present, so each route must opt in explicitly. Only `my-payments`
 * (own history) and `create` (submit own payment) are open to any authenticated user.
 */
@Controller('api/Payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  @Roles('Admin')
  async getAll() {
    return this.paymentService.getAll();
  }

  @Get('my-payments')
  async getMyPayments(@CurrentUser('numericId') userId: number) {
    return this.paymentService.getMyPayments(userId);
  }

  @Get('pending')
  @Roles('Admin')
  async getPending() {
    return this.paymentService.getPending();
  }

  @Get('statistics')
  @Roles('Admin')
  async getStatistics() {
    return this.paymentService.getStatistics();
  }

  /** Aggregated subscription/revenue report backing the admin Reports page. */
  @Get('subscription-report')
  @Roles('Admin')
  async getSubscriptionReport() {
    return this.paymentService.getSubscriptionReport();
  }

  @Get('by-status/:status')
  @Roles('Admin')
  async getByStatus(@Param('status') status: string) {
    return this.paymentService.getByStatus(status);
  }

  @Get('by-student/:studentId')
  @Roles('Admin')
  async getByStudent(@Param('studentId') studentId: string) {
    return this.paymentService.getByStudent(parseInt(studentId));
  }

  @Get('by-subscription-plan/:planId')
  @Roles('Admin')
  async getBySubscriptionPlan(@Param('planId') planId: string) {
    return this.paymentService.getBySubscriptionPlan(parseInt(planId));
  }

  @Get(':id')
  @Roles('Admin')
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
  @Roles('Admin')
  async review(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser('numericId') adminId: number,
  ) {
    return this.paymentService.review(parseInt(id), dto, adminId);
  }

  @Delete(':id')
  @Roles('Admin')
  async delete(@Param('id') id: string) {
    return this.paymentService.delete(parseInt(id));
  }
}
