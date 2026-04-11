import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { StudentSubscriptionService } from './student-subscription.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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

  @Get('expiring-soon')
  async getExpiringSoon() {
    return this.subService.getExpiringSoon();
  }

  @Get('expired')
  async getExpired() {
    return this.subService.getExpired();
  }

  @Get('by-student/:studentId')
  async getByStudent(@Param('studentId') studentId: string) {
    return this.subService.getByStudent(parseInt(studentId));
  }

  @Get('by-plan/:planId')
  async getByPlan(@Param('planId') planId: string) {
    return this.subService.getByPlan(parseInt(planId));
  }

  @Get('by-status/:status')
  async getByStatus(@Param('status') status: string) {
    return this.subService.getByStatus(status);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.subService.getById(parseInt(id));
  }

  @Put(':id/activate')
  async activate(@Param('id') id: string) {
    return this.subService.activate(parseInt(id));
  }

  @Put(':id/suspend')
  async suspend(@Param('id') id: string, @Body() dto: any) {
    return this.subService.suspend(parseInt(id), dto);
  }
}
