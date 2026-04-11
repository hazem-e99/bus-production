import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface Bus {
  id: string;
  assignedSupervisorId: string;
}

interface Trip {
  id: string;
  busId: string;
}

interface Booking {
  id: string;
  tripId: string;
  studentId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { supervisorId, busId, message } = body || {};
    if (!supervisorId || !message) {
      return NextResponse.json({ error: 'supervisorId and message are required' }, { status: 400 });
    }

    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    // Determine bus by busId or by supervisor assignment
    let targetBusId = busId;
    if (!targetBusId) {
      const bus = (db.buses || []).find((b: Bus) => b.assignedSupervisorId === supervisorId);
      targetBusId = bus?.id;
    }
    if (!targetBusId) {
      return NextResponse.json({ error: 'No bus assigned to this supervisor' }, { status: 404 });
    }

    // Find students booked on this bus's trips (today and upcoming)
    const trips = (db.trips || []).filter((t: Trip) => t.busId === targetBusId);
    const tripIds = new Set(trips.map((t: Trip) => t.id));
    const bookings = (db.bookings || []).filter((b: Booking) => tripIds.has(b.tripId));
    const studentIds = Array.from(new Set(bookings.map((b: Booking) => b.studentId)));

    if (!db.notifications) db.notifications = [];
    const createdAt = new Date().toISOString();
    for (const studentId of studentIds) {
      db.notifications.push({
        id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: studentId,
        senderId: supervisorId,
        type: 'alert',
        priority: 'high',
        status: 'unread',
        title: 'Bus Update',
        message,
        createdAt,
        updatedAt: createdAt,
      });
    }

    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    return NextResponse.json({ success: true, notified: studentIds.length });
  } catch (error) {
    console.error('Error broadcasting message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


