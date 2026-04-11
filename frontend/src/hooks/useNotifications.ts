'use client';

import { useState, useEffect, useCallback } from 'react';
import { notificationAPI } from '@/lib/api';
import { 
  NotificationViewModel, 
  NotificationFilters, 
  NotificationStats, 
  NotificationType,
  BroadcastNotificationDTO,
  getNotificationTypeFromContent
} from '@/types/notification';
import { useToast } from '@/components/ui/Toast';

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationViewModel[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // Load notifications
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await notificationAPI.getAll();
      if (response.success && response.data) {
        setNotifications(response.data);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError('Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      if (response.success && response.data !== null) {
        setUnreadCount(response.data);
      } else {
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to load unread count:', err);
      setUnreadCount(0);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (id: number) => {
    try {
      const response = await notificationAPI.markAsRead(id);
      if (response.success) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        showToast({
          type: 'success',
          title: 'Success',
          message: 'Notification marked as read'
        });
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to mark notification as read'
      });
    }
  }, [showToast]);

  // Mark notification as unread
  const markAsUnread = useCallback(async (id: number) => {
    try {
      // Since there's no direct unread endpoint, we'll update locally
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: false } : n)
      );
      setUnreadCount(prev => prev + 1);
      showToast({
        type: 'success',
        title: 'Success',
        message: 'Notification marked as unread'
      });
    } catch (err) {
      console.error('Failed to mark notification as unread:', err);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to mark notification as unread'
      });
    }
  }, [showToast]);

  // Delete notification
  const deleteNotification = useCallback(async (id: number) => {
    try {
      const response = await notificationAPI.delete(id);
      if (response.success) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        // Update unread count if the deleted notification was unread
        const deletedNotification = notifications.find(n => n.id === id);
        if (deletedNotification && !deletedNotification.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        showToast({
          type: 'success',
          title: 'Success',
          message: 'Notification deleted'
        });
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete notification'
      });
    }
  }, [notifications, showToast]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await notificationAPI.markAllAsRead();
      if (response.success) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, isRead: true }))
        );
        setUnreadCount(0);
        showToast({
          type: 'success',
          title: 'Success',
          message: 'All notifications marked as read'
        });
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to mark all notifications as read'
      });
    }
  }, [showToast]);

  // Clear all notifications
  const clearAll = useCallback(async () => {
    try {
      const response = await notificationAPI.clearAll();
      if (response.success) {
        setNotifications([]);
        setUnreadCount(0);
        showToast({
          type: 'success',
          title: 'Success',
          message: 'All notifications cleared'
        });
      }
    } catch (err) {
      console.error('Failed to clear all notifications:', err);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to clear all notifications'
      });
    }
  }, [showToast]);

  // Broadcast notification
  const broadcastNotification = useCallback(async (data: BroadcastNotificationDTO) => {
    try {
      const response = await notificationAPI.broadcast(data);
      if (response.success) {
        showToast({
          type: 'success',
          title: 'Success',
          message: 'Notification broadcasted successfully'
        });
        // Reload notifications to show the new one
        await loadNotifications();
        await loadUnreadCount();
      }
    } catch (err) {
      console.error('Failed to broadcast notification:', err);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to broadcast notification'
      });
    }
  }, [showToast, loadNotifications, loadUnreadCount]);

  // Filter notifications
  const filterNotifications = useCallback((filters: NotificationFilters) => {
    return notifications.filter(notification => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          (notification.title?.toLowerCase().includes(searchLower)) ||
          (notification.message?.toLowerCase().includes(searchLower)) ||
          (notification.userName?.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Type filter
      if (filters.type && filters.type !== 'all') {
        const notificationType = getNotificationTypeFromContent(notification.title, notification.message);
        if (notificationType !== filters.type) return false;
      }

      // Read status filter
      if (filters.isRead !== 'all') {
        if (filters.isRead !== notification.isRead) return false;
      }

      // Date filter
      if (filters.dateRange && filters.dateRange !== 'all') {
        const sentDate = new Date(notification.sentAt);
        const now = new Date();
        
        switch (filters.dateRange) {
          case 'today':
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            if (sentDate < startOfToday) return false;
            break;
          case '7d':
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(now.getDate() - 7);
            if (sentDate < sevenDaysAgo) return false;
            break;
          case '30d':
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(now.getDate() - 30);
            if (sentDate < thirtyDaysAgo) return false;
            break;
        }
      }

      // Specific date filter
      if (filters.specificDate) {
        const sentDate = new Date(notification.sentAt);
        const specificDate = new Date(filters.specificDate);
        const sentDateStr = sentDate.toISOString().split('T')[0];
        const specificDateStr = specificDate.toISOString().split('T')[0];
        if (sentDateStr !== specificDateStr) return false;
      }

      return true;
    });
  }, [notifications]);

  // Calculate stats
  const getStats = useCallback((): NotificationStats => {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.isRead).length;
    const read = total - unread;
    
    const byType: Record<NotificationType, number> = {
      [NotificationType.System]: 0,
      [NotificationType.Alert]: 0,
      [NotificationType.Announcement]: 0,
      [NotificationType.Reminder]: 0,
      [NotificationType.Booking]: 0,
    };

    // Calculate type counts based on content analysis
    notifications.forEach(notification => {
      const type = getNotificationTypeFromContent(notification.title, notification.message);
      byType[type]++;
    });

    return {
      total,
      unread,
      read,
      byType
    };
  }, [notifications]);

  // Load data on mount
  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, [loadNotifications, loadUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications,
    loadUnreadCount,
    markAsRead,
    markAsUnread,
    deleteNotification,
    markAllAsRead,
    clearAll,
    broadcastNotification,
    filterNotifications,
    getStats
  };
}
