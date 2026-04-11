'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Bell, 
  CheckCircle2, 
  Eye, 
  Trash2, 
  Clock,
  AlertTriangle,
  
  Megaphone,
  Calendar,
  Bus
} from 'lucide-react';
import { NotificationViewModel, NotificationType, getNotificationTypeFromContent } from '@/types/notification';
import { getRelativeTime } from '@/utils/formatDate';
import { useI18n } from '@/contexts/LanguageContext';

interface NotificationCardProps {
  notification: NotificationViewModel;
  onMarkAsRead?: (id: number) => void;
  onMarkAsUnread?: (id: number) => void;
  onDelete?: (id: number) => void;
  showActions?: boolean;
  compact?: boolean;
}

export function NotificationCard({
  notification,
  onMarkAsRead,
  onMarkAsUnread,
  onDelete,
  showActions = true,
  compact = false
}: NotificationCardProps) {
  const { t } = useI18n();
  // Determine notification type from content
  const notificationType = getNotificationTypeFromContent(notification.title, notification.message);

  const getNotificationIcon = (type?: NotificationType) => {
    switch (type) {
      case NotificationType.Alert:
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case NotificationType.Announcement:
        return <Megaphone className="w-5 h-5 text-blue-500" />;
      case NotificationType.Reminder:
        return <Calendar className="w-5 h-5 text-yellow-500" />;
      case NotificationType.Booking:
        return <Bus className="w-5 h-5 text-green-500" />;
      case NotificationType.System:
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  // color classes are not used directly in this component

  if (compact) {
    return (
      <div className={`p-3 border rounded-lg transition-colors ${
        !notification.isRead ? 'bg-primary/5 border-primary/20' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-start gap-3">
          <div className="mt-1">
            {getNotificationIcon(notificationType)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className={`text-sm font-semibold truncate ${
                !notification.isRead ? 'text-primary' : 'text-gray-900'
              }`}>
                {notification.title || t('pages.notifications.item.notification', 'Notification')}
              </p>
              {!notification.isRead && (
                <span className="inline-block w-2 h-2 rounded-full bg-primary" />
              )}
            </div>
            {notification.message && (
              <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                {notification.message}
              </p>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{notification.timeAgo || getRelativeTime(notification.sentAt)}</span>
            </div>
          </div>
          {showActions && (
            <div className="flex items-center gap-1">
              {!notification.isRead ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onMarkAsRead?.(notification.id)}
                  className="h-8 w-8 p-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onMarkAsUnread?.(notification.id)}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDelete?.(notification.id)}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={`p-6 transition-all duration-200 hover:shadow-md ${
      !notification.isRead ? 'bg-white border-l-4 border-l-primary' : 'bg-gray-50'
    }`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="flex items-start gap-3 mb-3">
            <div className="mt-1">
              {getNotificationIcon(notificationType)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className={`text-lg font-semibold ${
                  !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                }`}>
                  {notification.title || t('pages.notifications.item.notification', 'Notification')}
                </h3>
                {!notification.isRead && (
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                )}
              </div>
              {notification.message && (
                <p className={`text-gray-600 mb-3 ${
                  !notification.isRead ? 'font-medium' : ''
                }`}>
                  {notification.message}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{notification.timeAgo || getRelativeTime(notification.sentAt)}</span>
                </div>
                {notification.userName && (
                  <span className="whitespace-nowrap">{t('pages.notifications.item.from', 'From')}: {notification.userName}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {showActions && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-2 sm:ml-4">
            {!notification.isRead ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onMarkAsRead?.(notification.id)}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                {t('pages.notifications.actions.markRead', 'Mark Read')}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onMarkAsUnread?.(notification.id)}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Eye className="w-4 h-4 mr-1" />
                {t('pages.notifications.actions.markUnread', 'Mark Unread')}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete?.(notification.id)}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
