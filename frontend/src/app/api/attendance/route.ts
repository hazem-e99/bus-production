import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface AttendanceRecord {
  id: string;
  tripId: string;
  studentId: string;
  status: string;
  timestamp: string;
  notes?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get('tripId');
    const studentId = searchParams.get('studentId');
    const timestamp = searchParams.get('timestamp_like');

    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    let attendanceRecords = db.attendance || [];

    // Filter by tripId if provided
    if (tripId) {
      attendanceRecords = attendanceRecords.filter((record: AttendanceRecord) => record.tripId === tripId);
    }

    // Filter by studentId if provided
    if (studentId) {
      attendanceRecords = attendanceRecords.filter((record: AttendanceRecord) => record.studentId === studentId);
    }

    // Filter by timestamp if provided
    if (timestamp) {
      attendanceRecords = attendanceRecords.filter((record: AttendanceRecord) => 
        record.timestamp.includes(timestamp)
      );
    }

    return NextResponse.json(attendanceRecords);
  } catch {
    console.error('Error fetching attendance records:', Error);
    return NextResponse.json(
      { error: 'Internal server error' },
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

    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    const newAttendanceRecord = {
      id: `attendance-${Date.now()}`,
      studentId,
      tripId,
      status,
      timestamp,
      notes: notes || ''
    };

    if (!db.attendance) {
      db.attendance = [];
    }

    db.attendance.push(newAttendanceRecord);

    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));

    return NextResponse.json(newAttendanceRecord, { status: 201 });
  } catch {
    console.error('Error creating attendance record:', Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Attendance record ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, notes } = body;

    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    const recordIndex = db.attendance.findIndex((record: AttendanceRecord) => record.id === id);
    if (recordIndex === -1) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      );
    }

    // Update the record
    if (status !== undefined) db.attendance[recordIndex].status = status;
    if (notes !== undefined) db.attendance[recordIndex].notes = notes;

    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));

    return NextResponse.json(db.attendance[recordIndex]);
  } catch {
    console.error('Error updating attendance record:', Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

