import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface AttendanceRecord {
  id: string;
  studentId: string;
  tripId: string;
  status: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    const record = (db.attendance || []).find((a: AttendanceRecord) => a.id === id);

    if (!record) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch {
    console.error('Error fetching attendance record:', Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    const index = (db.attendance || []).findIndex((a: AttendanceRecord) => a.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }

    db.attendance[index] = {
      ...db.attendance[index],
      ...body,
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    return NextResponse.json(db.attendance[index]);
  } catch {
    console.error('Error updating attendance record:', Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
