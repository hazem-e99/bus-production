'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { X, Send, Megaphone, AlertTriangle, Calendar, Bus, Bell } from 'lucide-react';
import { BroadcastNotificationDTO, NotificationType } from '@/types/notification';
import { userAPI } from '@/lib/api';
import { useI18n } from '@/contexts/LanguageContext';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface BroadcastNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: BroadcastNotificationDTO) => Promise<void>;
  isLoading?: boolean;
}

type TargetType = 'all' | 'role' | 'specific';

export function BroadcastNotificationModal({
  isOpen,
  onClose,
  onSend,
  isLoading = false,
}: BroadcastNotificationModalProps) {
  const { t } = useI18n();
  const [formData, setFormData] = useState<BroadcastNotificationDTO>({
    title: '',
    message: '',
    type: NotificationType.System,
    userIds: null,
  });
  const [targetType, setTargetType] = useState<TargetType>('all');
  const [selectedRole, setSelectedRole] = useState<string>('student');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (isOpen && (targetType === 'specific' || targetType === 'role')) {
      loadUsers();
    }
  }, [isOpen, targetType]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await userAPI.getAll();
      const transformed = (response || []).map((user: any) => ({
        id: parseInt(user.id),
        name: user.name || user.fullName || '',
        email: user.email || '',
        role: user.role || '',
      }));
      setUsers(transformed);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSend = async () => {
    if (!formData.title.trim() || !formData.message.trim()) return;

    let userIds: number[] | null = null;
    if (targetType === 'specific') userIds = selectedUsers;
    else if (targetType === 'role') userIds = users.filter((u) => u.role === selectedRole).map((u) => u.id);

    const broadcastData: BroadcastNotificationDTO = { ...formData, userIds };
    await onSend(broadcastData);

    // Reset
    setFormData({ title: '', message: '', type: NotificationType.System, userIds: null });
    setTargetType('all');
    setSelectedRole('student');
    setSelectedUsers([]);
  };

  const getTypeIcon = (type: NotificationType) => {
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

  const isFormValid =
    formData.title.trim() && formData.message.trim() && (targetType === 'all' || targetType === 'role' || selectedUsers.length > 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{t('pages.notifications.broadcast.title', 'Broadcast Notification')}</h3>
              <p className="text-sm text-gray-600">{t('pages.notifications.broadcast.subtitle', 'Send notifications to users')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('pages.notifications.broadcast.fields.title', 'Title')} *</label>
            <Input
              placeholder={t('pages.notifications.broadcast.placeholders.title', 'Enter notification title')}
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">{formData.title.length}/200 {t('pages.notifications.broadcast.characters', 'characters')}</p>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.notifications.broadcast.fields.message', 'Message')} *</label>
            <textarea
              className="w-full p-2 border border-gray-300 rounded-lg resize-none h-20 focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder={t('pages.notifications.broadcast.placeholders.message', 'Enter notification message')}
              value={formData.message}
              onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 mt-1">{formData.message.length}/1000 {t('pages.notifications.broadcast.characters', 'characters')}</p>
          </div>

          {/* Type and Target */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.notifications.broadcast.fields.type', 'Notification Type')}</label>
              <Select
                value={formData.type}
                onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as NotificationType }))}
                options={[
                  { value: NotificationType.System, label: t('pages.notifications.types.system', 'System') },
                  { value: NotificationType.Alert, label: t('pages.notifications.types.alert', 'Alert') },
                  { value: NotificationType.Announcement, label: t('pages.notifications.types.announcement', 'Announcement') },
                  { value: NotificationType.Reminder, label: t('pages.notifications.types.reminder', 'Reminder') },
                  { value: NotificationType.Booking, label: t('pages.notifications.types.booking', 'Booking') },
                ]}
              />
            </div>

            {/* Target */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.notifications.broadcast.fields.target', 'Target Audience')}</label>
              <Select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as TargetType)}
                options={[
                  { value: 'all', label: t('pages.notifications.broadcast.target.all', 'All Users') },
                  { value: 'role', label: t('pages.notifications.broadcast.target.role', 'By Role') },
                  { value: 'specific', label: t('pages.notifications.broadcast.target.specific', 'Specific Users') },
                ]}
              />
            </div>
          </div>

          {/* Role Selection */}
          {targetType === 'role' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.notifications.broadcast.fields.role', 'Select Role')}</label>
              <Select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                options={[
                  { value: 'student', label: t('pages.notifications.broadcast.roles.students', 'Students') },
                  { value: 'driver', label: t('pages.notifications.broadcast.roles.drivers', 'Drivers') },
                  { value: 'supervisor', label: t('pages.notifications.broadcast.roles.supervisors', 'Supervisors') },
                  { value: 'movement-manager', label: t('pages.notifications.broadcast.roles.movementManagers', 'Movement Managers') },
                  { value: 'admin', label: t('pages.notifications.broadcast.roles.admins', 'Admins') },
                ]}
              />
              <p className="text-xs text-gray-500 mt-1">{t('pages.notifications.broadcast.roleNote', 'Will send to all users with the selected role')}</p>
            </div>
          )}

          {/* User Selection */}
          {targetType === 'specific' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('pages.notifications.broadcast.selectUsers', 'Select Users ({{count}} selected)').replace('{{count}}', String(selectedUsers.length))}
              </label>
              {loadingUsers ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">{t('pages.notifications.broadcast.loadingUsers', 'Loading users...')}</p>
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                  {users.map((user) => (
                    <label key={user.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded text-sm">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedUsers((prev) => [...prev, user.id]);
                          else setSelectedUsers((prev) => prev.filter((id) => id !== user.id));
                        }}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="font-medium">{user.name || t('pages.notifications.broadcast.unknownUser', 'Unknown User')}</span>
                      <span className="text-xs text-gray-500">({user.role})</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          <div className="p-3 bg-gray-50 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              {getTypeIcon(formData.type)}
              <span className="text-sm font-medium text-gray-700">{t('pages.notifications.broadcast.preview', 'Preview')}</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900 text-sm">{formData.title || t('pages.notifications.broadcast.previewTitle', 'Notification Title')}</h4>
                <Badge className="text-xs">
                  {formData.type === NotificationType.System
                    ? t('pages.notifications.types.system', 'System')
                    : formData.type === NotificationType.Alert
                    ? t('pages.notifications.types.alert', 'Alert')
                    : formData.type === NotificationType.Announcement
                    ? t('pages.notifications.types.announcement', 'Announcement')
                    : formData.type === NotificationType.Reminder
                    ? t('pages.notifications.types.reminder', 'Reminder')
                    : t('pages.notifications.types.booking', 'Booking')}
                </Badge>
              </div>
              <p className="text-xs text-gray-700">{formData.message || t('pages.notifications.broadcast.previewMessage', 'Notification message will appear here...')}</p>
              <p className="text-xs text-gray-500">
                {t('pages.notifications.broadcast.targetLabel', 'Target:')}{' '}
                {targetType === 'all'
                  ? t('pages.notifications.broadcast.target.all', 'All Users')
                  : targetType === 'role'
                  ? t(
                      selectedRole === 'student'
                        ? 'pages.notifications.broadcast.roles.students'
                        : selectedRole === 'driver'
                        ? 'pages.notifications.broadcast.roles.drivers'
                        : selectedRole === 'supervisor'
                        ? 'pages.notifications.broadcast.roles.supervisors'
                        : selectedRole === 'movement-manager'
                        ? 'pages.notifications.broadcast.roles.movementManagers'
                        : 'pages.notifications.broadcast.roles.admins',
                      'All Users'
                    )
                  : t('pages.notifications.broadcast.selectedUsers', '{{count}} selected users').replace('{{count}}', String(selectedUsers.length))}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={onClose} size="sm">
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSend} disabled={!isFormValid || isLoading} className="bg-primary hover:bg-primary-hover" size="sm">
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                {t('pages.notifications.broadcast.sending', 'Sending...')}
              </>
            ) : (
              <>
                <Send className="w-3 h-3 mr-1" />
                {t('pages.notifications.broadcast.send', 'Send')}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
