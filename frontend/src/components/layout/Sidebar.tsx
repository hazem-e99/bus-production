'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  Users, 
  Bus, 
  CreditCard, 
  Menu,
  X,
  Calendar,
  Bell,
  User,
  LayoutDashboard,
  ChevronRight,
  Sparkles,
  Crown,
  GraduationCap,
  UserCheck,
  Navigation,
  Car,
  Radio,
  Satellite,
  ClipboardCheck,
} from 'lucide-react';
import { UserRole } from '@/types/user';
import { notificationAPI } from '@/lib/api';
import { useI18n } from '@/contexts/LanguageContext';

interface SidebarProps {
  userRole: UserRole;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  badge?: string;
}

const navigationItems = {
  admin: [
    { name: 'Users', href: '/dashboard/admin/users', icon: Users, badge: 'Manage' },
    { name: 'Buses', href: '/dashboard/admin/buses', icon: Bus, badge: 'Fleet' },
    { name: 'Live Tracking', href: '/dashboard/admin/tracking', icon: Radio, badge: 'Live' },
    { name: 'Trips', href: '/trips', icon: Calendar, badge: 'Schedule' },
    { name: 'Plans', href: '/dashboard/admin/plans', icon: CreditCard, badge: 'Pricing' },
    { name: 'Student Subscriptions', href: '/dashboard/admin/student-subscriptions', icon: LayoutDashboard, badge: 'Subs' },
    { name: 'Voting', href: '/dashboard/admin/voting', icon: ClipboardCheck, badge: 'Surveys' },
    { name: 'Notifications', href: '/dashboard/admin/notifications', icon: Bell },
    { name: 'Profile', href: '/dashboard/admin/profile', icon: User, badge: 'Account' },
  ],
  student: [
    { name: 'Book Trip', href: '/dashboard/student/book-trip', icon: Bus, badge: 'New' },
    { name: 'Subscription', href: '/dashboard/student/subscription', icon: CreditCard, badge: 'Plan' },
    { name: 'Voting', href: '/dashboard/student/voting', icon: ClipboardCheck, badge: 'Forms' },
    { name: 'Notifications', href: '/dashboard/student/notifications', icon: Bell },
    { name: 'Profile', href: '/dashboard/student/profile', icon: User, badge: 'Account' },
  ],
  supervisor: [
    { name: 'My Trips', href: '/dashboard/supervisor/my-trips', icon: Calendar, badge: 'Active' },
    { name: 'Notifications', href: '/dashboard/supervisor/notifications', icon: Bell },
    { name: 'Profile', href: '/dashboard/supervisor/profile', icon: User, badge: 'Account' },
  ],
  'movement-manager': [
    { name: 'Buses', href: '/dashboard/movement-manager/buses', icon: Bus, badge: 'Fleet' },
    { name: 'Live Tracking', href: '/dashboard/movement-manager/tracking', icon: Radio, badge: 'Live' },
    { name: 'Trips Management', href: '/trips', icon: Calendar, badge: 'Manage' },
    { name: 'Notifications', href: '/dashboard/movement-manager/notifications', icon: Bell },
    { name: 'Profile', href: '/dashboard/movement-manager/profile', icon: User, badge: 'Account' },
  ],
  driver: [
    { name: 'My Trips', href: '/dashboard/driver/my-trips', icon: Calendar, badge: 'Schedule' },
    { name: 'Bus Tracking', href: '/dashboard/driver/tracking', icon: Satellite, badge: 'GPS' },
    { name: 'Notifications', href: '/dashboard/driver/notifications', icon: Bell },
    { name: 'Profile', href: '/dashboard/driver/profile', icon: User, badge: 'Account' },
  ],
};

// Unified orange theme configuration for all roles
const roleConfig = {
  admin: {
    icon: Crown,
    color: 'from-orange-500 to-orange-600',
    bgColor: 'from-orange-50 to-orange-100',
    textColor: 'text-orange-600',
    badgeColor: 'bg-orange-500 text-white',
    accentColor: 'from-orange-500 to-orange-600'
  },
  student: {
    icon: GraduationCap,
    color: 'from-orange-500 to-orange-600',
    bgColor: 'from-orange-50 to-orange-100',
    textColor: 'text-orange-600',
    badgeColor: 'bg-orange-500 text-white',
    accentColor: 'from-orange-500 to-orange-600'
  },
  supervisor: {
    icon: UserCheck,
    color: 'from-orange-500 to-orange-600',
    bgColor: 'from-orange-50 to-orange-100',
    textColor: 'text-orange-600',
    badgeColor: 'bg-orange-500 text-white',
    accentColor: 'from-orange-500 to-orange-600'
  },
  'movement-manager': {
    icon: Navigation,
    color: 'from-orange-500 to-orange-600',
    bgColor: 'from-orange-50 to-orange-100',
    textColor: 'text-orange-600',
    badgeColor: 'bg-orange-500 text-white',
    accentColor: 'from-orange-500 to-orange-600'
  },
  driver: {
    icon: Car,
    color: 'from-orange-500 to-orange-600',
    bgColor: 'from-orange-50 to-orange-100',
    textColor: 'text-orange-600',
    badgeColor: 'bg-orange-500 text-white',
    accentColor: 'from-orange-500 to-orange-600'
  }
};

