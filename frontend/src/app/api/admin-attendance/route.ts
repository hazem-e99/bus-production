import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface AttendanceRecord {
  id: string;
  status: string;
  date: string;
  tripId: string;
  studentId: string;
  bookingId: string;
  checkInTime?: string;
  checkOutTime?: string;
}

interface Trip {
  id: string;
  routeId: string;
  startTime: string;
  date: string;
  status: string;
  passengers?: number;
}

interface Route {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  status: string;
}

interface Booking {
  id: string;
}

interface EnrichedAttendance extends AttendanceRecord {
  trip?: Trip;
  route?: Route;
  student?: User;
  booking?: Booking;
  metrics: {
    isOnTime: boolean;
    delayMinutes: number;
    timeSpent: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const tripId = searchParams.get('tripId');
    const studentId = searchParams.get('studentId');
    const routeId = searchParams.get('routeId');
    const search = searchParams.get('search');

    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    // Get all data
    const attendance = db.attendance || [];
    const trips = db.trips || [];
    const routes = db.routes || [];
    const users = db.users || [];
    const bookings = db.bookings || [];
    
    // Filter attendance based on parameters
    let filteredAttendance = attendance;
    
    if (status) {
      filteredAttendance = filteredAttendance.filter((record: AttendanceRecord) => record.status === status);
    }
    
    if (date) {
      filteredAttendance = filteredAttendance.filter((record: AttendanceRecord) => record.date === date);
    }
    
    if (tripId) {
      filteredAttendance = filteredAttendance.filter((record: AttendanceRecord) => record.tripId === tripId);
    }
    
    if (studentId) {
      filteredAttendance = filteredAttendance.filter((record: AttendanceRecord) => record.studentId === studentId);
    }
    
    if (routeId) {
      const routeTrips = trips.filter((trip: Trip) => trip.routeId === routeId);
      const routeTripIds = routeTrips.map((trip: Trip) => trip.id);
      filteredAttendance = filteredAttendance.filter((record: AttendanceRecord) => 
        routeTripIds.includes(record.tripId)
      );
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredAttendance = filteredAttendance.filter((record: AttendanceRecord) => {
        const trip = trips.find((t: Trip) => t.id === record.tripId);
        const route = trip ? routes.find((r: Route) => r.id === trip.routeId) : null;
        const student = users.find((u: User) => u.id === record.studentId);
        
        return (
          record.id?.toLowerCase().includes(searchLower) ||
          trip?.id?.toLowerCase().includes(searchLower) ||
          route?.name?.toLowerCase().includes(searchLower) ||
          student?.name?.toLowerCase().includes(searchLower) ||
          student?.studentId?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Enrich attendance data with additional information
    const enrichedAttendance = filteredAttendance.map((record: AttendanceRecord) => {
      const trip = trips.find((t: Trip) => t.id === record.tripId);
      const route = trip ? routes.find((r: Route) => r.id === trip.routeId) : null;
      const student = users.find((u: User) => u.id === record.studentId);
      const booking = bookings.find((b: Booking) => b.id === record.bookingId);
      
      // Calculate attendance metrics
      const isPresent = record.status === 'present';
      const isAbsent = record.status === 'absent';
      const isLate = record.status === 'late';
      
      // Calculate time metrics
      let checkInTime = null;
      let checkOutTime = null;
      let timeSpent = 0;
      let isOnTime = false;
      let delayMinutes = 0;
      
      if (record.checkInTime && trip?.startTime) {
        checkInTime = record.checkInTime;
        const scheduledTime = new Date(`2000-01-01T${trip.startTime}`);
        const actualTime = new Date(`2000-01-01T${record.checkInTime}`);
        delayMinutes = Math.max(0, (actualTime.getTime() - scheduledTime.getTime()) / (1000 * 60));
        isOnTime = delayMinutes <= 5; // 5 minutes grace period
      }
      
      if (record.checkOutTime && record.checkInTime) {
        checkOutTime = record.checkOutTime;
        const checkIn = new Date(`2000-01-01T${record.checkInTime}`);
        const checkOut = new Date(`2000-01-01T${record.checkOutTime}`);
        timeSpent = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60); // in minutes
      }
      
      // Calculate trip details
      let tripDetails = null;
      if (trip) {
        const tripDate = new Date(trip.date);
        const today = new Date();
        const isUpcoming = tripDate > today;
        const isToday = tripDate.toDateString() === today.toDateString();
        const isPast = tripDate < today;
        
        tripDetails = {
          id: trip.id,
          date: trip.date,
          startTime: trip.startTime,
          endTime: trip.endTime,
          status: trip.status,
          isUpcoming,
          isToday,
          isPast,
          passengers: trip.passengers || 0
        };
      }
      
      // Calculate route details
      let routeDetails = null;
      if (route) {
        routeDetails = {
          id: route.id,
          name: route.name,
          startPoint: route.startPoint,
          endPoint: route.endPoint,
          distance: route.distance,
          estimatedDuration: route.estimatedDuration
        };
      }
      
      // Calculate student details
      let studentDetails = null;
      if (student) {
        studentDetails = {
          id: student.id,
          name: student.name,
          email: student.email,
          phone: student.phone,
          studentId: student.studentId,
          role: student.role
        };
      }
      
      // Calculate booking details
      let bookingDetails = null;
      if (booking) {
        bookingDetails = {
          id: booking.id,
          status: booking.status,
          date: booking.date,
          confirmed: booking.status === 'confirmed'
        };
      }

      return {
        ...record,
        trip: tripDetails,
        route: routeDetails,
        student: studentDetails,
        booking: bookingDetails,
        metrics: {
          isPresent,
          isAbsent,
          isLate,
          isOnTime,
          delayMinutes: Math.round(delayMinutes * 100) / 100,
          timeSpent: Math.round(timeSpent * 100) / 100,
          checkInTime,
          checkOutTime
        }
      };
    });

    // Sort attendance by date (newest first)
    enrichedAttendance.sort((a: EnrichedAttendance, b: EnrichedAttendance) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate attendance summary
    const totalRecords = enrichedAttendance.length;
    const presentRecords = enrichedAttendance.filter((record: EnrichedAttendance) => record.status === 'present').length;
    const absentRecords = enrichedAttendance.filter((record: EnrichedAttendance) => record.status === 'absent').length;
    const lateRecords = enrichedAttendance.filter((record: EnrichedAttendance) => record.status === 'late').length;
    const onTimeRecords = enrichedAttendance.filter((record: EnrichedAttendance) => record.metrics.isOnTime).length;
    
    const attendanceRate = totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 0;
    const absenceRate = totalRecords > 0 ? (absentRecords / totalRecords) * 100 : 0;
    const lateRate = totalRecords > 0 ? (lateRecords / totalRecords) * 100 : 0;
    const onTimeRate = totalRecords > 0 ? (onTimeRecords / totalRecords) * 100 : 0;
    
    const totalDelayMinutes = enrichedAttendance
      .filter((record: EnrichedAttendance) => record.metrics.delayMinutes > 0)
      .reduce((sum: number, record: EnrichedAttendance) => sum + record.metrics.delayMinutes, 0);
    
    const averageDelayMinutes = enrichedAttendance.filter((record: EnrichedAttendance) => record.metrics.delayMinutes > 0).length > 0 ? 
      totalDelayMinutes / enrichedAttendance.filter((record: EnrichedAttendance) => record.metrics.delayMinutes > 0).length : 0;
    
    const totalTimeSpent = enrichedAttendance
      .filter((record: EnrichedAttendance) => record.metrics.timeSpent > 0)
      .reduce((sum: number, record: EnrichedAttendance) => sum + record.metrics.timeSpent, 0);
    
    const averageTimeSpent = enrichedAttendance.filter((record: EnrichedAttendance) => record.metrics.timeSpent > 0).length > 0 ? 
      totalTimeSpent / enrichedAttendance.filter((record: EnrichedAttendance) => record.metrics.timeSpent > 0).length : 0;

    const summary = {
      totalRecords,
      presentRecords,
      absentRecords,
      lateRecords,
      onTimeRecords,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      absenceRate: Math.round(absenceRate * 100) / 100,
      lateRate: Math.round(lateRate * 100) / 100,
      onTimeRate: Math.round(onTimeRate * 100) / 100,
      averageDelayMinutes: Math.round(averageDelayMinutes * 100) / 100,
      averageTimeSpent: Math.round(averageTimeSpent * 100) / 100
    };

    return NextResponse.json({
      attendance: enrichedAttendance,
      summary
    });
  } catch (error) {
    console.error('Error fetching attendance data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    // Generate new attendance record ID
    const newRecord = {
      id: `attendance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...body,
      status: body.status || 'present',
      date: body.date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (!db.attendance) {
      db.attendance = [];
    }
    
    db.attendance.push(newRecord);
    
    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json(newRecord, { status: 201 });
  } catch (error) {
    console.error('Error creating attendance record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
