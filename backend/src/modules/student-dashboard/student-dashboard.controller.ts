import { Controller, Get, Param } from '@nestjs/common';
import { StudentDashboardService } from './student-dashboard.service';

@Controller('api/StudentDashboard')
export class StudentDashboardController {
  constructor(private readonly dashService: StudentDashboardService) {}

  @Get(':studentId/stats')
  async getStats(@Param('studentId') studentId: string) {
    return this.dashService.getStats(parseInt(studentId));
  }

  @Get(':studentId/recent-trips')
  async getRecentTrips(@Param('studentId') studentId: string) {
    return this.dashService.getRecentTrips(parseInt(studentId));
  }

  @Get(':studentId/upcoming-trips')
  async getUpcomingTrips(@Param('studentId') studentId: string) {
    return this.dashService.getUpcomingTrips(parseInt(studentId));
  }

  @Get(':studentId/payments')
  async getPayments(@Param('studentId') studentId: string) {
    return this.dashService.getPayments(parseInt(studentId));
  }
}
