'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/components/ui/Toast';
import { 
  Settings, 
  Save,
  RefreshCw,
  AlertTriangle,
  Building2,
  Palette,
  Globe,
  Wrench,
  CheckCircle
} from 'lucide-react';
import { settingsAPI } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';

interface SystemSettings {
  id: string;
  systemName: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  maintenanceMode: boolean;
  language: 'en' | 'ar';
  updatedAt: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    id: 'system-settings',
    systemName: 'University Bus Management System',
    logo: '/logo.png',
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    maintenanceMode: false,
    language: 'en',
    updatedAt: new Date().toISOString()
  });

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { t, language: currentLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'maintenance'>('general');

  // Load settings from db.json
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settingsData = await settingsAPI.get();
      const defaults: SystemSettings = {
        id: 'system-settings',
        systemName: 'University Bus Management System',
        logo: '/logo.png',
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
        maintenanceMode: false,
        language: 'en',
        updatedAt: new Date().toISOString()
      };
      const normalized: SystemSettings = {
        ...defaults,
        ...(settingsData || {}),
        systemName: (settingsData?.systemName ?? defaults.systemName) || '',
        logo: (settingsData?.logo ?? defaults.logo) || '',
        primaryColor: (settingsData?.primaryColor ?? defaults.primaryColor) || '#3B82F6',
        secondaryColor: (settingsData?.secondaryColor ?? defaults.secondaryColor) || '#10B981',
        language: (settingsData?.language ?? defaults.language) as 'en' | 'ar',
        maintenanceMode: !!settingsData?.maintenanceMode,
      };
      setSettings(normalized);
      // apply theme immediately after loading
      applyThemeColors(normalized.primaryColor, normalized.secondaryColor);
    } catch (error: unknown) {
      // Handle 404 errors gracefully by using defaults
      if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.includes('404')) {
        const defaults: SystemSettings = {
          id: 'system-settings',
          systemName: 'University Bus Management System',
          logo: '/logo.png',
          primaryColor: '#3B82F6',
          secondaryColor: '#10B981',
          maintenanceMode: false,
          language: 'en',
          updatedAt: new Date().toISOString()
        };
        setSettings(defaults);
        applyThemeColors(defaults.primaryColor, defaults.secondaryColor);
      } else {
        console.error('Error loading settings:', error);
        showToast({
          type: 'error',
          title: 'Error!',
          message: 'Failed to load system settings. Please try again.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaved(false);
      
      const updatedSettings = {
        ...settings,
        updatedAt: new Date().toISOString()
      };

      await settingsAPI.update(updatedSettings);
      setSettings(updatedSettings);
      
      setSaved(true);
      showToast({
        type: 'success',
        title: 'Success!',
        message: 'System settings updated successfully.'
      });
      
      // Apply color changes immediately and persist to localStorage
      applyThemeColors(updatedSettings.primaryColor, updatedSettings.secondaryColor);
      try {
        localStorage.setItem('themeColors', JSON.stringify({ primary: updatedSettings.primaryColor, secondary: updatedSettings.secondaryColor }));
      } catch {}
      
      setTimeout(() => setSaved(false), 3000);
      
    } catch {
      console.error('Error saving settings:', Error);
      showToast({
        type: 'error',
        title: 'Error!',
        message: 'Failed to save settings. Please try again.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setSaving(true);
      
      const defaultSettings: SystemSettings = {
        id: 'system-settings',
        systemName: 'University Bus Management System',
        logo: '/logo.png',
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
        maintenanceMode: false,
        language: 'en' as 'en' | 'ar',
        updatedAt: new Date().toISOString()
      };

      await settingsAPI.update(defaultSettings as unknown as Record<string, unknown>);
      setSettings(defaultSettings);
      
      // Apply default colors and persist
      applyThemeColors(defaultSettings.primaryColor, defaultSettings.secondaryColor);
      try {
        localStorage.setItem('themeColors', JSON.stringify({ primary: defaultSettings.primaryColor, secondary: defaultSettings.secondaryColor }));
      } catch {}
      
      showToast({
        type: 'success',
        title: 'Success!',
        message: 'Settings reset to default values.'
      });
      
    } catch {
      console.error('Error resetting settings:', Error);
      showToast({
        type: 'error',
        title: 'Error!',
        message: 'Failed to reset settings. Please try again.'
      });
    } finally {
      setSaving(false);
    }
  };

  // Apply color changes to CSS variables
  const applyThemeColors = (primary: string, secondary: string) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', primary);
    root.style.setProperty('--primary-hover', adjustBrightness(primary, -20));
    root.style.setProperty('--primary-light', adjustBrightness(primary, 90));
    root.style.setProperty('--secondary', secondary);
    root.style.setProperty('--secondary-hover', adjustBrightness(secondary, -20));
    root.style.setProperty('--secondary-light', adjustBrightness(secondary, 90));
  };

  // Helper function to adjust color brightness
  const adjustBrightness = (hex: string, percent: number) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  };

  // Handle logo upload
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const logoUrl = e.target?.result as string;
        setSettings({ ...settings, logo: logoUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('systemSettings')}</h1>
          <p className="text-gray-600">Configure system preferences and appearance</p>
        </div>
        <div className="flex items-center space-x-3">
          {saved && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Settings saved!</span>
            </div>
          )}
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-gray-200 bg-white p-2">
        <div className="flex flex-wrap gap-2">
          <Button variant={activeTab === 'general' ? 'default' : 'outline'} onClick={() => setActiveTab('general')} size="sm">
            <Building2 className="w-4 h-4 mr-2" /> General
          </Button>
          <Button variant={activeTab === 'appearance' ? 'default' : 'outline'} onClick={() => setActiveTab('appearance')} size="sm">
            <Palette className="w-4 h-4 mr-2" /> Appearance
          </Button>
          <Button variant={activeTab === 'maintenance' ? 'default' : 'outline'} onClick={() => setActiveTab('maintenance')} size="sm">
            <Wrench className="w-4 h-4 mr-2" /> Maintenance
          </Button>
        </div>
      </div>

      {/* Settings Content */}
      <Card className="max-w-screen-2xl mx-auto">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="flex items-center text-2xl">
            <Settings className="w-6 h-6 mr-3 text-blue-600" />
            {t('systemSettings')}
          </CardTitle>
          <CardDescription className="text-gray-600">
            Basic system configuration and appearance settings
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-8">
            {activeTab === 'general' && (
              <div className="space-y-8">
                {/* System Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <Building2 className="w-5 h-5 mr-2 text-blue-600" />
                    {t('systemInformation')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('systemName')}
                      </label>
                      <Input
                        value={settings.systemName || ''}
                        onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                        placeholder="Enter system name"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Logo Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <Building2 className="w-5 h-5 mr-2 text-green-600" />
                    {t('logo')} {t('settings')}
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                        {settings.logo ? (
                          <Image src={settings.logo} alt="System Logo" width={40} height={40} className="w-full h-full object-contain" />
                        ) : (
                          <Building2 className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Upload {t('logo')}
                        </label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="w-full"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Recommended size: 200x200px, Max size: 2MB
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <Palette className="w-5 h-5 mr-2 text-purple-600" />
                  {t('appearance')} {t('settings')}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('primaryColor')}
                    </label>
                    <div className="flex items-center space-x-3">
                      <Input
                        type="color"
                        value={settings.primaryColor || '#3B82F6'}
                        onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={settings.primaryColor || '#3B82F6'}
                        onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                        placeholder="#3B82F6"
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      This color will be applied to buttons, links, and primary elements
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secondary Color
                    </label>
                    <div className="flex items-center space-x-3">
                      <Input
                        type="color"
                        value={settings.secondaryColor || '#10B981'}
                        onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={settings.secondaryColor || '#10B981'}
                        onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                        placeholder="#10B981"
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Used for accents and secondary elements
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'maintenance' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <Wrench className="w-5 h-5 mr-2 text-orange-600" />
                  {t('maintenanceMode')} {t('settings')}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('maintenanceMode')}</label>
                      <p className="text-sm text-gray-500">
                        When enabled, users will see a maintenance page instead of the login
                      </p>
                    </div>
                    <Switch
                      checked={!!settings.maintenanceMode}
                      onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
                    />
                  </div>
                  {settings.maintenanceMode && (
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center space-x-2 text-red-700">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-medium">Warning:</span>
                      </div>
                      <p className="text-sm text-red-600 mt-1">
                        Maintenance mode is active. Users will not be able to access the system.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Last Updated */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Last Updated:</span>
                <span>{new Date(settings.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card className="max-w-screen-2xl mx-auto">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b">
          <CardTitle className="flex items-center text-xl">
            <Globe className="w-5 h-5 mr-2 text-gray-600" />
            Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center p-6 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <div className="w-16 h-16 mx-auto mb-4">
                {settings.logo ? (
                  <Image src={settings.logo} alt="Logo Preview" width={40} height={40} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{settings.systemName}</h3>
              <p className="text-sm text-gray-500">System Logo & Name Preview</p>
            </div>
            
            <div className="text-center p-6 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <div className="space-y-3">
                <Button 
                  className="w-full"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  Primary Button
                </Button>
                <div className="w-full h-4 rounded" style={{ backgroundColor: settings.primaryColor }}></div>
                <p className="text-sm text-gray-500">Primary Color Preview</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
