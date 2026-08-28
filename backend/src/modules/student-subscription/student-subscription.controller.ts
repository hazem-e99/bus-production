import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { StudentSubscriptionService } from './student-subscription.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequestCancellationDto, ReviewCancellationDto } from './dto/cancellation.dto';

/**
 * Route order matters: literal segments must be declared before the `:id`
 * wildcard or they get swallowed by it.
 */
@Controller('api/StudentSubscription')
export class StudentSubscriptionController {
  constructor(private readonly subService: StudentSubscriptionService) {}

  @Get('my-active-subscription')
  async getMyActiveSubscription(@CurrentUser('numericId') userId: number) {
    return this.subService.getMyActiveSubscription(userId);
  }

  @Get('my-subscriptions')
  async getMySubscriptions(@CurrentUser('numericId') userId: number) {
    return this.subService.getMySubscriptions(userId);
  }

  /** Admin: all subscriptions across all students. */
  @Get('all')
  @Roles('Admin')
  async getAll() {
    return this.subService.getAll();
  }

  /** Admin queue of student-initiated cancellation requests. */
  @Get('cancellation-requests')
  @Roles('Admin')
  async getCancellationRequests(@Query('status') status?: string) {
    return this.subService.getCancellationRequests(status || 'Pending');
  }

  @Get('expiring-soon')
  @Roles('Admin')
  async getExpiringSoon() {
    return this.subService.getExpiringSoon();
  }

  @Get('expired')
  @Roles('Admin')
  async getExpired() {
    return this.subService.getExpired();
  }

  @Get('by-student/:studentId')
  @Roles('Admin')
  async getByStudent(@Param('studentId') studentId: string) {
    return this.subService.getByStudent(parseInt(studentId));
  }

  @Get('by-plan/:planId')
  @Roles('Admin')
  async getByPlan(@Param('planId') planId: string) {
    return this.subService.getByPlan(parseInt(planId));
  }

  @Get('by-status/:status')
  @Roles('Admin')
  async getByStatus(@Param('status') status: string) {
    return this.subService.getByStatus(status);
  }

  @Get(':id')
  @Roles('Admin')
  async getById(@Param('id') id: string) {
    return this.subService.getById(parseInt(id));
  }

  /**
   * Student asks to cancel their own active subscription. A reason is mandatory.
   * This only queues the request — nothing is cancelled until an admin approves.
   */
  @Post('request-cancellation')
  @Roles('Student')
  async requestCancellation(
    @CurrentUser('numericId') userId: number,
    @Body() dto: RequestCancellationDto,
  ) {
    return this.subService.requestCancellation(userId, dto);
  }

  /** Admin approves (cancels + refunds) or rejects a pending cancellation request. */
  @Put(':id/cancellation-review')
  @Roles('Admin')
  async reviewCancellation(
    @Param('id') id: string,
    @Body() dto: ReviewCancellationDto,
    @CurrentUser('numericId') adminId: number,
  ) {
    return this.subService.reviewCancellation(parseInt(id), dto, adminId);
  }

  @Put(':id/activate')
  @Roles('Admin')
  async activate(@Param('id') id: string) {
    return this.subService.activate(parseInt(id));
  }

  @Put(':id/suspend')
  @Roles('Admin')
  async suspend(@Param('id') id: string, @Body() dto: any) {
    return this.subService.suspend(parseInt(id), dto);
  }

  /**
   * Admin-only: clears a student's active subscription and any pending
   * payment so they can select a plan again (e.g. they picked the wrong
   * package). Payment/subscription records are preserved (status-changed,
   * not deleted) — see StudentSubscriptionService.resetForStudent.
   */
  @Put('by-student/:studentId/reset')
  @Roles('Admin')
  async resetForStudent(
    @Param('studentId') studentId: string,
    @CurrentUser('numericId') adminId: number,
  ) {
    return this.subService.resetForStudent(parseInt(studentId), adminId);
  }
}