export const Sidebar = ({ userRole }: SidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  const items = navigationItems[userRole] || [];
  const config = roleConfig[userRole] || roleConfig.admin;
  const { isRTL, t } = useI18n();

  // Load unread notification count
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const response = await notificationAPI.getUnreadCount();
        if (response.success && response.data !== null) {
          setUnreadCount(response.data);
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

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn('lg:hidden fixed top-4 z-50 p-3 rounded-xl bg-white shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 backdrop-blur-sm', isRTL ? 'right-4' : 'left-4')}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-gray-700" />
        ) : (
          <Menu className="h-6 w-6 text-gray-700" />
        )}
      </button>

      {/* Sidebar */}
    <div
        className={cn(
      'fixed inset-y-0 z-40 w-72 bg-white shadow-2xl transform transition-all duration-300 ease-in-out lg:translate-x-0',
      isRTL ? 'right-0 border-l border-gray-200' : 'left-0 border-r border-gray-200',
      isOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header with Logo and Role */}
          <div className={cn(
            'relative px-6 py-6 bg-gradient-to-r',
            config.accentColor
          )}>
            <div className="absolute inset-0 bg-black/5 rounded-b-3xl"></div>
            <div className="relative">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <config.icon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{t('brand.name', 'Bus System')}</h1>
                  <p className="text-white/80 text-sm capitalize">{t('sidebar.dashboardFor', '{{role}} Dashboard').replace('{{role}}', userRole.replace('-', ' '))}</p>
                </div>
              </div>
              
              {/* Role Badge */}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-white/90 text-sm font-medium">{t('sidebar.activeSession', 'Active Session')}</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2">
            {items.map((item: NavigationItem) => {
              const isActive = pathname === item.href;
              const isDisabled = item.disabled;
              const isNotificationItem = item.name === 'Notifications';
              const showBadge = isNotificationItem && unreadCount > 0;
              
              if (isDisabled) {
                return (
                  <div
                    key={item.name}
                    className="flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 text-gray-400 cursor-not-allowed opacity-60 bg-gray-50"
                  >
                    <item.icon className={cn(isRTL ? 'ml-3' : 'mr-3', 'h-5 w-5')} />
                    <span className="flex-1">{t(`nav.${item.name.toLowerCase().replace(/\s+/g,'_')}`, item.name)}</span>
                    <span className={cn('text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-medium', isRTL ? 'mr-auto' : 'ml-auto')}>
                      {t('common.soon', 'Soon')}
                    </span>
                  </div>
                );
              }
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                    className={cn(
                      'group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 relative overflow-hidden',
                      isActive
                        ? cn('bg-gradient-to-r text-white shadow-lg transform scale-[1.02]', config.accentColor)
                        : 'text-gray-700 hover:bg-gray-50 hover:shadow-md hover:transform hover:scale-[1.01]'
                    )}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className={cn('absolute top-0 bottom-0 w-1 bg-white', isRTL ? 'right-0 rounded-l-full' : 'left-0 rounded-r-full')}></div>
                  )}
                  
                  {/* Icon */}
                  <div className={cn(
                    isRTL ? 'ml-3' : 'mr-3',
                    'h-5 w-5 transition-all duration-300',
                    isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                  )}>
                    <item.icon className="w-full h-full" />
                  </div>
                  
                  {/* Text */}
                  <span className="flex-1">{t(`nav.${item.name.toLowerCase().replace(/\s+/g,'_')}`, item.name)}</span>
                  
                  {/* Badges */}
                  <div className="flex items-center gap-2">
          {item.badge && !isActive && (
                      <span className={cn(
                        'text-xs px-2 py-1 rounded-full font-medium',
                        config.badgeColor
                      )}>
            {t(`nav.badges.${item.badge.toLowerCase().replace(/\s+/g,'_')}`, item.badge)}
                      </span>
                    )}
                    
                    {showBadge && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                    
                    {isActive && (
                      <ChevronRight className="w-4 h-4 text-white/80" />
                    )}
                  </div>
                  
                  {/* Hover effect */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Profile Section */}
          <div className="p-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center p-3 rounded-2xl bg-white shadow-lg border border-gray-100">
              <div className={cn(
                'w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-r',
                config.accentColor
              )}>
                <config.icon className="w-6 h-6 text-white" />
              </div>
              <div className={cn(isRTL ? 'mr-4' : 'ml-4', 'flex-1')}>
                <p className="text-sm font-bold text-gray-900 capitalize">
                  {userRole.replace('-', ' ')}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-xs text-gray-500 font-medium">{t('common.online', 'Online')}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                <span className="text-xs font-bold text-yellow-600">{t('common.pro', 'Pro')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden transition-all duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};