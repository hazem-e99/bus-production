import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { autoCompleteTrips } from '@/lib/tripStatus';

interface User {
  id: string;
  role: string;
  name: string;
  email: string;
  phone: string;
}

interface Trip {
  id: string;
  driverId: string;
  routeId: string;
  busId: string;
  supervisorId: string;
  status: string;
  date: string;
  startTime: string;
  endTime: string;
  passengers: number;
  bookings?: {
    total: number;
    confirmed: number;
    pending: number;
    cancelled: number;
    list: any[];
  };
  payments?: {
    total: number;
    completed: number;
    pending: number;
    failed: number;
    totalRevenue: number;
  };
  metrics?: {
    tripDuration: number;
    utilizationRate: number;
    revenuePerPassenger: number;
  };
  attendance?: {
    total: number;
    present: number;
    absent: number;
    rate: number;
  };
}

interface Route {
  id: string;
  name: string;
  startPoint: string;
  endPoint: string;
  distance: number;
  estimatedDuration: number;
}

interface Bus {
  id: string;
  number: string;
  model: string;
  capacity: number;
  status: string;
}

interface Booking {
  id: string;
  tripId: string;
  studentId: string;
  status: string;
  date?: string;
}

interface Payment {
  id: string;
  tripId: string;
  status: string;
  amount: number;
}

