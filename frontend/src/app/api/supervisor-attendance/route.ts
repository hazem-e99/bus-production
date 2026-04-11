import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface Trip {
  id: string;
  supervisorId: string;
  routeId: string;
  busId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface User {
  id: string;
  name: string;
  studentId: string;
  department: string;
  year: string;
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
}

interface AttendanceRecord {
  id: string;
  tripId: string;
  studentId: string;
  status: string;
  timestamp: string;
  trip?: any;
  route?: any;
  bus?: any;
  student?: any;
}

interface TripAttendanceData {
  trip: any;
  route: any;
  bus: any;
  records: AttendanceRecord[];
  summary: {
    total: number;
    present: number;
    absent: number;
    rate: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supervisorId = searchParams.get('supervisorId');
    const tripId = searchParams.get('tripId');
    const date = searchParams.get('date');

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

    // Filter by date if provided
    if (date) {
      supervisorTrips = supervisorTrips.filter((trip: Trip) => trip.date === date);
    }

    // Filter by specific trip if provided
    if (tripId) {
      supervisorTrips = supervisorTrips.filter((trip: Trip) => trip.id === tripId);
    }

    // Get trip IDs for attendance lookup
    const tripIds = supervisorTrips.map((trip: Trip) => trip.id);

    // Get attendance records for these trips
    const attendanceRecords = db.attendance?.filter((record: AttendanceRecord) => 
      tripIds.includes(record.tripId)
    ) || [];

    // Enrich attendance records with additional information
    const enrichedAttendance = attendanceRecords.map((record: AttendanceRecord) => {
      const trip = db.trips?.find((t: Trip) => t.id === record.tripId);
      const student = db.users?.find((u: User) => u.id === record.studentId);
      const route = trip ? db.routes?.find((r: Route) => r.id === trip.routeId) : null;
      const bus = trip ? db.buses?.find((b: Bus) => b.id === trip.busId) : null;

      return {
        ...record,
        trip: trip ? {
          id: trip.id,
          date: trip.date,
          startTime: trip.startTime,
          endTime: trip.endTime,
          status: trip.status
        } : null,
        student: student ? {
          id: student.id,
          name: student.name,
          studentId: student.studentId,
          department: student.department,
          year: student.year
        } : null,
        route: route ? {
          id: route.id,
          name: route.name,
          startPoint: route.startPoint,
          endPoint: route.endPoint
        } : null,
        bus: bus ? {
          id: bus.id,
          number: bus.number
        } : null
      };
    });

    // Calculate summary statistics
    const totalRecords = enrichedAttendance.length;
    const presentStudents = enrichedAttendance.filter((record: AttendanceRecord) => 
      record.status === 'present'
    ).length;
    const absentStudents = enrichedAttendance.filter((record: AttendanceRecord) => 
      record.status === 'absent'
    ).length;
    const attendanceRate = totalRecords > 0 ? (presentStudents / totalRecords) * 100 : 0;

    // Group by trip for better organization
    const attendanceByTrip: Record<string, TripAttendanceData> = {};
    enrichedAttendance.forEach((record: AttendanceRecord) => {
      const tripId = record.tripId;
      if (!attendanceByTrip[tripId]) {
        attendanceByTrip[tripId] = {
          trip: record.trip,
          route: record.route,
          bus: record.bus,
          records: [],
          summary: {
            total: 0,
            present: 0,
            absent: 0,
            rate: 0
          }
        };
      }
      
      attendanceByTrip[tripId].records.push(record);
      attendanceByTrip[tripId].summary.total += 1;
      if (record.status === 'present') {
        attendanceByTrip[tripId].summary.present += 1;
      } else if (record.status === 'absent') {
        attendanceByTrip[tripId].summary.absent += 1;
      }
    });

    // Calculate rate for each trip
    Object.values(attendanceByTrip).forEach((tripData) => {
      tripData.summary.rate = tripData.summary.total > 0 ? 
        (tripData.summary.present / tripData.summary.total) * 100 : 0;
    });

    const response = {
      supervisorId,
      summary: {
        totalRecords,
        presentStudents,
        absentStudents,
        attendanceRate: Math.round(attendanceRate * 100) / 100
      },
      attendanceByTrip,
      allRecords: enrichedAttendance
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching supervisor attendance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supervisor attendance' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, tripId, status, timestamp, notes } = body;

    if (!studentId || !tripId || !status || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    // Verify the trip belongs to the supervisor
    const trip = db.trips?.find((t: Trip) => t.id === tripId);
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Check if attendance record already exists
    const existingRecordIndex = db.attendance?.findIndex((record: AttendanceRecord) => 
      record.studentId === studentId && record.tripId === tripId
    ) || -1;

    let attendanceRecord;
    if (existingRecordIndex >= 0) {
      // Update existing record
      db.attendance[existingRecordIndex] = {
        ...db.attendance[existingRecordIndex],
        status,
        notes: notes || db.attendance[existingRecordIndex].notes,
        updatedAt: new Date().toISOString()
      };
      attendanceRecord = db.attendance[existingRecordIndex];
    } else {
      // Create new record
      attendanceRecord = {
        id: `attendance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        studentId,
        tripId,
        status,
        timestamp,
        notes: notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (!db.attendance) {
        db.attendance = [];
      }
      db.attendance.push(attendanceRecord);
    }

    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));

    return NextResponse.json(attendanceRecord, { status: 201 });
  } catch {
    console.error('Error creating/updating attendance record:', Error);
    return NextResponse.json(
      { error: 'Failed to create/update attendance record' },
      { status: 500 }
    );
  }
}
