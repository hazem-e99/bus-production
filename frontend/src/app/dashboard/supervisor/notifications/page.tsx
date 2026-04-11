'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Bell, CheckCircle2, RefreshCw, Send, Users } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationCard } from '@/components/notifications/NotificationCard';
import { NotificationFiltersComponent } from '@/components/notifications/NotificationFilters';
import { NotificationStatsComponent } from '@/components/notifications/NotificationStats';
import { BroadcastNotificationModal } from '@/components/notifications/BroadcastNotificationModal';
import { NotificationFilters, BroadcastNotificationDTO } from '@/types/notification';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/contexts/LanguageContext';

export default function SupervisorNotificationsPage() {
  const { t } = useI18n();
  const {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markAsRead,
    markAsUnread,
    deleteNotification,
    markAllAsRead,
    broadcastNotification,
    filterNotifications,
    getStats
  } = useNotifications();

  const [filters, setFilters] = useState<NotificationFilters>({
    search: '',
    type: 'all',
    isRead: 'all',
    dateRange: 'all'
  });

  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const { showToast } = useToast();

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#212121] flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" /> 
            {t('pages.supervisor.notifications.title', 'Supervisor Notifications')}
          </h1>
          <p className="text-[#424242]">{t('pages.supervisor.notifications.subtitle', 'Review and manage notifications, send announcements to students')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <Badge variant="outline" className="text-primary border-primary px-3 py-1">
            {unreadCount} {t('topbar.unread', 'Unread')}
          </Badge>
          <Button 
            variant="outline" 
            onClick={loadNotifications}
            className="flex items-center gap-2 px-4 py-2 border-gray-300 hover:bg-gray-50 transition-all duration-300 w-full sm:w-auto"
          >
            <RefreshCw className="w-4 h-4" />
            {t('driver.myTrips.refresh', 'Refresh')}
          </Button>
          <Button 
            onClick={() => setBroadcastModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 w-full sm:w-auto"
          >
            <Send className="w-5 h-5" />
            <div className="text-left">
              <div className="text-sm font-semibold">{t('pages.notifications.actions.broadcast', 'Broadcast')}</div>
              <div className="text-xs opacity-90">{t('topbar.notification', 'Notification')}</div>
            </div>
          </Button>
          {unreadCount > 0 && (
            <Button 
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 w-full sm:w-auto"
            >
              <CheckCircle2 className="w-5 h-5" />
              <div className="text-left">
                <div className="text-sm font-semibold">{t('pages.notifications.actions.markAllPrefix', 'Mark All as')}</div>
                <div className="text-xs opacity-90">{t('pages.notifications.status.read', 'Read')}</div>
              </div>
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
          <CardTitle>{t('pages.notifications.list.title', 'Notifications')}</CardTitle>
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
                  ? t('topbar.allCaughtUp', "You're all caught up!") 
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
                  onDelete={deleteNotification}
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


