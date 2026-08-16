'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Modal } from '@/components/ui/Modal';
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
  CheckCircle,
  ShieldAlert,
  Trash2,
  Lock
} from 'lucide-react';
import { settingsAPI, adminSystemAPI, PurgeDatabaseResponseData } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';
import { ApiError, getApiErrorMessage } from '@/lib/apiError';

const PURGE_CONFIRMATION_PHRASE = 'DELETE ALL DATA';

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
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'maintenance' | 'danger'>('general');

  // Danger Zone: purge-all-data state
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState('');
  const [purgePassword, setPurgePassword] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const [purgeError, setPurgeError] = useState('');
  const isPurgeConfirmed = purgeConfirmText === PURGE_CONFIRMATION_PHRASE && purgePassword.length > 0;

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
      // Handle "not found" gracefully by falling back to defaults
      if (error instanceof ApiError && error.status === 404) {
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
          message: getApiErrorMessage(error)
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
      
    } catch (error: unknown) {
      console.error('Error saving settings:', error);
      showToast({
        type: 'error',
        title: 'Error!',
        message: getApiErrorMessage(error)
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
      
    } catch (error: unknown) {
      console.error('Error resetting settings:', error);
      showToast({
        type: 'error',
        title: 'Error!',
        message: getApiErrorMessage(error)
      });
    } finally {
      setSaving(false);
    }
  };

  const openPurgeModal = () => {
    setPurgeConfirmText('');
    setPurgePassword('');
    setPurgeError('');
    setShowPurgeModal(true);
  };

  const closePurgeModal = () => {
    if (isPurging) return; // never allow closing mid-request
    setShowPurgeModal(false);
    setPurgeConfirmText('');
    setPurgePassword('');
    setPurgeError('');
  };

  const handlePurgeDatabase = async (e?: React.FormEvent) => {
    e?.preventDefault();
    // Defense in depth: never proceed on an accidental Enter-key submit or a
    // programmatic call before both fields are genuinely valid.
    if (!isPurgeConfirmed || isPurging) return;

    setIsPurging(true);
    setPurgeError('');
    try {
      const resp = await adminSystemAPI.purgeDatabase({
        confirmationPhrase: purgeConfirmText,
        password: purgePassword,
      });
      const data = resp?.data as PurgeDatabaseResponseData | undefined;
      setShowPurgeModal(false);
      setPurgeConfirmText('');
      setPurgePassword('');

      const deletedTotal = data?.deleted
        ? Object.values(data.deleted).reduce((sum, n) => sum + (n || 0), 0)
        : undefined;
      showToast({
        type: 'success',
        title: t('deleteAllDataSuccessTitle'),
        message: deletedTotal !== undefined
          ? `${t('deleteAllDataSuccessMessage')} (${deletedTotal})`
          : t('deleteAllDataSuccessMessage'),
      });
    } catch (error: unknown) {
      // Keep the modal open on failure so the admin can correct the password
      // or retry, without having to re-type the confirmation phrase.
      setPurgePassword('');
      setPurgeError(getApiErrorMessage(error));
    } finally {
      setIsPurging(false);
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
          <Button
            variant={activeTab === 'danger' ? 'destructive' : 'outline'}
            onClick={() => setActiveTab('danger')}
            size="sm"
            className={activeTab !== 'danger' ? 'text-error border-error/30 hover:bg-error/5 hover:border-error' : ''}
          >
            <ShieldAlert className="w-4 h-4 mr-2" /> {t('dangerZone')}
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

            {activeTab === 'danger' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <ShieldAlert className="w-5 h-5 mr-2 text-error" />
                  {t('dangerZone')}
                </h3>
                <p className="text-sm text-gray-500">{t('dangerZoneDescription')}</p>

                <div className="rounded-xl border-2 border-error/30 bg-error/5 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-error/10 rounded-lg flex-shrink-0">
                        <Trash2 className="w-5 h-5 text-error" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-error">{t('deleteAllData')}</h4>
                        <p className="text-sm text-gray-600 mt-1 max-w-xl">{t('deleteAllDataDescription')}</p>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={openPurgeModal}
                      className="w-full sm:w-auto flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('deleteAllDataButton')}
                    </Button>
                  </div>
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

      {/* Danger Zone: Delete All Database Data confirmation modal */}
      <Modal
        isOpen={showPurgeModal}
        onClose={closePurgeModal}
        title={t('deleteAllDataModalTitle')}
        size="md"
      >
        <form onSubmit={handlePurgeDatabase} className="space-y-5">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-error/10 border border-error/30">
            <AlertTriangle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-error">{t('deleteAllDataWarning')}</p>
              <p className="text-sm text-gray-700">{t('deleteAllDataIrreversible')}</p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-gray-800">{t('whatWillBeDeleted')}</p>
              <p className="text-gray-600 mt-0.5">{t('whatWillBeDeletedList')}</p>
            </div>
            <div>
              <p className="font-medium text-gray-800">{t('whatWillBePreserved')}</p>
              <p className="text-gray-600 mt-0.5">{t('whatWillBePreservedList')}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('typeToConfirm').replace('{phrase}', '')}
              <code className="ml-1 px-1.5 py-0.5 rounded bg-gray-100 text-error font-mono text-xs align-middle">
                {PURGE_CONFIRMATION_PHRASE}
              </code>
            </label>
            <Input
              value={purgeConfirmText}
              onChange={(e) => setPurgeConfirmText(e.target.value)}
              placeholder={PURGE_CONFIRMATION_PHRASE}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={isPurging}
              className={purgeConfirmText && purgeConfirmText !== PURGE_CONFIRMATION_PHRASE ? 'border-error focus-visible:ring-error' : ''}
            />
            {purgeConfirmText && purgeConfirmText !== PURGE_CONFIRMATION_PHRASE && (
              <p className="text-xs text-error mt-1">{t('confirmationPhraseMismatch')}</p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
              <Lock className="w-3.5 h-3.5" />
              {t('currentPasswordLabel')}
            </label>
            <Input
              type="password"
              value={purgePassword}
              onChange={(e) => setPurgePassword(e.target.value)}
              placeholder={t('currentPasswordPlaceholder')}
              autoComplete="current-password"
              disabled={isPurging}
            />
          </div>

          {purgeError && (
            <div className="text-sm text-error bg-error/10 border border-error/30 rounded-lg p-3">
              {purgeError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closePurgeModal} disabled={isPurging}>
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!isPurgeConfirmed || isPurging}
            >
              {isPurging ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {t('deletingInProgress')}
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('deleteAllDataButton')}
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
