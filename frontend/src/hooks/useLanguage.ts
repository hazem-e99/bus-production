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

    // Danger Zone
    'dangerZone': 'Danger Zone',
    'dangerZoneDescription': 'Irreversible and destructive actions. Proceed with extreme caution.',
    'deleteAllData': 'Delete All Database Data',
    'deleteAllDataDescription': 'Permanently removes all application data — buses, trips, bookings, payments, subscriptions, notifications, attendance, routes, voting data, and live tracking data — from the database. This cannot be undone.',
    'deleteAllDataButton': 'Delete All Data',
    'deleteAllDataModalTitle': 'Delete All Database Data',
    'deleteAllDataWarning': 'This action permanently deletes the database data. Make sure you have a recent backup before continuing.',
    'deleteAllDataIrreversible': 'This operation is permanent and cannot be undone unless a backup exists.',
    'whatWillBeDeleted': 'What will be deleted',
    'whatWillBeDeletedList': 'Buses, trips, bookings, payments, subscription plans, student subscriptions, notifications, attendance records, routes, voting surveys and votes, and live bus tracking data.',
    'whatWillBePreserved': 'What will be preserved',
    'whatWillBePreservedList': 'Your own administrator account (this login) and system settings. All other user accounts will also be deleted.',
    'typeToConfirm': 'Type {phrase} to confirm',
    'confirmationPhraseLabel': 'Confirmation phrase',
    'confirmationPhraseMismatch': 'Does not match. Type it exactly as shown.',
    'currentPasswordLabel': 'Your current password',
    'currentPasswordPlaceholder': 'Enter your password to confirm your identity',
    'deletingInProgress': 'Deleting all data…',
    'deleteAllDataSuccessTitle': 'Database purged',
    'deleteAllDataSuccessMessage': 'All application data has been permanently deleted. Your admin account was preserved.',
    'deleteAllDataFailedTitle': 'Purge failed',
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

    // Danger Zone
    'dangerZone': 'منطقة الخطر',
    'dangerZoneDescription': 'إجراءات مدمرة ولا يمكن التراجع عنها. تابع بحذر شديد.',
    'deleteAllData': 'حذف جميع بيانات قاعدة البيانات',
    'deleteAllDataDescription': 'يحذف نهائيًا جميع بيانات التطبيق — الباصات، الرحلات، الحجوزات، المدفوعات، الاشتراكات، الإشعارات، الحضور، الطرق، بيانات التصويت، وبيانات التتبع المباشر — من قاعدة البيانات. لا يمكن التراجع عن هذا الإجراء.',
    'deleteAllDataButton': 'حذف جميع البيانات',
    'deleteAllDataModalTitle': 'حذف جميع بيانات قاعدة البيانات',
    'deleteAllDataWarning': 'هذا الإجراء يحذف بيانات قاعدة البيانات نهائيًا. تأكد من وجود نسخة احتياطية حديثة قبل المتابعة.',
    'deleteAllDataIrreversible': 'هذه العملية نهائية ولا يمكن التراجع عنها إلا في حال وجود نسخة احتياطية.',
    'whatWillBeDeleted': 'ما سيتم حذفه',
    'whatWillBeDeletedList': 'الباصات، الرحلات، الحجوزات، المدفوعات، خطط الاشتراك، اشتراكات الطلاب، الإشعارات، سجلات الحضور، الطرق، استطلاعات التصويت والأصوات، وبيانات تتبع الباصات المباشر.',
    'whatWillBePreserved': 'ما سيتم الحفاظ عليه',
    'whatWillBePreservedList': 'حساب المسؤول الخاص بك (هذا الحساب) وإعدادات النظام. سيتم حذف جميع حسابات المستخدمين الأخرى.',
    'typeToConfirm': 'اكتب {phrase} للتأكيد',
    'confirmationPhraseLabel': 'عبارة التأكيد',
    'confirmationPhraseMismatch': 'غير مطابقة. اكتبها تمامًا كما هي موضحة.',
    'currentPasswordLabel': 'كلمة مرورك الحالية',
    'currentPasswordPlaceholder': 'أدخل كلمة المرور لتأكيد هويتك',
    'deletingInProgress': 'جاري حذف جميع البيانات…',
    'deleteAllDataSuccessTitle': 'تم تفريغ قاعدة البيانات',
    'deleteAllDataSuccessMessage': 'تم حذف جميع بيانات التطبيق نهائيًا. تم الحفاظ على حساب المسؤول الخاص بك.',
    'deleteAllDataFailedTitle': 'فشل الحذف',
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
