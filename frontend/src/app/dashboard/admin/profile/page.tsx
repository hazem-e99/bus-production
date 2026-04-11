'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { 
  User, 
  Mail, 
  Phone, 
  Save, 
  Edit3, 
  X,
  Shield,
  Crown,
  Settings,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Upload,
  Eye,
  EyeOff
} from 'lucide-react';
import { userAPI } from '@/lib/api';
import { useI18n } from '@/contexts/LanguageContext';
import { toBackendAssetUrl } from '@/lib/backend-url';

interface AdminProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  nationalId: string;
  profilePictureUrl: string;
  status: string;
  role: string;
}

export default function AdminProfilePage() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: ''
  });

  // Fetch profile data from /api/Users/profile
  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Fetching admin profile from /api/Users/profile...');
      
      const response = await userAPI.getCurrentUserProfile();
      console.log('📊 Admin data loaded:', response);
      
      if (response) {
        const profileData: AdminProfile = {
          id: parseInt(response.id) || 0,
          firstName: response.firstName || '',
          lastName: response.lastName || '',
          email: response.email || '',
          phoneNumber: response.phoneNumber || '',
          nationalId: response.nationalId || '',
          profilePictureUrl: response.profilePictureUrl || '/avatar-placeholder.svg',
          status: response.status || 'Active',
          role: response.role || 'Admin'
        };
        
        setProfile(profileData);
        setFormData({
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          email: profileData.email,
          phoneNumber: profileData.phoneNumber
        });
        
        setLastRefresh(new Date());
        console.log('✅ Admin profile loaded successfully');
      }
    } catch (error) {
      console.error('❌ Failed to fetch profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle save
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Validate form data
      const trimmedData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim()
      };

      // Check if at least one field is provided
      if (!trimmedData.firstName && !trimmedData.lastName && !trimmedData.email && !trimmedData.phoneNumber) {
  alert(t('pages.admin.profile.alerts.fillOne', 'Please fill in at least one field to update.'));
        return;
      }

      // Validate name lengths
      if (trimmedData.firstName && (trimmedData.firstName.length < 2 || trimmedData.firstName.length > 50)) {
  alert(t('pages.admin.profile.alerts.firstNameLength', 'First name must be between 2 and 50 characters.'));
        return;
      }

      if (trimmedData.lastName && (trimmedData.lastName.length < 2 || trimmedData.lastName.length > 50)) {
  alert(t('pages.admin.profile.alerts.lastNameLength', 'Last name must be between 2 and 50 characters.'));
        return;
      }

      // Validate email format
      if (trimmedData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedData.email)) {
  alert(t('pages.admin.profile.alerts.invalidEmail', 'Please enter a valid email address.'));
        return;
      }

      console.log('💾 Saving admin profile to /api/Users/admin-profile...');
      
      const response = await userAPI.updateAdminProfile(trimmedData);
      
      if (response) {
        setIsEditing(false);
        await fetchProfile();
        setLastRefresh(new Date());
        
        // Dispatch events to update other components
        window.dispatchEvent(new StorageEvent('storage'));
        window.dispatchEvent(new CustomEvent('profileUpdated'));
        
        alert(t('pages.admin.profile.alerts.updated', 'Profile updated successfully!'));
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert(t('pages.admin.profile.alerts.updateFailed', 'Failed to update profile. Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (profile) {
      setFormData({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phoneNumber: profile.phoneNumber
      });
    }
    setIsEditing(false);
  };

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert(t('pages.admin.profile.alerts.selectImage', 'Please select an image file.'));
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert(t('pages.admin.profile.alerts.imageTooLarge', 'Image size should not exceed 5MB.'));
      return;
    }

    try {
      setIsUploadingImage(true);
      console.log('📸 Uploading new avatar to /api/Users/update-profile-picture...');
      
      const response = await userAPI.updateProfilePicture(file);
      
      if (response) {
        // Re-fetch profile data to get updated image
        await fetchProfile();
        setLastRefresh(new Date());
        
        // Dispatch events to update other components
        window.dispatchEvent(new StorageEvent('storage'));
        window.dispatchEvent(new CustomEvent('profileUpdated'));
        
        alert(t('pages.admin.profile.alerts.pictureUpdated', 'Profile picture updated successfully!'));
      }
    } catch (error) {
      console.error('Failed to update profile picture:', error);
      alert(t('pages.admin.profile.alerts.pictureUpdateFailed', 'Failed to update profile picture. Please try again.'));
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Build image URL helper
  const buildImageUrl = (imagePath: string | undefined): string => {
    if (!imagePath) return '/logo2.png';
    if (imagePath.includes('example.com/default-profile.png')) return '/logo2.png';
    return toBackendAssetUrl(imagePath);
  };

  // Get avatar display
  const getAvatarDisplay = () => {
    if (profile?.profilePictureUrl) {
      return (
      // eslint-disable-next-line @next/next/no-img-element
        <img
          src={buildImageUrl(profile.profilePictureUrl)}
          alt="Profile"
          className="w-full h-full object-cover rounded-full"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/logo2.png';
          }}
        />
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/logo2.png" alt="Profile" className="w-full h-full object-cover rounded-full" />
    );
  };

  // Mask sensitive data
  const maskData = (data: string, visibleChars: number = 4) => {
    if (!data || data.length <= visibleChars) return data;
    return '*'.repeat(data.length - visibleChars) + data.slice(-visibleChars);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-50 to-orange-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            {/* Header Skeleton */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <div className="h-8 bg-gray-200 rounded w-64"></div>
                  <div className="h-4 bg-gray-200 rounded w-96"></div>
                </div>
                <div className="flex gap-3">
                  <div className="h-10 bg-gray-200 rounded w-32"></div>
                  <div className="h-10 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
            </div>
            
            {/* Content Skeleton */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-1">
                <div className="bg-white rounded-2xl shadow-xl p-8 h-96"></div>
              </div>
              <div className="xl:col-span-2">
                <div className="bg-white rounded-2xl shadow-xl p-8 h-96"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-50 to-orange-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('pages.admin.profile.notFound.title', 'Profile Not Found')}</h1>
          <p className="text-gray-600 mb-6">{t('pages.admin.profile.notFound.message', 'Unable to load profile information.')}</p>
          <Button onClick={fetchProfile} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('pages.admin.profile.notFound.tryAgain', 'Try Again')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-50 to-orange-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Modern Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gradient-to-br from-orange-500 to-orange-600">
                {getAvatarDisplay()}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {profile.firstName} {profile.lastName}
                  </h1>
                  <Badge className="bg-orange-500 text-white border-orange-600">
                    <Crown className="w-3 h-3 mr-1" />
                    {profile.role}
                  </Badge>
                </div>
                <p className="text-gray-600 text-lg">{t('pages.admin.profile.header.adminTitle', 'System Administrator')}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {profile.status}
                  </span>
                  <span>•</span>
                  <span>{t('pages.admin.profile.header.lastUpdated', 'Last updated')}: {lastRefresh.toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full lg:w-auto">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white shadow-lg w-full sm:w-auto"
              >
                {isUploadingImage ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {isUploadingImage 
                  ? t('pages.admin.profile.header.uploading', 'Uploading...') 
                  : t('pages.admin.profile.header.changePhoto', 'Change Photo')}
              </Button>
              <Button
                onClick={() => setIsEditing(!isEditing)}
                className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white shadow-lg w-full sm:w-auto"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {isEditing 
                  ? t('pages.admin.profile.header.cancelEdit', 'Cancel Edit') 
                  : t('pages.admin.profile.header.edit', 'Edit Profile')}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Profile Overview Card */}
          <div className="xl:col-span-1">
            <Card className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-600 to-orange-600 p-6 text-white">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Settings className="w-5 h-5" />
                  {t('pages.admin.profile.overview.title', 'Profile Overview')}
                </CardTitle>
                <CardDescription className="text-purple-100">
                  {t('pages.admin.profile.overview.description', 'Your administrative profile summary')}
                </CardDescription>
              </div>
              <CardContent className="p-6 space-y-6">
                
                {/* Avatar Section */}
                <div className="flex justify-center">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl">
                    {getAvatarDisplay()}
                  </div>
                </div>

                {/* Status Badge */}
                <div className="text-center">
                  <Badge className={`px-4 py-2 text-sm font-medium ${
                    profile.status === 'Active' 
                      ? 'bg-green-100 text-green-800 border-green-200' 
                      : 'bg-red-100 text-red-800 border-red-200'
                  }`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      profile.status === 'Active' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    {profile.status}
                  </Badge>
                </div>

                {/* Quick Stats */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-sm font-medium text-gray-600">{t('pages.admin.profile.overview.userId', 'User ID')}</span>
                    <span className="font-mono text-sm font-bold text-gray-900">#{profile.id}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-sm font-medium text-gray-600">{t('pages.admin.profile.overview.roleLevel', 'Role Level')}</span>
                    <Badge className="bg-purple-100 text-purple-800">
                      <Crown className="w-3 h-3 mr-1" />
                      {t('pages.admin.profile.overview.roleAdmin', 'Admin')}
                    </Badge>
                  </div>
                </div>

                {/* Security Info */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-600" />
                    {t('pages.admin.profile.overview.securityInfo', 'Security Information')}
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{t('pages.admin.profile.overview.nationalId', 'National ID')}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {showSensitiveData ? profile.nationalId : maskData(profile.nationalId)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowSensitiveData(!showSensitiveData)}
                          className="p-1 h-auto"
                        >
                          {showSensitiveData ? (
                            <EyeOff className="w-3 h-3" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Personal Information Card */}
          <div className="xl:col-span-2">
            <Card className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-600 to-orange-600 p-6 text-white">
                <CardTitle className="flex items-center gap-2 text-white">
                  <User className="w-5 h-5" />
                  {t('pages.admin.profile.personal.title', 'Personal Information')}
                </CardTitle>
                <CardDescription className="text-blue-100">
                  {t('pages.admin.profile.personal.description', 'Manage your personal details and contact information')}
                </CardDescription>
              </div>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* First Name */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      {t('pages.admin.profile.personal.firstName', 'First Name')}
                    </label>
                    <div className="relative">
                      <Input
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder={t('pages.admin.profile.personal.placeholders.firstName', 'Enter your first name')}
                        className={`transition-all duration-200 ${
                          isEditing 
                            ? 'border-blue-300 focus:border-blue-500 focus:ring-blue-500' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      />
                      {isEditing && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <User className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Last Name */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      {t('pages.admin.profile.personal.lastName', 'Last Name')}
                    </label>
                    <div className="relative">
                      <Input
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder={t('pages.admin.profile.personal.placeholders.lastName', 'Enter your last name')}
                        className={`transition-all duration-200 ${
                          isEditing 
                            ? 'border-blue-300 focus:border-blue-500 focus:ring-blue-500' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      />
                      {isEditing && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <User className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      {t('pages.admin.profile.personal.email', 'Email Address')}
                    </label>
                    <div className="relative">
                      <Input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder={t('pages.admin.profile.personal.placeholders.email', 'Enter your email')}
                        className={`transition-all duration-200 ${
                          isEditing 
                            ? 'border-blue-300 focus:border-blue-500 focus:ring-blue-500' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      />
                      {isEditing && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <Mail className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      {t('pages.admin.profile.personal.phone', 'Phone Number')}
                    </label>
                    <div className="relative">
                      <Input
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder={t('pages.admin.profile.personal.placeholders.phone', 'Enter your phone number')}
                        className={`transition-all duration-200 ${
                          isEditing 
                            ? 'border-blue-300 focus:border-blue-500 focus:ring-blue-500' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      />
                      {isEditing && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <Phone className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {isEditing && (
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 mt-6 border-t border-gray-200">
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg w-full sm:flex-1"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              {t('pages.admin.profile.actions.saving', 'Saving...')}
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
              {t('pages.admin.profile.actions.save', 'Save Changes')}
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      className="w-full sm:flex-1 border-gray-300 hover:bg-gray-50"
                    >
                      <X className="w-4 h-4 mr-2" />
            {t('common.cancel', 'Cancel')}
                    </Button>
                  </div>
                )}

                {/* Info Footer */}
                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Settings className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">{t('pages.admin.profile.footer.title', 'System Administrator')}</h4>
                      <p className="text-sm text-blue-700">
                        {t('pages.admin.profile.footer.message', 'You have full administrative access to the bus management system. Your profile information is synchronized across all system components.')}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}