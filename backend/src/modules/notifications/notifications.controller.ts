import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/Notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getAll(@CurrentUser('numericId') userId: number) {
    return this.notificationsService.getAll(userId);
  }

  @Get('unread')
  async getUnread(@CurrentUser('numericId') userId: number) {
    return this.notificationsService.getUnread(userId);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser('numericId') userId: number) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Get('admin/all')
  async adminGetAll() {
    return this.notificationsService.adminGetAll();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.notificationsService.getById(parseInt(id));
  }

  @Post()
  async create(@Body() dto: any) {
    return this.notificationsService.create(dto);
  }

  @Post('broadcast')
  async broadcast(@Body() dto: any) {
    return this.notificationsService.broadcast(dto);
  }

  @Put(':id/mark-read')
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(parseInt(id));
  }

  @Put('mark-all-read')
  async markAllAsRead(@CurrentUser('numericId') userId: number) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete('clear-all')
  async clearAll(@CurrentUser('numericId') userId: number) {
    return this.notificationsService.clearAll(userId);
  }

  @Delete('admin/:id')
  async adminDelete(@Param('id') id: string) {
    return this.notificationsService.adminDelete(parseInt(id));
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.notificationsService.delete(parseInt(id));
  }
}
