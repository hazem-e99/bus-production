'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { 
  User, 
  Mail, 
  Phone, 
  
  Save, 
  Edit3, 
  X,
  Shield,
  GraduationCap,
  
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Upload,
  Eye,
  EyeOff,
  BookOpen,
  Calendar
} from 'lucide-react';
import { userAPI } from '@/lib/api';
import { useI18n } from '@/contexts/LanguageContext';
import { toBackendAssetUrl } from '@/lib/backend-url';

// Department and Year of Study options (same as registration page)
const departments = [
  'Medicine', 'Dentistry', 'Pharmacy', 'VeterinaryMedicine', 'Nursing',
  'CivilEngineering', 'MechanicalEngineering', 'ElectricalEngineering', 'ComputerEngineering', 'ChemicalEngineering',
  'Architecture', 'ComputerScience', 'InformationTechnology', 'SoftwareEngineering', 'DataScience',
  'BusinessAdministration', 'Accounting', 'Finance', 'Marketing', 'Economics', 'Management',
  'Law', 'ArabicLanguageAndLiterature', 'EnglishLanguageAndLiterature', 'History', 'Philosophy',
  'Geography', 'PoliticalScience', 'Psychology', 'Sociology', 'SocialWork', 'InternationalRelations',
  'Physics', 'Chemistry', 'Biology', 'Mathematics', 'Agriculture', 'AgriculturalEngineering',
  'Education', 'FineArts', 'Music', 'GraphicDesign', 'MassCommunication', 'Journalism',
  'PhysicalEducation', 'TourismAndHotels'
];

// Academic Year enum options
const ACADEMIC_YEAR_OPTIONS = [
  'PreparatoryYear', 'FirstYear', 'SecondYear', 'ThirdYear', 'FourthYear', 'FifthYear', 'SixthYear', 'SeventhYear',
  'MastersFirstYear', 'MastersSecondYear', 'MastersThirdYear',
  'PhDFirstYear', 'PhDSecondYear', 'PhDThirdYear', 'PhDFourthYear', 'PhDFifthYear', 'PhDSixthYear',
  'ResidencyFirstYear', 'ResidencySecondYear', 'ResidencyThirdYear', 'ResidencyFourthYear', 'ResidencyFifthYear',
  'FellowshipFirstYear', 'FellowshipSecondYear',
  'ExchangeStudent', 'VisitingStudent', 'NonDegreeStudent', 'ContinuingEducation',
  'DiplomaFirstYear', 'DiplomaSecondYear', 'DiplomaThirdYear',
  'ProfessionalFirstYear', 'ProfessionalSecondYear', 'ProfessionalThirdYear', 'ProfessionalFourthYear',
  'RepeatYear', 'ThesisWriting', 'DissertationWriting'
];

interface StudentProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  nationalId: string;
  profilePictureUrl: string;
  status: string;
  role: string;
  studentProfileId?: number;
  studentAcademicNumber?: string;
  department?: string;
  yearOfStudy?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

