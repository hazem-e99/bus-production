'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { 
  User, 
  Save, 
  ArrowLeft,
  GraduationCap,
  
  Activity,
  Clock
} from 'lucide-react';
import { studentAPI } from '@/lib/api';
import { StudentViewModel } from '@/types/user';
import { validateStudentEdit } from '@/utils/validateStudentRegistration';

interface StudentEditData {
  firstName: string;
  lastName: string;
  nationalId: string;
  email: string;
  phoneNumber: string;
  studentAcademicNumber: string;
  department: string;
  yearOfStudy: string;
}

export default function EditStudentPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  const [student, setStudent] = useState<StudentViewModel | null>(null);
  const [formData, setFormData] = useState<StudentEditData>({
    firstName: '',
    lastName: '',
    nationalId: '',
    email: '',
    phoneNumber: '',
    studentAcademicNumber: '',
    department: '',
    yearOfStudy: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { showToast } = useToast();

  // Department options from Swagger schema
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

  // Academic year options from Swagger schema
  const yearsOfStudy = [
    'PreparatoryYear', 'FirstYear', 'SecondYear', 'ThirdYear', 'FourthYear',
    'FifthYear', 'SixthYear', 'SeventhYear',
    'MastersFirstYear', 'MastersSecondYear', 'MastersThirdYear',
    'PhDFirstYear', 'PhDSecondYear', 'PhDThirdYear', 'PhDFourthYear', 'PhDFifthYear', 'PhDSixthYear',
    'ResidencyFirstYear', 'ResidencySecondYear', 'ResidencyThirdYear', 'ResidencyFourthYear', 'ResidencyFifthYear',
    'FellowshipFirstYear', 'FellowshipSecondYear',
    'ExchangeStudent', 'VisitingStudent', 'NonDegreeStudent', 'ContinuingEducation',
    'DiplomaFirstYear', 'DiplomaSecondYear', 'DiplomaThirdYear',
    'ProfessionalFirstYear', 'ProfessionalSecondYear', 'ProfessionalThirdYear', 'ProfessionalFourthYear',
    'RepeatYear', 'ThesisWriting', 'DissertationWriting'
  ];

  // Fetch student data
  useEffect(() => {
    const fetchStudent = async () => {
      try {
        setIsLoading(true);
        const studentData = await studentAPI.getById(studentId);
        
        if (!studentData) {
          showToast({
            type: 'error',
            title: 'Student Not Found',
            message: 'The requested student could not be found.'
          });
          router.push('/dashboard/admin/users');
          return;
        }
        
        setStudent(studentData);
        
        // Populate form with student data
        setFormData({
          firstName: studentData.firstName || '',
          lastName: studentData.lastName || '',
          nationalId: studentData.nationalId || '',
          email: studentData.email || '',
          phoneNumber: studentData.phoneNumber || '',
          studentAcademicNumber: studentData.studentAcademicNumber || '',
          department: studentData.department || '',
          yearOfStudy: studentData.yearOfStudy || ''
        });
      } catch (error) {
        console.error('Failed to fetch student:', error);
        showToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to load student data. Please try again.'
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (studentId) {
      fetchStudent();
    }
  }, [studentId, router, showToast]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    
    // Validate form data (excluding password for edit)
    const validation = validateStudentEdit(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: validation.errors.join(', ')
      });
      return;
    }

    setIsSaving(true);
    try {
      // Note: The backend doesn't have a specific student update endpoint
      // We'll need to use the registration endpoint or handle this differently
      showToast({
        type: 'info',
        title: 'Update Not Available',
        message: 'Student update functionality is not available in the current API. Please contact the administrator.'
      });
      
      // For now, just show success message and redirect
      // In a real implementation, you would call the appropriate update API
      
    } catch (error) {
      console.error('Failed to update student:', error);
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update student information. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof StudentEditData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto shadow-lg"></div>
          <p className="mt-6 text-text-secondary text-lg font-medium">Loading student data...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">Student Not Found</h2>
        <p className="text-text-secondary mb-6">The requested student could not be found.</p>
        <Button onClick={() => router.push('/dashboard/admin/users')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Users
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Creative Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => router.push(`/dashboard/admin/students/${studentId}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Student
          </Button>
          <div>
              <h1 className="text-3xl font-bold text-text-primary tracking-tight">Edit Student</h1>
            <p className="text-text-secondary mt-1">Update student information</p>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border bg-white/70 backdrop-blur p-4 flex items-center gap-3">
            <Activity className="w-5 h-5 text-indigo-600" />
            <div>
              <p className="text-sm text-text-secondary">Account Status</p>
              <p className="font-semibold">{student.status}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-white/70 backdrop-blur p-4 flex items-center gap-3">
            <GraduationCap className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-sm text-text-secondary">Department</p>
              <p className="font-semibold">{student.department || '—'}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-white/70 backdrop-blur p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-text-secondary">Year of Study</p>
              <p className="font-semibold">{student.yearOfStudy || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Student Info Header */}
      <Card className="rounded-2xl border bg-white shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gray-100 ring-1 ring-black/5 flex items-center justify-center overflow-hidden shadow-sm relative">
                {student.profilePictureUrl ? (
                  <Image
                    src={student.profilePictureUrl}
                    alt={`${student.firstName} ${student.lastName}`}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-gray-500" />
                )}
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl">
                {student.firstName} {student.lastName}
              </CardTitle>
              <p className="text-text-secondary">{student.email}</p>
              <p className="text-sm text-text-muted">Student ID: #{student.id}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Edit Form */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Personal Information */}
        <Card className="xl:col-span-2 rounded-xl border bg-sky-50/60">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Information
            </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">First Name *</label>
                  <Input 
                    type="text" 
                    value={formData.firstName} 
                    onChange={(e) => handleInputChange('firstName', e.target.value)} 
                    placeholder="Enter first name"
                    required 
                    minLength={2}
                    maxLength={20}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Last Name *</label>
                  <Input 
                    type="text" 
                    value={formData.lastName} 
                    onChange={(e) => handleInputChange('lastName', e.target.value)} 
                    placeholder="Enter last name"
                    required 
                    minLength={2}
                    maxLength={20}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Phone Number *</label>
                  <Input 
                    type="tel" 
                    value={formData.phoneNumber} 
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)} 
                    placeholder="Enter phone number"
                    required 
                    pattern="^01[0-2,5]{1}[0-9]{8}$"
                    inputMode="tel"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">National ID *</label>
                  <Input 
                    type="text" 
                    value={formData.nationalId} 
                    onChange={(e) => handleInputChange('nationalId', e.target.value.replace(/[^0-9]/g, '').slice(0, 14))} 
                    placeholder="Enter national ID"
                    required 
                    pattern="^[0-9]{14}$"
                    maxLength={14}
                    inputMode="numeric"
                    title="National ID must be exactly 14 digits"
                  />
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

            {/* Academic Information */}
        <Card className="rounded-xl border bg-emerald-50/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Academic Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Email *</label>
                  <Input 
                    type="email" 
                    value={formData.email} 
                    onChange={(e) => handleInputChange('email', e.target.value)} 
                    placeholder="Enter university email"
                    required 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Student Academic Number *</label>
                  <Input 
                    type="text" 
                    value={formData.studentAcademicNumber} 
                    onChange={(e) => handleInputChange('studentAcademicNumber', e.target.value)} 
                    placeholder="Enter student academic number"
                    required 
                    maxLength={20}
                  />
              </div>
              
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Department *</label>
                  <Select 
                    value={formData.department} 
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Year of Study *</label>
                  <Select 
                    value={formData.yearOfStudy} 
                    onChange={(e) => handleInputChange('yearOfStudy', e.target.value)}
                    required
                  >
                    <option value="">Select Year of Study</option>
                    {yearsOfStudy.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </Select>
                </div>
              </div>
          </CardContent>
        </Card>
            </div>

            {/* Validation Errors */}
            {errors.length > 0 && (
        <Card className="rounded-xl border bg-red-50">
          <CardContent className="p-4">
                <h4 className="text-red-800 font-medium mb-2">Please fix the following errors:</h4>
                <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
          </CardContent>
        </Card>
            )}

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/dashboard/admin/students/${studentId}`)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
    </div>
  );
}
