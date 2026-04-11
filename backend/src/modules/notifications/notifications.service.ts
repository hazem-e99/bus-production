import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './notification.schema';
import { User, UserDocument } from '../users/user.schema';
import { createApiResponse, ApiResponse } from '../../common/interfaces/api-response.interface';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notifModel: Model<NotificationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  private getNumericId(doc: any): number {
    return parseInt((doc._id as any).toString().slice(-8), 16) % 100000;
  }

  private getTimeAgo(date: Date): string {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  private async toViewModel(notif: NotificationDocument): Promise<any> {
    const id = this.getNumericId(notif);
    const user = await this.findByNumericId(this.userModel, notif.userId);
    return {
      id,
      userId: notif.userId,
      title: notif.title,
      message: notif.message,
      sentAt: notif.sentAt?.toISOString(),
      isRead: notif.isRead,
      isDeleted: notif.isDeleted,
      userName: user ? `${user.firstName} ${user.lastName}` : null,
      timeAgo: notif.sentAt ? this.getTimeAgo(notif.sentAt) : null,
    };
  }

  private async findByNumericId(model: Model<any>, numericId: number): Promise<any> {
    const docs = await model.find().exec();
    return docs.find((d) => this.getNumericId(d) === numericId) || null;
  }

  private async findNotifByNumericId(id: number): Promise<NotificationDocument | null> {
    const docs = await this.notifModel.find().exec();
    return docs.find((d) => this.getNumericId(d) === id) || null;
  }

  async getAll(userId: number): Promise<{ success: boolean; message: string | null; data: any[] }> {
    const notifs = await this.notifModel.find({ userId, isDeleted: false }).sort({ sentAt: -1 }).exec();
    const vms = await Promise.all(notifs.map((n) => this.toViewModel(n)));
    return { success: true, message: null, data: vms };
  }

  async getUnread(userId: number): Promise<{ success: boolean; message: string | null; data: any[] }> {
    const notifs = await this.notifModel.find({ userId, isRead: false, isDeleted: false }).sort({ sentAt: -1 }).exec();
    const vms = await Promise.all(notifs.map((n) => this.toViewModel(n)));
    return { success: true, message: null, data: vms };
  }

  async getUnreadCount(userId: number): Promise<{ success: boolean; message: string | null; data: number }> {
    const count = await this.notifModel.countDocuments({ userId, isRead: false, isDeleted: false });
    return { success: true, message: null, data: count };
  }

  async getById(id: number): Promise<{ success: boolean; message: string | null; data: any }> {
    const notif = await this.findNotifByNumericId(id);
    if (!notif) throw new NotFoundException('Notification not found');
    const vm = await this.toViewModel(notif);
    return { success: true, message: null, data: vm };
  }

  async create(dto: any): Promise<ApiResponse<boolean>> {
    await this.notifModel.create({
      userId: dto.userId,
      title: dto.title,
      message: dto.message,
      type: dto.type || 'System',
      sentAt: new Date(),
    });
    return createApiResponse(true, 'Notification created');
  }

  async delete(id: number): Promise<ApiResponse<boolean>> {
    const notif = await this.findNotifByNumericId(id);
    if (!notif) throw new NotFoundException('Notification not found');
    await this.notifModel.findByIdAndDelete(notif._id);
    return createApiResponse(true, 'Notification deleted');
  }

  async broadcast(dto: any): Promise<ApiResponse<boolean>> {
    const userIds = dto.userIds || [];
    let targetUsers: any[];
    if (userIds.length > 0) {
      targetUsers = userIds;
    } else {
      const allUsers = await this.userModel.find().exec();
      targetUsers = allUsers.map((u) => this.getNumericId(u));
    }
    const notifications = targetUsers.map((uid) => ({
      userId: uid,
      title: dto.title,
      message: dto.message,
      type: dto.type || 'Announcement',
      sentAt: new Date(),
    }));
    await this.notifModel.insertMany(notifications);
    return createApiResponse(true, 'Broadcast sent');
  }

  async markAsRead(id: number): Promise<ApiResponse<boolean>> {
    const notif = await this.findNotifByNumericId(id);
    if (!notif) throw new NotFoundException('Notification not found');
    await this.notifModel.findByIdAndUpdate(notif._id, { isRead: true });
    return createApiResponse(true, 'Marked as read');
  }

  async markAllAsRead(userId: number): Promise<ApiResponse<boolean>> {
    await this.notifModel.updateMany({ userId, isRead: false }, { isRead: true });
    return createApiResponse(true, 'All marked as read');
  }

  async clearAll(userId: number): Promise<ApiResponse<boolean>> {
    await this.notifModel.updateMany({ userId }, { isDeleted: true });
    return createApiResponse(true, 'All notifications cleared');
  }

  async adminGetAll(): Promise<{ success: boolean; message: string | null; data: any[] }> {
    const notifs = await this.notifModel.find().sort({ sentAt: -1 }).exec();
    const vms = await Promise.all(notifs.map((n) => this.toViewModel(n)));
    return { success: true, message: null, data: vms };
  }

  async adminDelete(id: number): Promise<ApiResponse<boolean>> {
    return this.delete(id);
  }
}