export default function StudentProfilePage() {
  const { t, lang } = useI18n() as any;
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    department: '',
    yearOfStudy: '',
    emergencyContact: '',
    emergencyPhone: ''
  });

  // Fetch profile data from /api/Users/profile
  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Fetching student profile from /api/Users/profile...');
      
      const response = await userAPI.getCurrentUserProfile();
      console.log('📊 Student data loaded:', response);
      
      if (response) {
        const profileData: StudentProfile = {
          id: parseInt(response.id) || 0,
          firstName: response.firstName || '',
          lastName: response.lastName || '',
          email: response.email || '',
          phoneNumber: response.phoneNumber || '',
          nationalId: response.nationalId || '',
          profilePictureUrl: response.profilePictureUrl || '/avatar-placeholder.svg',
          status: response.status || 'Active',
          role: response.role || 'Student',
          studentProfileId: parseInt(response.id) || 0, // Use user ID as studentUserId
          studentAcademicNumber: '', // Will be filled when user updates
          department: '', // Will be filled when user updates
          yearOfStudy: response.academicYear || String(response.yearOfStudy || ''),
          emergencyContact: '', // Will be filled when user updates
          emergencyPhone: '' // Will be filled when user updates
        };
        
        setProfile(profileData);
        setFormData({
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          email: profileData.email,
          phoneNumber: profileData.phoneNumber,
          department: profileData.department || '',
          yearOfStudy: String(profileData.yearOfStudy || ''),
          emergencyContact: profileData.emergencyContact || '',
          emergencyPhone: profileData.emergencyPhone || ''
        });
        
        setLastRefresh(new Date());
        console.log('✅ Student profile loaded successfully');
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
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      
      // Prepare data for API - only send non-empty fields
      const apiData: any = {};
      
      if (formData.firstName.trim()) {
        apiData.firstName = formData.firstName.trim();
      }
      if (formData.lastName.trim()) {
        apiData.lastName = formData.lastName.trim();
      }
      if (formData.email.trim()) {
        apiData.email = formData.email.trim();
      }
      if (formData.phoneNumber.trim()) {
        apiData.phoneNumber = formData.phoneNumber.trim();
      }
      if (formData.department.trim()) {
        apiData.department = formData.department.trim();
      }
      if (formData.yearOfStudy && formData.yearOfStudy.trim()) {
        // Backend expects a numeric yearOfStudy per Swagger example; map enum to index if needed
        const idx = ACADEMIC_YEAR_OPTIONS.indexOf(formData.yearOfStudy.trim());
        apiData.yearOfStudy = idx >= 0 ? idx + 1 : Number(formData.yearOfStudy);
      }
      if (formData.emergencyContact.trim()) {
        apiData.emergencyContact = formData.emergencyContact.trim();
      }
      if (formData.emergencyPhone.trim()) {
        apiData.emergencyPhone = formData.emergencyPhone.trim();
      }

      // Check if at least one field is provided
      if (Object.keys(apiData).length === 0) {
        alert(t('pages.student.profile.alerts.fillOne', 'Please fill in at least one field to update.'));
        return;
      }

      // Validate name lengths
      if (apiData.firstName && (apiData.firstName.length < 2 || apiData.firstName.length > 50)) {
        alert(t('pages.student.profile.alerts.firstNameLength', 'First name must be between 2 and 50 characters.'));
        return;
      }

      if (apiData.lastName && (apiData.lastName.length < 2 || apiData.lastName.length > 50)) {
        alert(t('pages.student.profile.alerts.lastNameLength', 'Last name must be between 2 and 50 characters.'));
        return;
      }

      // Validate email format
      if (apiData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(apiData.email)) {
        alert(t('pages.student.profile.alerts.invalidEmail', 'Please enter a valid email address.'));
        return;
      }

      // Validate year of study is one of the enum options
      if (formData.yearOfStudy && !ACADEMIC_YEAR_OPTIONS.includes(formData.yearOfStudy)) {
        alert(t('pages.student.profile.alerts.yearRange', 'Please select a valid academic year.'));
        return;
      }

      // Validate department
      if (apiData.department && !departments.includes(apiData.department)) {
        alert(t('pages.student.profile.alerts.invalidDepartment', 'Please select a valid department.'));
        return;
      }

      // Validate emergency contact length
      if (apiData.emergencyContact && apiData.emergencyContact.length > 100) {
        alert(t('pages.student.profile.alerts.emergencyContactLength', 'Emergency contact name must not exceed 100 characters.'));
        return;
      }

      // Validate emergency phone length
      if (apiData.emergencyPhone && apiData.emergencyPhone.length > 20) {
        alert(t('pages.student.profile.alerts.emergencyPhoneLength', 'Emergency phone number must not exceed 20 characters.'));
        return;
      }

      console.log('💾 Saving student profile to /api/Users/student-profile...');
      console.log('📤 Data being sent:', apiData);
      
      const response = await userAPI.updateStudentProfile(apiData);
      
      if (response) {
        setIsEditing(false);
        await fetchProfile();
        setLastRefresh(new Date());
        
        // Dispatch events to update other components
        window.dispatchEvent(new StorageEvent('storage'));
        window.dispatchEvent(new CustomEvent('profileUpdated'));
        
  alert(t('pages.student.profile.alerts.updateSuccess', 'Student profile updated successfully!'));
      }
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      
      // Provide more specific error messages
      if (error?.response?.status === 400) {
  alert(t('pages.student.profile.alerts.invalidData', 'Invalid data provided. Please check your input and try again.'));
      } else if (error?.response?.status === 401) {
  alert(t('pages.student.profile.alerts.unauthorized', 'You are not authorized to perform this action.'));
      } else if (error?.response?.status === 403) {
  alert(t('pages.student.profile.alerts.forbidden', 'Access denied. You do not have permission to update this profile.'));
      } else {
  alert(t('pages.student.profile.alerts.updateFailed', 'Failed to update profile. Please try again.'));
      }
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
        phoneNumber: profile.phoneNumber,
        department: profile.department || '',
        yearOfStudy: String(profile.yearOfStudy || 1),
        emergencyContact: profile.emergencyContact || '',
        emergencyPhone: profile.emergencyPhone || ''
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
      alert(t('pages.student.profile.alerts.selectImage', 'Please select an image file.'));
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert(t('pages.student.profile.alerts.imageTooLarge', 'Image size should not exceed 5MB.'));
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
        
        alert(t('pages.student.profile.alerts.photoSuccess', 'Profile picture updated successfully!'));
      }
    } catch (error) {
      console.error('Failed to update profile picture:', error);
      alert(t('pages.student.profile.alerts.photoFailed', 'Failed to update profile picture. Please try again.'));
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
        <Image
          src={imageError ? '/logo2.png' : buildImageUrl(profile.profilePictureUrl)}
          alt="Profile"
          fill
          sizes="(max-width: 1024px) 80px, 128px"
          className="object-cover rounded-full"
          onError={() => setImageError(true)}
          priority
        />
      );
    }
    return (
      <div className="w-full h-full bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 rounded-full flex items-center justify-center">
        <GraduationCap className="w-12 h-12 text-white" />
      </div>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('pages.student.profile.notFoundTitle', 'Profile Not Found')}</h1>
          <p className="text-gray-600 mb-6">{t('pages.student.profile.notFoundDesc', 'Unable to load profile information.')}</p>
          <Button onClick={fetchProfile} className="bg-green-600 hover:bg-green-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('common.tryAgain', 'Try Again')}
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
              <div className="w-20 h-20 rounded-full overflow-hidden relative border-4 border-white shadow-lg bg-gradient-to-br from-orange-500 to-orange-600">
                {getAvatarDisplay()}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {profile.firstName} {profile.lastName}
                  </h1>
                  <Badge className="bg-orange-500 text-white border-orange-600">
                    <GraduationCap className="w-3 h-3 mr-1" />
                    {t('roles.student', 'Student')}
                  </Badge>
                </div>
                <p className="text-gray-600 text-lg">{t('pages.student.profile.subtitle', 'Student Profile')}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {t(`common.status.${(profile.status || '').toLowerCase()}` as any, profile.status)}
                  </span>
                  <span>•</span>
                  <span>
                    {t('pages.student.profile.lastUpdated', 'Last updated')}: {lastRefresh.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                  </span>
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
                {isUploadingImage ? t('pages.student.profile.uploading', 'Uploading...') : t('pages.student.profile.changePhoto', 'Change Photo')}
              </Button>
              <Button
                onClick={() => setIsEditing(!isEditing)}
                className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white shadow-lg w-full sm:w-auto"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {isEditing ? t('pages.student.profile.cancelEdit', 'Cancel Edit') : t('pages.student.profile.editProfile', 'Edit Profile')}
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
                  <BookOpen className="w-5 h-5" />
                  {t('pages.student.profile.overviewTitle', 'Student Overview')}
                </CardTitle>
                <CardDescription className="text-green-100">
                  {t('pages.student.profile.overviewDesc', 'Your academic profile summary')}
                </CardDescription>
              </div>
              <CardContent className="p-6 space-y-6">
                
                {/* Avatar Section */}
                <div className="flex justify-center">
                  <div className="w-32 h-32 rounded-full overflow-hidden relative border-4 border-white shadow-xl">
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
                    {t(`common.status.${(profile.status || '').toLowerCase()}` as any, profile.status)}
                  </Badge>
                </div>

                {/* Quick Stats */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-sm font-medium text-gray-600">{t('pages.student.profile.studentId', 'Student ID')}</span>
                    <span className="font-mono text-sm font-bold text-gray-900">#{profile.id}</span>
                  </div>
                  
                  {profile.studentAcademicNumber && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm font-medium text-gray-600">{t('pages.student.profile.academicNumber', 'Academic Number')}</span>
                      <span className="font-mono text-sm font-bold text-gray-900">{profile.studentAcademicNumber}</span>
                    </div>
                  )}
                  
                  {profile.department && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm font-medium text-gray-600">{t('pages.student.profile.department', 'Department')}</span>
                      <span className="text-sm font-bold text-gray-900">{profile.department}</span>
                    </div>
                  )}
                  
                  {profile.yearOfStudy && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <span className="text-sm font-medium text-gray-600">{t('pages.student.profile.yearOfStudy', 'Year of Study')}</span>
                      <Badge className="bg-blue-100 text-blue-800">
                        {profile.yearOfStudy}
                      </Badge>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-sm font-medium text-gray-600">{t('pages.student.profile.academicStatus', 'Academic Status')}</span>
                    <Badge className="bg-green-100 text-green-800">
                      <GraduationCap className="w-3 h-3 mr-1" />
                      {t('roles.student', 'Student')}
                    </Badge>
                  </div>
                </div>

                {/* Security Info */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    {t('pages.student.profile.securityInfo', 'Security Information')}
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{t('pages.student.profile.nationalId', 'National ID')}</span>
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

                {/* Emergency Information */}
                {(profile.emergencyContact || profile.emergencyPhone) && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      {t('pages.student.profile.emergencyInfo', 'Emergency Information')}
                    </h4>
                    <div className="space-y-2">
                      {profile.emergencyContact && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{t('pages.student.profile.emergencyContact', 'Emergency Contact')}</span>
                          <span className="text-sm font-medium text-gray-900">{profile.emergencyContact}</span>
                        </div>
                      )}
                      {profile.emergencyPhone && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{t('pages.student.profile.emergencyPhone', 'Emergency Phone')}</span>
                          <span className="font-mono text-sm font-medium text-gray-900">{profile.emergencyPhone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Personal Information Card */}
          <div className="xl:col-span-2">
            <Card className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-600 to-orange-600 p-6 text-white">
                <CardTitle className="flex items-center gap-2 text-white">
                  <User className="w-5 h-5" />
                  {t('pages.student.profile.personalInfo', 'Personal Information')}
                </CardTitle>
                <CardDescription className="text-emerald-100">
                  {t('pages.student.profile.personalInfoDesc', 'Manage your personal details and contact information')}
                </CardDescription>
              </div>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* First Name */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      {t('pages.student.profile.firstName', 'First Name')}
                    </label>
                    <div className="relative">
                      <Input
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder={t('pages.student.profile.firstNamePlaceholder', 'Enter your first name')}
                        className={`transition-all duration-200 ${
                          isEditing 
                            ? 'border-green-300 focus:border-green-500 focus:ring-green-500' 
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
                      {t('pages.student.profile.lastName', 'Last Name')}
                    </label>
                    <div className="relative">
                      <Input
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder={t('pages.student.profile.lastNamePlaceholder', 'Enter your last name')}
                        className={`transition-all duration-200 ${
                          isEditing 
                            ? 'border-green-300 focus:border-green-500 focus:ring-green-500' 
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
                      {t('pages.student.profile.email', 'Email Address')}
                    </label>
                    <div className="relative">
                      <Input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder={t('pages.student.profile.emailPlaceholder', 'Enter your email')}
                        className={`transition-all duration-200 ${
                          isEditing 
                            ? 'border-green-300 focus:border-green-500 focus:ring-green-500' 
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
                      {t('pages.student.profile.phone', 'Phone Number')}
                    </label>
                    <div className="relative">
                      <Input
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder={t('pages.student.profile.phonePlaceholder', 'Enter your phone number')}
                        className={`transition-all duration-200 ${
                          isEditing 
                            ? 'border-green-300 focus:border-green-500 focus:ring-green-500' 
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

                  {/* Department */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      {t('pages.student.profile.department', 'Department')}
                    </label>
                    <div className="relative">
                      <Select
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`transition-all duration-200 ${
                          isEditing 
                            ? 'border-green-300 focus:border-green-500 focus:ring-green-500' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <option value="">{t('pages.student.profile.selectDepartment', 'Select Department')}</option>
                        {departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </Select>
                      {isEditing && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <BookOpen className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Year of Study (Academic Year enum) */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      {t('pages.student.profile.yearOfStudy', 'Year of Study')}
                    </label>
                    <div className="relative">
                      <Select
                        name="yearOfStudy"
                        value={formData.yearOfStudy}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={`transition-all duration-200 ${
                          isEditing 
                            ? 'border-green-300 focus:border-green-500 focus:ring-green-500' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <option value="">{t('pages.student.profile.yearPlaceholder', 'Select academic year')}</option>
                        {ACADEMIC_YEAR_OPTIONS.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </Select>
                      {isEditing && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <Calendar className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      {t('pages.student.profile.emergencyContact', 'Emergency Contact')}
                    </label>
                    <div className="relative">
                      <Input
                        name="emergencyContact"
                        value={formData.emergencyContact}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder={t('pages.student.profile.emergencyContactPlaceholder', 'Enter emergency contact name')}
                        className={`transition-all duration-200 ${
                          isEditing 
                            ? 'border-green-300 focus:border-green-500 focus:ring-green-500' 
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

                  {/* Emergency Phone */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      {t('pages.student.profile.emergencyPhone', 'Emergency Phone')}
                    </label>
                    <div className="relative">
                      <Input
                        name="emergencyPhone"
                        value={formData.emergencyPhone}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder={t('pages.student.profile.emergencyPhonePlaceholder', 'Enter emergency phone number')}
                        className={`transition-all duration-200 ${
                          isEditing 
                            ? 'border-green-300 focus:border-green-500 focus:ring-green-500' 
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
                      className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white shadow-lg w-full sm:flex-1"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          {t('common.saving', 'Saving...')}
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          {t('common.saveChanges', 'Save Changes')}
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
                <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <GraduationCap className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-green-900 mb-1">{t('pages.student.profile.footerTitle', 'Student Account')}</h4>
                      <p className="text-sm text-green-700">
                        {t('pages.student.profile.footerDesc', 'You have access to view and book bus trips, manage your profile, and track your travel history. Keep your information updated for better service.')}
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