interface AttendanceRecord {
  id: string;
  tripId: string;
  status: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    if (!driverId) {
      return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 });
    }

    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    // Auto-complete trips whose end time has passed
    const changed = autoCompleteTrips(db);
    if (changed) {
      await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    }

    // Verify driver exists
    const driver = db.users?.find((user: User) => 
      user.id.toString() === driverId && user.role === 'driver'
    );

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    // Get driver's trips
    let driverTrips = db.trips?.filter((trip: Trip) => trip.driverId === driverId) || [];

    // Filter by status if provided
    if (status) {
      driverTrips = driverTrips.filter((trip: Trip) => trip.status === status);
    }

    // Filter by date if provided
    if (date) {
      driverTrips = driverTrips.filter((trip: Trip) => trip.date === date);
    }

    // Enrich trips with additional information
    const enrichedTrips = driverTrips.map((trip: Trip) => {
      const route = db.routes?.find((r: Route) => r.id === trip.routeId);
      const bus = db.buses?.find((b: Bus) => b.id === trip.busId);
      const supervisor = db.users?.find((u: User) => u.id === trip.supervisorId);
      
      const tripBookings = db.bookings?.filter((b: Booking) => b.tripId === trip.id) || [];
      const tripPayments = db.payments?.filter((p: Payment) => p.tripId === trip.id) || [];
      const tripAttendance = db.attendance?.filter((a: AttendanceRecord) => a.tripId === trip.id) || [];

      const totalRevenue = tripPayments
        .filter((p: Payment) => p.status === 'completed')
        .reduce((sum: number, p: Payment) => sum + (p.amount || 0), 0);

      const confirmedBookings = tripBookings.filter((b: Booking) => b.status === 'confirmed');
      const pendingBookings = tripBookings.filter((b: Booking) => b.status === 'pending');
      const cancelledBookings = tripBookings.filter((b: Booking) => b.status === 'cancelled');

      const presentStudents = tripAttendance.filter((a: AttendanceRecord) => a.status === 'present').length;
      const absentStudents = tripAttendance.filter((a: AttendanceRecord) => a.status === 'absent').length;
      const attendanceRate = tripAttendance.length > 0 ? (presentStudents / tripAttendance.length) * 100 : 0;

      // Calculate trip duration
      let tripDuration = 0;
      if (trip.startTime && trip.endTime) {
        const start = new Date(`2000-01-01T${trip.startTime}`);
        const end = new Date(`2000-01-01T${trip.endTime}`);
        tripDuration = (end.getTime() - start.getTime()) / (1000 * 60); // in minutes
      }

      // Calculate utilization rate
      const utilizationRate = bus && bus.capacity ? 
        ((trip.passengers || 0) / bus.capacity) * 100 : 0;

      return {
        ...trip,
        route: route ? {
          id: route.id,
          name: route.name,
          startPoint: route.startPoint,
          endPoint: route.endPoint,
          distance: route.distance,
          estimatedDuration: route.estimatedDuration
        } : null,
        bus: bus ? {
          id: bus.id,
          number: bus.number,
          model: bus.model,
          capacity: bus.capacity,
          status: bus.status
        } : null,
        supervisor: supervisor ? {
          id: supervisor.id,
          name: supervisor.name,
          phone: supervisor.phone
        } : null,
        bookings: {
          total: tripBookings.length,
          confirmed: confirmedBookings.length,
          pending: pendingBookings.length,
          cancelled: cancelledBookings.length,
          list: tripBookings.map((booking: Booking) => {
            const student = db.users?.find((u: User) => u.id === booking.studentId);
            return {
              id: booking.id,
              status: booking.status,
              date: booking.date,
              student: student ? {
                id: student.id,
                name: student.name,
                studentId: student.studentId
              } : null
            };
          })
        },
        payments: {
          total: tripPayments.length,
          completed: tripPayments.filter((p: Payment) => p.status === 'completed').length,
          pending: tripPayments.filter((p: Payment) => p.status === 'pending').length,
          failed: tripPayments.filter((p: Payment) => p.status === 'failed').length,
          totalRevenue
        },
        attendance: {
          total: tripAttendance.length,
          present: presentStudents,
          absent: absentStudents,
          rate: Math.round(attendanceRate * 100) / 100
        },
        metrics: {
          tripDuration: Math.round(tripDuration * 100) / 100,
          utilizationRate: Math.round(utilizationRate * 100) / 100,
          revenuePerPassenger: trip.passengers > 0 ? totalRevenue / trip.passengers : 0
        }
      };
    });

    // Sort trips by date (newest first)
    enrichedTrips.sort((a: Trip, b: Trip) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate summary statistics
    const totalTrips = enrichedTrips.length;
    const completedTrips = enrichedTrips.filter((trip: Trip) => trip.status === 'completed').length;
    const activeTrips = enrichedTrips.filter((trip: Trip) => trip.status === 'active').length;
    const scheduledTrips = enrichedTrips.filter((trip: Trip) => trip.status === 'scheduled').length;
    const cancelledTrips = enrichedTrips.filter((trip: Trip) => trip.status === 'cancelled').length;

    const totalBookings = enrichedTrips.reduce((sum: number, trip: Trip) => sum + trip.bookings.total, 0);
    const totalRevenue = enrichedTrips.reduce((sum: number, trip: Trip) => sum + trip.payments.totalRevenue, 0);
    const totalPassengers = enrichedTrips.reduce((sum: number, trip: Trip) => sum + (trip.passengers || 0), 0);

    const averageUtilization = enrichedTrips.length > 0 ? 
      enrichedTrips.reduce((sum: number, trip: Trip) => sum + trip.metrics.utilizationRate, 0) / enrichedTrips.length : 0;

    const averageAttendanceRate = enrichedTrips.length > 0 ? 
      enrichedTrips.reduce((sum: number, trip: Trip) => sum + trip.attendance.rate, 0) / enrichedTrips.length : 0;

    const summary = {
      totalTrips,
      completedTrips,
      activeTrips,
      scheduledTrips,
      cancelledTrips,
      completionRate: totalTrips > 0 ? (completedTrips / totalTrips) * 100 : 0,
      totalBookings,
      totalRevenue,
      totalPassengers,
      averageUtilization: Math.round(averageUtilization * 100) / 100,
      averageAttendanceRate: Math.round(averageAttendanceRate * 100) / 100
    };

    return NextResponse.json({
      driver: {
        id: driver.id,
        name: driver.name,
        licenseNumber: driver.licenseNumber
      },
      trips: enrichedTrips,
      summary
    });
  } catch (error) {
    console.error('Error fetching driver trips:', error);
    return NextResponse.json(
      { error: 'Failed to fetch driver trips' },
      { status: 500 }
    );
  }
}
