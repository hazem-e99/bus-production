// Notification types based on swagger schema

export enum NotificationType {
  System = 'System',
  Alert = 'Alert',
  Announcement = 'Announcement',
  Reminder = 'Reminder',
  Booking = 'Booking'
}

export interface NotificationViewModel {
  id: number;
  userId: number;
  title: string | null;
  message: string | null;
  sentAt: string; // ISO date-time string
  isRead: boolean;
  isDeleted: boolean;
  userName: string | null;
  timeAgo: string | null;
}

export interface CreateNotificationDTO {
  userId: number;
  title: string; // minLength: 1, maxLength: 200
  message: string; // minLength: 1, maxLength: 1000
  type: NotificationType;
}

export interface BroadcastNotificationDTO {
  title: string; // minLength: 1, maxLength: 200
  message: string; // minLength: 1, maxLength: 1000
  type: NotificationType;
  userIds?: number[] | null; // Optional array of user IDs for targeted broadcast
}

// API Response wrappers
export interface NotificationViewModelApiResponse {
  success: boolean;
  message: string | null;
  data: NotificationViewModel | null;
}

export interface NotificationViewModelIEnumerableApiResponse {
  success: boolean;
  message: string | null;
  data: NotificationViewModel[] | null;
}

export interface Int32ApiResponse {
  success: boolean;
  message: string | null;
  data: number | null;
}

export interface BooleanApiResponse {
  success: boolean;
  message: string | null;
  data: boolean | null;
}

// Extended interfaces for frontend use
export interface NotificationWithType extends NotificationViewModel {
  type?: NotificationType;
}

// Helper function to determine notification type from content
export const getNotificationTypeFromContent = (title: string | null, message: string | null): NotificationType => {
  const titleLower = title?.toLowerCase() || '';
  const messageLower = message?.toLowerCase() || '';
  const combinedText = `${titleLower} ${messageLower}`;

  // Check for booking-related keywords
  if (combinedText.includes('booking') || combinedText.includes('trip') || combinedText.includes('bus') || 
      combinedText.includes('reservation') || combinedText.includes('seat')) {
    return NotificationType.Booking;
  }

  // Check for alert-related keywords
  if (combinedText.includes('alert') || combinedText.includes('warning') || combinedText.includes('urgent') || 
      combinedText.includes('emergency') || combinedText.includes('important')) {
    return NotificationType.Alert;
  }

  // Check for announcement-related keywords
  if (combinedText.includes('announcement') || combinedText.includes('news') || combinedText.includes('update') || 
      combinedText.includes('notice') || combinedText.includes('information')) {
    return NotificationType.Announcement;
  }

  // Check for reminder-related keywords
  if (combinedText.includes('reminder') || combinedText.includes('remember') || combinedText.includes('don\'t forget') || 
      combinedText.includes('schedule') || combinedText.includes('appointment')) {
    return NotificationType.Reminder;
  }

  // Default to System
  return NotificationType.System;
};

export interface NotificationFilters {
  search?: string;
  type?: NotificationType | 'all';
  isRead?: boolean | 'all';
  dateRange?: 'all' | 'today' | '7d' | '30d' | 'specific';
  specificDate?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  byType: Record<NotificationType, number>;
}
