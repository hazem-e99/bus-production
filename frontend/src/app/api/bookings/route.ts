import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface Booking {
  id: string;
  tripId: string;
  studentId: string;
  stopId: string;
  status: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

interface Trip {
  id: string;
  busId: string;
}

interface User {
  id: string;
  role: string;
}

interface Payment {
  id: string;
  studentId: string;
  status: string;
}

interface Bus {
  id: string;
  capacity: number;
  assignedSupervisorId?: string;
}

interface Route {
  id: string;
  assignedSupervisors?: string[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get('tripId');
    const studentId = searchParams.get('studentId');
    const date = searchParams.get('date');

    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    let bookings = db.bookings || [];

    if (tripId) {
      bookings = bookings.filter((b: Booking) => b.tripId === tripId);
    }
    if (studentId) {
      bookings = bookings.filter((b: Booking) => b.studentId === studentId);
    }
    if (date) {
      bookings = bookings.filter((b: Booking) => b.date === date);
    }

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Error reading bookings data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tripId, studentId, stopId } = body || {};

    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    // Validate required fields
    if (!tripId || !studentId || !stopId) {
      return NextResponse.json({ message: 'tripId, studentId and stopId are required' }, { status: 400 });
    }

    // Validate trip exists
    const trip = (db.trips || []).find((t: Trip) => t.id === tripId);
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Validate student exists and role is student
    const student = (db.users || []).find((u: User) => u.id === studentId && u.role === 'student');
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Subscription check removed - all students can book trips

    // Validate bus capacity and seat availability
    const bus = (db.buses || []).find((b: Bus) => b.id === trip.busId);
    if (!bus) {
      return NextResponse.json({ error: 'Bus not found for trip' }, { status: 409 });
    }
    const capacity = Number(bus.capacity) || 0;

    const existingTripBookings = (db.bookings || []).filter((b: Booking) => b.tripId === tripId);

    // Optional: prevent multiple bookings for same student on same trip
    if (existingTripBookings.some((b: Booking) => b.studentId === studentId)) {
      return NextResponse.json({ message: 'You already have a booking for this trip' }, { status: 409 });
    }

    // Auto seat assignment: ensure capacity not exceeded
    if (existingTripBookings.length >= capacity) {
      return NextResponse.json({ message: 'No seats available' }, { status: 409 });
    }

    // Generate/idempotent booking ID support
    const newBooking = {
      id: body.id && String(body.id).trim() ? String(body.id).trim() : `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tripId,
      studentId,
      stopId,
      status: 'confirmed',
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (!db.bookings) {
      db.bookings = [];
    }
    
    if (db.bookings.some((b: Booking) => b.id === newBooking.id)) {
      return NextResponse.json({ error: 'Booking ID already exists' }, { status: 409 });
    }
    db.bookings.push(newBooking);

    // Update trip passengers count and assignedStudents
    try {
      const tripIndex = (db.trips || []).findIndex((t: Trip) => t.id === tripId);
      if (tripIndex >= 0) {
        const assignedStudents: string[] = Array.isArray(db.trips[tripIndex].assignedStudents)
          ? db.trips[tripIndex].assignedStudents
          : [];
        if (!assignedStudents.includes(studentId)) assignedStudents.push(studentId);
        const passengers = Number(db.trips[tripIndex].passengers || 0) + 1;
        db.trips[tripIndex] = { ...db.trips[tripIndex], assignedStudents, passengers };
      }
    } catch (error) {
      console.error('Error updating trip passengers:', error);
    }
    
    // Send notification to supervisor (bus.assignedSupervisorId -> trip.supervisorId -> route.assignedSupervisors[0])
    try {
      const busForNotification = (db.buses || []).find((b: Bus) => b.id === trip.busId);
      const routeForTrip = (db.routes || []).find((r: Route) => r.id === trip.routeId);
      const supervisorId = busForNotification?.assignedSupervisorId
        || trip?.supervisorId
        || (Array.isArray(routeForTrip?.assignedSupervisors) ? routeForTrip.assignedSupervisors[0] : undefined);
      const stop = Array.isArray(trip?.stops) ? trip.stops.find((s: { id: string; stopName: string; stopTime: string }) => s.id === stopId) : null;

      if (supervisorId) {
        if (!db.notifications) db.notifications = [];
        db.notifications.push({
          id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId: supervisorId,
          senderId: studentId,
          type: 'booking',
          priority: 'medium',
          status: 'unread',
          read: false,
          title: 'حجز جديد في الباص',
          message: `${student.name} حجز في الباص رقم ${(busForNotification?.number ?? '')} على الرحلة ${tripId}${stop ? ` - محطة: ${stop.stopName}${stop.stopTime ? ` (${stop.stopTime})` : ''}` : ''}.`,
          busId: trip.busId,
          tripId: tripId,
          stopId: stopId,
          stopName: stop?.stopName,
          stopTime: stop?.stopTime,
          actionUrl: '/dashboard/supervisor/notifications',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }

    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json(newBooking, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
