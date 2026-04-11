'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Bell, CheckCircle2, RefreshCw, Send, Shield, Trash2 } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationCard } from '@/components/notifications/NotificationCard';
import { NotificationFiltersComponent } from '@/components/notifications/NotificationFilters';
import { NotificationStatsComponent } from '@/components/notifications/NotificationStats';
import { BroadcastNotificationModal } from '@/components/notifications/BroadcastNotificationModal';
import { NotificationFilters, BroadcastNotificationDTO } from '@/types/notification';
import { notificationAPI } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/contexts/LanguageContext';

export default function AdminNotificationsPage() {
  const { t } = useI18n();
  const {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markAsRead,
    markAsUnread,
    
    markAllAsRead,
    clearAll,
    broadcastNotification,
    filterNotifications,
    getStats
  } = useNotifications();

  const { showToast } = useToast();
  const [filters, setFilters] = useState<NotificationFilters>({
    search: '',
    type: 'all',
    isRead: 'all',
    dateRange: 'all'
  });

  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  const filteredNotifications = filterNotifications(filters);
  const stats = getStats();

  const handleFiltersChange = (newFilters: NotificationFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      type: 'all',
      isRead: 'all',
      dateRange: 'all'
    });
  };

  const handleBroadcast = async (data: BroadcastNotificationDTO) => {
    setIsBroadcasting(true);
    try {
      await broadcastNotification(data);
      setBroadcastModalOpen(false);
      showToast({
        type: 'success',
        title: t('pages.notifications.toasts.successTitle', 'Success'),
        message: t('pages.notifications.toasts.broadcastSent', 'Notification broadcast sent'),
      });
      // Optionally refresh list
      await loadNotifications();
    } catch (error) {
      console.error('Failed to broadcast notification:', error);
      showToast({
        type: 'error',
        title: t('pages.notifications.toasts.errorTitle', 'Error'),
        message: t('pages.notifications.toasts.broadcastFailed', 'Failed to send broadcast'),
      });
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleClearAllNotifications = async () => {
  if (!confirm(t('pages.notifications.confirms.clearAll', 'Are you sure you want to clear ALL notifications? This action cannot be undone.'))) {
      return;
    }

    setIsClearingAll(true);
    try {
      await clearAll();
      showToast({
        type: 'success',
  title: t('pages.notifications.toasts.successTitle', 'Success'),
  message: t('pages.notifications.toasts.cleared', 'All notifications have been cleared')
      });
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
      showToast({
        type: 'error',
  title: t('pages.notifications.toasts.errorTitle', 'Error'),
  message: t('pages.notifications.toasts.clearFailed', 'Failed to clear all notifications')
      });
    } finally {
      setIsClearingAll(false);
    }
  };

  const handleAdminDelete = async (id: number) => {
    try {
      const response = await notificationAPI.adminDelete(id);
      if (response.success) {
        // Remove from local state
  // const updatedNotifications = notifications.filter(n => n.id !== id);
        // Update unread count if needed
        const deletedNotification = notifications.find(n => n.id === id);
        if (deletedNotification && !deletedNotification.isRead) {
          // This would need to be handled by the hook
        }
        showToast({
          type: 'success',
          title: t('pages.notifications.toasts.successTitle', 'Success'),
          message: t('pages.notifications.toasts.deleted', 'Notification deleted successfully')
        });
        // Reload notifications to get updated data
        await loadNotifications();
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
      showToast({
        type: 'error',
        title: t('pages.notifications.toasts.errorTitle', 'Error'),
        message: t('pages.notifications.toasts.deleteFailed', 'Failed to delete notification')
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#212121] flex items-center gap-2">
            <Shield className="w-7 h-7 text-primary" /> 
            {t('pages.admin.notifications.title', 'Admin Notifications')}
          </h1>
          <p className="text-[#424242]">{t('pages.admin.notifications.subtitle', 'Manage all system notifications and broadcast messages')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Badge variant="outline" className="text-primary border-primary">
            {unreadCount} {t('topbar.unread', 'Unread')}
          </Badge>
          <Button 
            variant="outline" 
            onClick={loadNotifications}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {t('driver.myTrips.refresh', 'Refresh')}
          </Button>
          <Button 
            onClick={() => setBroadcastModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {t('pages.notifications.actions.broadcast', 'Broadcast')}
          </Button>
          {unreadCount > 0 && (
            <Button 
              onClick={markAllAsRead}
              className="flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {t('topbar.markAllRead', 'Mark all read')}
            </Button>
          )}
          {notifications.length > 0 && (
            <Button 
              variant="destructive"
              onClick={handleClearAllNotifications}
              disabled={isClearingAll}
              className="flex items-center gap-2"
            >
              {isClearingAll ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('pages.notifications.actions.clearing', 'Clearing...')}
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  {t('topbar.clearAll', 'Clear all')}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <NotificationStatsComponent stats={stats} />

      {/* Filters */}
      <NotificationFiltersComponent
        filters={filters}
        onFiltersChange={handleFiltersChange}
        totalCount={filteredNotifications.length}
        onClearFilters={handleClearFilters}
      />

      {/* Notifications List */}
      <Card className="bg-white border-[#E0E0E0]">
        <CardHeader>
          <CardTitle>{t('pages.notifications.list.title', 'All Notifications')}</CardTitle>
          <CardDescription>
            {loading ? t('common.loading', 'Loading...') : t('pages.notifications.list.results', '{{count}} result(s)')
              .replace('{{count}}', String(filteredNotifications.length))}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-[#757575]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p>{t('pages.notifications.list.loading', 'Loading notifications...')}</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12 text-[#757575]">
              <Bell className="w-16 h-16 mx-auto mb-4 text-[#BDBDBD]" />
              <h3 className="text-lg font-medium mb-2">{t('pages.notifications.empty.title', 'No notifications')}</h3>
              <p className="text-sm">
                {notifications.length === 0 
                  ? t('pages.notifications.empty.none', 'No notifications in the system.')
                  : t('pages.notifications.empty.noMatch', 'No notifications match your current filters.')
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onMarkAsUnread={markAsUnread}
                  onDelete={handleAdminDelete}
                  showActions={true}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Broadcast Modal */}
      <BroadcastNotificationModal
        isOpen={broadcastModalOpen}
        onClose={() => setBroadcastModalOpen(false)}
        onSend={handleBroadcast}
        isLoading={isBroadcasting}
      />
    </div>
  );
}
