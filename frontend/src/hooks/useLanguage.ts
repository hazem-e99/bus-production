import { useState, useEffect } from 'react';
import { settingsAPI } from '@/lib/api';

export type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const translations = {
  en: {
    // Common
    'save': 'Save',
    'cancel': 'Cancel',
    'edit': 'Edit',
    'delete': 'Delete',
    'create': 'Create',
    'update': 'Update',
    'loading': 'Loading...',
    'error': 'Error',
    'success': 'Success',
    'warning': 'Warning',
    'info': 'Information',
    
    // Navigation
    'dashboard': 'Dashboard',
    'users': 'Users',
    'buses': 'Buses',
    'routes': 'Routes',
    'payments': 'Payments',
    'settings': 'Settings',
    'analytics': 'Analytics',
    
    // Dashboard
    'totalStudents': 'Total Students',
    'totalDrivers': 'Total Drivers',
    'totalBuses': 'Total Buses',
    'totalRoutes': 'Total Routes',
    'totalRevenue': 'Total Revenue',
    'todayTrips': 'Today\'s Trips',
    'recentActivity': 'Recent Activity',
    
    // Settings
    'systemSettings': 'System Settings',
    'systemName': 'System Name',
    'logo': 'Logo',
    'primaryColor': 'Primary Color',
    'maintenanceMode': 'Maintenance Mode',
    'language': 'Language',
    'appearance': 'Appearance',
    'systemInformation': 'System Information',
    
    // Maintenance
    'underMaintenance': 'Under Maintenance',
    'maintenanceMessage': 'We are currently performing scheduled maintenance to improve our services. Please check back later.',
    'estimatedTime': 'Estimated completion time',
    'tryAgain': 'Try Again',
    'contactSupport': 'Need immediate assistance?',
  },
  ar: {
    // Common
    'save': 'حفظ',
    'cancel': 'إلغاء',
    'edit': 'تعديل',
    'delete': 'حذف',
    'create': 'إنشاء',
    'update': 'تحديث',
    'loading': 'جاري التحميل...',
    'error': 'خطأ',
    'success': 'نجح',
    'warning': 'تحذير',
    'info': 'معلومات',
    
    // Navigation
    'dashboard': 'لوحة التحكم',
    'users': 'المستخدمين',
    'buses': 'الباصات',
    'routes': 'الطرق',
    'payments': 'المدفوعات',
    'settings': 'الإعدادات',
    'analytics': 'التحليلات',
    
    // Dashboard
    'totalStudents': 'إجمالي الطلاب',
    'totalDrivers': 'إجمالي السائقين',
    'totalBuses': 'إجمالي الباصات',
    'totalRoutes': 'إجمالي الطرق',
    'totalRevenue': 'إجمالي الإيرادات',
    'todayTrips': 'رحلات اليوم',
    'recentActivity': 'النشاط الأخير',
    
    // Settings
    'systemSettings': 'إعدادات النظام',
    'systemName': 'اسم النظام',
    'logo': 'الشعار',
    'primaryColor': 'اللون الأساسي',
    'maintenanceMode': 'وضع الصيانة',
    'language': 'اللغة',
    'appearance': 'المظهر',
    'systemInformation': 'معلومات النظام',
    
    // Maintenance
    'underMaintenance': 'قيد الصيانة',
    'maintenanceMessage': 'نحن نقوم حالياً بإجراء صيانة مجدولة لتحسين خدماتنا. يرجى المحاولة مرة أخرى لاحقاً.',
    'estimatedTime': 'الوقت المتوقع للانتهاء',
    'tryAgain': 'حاول مرة أخرى',
    'contactSupport': 'تحتاج مساعدة فورية؟',
  }
};

export function useLanguage(): LanguageContextType {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    // Load language from settings
    const loadLanguage = async () => {
      try {
        const settings = await settingsAPI.get();
        setLanguageState(settings.language || 'en');
      } catch (error: unknown) {
        // Silently ignore 404 errors and use default language
        if (!(error as Error)?.message?.includes('404')) {
          console.error('Failed to load language setting:', error);
        }
        setLanguageState('en'); // Default to English
      }
    };

    loadLanguage();
  }, []);

  const setLanguage = async (lang: Language) => {
    try {
      setLanguageState(lang);
      
      // Update language in settings (skip if settings API is not available)
      try {
        const currentSettings = await settingsAPI.get();
        await settingsAPI.update({
          ...currentSettings,
          language: lang
        });
      } catch (settingsError: unknown) {
        // Ignore 404 errors for settings API
        if (!(settingsError as Error)?.message?.includes('404')) {
          console.error('Failed to update language in settings:', settingsError);
        }
      }
      
      // Apply RTL if needed
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
      
    } catch (error: unknown) {
      console.error('Failed to update language:', error);
    }
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const isRTL = language === 'ar';

  // Apply RTL on language change
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [isRTL, language]);

  return {
    language,
    setLanguage,
    t,
    isRTL
  };
}
