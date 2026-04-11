'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, LogOut, ChevronDown, Clock, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { notificationAPI, settingsAPI, userAPI } from '@/lib/api';
import { getRelativeTime } from '@/utils/formatDate';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { useI18n } from '@/contexts/LanguageContext';
import Image from 'next/image';
import { toBackendAssetUrl } from '@/lib/backend-url';

interface Notification {
  id: number;
  isRead: boolean;
  title?: string;
  message?: string;
  sentAt: string;
  userName?: string;
  actionUrl?: string;
}

export const Topbar = () => {
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  // removed isLoadingNotifications state (not used in UI)
  const [systemLogo, setSystemLogo] = useState('/logo2.png');
  const [systemName, setSystemName] = useState('El Renad');
  const [userProfile, setUserProfile] = useState<unknown>(null);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
  const { t } = useI18n();
  const notifRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string>('/logo2.png');
  // Note: Always render stable markup on SSR and CSR to avoid hydration issues

  // Fetch system settings (logo and name)
  useEffect(() => {
    const fetchSystemSettings = async () => {
      try {
        const settings = await settingsAPI.get();
        setSystemLogo(settings?.logo || '/logo2.png');
        setSystemName(settings?.systemName || 'El Renad');
      } catch (error: unknown) {
        // Ignore 404s silently
        if ((error as Error)?.message?.includes('404')) {
          setSystemLogo('/logo2.png');
          setSystemName('El Renad');
          return;
        }
        console.error('Failed to fetch system settings:', error);
      }
    };

    fetchSystemSettings();
  }, []);

  // Fetch user profile data from /api/Users/profile endpoint
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        // Fetch profile from /api/Users/profile endpoint
        const profileData = await userAPI.getCurrentUserProfile();
        if (profileData) {
          console.log('👤 Raw profile data from /Users/profile:', profileData);
          
          // Build correct image URL
          const buildImageUrl = (imagePath: string | undefined): string | undefined => {
            if (!imagePath) return undefined;
            return toBackendAssetUrl(imagePath);
          };
          
          // Create user profile object with correct data
          const userProfile = {
            id: String(profileData.id || user.id),
            name: profileData.firstName && profileData.lastName 
              ? `${profileData.firstName} ${profileData.lastName}` 
              : profileData.fullName || user.fullName || user.name,
            email: profileData.email || user.email,
            role: profileData.role || user.role,
            avatar: buildImageUrl(profileData.profilePictureUrl || profileData.avatar)
          };
          
          setUserProfile(userProfile);
          let computed = getUserAvatarFrom(profileData, user);
          // Normalize known default filenames returned by backend
          if (computed && /default-profile\.(png|jpg|jpeg)$/i.test(computed)) {
            computed = '/logo2.png';
          }
          const proxied = computed && computed.startsWith('http')
            ? `/api/image-proxy?url=${encodeURIComponent(computed)}`
            : (computed || '/logo2.png');
          setAvatarSrc(proxied);
          console.log('👤 User profile loaded from /Users/profile:', userProfile);
          console.log('🖼️ Avatar URL:', userProfile.avatar);
        }
      } catch (error) {
        console.error('Failed to fetch user profile from /Users/profile:', error);
        // Use user context data as fallback
        setUserProfile({
          id: user.id,
          name: user.fullName || user.name,
          email: user.email,
          role: user.role,
          avatar: null
        });
        setAvatarSrc('/logo2.png');
      }
    };

    fetchUserProfile();

    // Listen for profile updates from other components
    const handleProfileUpdate = () => {
      console.log('🔄 Profile update detected, refreshing user profile from /Users/profile...');
      fetchUserProfile();
    };

    // Listen for storage events (when profile is updated)
    window.addEventListener('storage', handleProfileUpdate);
    
    // Also listen for custom events
    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('storage', handleProfileUpdate);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [user]);

  // Fetch notifications for the current user
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      
    try {
        const response = await notificationAPI.getAll();
        if (response.success && response.data) {
          setNotifications(response.data as Notification[]);
        } else {
          setNotifications([]);
        }
      } catch (error: unknown) {
        console.error('Failed to fetch notifications:', error);
        setNotifications([]);
      } finally {
        // no-op
      }
    };

    fetchNotifications();
    
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const userNotifications = Array.isArray(notifications) ? notifications : [];

  // Load unread count separately for badge
  const [unreadCountBadge, setUnreadCountBadge] = useState(0);
  
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const response = await notificationAPI.getUnreadCount();
        if (response.success && response.data !== null) {
          setUnreadCountBadge(response.data);
        }
      } catch (error) {
        console.error('Failed to load unread count:', error);
      }
    };

    loadUnreadCount();
    
    // Refresh count every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    // Redirect directly to login page
    window.location.href = '/auth/login';
  };

  // Close popups when clicking anywhere outside
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (showNotifications && notifRef.current && target && !notifRef.current.contains(target)) {
        setShowNotifications(false);
      }
      if (showUserMenu && userMenuRef.current && target && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [showNotifications, showUserMenu]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!user) return;
    
    try {
      // Mark notification as read in the database
      await notificationAPI.markAsRead(notification.id);
      
      // Update local state to mark notification as read
      setNotifications(prev => 
        Array.isArray(prev) ? prev.map((n: Notification) => 
          n.id === notification.id ? { ...n, isRead: true } : n
        ) : []
      );
      
      // Update badge count
      setUnreadCountBadge(prev => Math.max(0, prev - 1));
      
      // Close notifications dropdown
      setShowNotifications(false);
      
      // Navigate to action URL if provided; otherwise, go to role-specific notifications page
      const fallbackUrl = user.role === 'supervisor'
        ? '/dashboard/supervisor/notifications'
        : user.role === 'student'
          ? '/dashboard/student/notifications'
          : user.role === 'driver'
            ? '/dashboard/driver/notifications'
            : user.role === 'admin'
              ? '/dashboard/admin/notifications'
              : user.role === 'movement-manager'
                ? '/dashboard/movement-manager/notifications'
                : '/';
      const target = notification.actionUrl || fallbackUrl;
      window.location.href = target;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Still mark as read locally and navigate
      setNotifications(prev => 
        Array.isArray(prev) ? prev.map((n: Notification) => 
          n.id === notification.id ? { ...n, isRead: true } : n
        ) : []
      );
      
      // Update badge count
      setUnreadCountBadge(prev => Math.max(0, prev - 1));
      setShowNotifications(false);
      
      // Navigate to action URL if provided; otherwise, go to role-specific notifications page
      const fallbackUrl = user?.role === 'supervisor'
        ? '/dashboard/supervisor/notifications'
        : user?.role === 'student'
          ? '/dashboard/student/notifications'
          : user?.role === 'driver'
            ? '/dashboard/driver/notifications'
            : user?.role === 'admin'
              ? '/dashboard/admin/notifications'
              : user?.role === 'movement-manager'
                ? '/dashboard/movement-manager/notifications'
                : '/';
      const target = notification.actionUrl || fallbackUrl;
      window.location.href = target;
    }
  };

  const handleClearAllRead = async () => {
    if (!user) return;
    
    try {
      // Clear all notifications from the database
      const result = await notificationAPI.clearAll();
      
      if (result && result.success) {
        // Update local state to remove all notifications
        setNotifications([]);
        
        // Update badge count
        setUnreadCountBadge(0);
        
        // Close notifications dropdown
        setShowNotifications(false);
        
        console.log('Cleared all notifications');
      } else {
        // Fallback: manually clear notifications from local state
        setNotifications([]);
        
        // Update badge count
        setUnreadCountBadge(0);
        setShowNotifications(false);
        console.log('Used fallback method to clear notifications');
      }
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      // Fallback: manually clear notifications from local state
      setNotifications([]);
      
      // Update badge count
      setUnreadCountBadge(0);
      setShowNotifications(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    
    try {
      // Mark all notifications as read in the database
      const result = await notificationAPI.markAllAsRead();
      
      if (result && result.success) {
        // Update local state to mark all notifications as read
        setNotifications(prev => Array.isArray(prev) ? prev.map((n: Notification) => ({ ...n, isRead: true })) : []);
        
        // Update badge count
        setUnreadCountBadge(0);
        
        // Close notifications dropdown
        setShowNotifications(false);
        
        console.log('Marked all notifications as read');
      } else {
        // Fallback: manually mark all notifications as read in local state
        setNotifications(prev => Array.isArray(prev) ? prev.map((n: Notification) => ({ ...n, isRead: true })) : []);
        
        // Update badge count
        setUnreadCountBadge(0);
        setShowNotifications(false);
        console.log('Used fallback method to mark all notifications as read');
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      // Fallback: manually mark all notifications as read in local state
      setNotifications(prev => Array.isArray(prev) ? prev.map((n: Notification) => ({ ...n, isRead: true })) : []);
      
      // Update badge count
      setUnreadCountBadge(0);
      setShowNotifications(false);
    }
  };

  // Build avatar URL from profile/user safely
  const getUserAvatarFrom = (profileData: any, fallbackUser: any): string | null => {
    const avatarCandidate = profileData?.profilePictureUrl || profileData?.avatar || (fallbackUser as any)?.avatar;
    if (avatarCandidate) {
      const avatarUrl = String(avatarCandidate);
      if (avatarUrl.startsWith('data:image')) return avatarUrl;
      if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl;
      if (avatarUrl.startsWith('/')) {
        return toBackendAssetUrl(avatarUrl);
      }
      return toBackendAssetUrl(avatarUrl);
    }
    return null;
  };

  // Legacy helper (kept for other uses if any)
  const getUserAvatar = () => {
    if ((userProfile as any)?.avatar) {
      const avatarUrl = (userProfile as any).avatar;
      console.log('🖼️ getUserAvatar - Original URL:', avatarUrl);
      
      // Check if it's a base64 image
      if (avatarUrl.startsWith('data:image')) {
        console.log('🖼️ getUserAvatar - Using base64 image');
        return avatarUrl; // Base64 image
      }
      
      // Check if it's already a full URL
      if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
        console.log('🖼️ getUserAvatar - Using full URL:', avatarUrl);
        return avatarUrl;
      }
      
      // Check if it's a relative path
      if (avatarUrl.startsWith('/')) {
        const fullUrl = toBackendAssetUrl(avatarUrl);
        console.log('🖼️ getUserAvatar - Built URL from relative path:', fullUrl);
        return fullUrl;
      }
      
      // If it's just a filename, assume it's in uploads folder
      const uploadsUrl = toBackendAssetUrl(avatarUrl);
      console.log('🖼️ getUserAvatar - Built URL from filename:', uploadsUrl);
      return uploadsUrl;
    }
    console.log('🖼️ getUserAvatar - No avatar found');
    return null;
  };

  // Get user display name - use profile name if available, otherwise fallback to user context
  const getUserDisplayName = () => {
    if ((userProfile as any)?.name) {
      return (userProfile as any).name;
    }
    return user?.name || 'User';
  };

  const displayNotifications = (notifFilter === 'all' ? userNotifications : userNotifications.filter((n: Notification) => !n.isRead));
  const fallbackUrl = user?.role === 'supervisor' 
    ? '/dashboard/supervisor/notifications' 
    : user?.role === 'student' 
      ? '/dashboard/student/notifications'
      : user?.role === 'driver'
        ? '/dashboard/driver/notifications'
        : user?.role === 'admin'
          ? '/dashboard/admin/notifications'
          : user?.role === 'movement-manager'
            ? '/dashboard/movement-manager/notifications'
            : '/';

  return (
    <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 px-6 py-4 w-full shadow-lg sticky top-0 z-30">
      <div className="flex items-center justify-between">
        
        {/* Left side - Logo and System Name */}
        <div className="flex items-center space-x-6 ml-0 lg:ml-4">
          <div className="flex items-center space-x-4 group cursor-pointer hover:bg-gray-50/80 p-3 rounded-2xl transition-all duration-300">
            <div className="w-14 h-14 lg:w-16 lg:h-16 flex items-center justify-center overflow-hidden transition-all duration-300 relative">
              <Image 
                src={systemLogo || '/logo2.png'} 
                alt="System Logo" 
                fill
                className="object-contain group-hover:scale-110 transition-transform duration-300"
                sizes="(max-width: 768px) 56px, 64px"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg lg:text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent group-hover:from-orange-600 group-hover:to-orange-500 transition-all duration-300">
                {systemName}
              </h1>
              <p className="text-sm text-gray-500 hidden lg:block group-hover:text-gray-600 transition-colors duration-300">
                {t('topbar.subtitle', 'Transportation Management System')}
              </p>
            </div>
          </div>
        </div>

        {/* Right side - Actions and User Menu */}
        <div className="flex items-center space-x-3">
          
          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 rounded-xl transition-all duration-300 group"
            >
              <Bell className="h-5 w-5 group-hover:animate-pulse" />
              {unreadCountBadge > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold shadow-lg animate-pulse">
                  {unreadCountBadge > 99 ? '99+' : unreadCountBadge}
                </span>
              )}
            </button>

            {/* Notifications dropdown */}
            {showNotifications && (
              <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[min(24rem,calc(100vw-1.5rem))] sm:w-96 mx-2 sm:mx-0 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 z-50 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-200/50 bg-gradient-to-r from-gray-50/80 to-white/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                        <Bell className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{t('topbar.notifications', 'Notifications')}</h3>
                        <p className="text-sm text-gray-500">{unreadCountBadge} {t('topbar.newMessages', 'new messages')}</p>
                      </div>
                    </div>
                    {userNotifications.length > 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setNotifFilter('all')}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-300 ${
                            notifFilter === 'all' 
                              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-transparent shadow-lg' 
                              : 'text-gray-600 hover:bg-gray-100 border-gray-200'
                          }`}
                        >
                          {t('common.all', 'All')}
                        </button>
                        <button
                          onClick={() => setNotifFilter('unread')}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-300 ${
                            notifFilter === 'unread' 
                              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-transparent shadow-lg' 
                              : 'text-gray-600 hover:bg-gray-100 border-gray-200'
                          }`}
                        >
                          {t('topbar.unread', 'Unread')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* List */}
                <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto">
                  {displayNotifications.length > 0 ? (
                    displayNotifications.map((notification: Notification) => (
                        <div
                        key={notification.id}
                        className={`p-4 border-b border-gray-100/50 hover:bg-gray-50/80 cursor-pointer transition-all duration-300 ${
                          !notification.isRead ? 'bg-orange-50/50 border-l-4 border-l-orange-500' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                            (notification as any).type === 'booking' ? 'bg-green-100 text-green-600' :
                            (notification as any).type === 'announcement' ? 'bg-blue-100 text-blue-600' :
                            'bg-orange-100 text-orange-600'
                          }`}>
                            {(notification as any).type === 'booking' ? <CheckCircle className="w-5 h-5" /> :
                             (notification as any).type === 'announcement' ? <Info className="w-5 h-5" /> :
                             <AlertCircle className="w-5 h-5" />}
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <p className={`text-sm font-semibold truncate pr-3 ${
                                !notification.isRead ? 'text-orange-700' : 'text-gray-900'
                              }`}>
                                {notification.title || t('topbar.notification', 'Notification')}
                              </p>
                              {!notification.isRead && (
                                <span className="mt-1 inline-block w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                              )}
                            </div>
                            {notification.message && (
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              <span>{getRelativeTime(notification.sentAt)}</span>
                              {notification.userName && <span>• {t('topbar.from', 'From')}: {notification.userName}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center text-gray-500">
                      <div className="mx-auto w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                        <Bell className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-medium">{t('topbar.noNotifications', 'No notifications to show')}</p>
                      <p className="text-xs mt-1">{t('topbar.allCaughtUp', "You're all caught up!")}</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200/50 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:shadow-lg transition-all duration-300 font-medium w-full sm:w-auto"
                    >
                      {t('topbar.markAllRead', 'Mark all read')}
                    </button>
                    <button
                      onClick={handleClearAllRead}
                      className="text-xs px-4 py-2 rounded-xl bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all duration-300 font-medium w-full sm:w-auto"
                    >
                      {t('topbar.clearAll', 'Clear all')}
                    </button>
                  </div>
                  <a 
                    href={fallbackUrl} 
                    className="text-xs px-4 py-2 rounded-xl border border-gray-200 hover:bg-white transition-all duration-300 font-medium w-full sm:w-auto text-center"
                  >
                    {t('topbar.viewAll', 'View all')}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative flex items-center gap-2" ref={userMenuRef}>
            {/* Language Toggle */}
            <LanguageSwitcher className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm" />

            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100/80 rounded-xl transition-all duration-300 group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg overflow-hidden group-hover:shadow-xl transition-all duration-300 relative">
                <Image 
                  src={avatarSrc || '/logo2.png'} 
                  alt="Profile" 
                  fill
                  className="object-cover"
                  sizes="40px"
                  unoptimized
                  onError={() => setAvatarSrc('/logo2.png')}
                />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-gray-900">
                {getUserDisplayName()}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <ChevronDown className="h-4 w-4 group-hover:rotate-180 transition-transform duration-300" />
            </button>

            {/* User dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-4 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 z-50 overflow-hidden">
                <div className="p-2">
                  <div className="px-4 py-4 border-b border-gray-200/50 bg-gradient-to-r from-gray-50/80 to-white/80">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg overflow-hidden relative">
                        <Image 
                          src={avatarSrc || '/logo2.png'} 
                          alt="Profile" 
                          fill
                          className="object-cover"
                          sizes="48px"
                          unoptimized
                          onError={() => setAvatarSrc('/logo2.png')}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{getUserDisplayName()}</p>
                        <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-green-600 font-medium">{t('common.online', 'Online')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                <div className="py-2">
                  <button
                    onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50/80 hover:text-red-700 flex items-center space-x-3 transition-all duration-300 rounded-lg mx-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{t('common.logout', 'Logout')}</span>
                  </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showNotifications || showUserMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowNotifications(false);
            setShowUserMenu(false);
          }}
        />
      )}
    </div>
  );
};
