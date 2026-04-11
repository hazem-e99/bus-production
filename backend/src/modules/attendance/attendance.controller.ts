import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';

@Controller('api/Attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  async getAll(@Query('tripId') tripId?: string, @Query('studentId') studentId?: string) {
    return this.attendanceService.getAll({ tripId, studentId });
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.attendanceService.getById(id);
  }

  @Post()
  async create(@Body() dto: any) {
    return this.attendanceService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.attendanceService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.attendanceService.delete(id);
  }
}
