'use client';

import { Card } from '@/components/ui/Card';
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Megaphone, 
  Calendar, 
  Bus,
  
} from 'lucide-react';
import { NotificationStats, NotificationType } from '@/types/notification';
import { useI18n } from '@/contexts/LanguageContext';

interface NotificationStatsProps {
  stats: NotificationStats;
}

export function NotificationStatsComponent({ stats }: NotificationStatsProps) {
  const { t } = useI18n();
  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.Alert:
        return <AlertTriangle className="w-6 h-6 text-red-500" />;
      case NotificationType.Announcement:
        return <Megaphone className="w-6 h-6 text-blue-500" />;
      case NotificationType.Reminder:
        return <Calendar className="w-6 h-6 text-yellow-500" />;
      case NotificationType.Booking:
        return <Bus className="w-6 h-6 text-green-500" />;
      case NotificationType.System:
      default:
        return <Bell className="w-6 h-6 text-gray-500" />;
    }
  };

  const getTypeColor = (type: NotificationType) => {
    switch (type) {
      case NotificationType.Alert:
        return 'bg-red-50 border-red-200';
      case NotificationType.Announcement:
        return 'bg-blue-50 border-blue-200';
      case NotificationType.Reminder:
        return 'bg-yellow-50 border-yellow-200';
      case NotificationType.Booking:
        return 'bg-green-50 border-green-200';
      case NotificationType.System:
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {/* Total Notifications */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-600 font-medium">{t('pages.notifications.stats.total', 'Total')}</p>
            <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
          </div>
          <Bell className="w-8 h-8 text-blue-500" />
        </div>
      </Card>

      {/* Unread Notifications */}
      <Card className="p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-yellow-600 font-medium">{t('pages.notifications.status.unread', 'Unread')}</p>
            <p className="text-2xl font-bold text-yellow-900">{stats.unread}</p>
          </div>
          <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">{stats.unread}</span>
          </div>
        </div>
      </Card>

      {/* Read Notifications */}
      <Card className="p-4 bg-gradient-to-r from-green-50 to-green-100 border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-green-600 font-medium">{t('pages.notifications.status.read', 'Read')}</p>
            <p className="text-2xl font-bold text-green-900">{stats.read}</p>
          </div>
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
      </Card>

      {/* High Priority (Alerts) */}
      <Card className="p-4 bg-gradient-to-r from-red-50 to-red-100 border-red-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-red-600 font-medium">{t('pages.notifications.stats.alerts', 'Alerts')}</p>
            <p className="text-2xl font-bold text-red-900">
              {stats.byType[NotificationType.Alert] || 0}
            </p>
          </div>
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
      </Card>

      {/* Type Breakdown */}
      <div className="md:col-span-4">
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">{t('pages.notifications.stats.byType', 'Notifications by Type')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.values(NotificationType).map((type) => (
              <div
                key={type}
                className={`p-3 rounded-lg border ${getTypeColor(type)}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {getTypeIcon(type)}
                  <span className="text-sm font-medium capitalize">
                    {
                      type === NotificationType.System ? t('pages.notifications.types.system', 'System') :
                      type === NotificationType.Alert ? t('pages.notifications.types.alert', 'Alert') :
                      type === NotificationType.Announcement ? t('pages.notifications.types.announcement', 'Announcement') :
                      type === NotificationType.Reminder ? t('pages.notifications.types.reminder', 'Reminder') :
                      t('pages.notifications.types.booking', 'Booking')
                    }
                  </span>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {stats.byType[type] || 0}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
