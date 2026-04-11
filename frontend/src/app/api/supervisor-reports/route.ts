import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface Trip {
  id: string;
  supervisorId: string;
  routeId: string;
  busId: string;
  date: string;
  status: string;
  passengers: number;
}

interface AttendanceRecord {
  id: string;
  tripId: string;
  status: string;
}

interface Payment {
  id: string;
  tripId: string;
  status: string;
  amount: number;
}

interface Route {
  id: string;
  name: string;
  startPoint: string;
  endPoint: string;
}

interface Bus {
  id: string;
  number: string;
  capacity: number;
}

interface MonthlyStats {
  trips: number;
  passengers: number;
  revenue: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supervisorId = searchParams.get('supervisorId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!supervisorId) {
      return NextResponse.json({ error: 'Supervisor ID is required' }, { status: 400 });
    }

    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    // Get supervisor trips
    let supervisorTrips = db.trips?.filter((trip: Trip) => 
      trip.supervisorId === supervisorId
    ) || [];

    // Filter by date range if provided
    if (startDate && endDate) {
      supervisorTrips = supervisorTrips.filter((trip: Trip) => 
        trip.date >= startDate && trip.date <= endDate
      );
    }

    // Get attendance records for these trips
    const tripIds = supervisorTrips.map((trip: Trip) => trip.id);
    const attendanceRecords = db.attendance?.filter((record: AttendanceRecord) => 
      tripIds.includes(record.tripId)
    ) || [];

    // Get payments for these trips
    const payments = db.payments?.filter((payment: Payment) => 
      tripIds.includes(payment.tripId)
    ) || [];

    // Calculate report statistics
    const totalTrips = supervisorTrips.length;
    const completedTrips = supervisorTrips.filter((trip: Trip) => trip.status === 'completed').length;
    const activeTrips = supervisorTrips.filter((trip: Trip) => trip.status === 'active').length;
    const cancelledTrips = supervisorTrips.filter((trip: Trip) => trip.status === 'cancelled').length;

    const totalPassengers = supervisorTrips.reduce((sum: number, trip: Trip) => 
      sum + (trip.passengers || 0), 0
    );

    const totalRevenue = payments
      .filter((p: Payment) => p.status === 'completed')
      .reduce((sum: number, p: Payment) => sum + (p.amount || 0), 0);

    const totalAttendance = attendanceRecords.length;
    const presentStudents = attendanceRecords.filter((record: AttendanceRecord) => 
      record.status === 'present'
    ).length;
    const absentStudents = attendanceRecords.filter((record: AttendanceRecord) => 
      record.status === 'absent'
    ).length;

    // Get monthly statistics
    const monthlyStats: Record<string, MonthlyStats> = {};
    supervisorTrips.forEach((trip: Trip) => {
      const month = new Date(trip.date).toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyStats[month]) {
        monthlyStats[month] = {
          trips: 0,
          passengers: 0,
          revenue: 0
        };
      }
      monthlyStats[month].trips += 1;
      monthlyStats[month].passengers += trip.passengers || 0;
    });

    // Add revenue to monthly stats
    payments.forEach((payment: Payment) => {
      if (payment.status === 'completed') {
        const trip = supervisorTrips.find((t: Trip) => t.id === payment.tripId);
        if (trip) {
          const month = new Date(trip.date).toISOString().slice(0, 7);
          if (monthlyStats[month]) {
            monthlyStats[month].revenue += payment.amount || 0;
          }
        }
      }
    });

    // Convert monthly stats to array format
    const monthlyStatsArray = Object.entries(monthlyStats).map(([month, stats]: [string, MonthlyStats]) => ({
      month,
      ...stats
    }));

    const report = {
      supervisorId,
      period: {
        startDate: startDate || 'all',
        endDate: endDate || 'all'
      },
      summary: {
        totalTrips,
        completedTrips,
        activeTrips,
        cancelledTrips,
        totalPassengers,
        totalRevenue,
        totalAttendance,
        presentStudents,
        absentStudents,
        attendanceRate: totalAttendance > 0 ? (presentStudents / totalAttendance) * 100 : 0
      },
      monthlyStats: monthlyStatsArray,
      trips: supervisorTrips.map((trip: Trip) => {
        const route = db.routes?.find((r: Route) => r.id === trip.routeId);
        const bus = db.buses?.find((b: Bus) => b.id === trip.busId);
        const tripPayments = payments.filter((p: Payment) => p.tripId === trip.id);
        const tripAttendance = attendanceRecords.filter((a: AttendanceRecord) => a.tripId === trip.id);
        
        return {
          ...trip,
          route: route ? {
            id: route.id,
            name: route.name,
            startPoint: route.startPoint,
            endPoint: route.endPoint
          } : null,
          bus: bus ? {
            id: bus.id,
            number: bus.number,
            capacity: bus.capacity
          } : null,
          revenue: tripPayments
            .filter((p: Payment) => p.status === 'completed')
            .reduce((sum: number, p: Payment) => sum + (p.amount || 0), 0),
          attendance: {
            total: tripAttendance.length,
            present: tripAttendance.filter((a: AttendanceRecord) => a.status === 'present').length,
            absent: tripAttendance.filter((a: AttendanceRecord) => a.status === 'absent').length
          }
        };
      })
    };

    return NextResponse.json(report);
  } catch {
    console.error('Error generating supervisor report:', Error);
    return NextResponse.json(
      { error: 'Failed to generate supervisor report' },
      { status: 500 }
    );
  }
}
