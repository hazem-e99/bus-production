import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface Booking {
  id: string;
  studentId: string;
  tripId: string;
  status: string;
}

interface Trip {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

const dbPath = path.join(process.cwd(), 'db.json');

// GET - Get student's current reservations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const dbData = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbData);

    // Get student's current reservations (active and pending)
    const currentReservations = db.bookings?.filter((booking: Booking) => 
      booking.studentId === studentId && 
      ['active', 'pending', 'confirmed'].includes(booking.status)
    ) || [];

    // Add trip details to each reservation
    const reservationsWithDetails = currentReservations.map((reservation: Booking) => {
      const trip = db.trips?.find((t: Trip) => t.id === reservation.tripId);
      return {
        ...reservation,
        trip: trip || null
      };
    });

    return NextResponse.json(reservationsWithDetails);
  } catch {
    console.error('Error reading reservations:', Error);
    return NextResponse.json({ error: 'Failed to read reservations' }, { status: 500 });
  }
}
