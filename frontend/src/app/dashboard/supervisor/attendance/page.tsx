'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { 
  Users, 
  XCircle, 
  Clock, 
  Search,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Download,
  Filter,
  User,
  CreditCard,
  Wallet,
  Smartphone,
  DollarSign,
  CheckCircle
} from 'lucide-react';
import { userAPI, bookingAPI, tripAPI, paymentAPI } from '@/lib/api';

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  studentId: string;
  department: string;
  year: number;
  assignedBusId: string;
  assignedRouteId: string;
  assignedSupervisorId: string;
}

interface Booking {
  id: string;
  studentId: string;
  tripId: string;
  date: string;
  status: string;
  seatNumber: number;
  paymentMethod: string;
  price: number;
}

interface Trip {
  id: string;
  busId: string;
  routeId: string;
  driverId: string;
  date: string;
  status: string;
  startTime: string;
  endTime: string;
  assignedStudents: string[];
  supervisorId: string;
}

interface Payment {
  id: string;
  studentId: string;
  amount: number;
  date: string;
  status: string;
  method: string;
  tripId: string;
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  tripId: string;
  status: 'present' | 'absent' | 'late';
  timestamp: string;
  notes?: string;
}

export default function SupervisorAttendancePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  // Fetch data from global backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        const [studentsData, bookingsData, tripsData, paymentsData] = await Promise.all([
          userAPI.getByRole('student').catch(() => []),
          bookingAPI.getAll().catch(() => []),
          tripAPI.getAll().catch(() => []),
          paymentAPI.getAll().catch(() => [])
        ]);

        setStudents(studentsData || []);
        setBookings(bookingsData || []);
        setTrips(tripsData || []);
        setPayments(paymentsData || []);

        // Generate initial attendance records
        generateInitialAttendanceRecords();
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const generateInitialAttendanceRecords = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = bookings.filter(booking => 
      booking.date === today || booking.date.startsWith(today)
    );

    const records: AttendanceRecord[] = todayBookings.map(booking => ({
      id: `att-${booking.studentId}-${booking.tripId}`,
      studentId: booking.studentId,
      tripId: booking.tripId,
      status: 'present' as const,
      timestamp: new Date().toISOString(),
      notes: ''
    }));

    setAttendanceRecords(records);
  };

  // Get current date data
  const getCurrentDateData = () => {
    const today = new Date().toISOString().split('T')[0];
      return {
      today,
      yesterday: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      weekStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
  };

  // Get filtered data based on date filter
  const getFilteredData = () => {
    const { today, yesterday, weekStart } = getCurrentDateData();
    
    let targetDate: string;
    switch (dateFilter) {
      case 'today':
        targetDate = today;
        break;
      case 'yesterday':
        targetDate = yesterday;
        break;
      case 'week':
        // Get all dates in the week
        const weekDates = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          weekDates.push(date.toISOString().split('T')[0]);
        }
        return bookings.filter(booking => weekDates.includes(booking.date));
      default:
        targetDate = today;
    }

    return bookings.filter(booking => 
      booking.date === targetDate || booking.date.startsWith(targetDate)
    );
  };

  // Get students with bookings for the selected date
  const getStudentsWithBookings = () => {
    const filteredBookings = getFilteredData();
    const studentIds = [...new Set(filteredBookings.map(b => b.studentId))];
    
    return students
      .filter(student => studentIds.includes(student.id))
      .map(student => {
        const studentBookings = filteredBookings.filter(b => b.studentId === student.id);
        const studentPayments = payments.filter(p => 
          studentBookings.some(b => b.tripId === p.tripId)
        );
        
        const attendanceRecord = attendanceRecords.find(ar => 
          ar.studentId === student.id && 
          studentBookings.some(b => b.tripId === ar.tripId)
        );

        return {
          ...student,
          bookings: studentBookings,
          payments: studentPayments,
          attendanceStatus: attendanceRecord?.status || 'absent',
          needsPaymentUpdate: studentBookings.some(b => 
            b.paymentMethod === 'cash' && 
            studentPayments.some(p => 
              p.tripId === b.tripId && p.status === 'pending'
            )
          )
        };
      });
  };

  // Filter students
  const getFilteredStudents = () => {
    let filtered = getStudentsWithBookings();

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(student => student.attendanceStatus === statusFilter);
    }

    // Payment method filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(student =>
        student.bookings.some(booking => booking.paymentMethod === paymentFilter)
      );
    }

    return filtered;
  };

  // Calculate statistics
  const calculateStatistics = () => {
    const filteredStudents = getStudentsWithBookings();
    const totalStudents = filteredStudents.length;
    const presentCount = filteredStudents.filter(s => s.attendanceStatus === 'present').length;
    const absentCount = filteredStudents.filter(s => s.attendanceStatus === 'absent').length;
    const lateCount = filteredStudents.filter(s => s.attendanceStatus === 'late').length;
    const cashPayments = filteredStudents.filter(s => s.needsPaymentUpdate).length;

    return {
      totalStudents,
      presentCount,
      absentCount,
      lateCount,
      cashPayments,
      attendanceRate: totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0
    };
  };

  // Handle attendance change
  const handleAttendanceChange = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendanceRecords(prev => {
      const existing = prev.find(ar => ar.studentId === studentId);
      if (existing) {
        return prev.map(ar => 
          ar.studentId === studentId 
            ? { ...ar, status, timestamp: new Date().toISOString() }
            : ar
        );
      } else {
        // Find the student's booking to get tripId
        const student = getStudentsWithBookings().find(s => s.id === studentId);
        const tripId = student?.bookings[0]?.tripId || '';
        
        return [...prev, {
          id: `att-${studentId}-${tripId}`,
          studentId,
          tripId,
          status,
          timestamp: new Date().toISOString(),
          notes: ''
        }];
      }
    });
  };

  // Handle payment status update
  const handlePaymentUpdate = (studentId: string, tripId: string) => {
    setPayments(prev => 
      prev.map(payment => 
        payment.studentId === studentId && payment.tripId === tripId
          ? { ...payment, status: 'completed' }
          : payment
      )
    );
  };

  // Export attendance data
  const exportAttendance = () => {
    const data = getFilteredStudents().map(student => ({
      StudentID: student.studentId,
      Name: student.name,
      Email: student.email,
      Department: student.department,
      Year: student.year,
      Attendance: student.attendanceStatus,
      PaymentMethod: student.bookings[0]?.paymentMethod || 'N/A',
      PaymentStatus: student.payments[0]?.status || 'N/A',
      SeatNumber: student.bookings[0]?.seatNumber || 'N/A',
      Date: getCurrentDateData().today
    }));

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${getCurrentDateData().today}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const stats = calculateStatistics();
  const filteredStudents = getFilteredStudents();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Attendance</h1>
          <p className="text-gray-600">Track and manage student attendance for bus trips</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={exportAttendance}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="bg-white border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-blue-50 to-blue-100">
            <CardTitle className="text-sm font-medium text-gray-900">Total Students</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalStudents}</div>
            <p className="text-xs text-gray-600">With confirmed bookings</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-green-50 to-green-100">
            <CardTitle className="text-sm font-medium text-gray-900">Present</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{stats.presentCount}</div>
            <p className="text-xs text-green-700">{stats.attendanceRate}% attendance rate</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Absent</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">{stats.absentCount}</div>
            <p className="text-xs text-red-700">Students not present</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-orange-50 to-orange-100">
            <CardTitle className="text-sm font-medium text-gray-900">Late</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.lateCount}</div>
            <p className="text-xs text-gray-600">Students arrived late</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-orange-50 to-orange-100">
            <CardTitle className="text-sm font-medium text-gray-900">Cash Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{stats.cashPayments}</div>
            <p className="text-xs text-purple-700">Pending completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white shadow-sm border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
            </Select>

            <Select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
            </Select>

            <Select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All Payment Methods</option>
              <option value="card">Credit Card</option>
              <option value="cash">Cash</option>
              <option value="vodafone">Vodafone Cash</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card className="bg-white shadow-sm border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-gray-900">Student Attendance</CardTitle>
              <p className="text-sm text-gray-600">
                {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Student</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Details</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Payment</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Attendance</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                  <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-700">
                            {student.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                          <div className="font-medium text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-500">{student.email}</div>
                          <div className="text-xs text-gray-400">ID: {student.studentId}</div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-900">
                        <div>Department: {student.department}</div>
                        <div>Year: {student.year}</div>
                        <div>Seat: {student.bookings[0]?.seatNumber || 'N/A'}</div>
                      </div>
                    </td>
                    
                    <td className="py-4 px-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          {student.bookings[0]?.paymentMethod === 'card' && (
                            <CreditCard className="h-4 w-4 text-blue-600" />
                          )}
                          {student.bookings[0]?.paymentMethod === 'cash' && (
                            <Wallet className="h-4 w-4 text-green-600" />
                          )}
                          {student.bookings[0]?.paymentMethod === 'vodafone' && (
                            <Smartphone className="h-4 w-4 text-purple-600" />
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            {student.bookings[0]?.paymentMethod === 'card' ? 'Credit Card' :
                             student.bookings[0]?.paymentMethod === 'vodafone' ? 'Vodafone Cash' :
                             'Cash'}
                          </span>
                        </div>
                        
                        {student.bookings[0]?.paymentMethod === 'cash' && student.needsPaymentUpdate && (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`payment-${student.id}`}
                              onCheckedChange={() => handlePaymentUpdate(
                                student.id, 
                                student.bookings[0]?.tripId || ''
                              )}
                              className="text-green-600"
                            />
                            <label htmlFor={`payment-${student.id}`} className="text-xs text-gray-600">
                              Mark payment completed
                            </label>
                        </div>
                      )}
                    </div>
                    </td>
                    
                    <td className="py-4 px-4">
                      <Badge 
                        variant={
                          student.attendanceStatus === 'present' ? 'default' :
                          student.attendanceStatus === 'late' ? 'secondary' :
                      'destructive'
                        }
                        className={
                          student.attendanceStatus === 'present' ? 'bg-green-100 text-green-800' :
                          student.attendanceStatus === 'late' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }
                      >
                        {student.attendanceStatus}
                    </Badge>
                    </td>
                    
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                          variant={student.attendanceStatus === 'present' ? 'default' : 'outline'}
                          onClick={() => handleAttendanceChange(student.id, 'present')}
                          className="h-8 px-2 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                          variant={student.attendanceStatus === 'late' ? 'default' : 'outline'}
                          onClick={() => handleAttendanceChange(student.id, 'late')}
                          className="h-8 px-2 bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        <Clock className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                          variant={student.attendanceStatus === 'absent' ? 'default' : 'outline'}
                          onClick={() => handleAttendanceChange(student.id, 'absent')}
                          className="h-8 px-2 bg-red-600 hover:bg-red-700 text-white"
                      >
                        <XCircle className="w-3 h-3" />
                      </Button>
                    </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredStudents.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No students found matching the current filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
