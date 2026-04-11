'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { 
  User, 
  Mail, 
  Phone, 
  GraduationCap, 
  Calendar,
  Edit,
  ArrowLeft,
  Shield,
  IdCard,
  Activity,
  Clock
} from 'lucide-react';
import { studentAPI } from '@/lib/api';
import { StudentViewModel } from '@/types/user';
 

export default function ViewStudentPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  const [student, setStudent] = useState<StudentViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto shadow-lg"></div>
          <p className="mt-6 text-text-secondary text-lg font-medium">Loading student details...</p>
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

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'suspended': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Creative Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard/admin/users')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Users
          </Button>
          <div>
              <h1 className="text-3xl font-bold text-text-primary tracking-tight">Student Details</h1>
              <p className="text-text-secondary mt-1">Modern overview with quick insights</p>
          </div>
        </div>
          <div className="flex items-center gap-2">
        <Button 
          onClick={() => router.push(`/dashboard/admin/students/${studentId}/edit`)}
          className="flex items-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit Student
        </Button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border bg-white/70 backdrop-blur p-4 flex items-center gap-3">
            <Activity className="w-5 h-5 text-indigo-600" />
            <div>
              <p className="text-sm text-text-secondary">Account Status</p>
              <p className="font-semibold"><span className="inline-block align-middle"><Badge variant={getStatusColor(student.status)}>{student.status}</Badge></span></p>
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

      {/* Student Profile Card */}
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
            <div className="flex-1">
              <CardTitle className="text-2xl">
                {student.firstName} {student.lastName}
              </CardTitle>
              <p className="text-text-secondary">{student.email}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">
                  <GraduationCap className="w-3 h-3 mr-1" />
                  Student
                </Badge>
                <Badge variant={getStatusColor(student.status)}>
                  <Shield className="w-3 h-3 mr-1" />
                  {student.status}
                </Badge>
                {student.studentAcademicNumber && (
                  <Badge variant="outline" className="font-mono">#{student.studentAcademicNumber}</Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Student Information Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Personal Information */}
        <Card className="xl:col-span-2 rounded-xl border bg-sky-50/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 leading-relaxed">
            {/* Contact Card */}
            <div className="rounded-lg border bg-white/70 p-4 space-y-4">
              <h4 className="text-sm font-semibold text-text-secondary">Contact</h4>
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                <p className="text-text-primary font-semibold tracking-wide">
                {student.firstName} {student.lastName}
              </p>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <p className="text-text-primary">{student.email}</p>
              </div>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <p className="text-text-primary">{student.phoneNumber || 'Not provided'}</p>
                </div>
              </div>
            </div>
            
            {/* Identifiers Card */}
            <div className="rounded-lg border bg-white/70 p-4 space-y-4">
              <h4 className="text-sm font-semibold text-text-secondary">Identifiers</h4>
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">National ID</label>
              <div className="flex items-center gap-2">
                <IdCard className="w-4 h-4 text-gray-500" />
                <p className="text-text-primary font-mono">{student.nationalId || 'Not provided'}</p>
              </div>
            </div>
              <div className="grid grid-cols-2 gap-4">
            <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Student ID</label>
              <p className="text-text-primary font-mono">#{student.id}</p>
            </div>
            <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Profile ID</label>
              <p className="text-text-primary font-mono">#{student.studentProfileId}</p>
                </div>
              </div>
            </div>
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
          <CardContent className="space-y-4 leading-relaxed">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Academic Number</label>
              <p className="text-text-primary font-mono">{student.studentAcademicNumber || 'Not provided'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <p className="text-text-primary">{student.department || 'Not specified'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year of Study</label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <p className="text-text-primary">{student.yearOfStudy || 'Not specified'}</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
              <Badge variant={getStatusColor(student.status)} className="text-sm">
                {student.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button 
          variant="outline" 
          onClick={() => router.push('/dashboard/admin/users')}
        >
          Back to Users List
        </Button>
        <Button 
          onClick={() => router.push(`/dashboard/admin/students/${studentId}/edit`)}
          className="flex items-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit Student
        </Button>
      </div>
    </div>
  );
}
