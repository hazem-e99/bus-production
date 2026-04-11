'use client';

import { useEffect, useState } from 'react';
import { Wrench, Clock, AlertTriangle, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { settingsAPI } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';

export default function MaintenancePage() {
  const { t, isRTL } = useLanguage();
  const [maintenanceInfo, setMaintenanceInfo] = useState({
    systemName: 'El Renad',
    estimatedTime: '2 hours',
    message: t('maintenanceMessage')
  });

  useEffect(() => {
    // Load system name from settings
    const loadSystemInfo = async () => {
      try {
        const settings = await settingsAPI.get();
        setMaintenanceInfo(prev => ({
          ...prev,
          systemName: settings.systemName || 'El Renad'
        }));
      } catch (error: unknown) {
        // Silently ignore 404 errors and use default system name
        if (error instanceof Error && !error.message.includes('404')) {
          console.error('Failed to load system info:', error);
        }
        setMaintenanceInfo(prev => ({
          ...prev,
          systemName: 'El Renad'
        }));
      }
    };

    loadSystemInfo();
  }, []);

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Wrench className="w-12 h-12 text-orange-600" />
          </div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {t('underMaintenance')}
        </h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            {maintenanceInfo.systemName}
          </h2>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="text-center space-y-6">
            {/* Alert Icon */}
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            {/* Message */}
            <div>
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                {maintenanceInfo.message}
              </p>
              <p className="text-gray-600">
                We apologize for any inconvenience this may cause.
              </p>
            </div>

            {/* Estimated Time */}
            <div className="flex items-center justify-center space-x-2 text-orange-600">
              <Clock className="w-5 h-5" />
              <span className="font-medium">
                {t('estimatedTime')}: {maintenanceInfo.estimatedTime}
              </span>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
            What&apos;s happening?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
              <span>System updates and improvements</span>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
              <span>Database optimization</span>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
              <span>Security enhancements</span>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
              <span>Performance improvements</span>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Need immediate assistance?
          </h3>
          <p className="text-gray-600 mb-4">
            If you have an urgent matter, please contact our support team:
          </p>
          <div className="space-y-2 text-sm text-gray-600">
            <p>📧 support@university.edu</p>
            <p>📞 +1-555-0123</p>
            <p>🕒 Emergency support available 24/7</p>
          </div>
        </div>

        {/* Try Again Button */}
        <div className="text-center">
          <Button 
            onClick={() => window.location.reload()} 
            className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3"
          >
            <Home className="w-4 h-4 mr-2" />
            {t('tryAgain')}
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>© 2024 {maintenanceInfo.systemName}. All rights reserved.</p>
          <p className="mt-1">
            Maintenance started at: {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
