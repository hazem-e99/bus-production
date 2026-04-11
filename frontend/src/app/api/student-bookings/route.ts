import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface Booking {
  id: string;
  studentId: string;
  tripId: string;
  status: string;
  date: string;
}

interface Trip {
  id: string;
  routeId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface Route {
  id: string;
  name: string;
  startPoint: string;
  endPoint: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    // Get student bookings
    const studentBookings = db.bookings?.filter((booking: Booking) => 
      booking.studentId === studentId
    ) || [];

    // Enrich bookings with trip and route information
    const enrichedBookings = studentBookings.map((booking: Booking) => {
      const trip = db.trips?.find((t: Trip) => t.id === booking.tripId);
      const route = trip ? db.routes?.find((r: Route) => r.id === trip.routeId) : null;
      
      return {
        ...booking,
        trip: trip ? {
          id: trip.id,
          date: trip.date,
          startTime: trip.startTime,
          endTime: trip.endTime,
          status: trip.status
        } : null,
        route: route ? {
          id: route.id,
          name: route.name,
          startPoint: route.startPoint,
          endPoint: route.endPoint
        } : null
      };
    });

    return NextResponse.json(enrichedBookings);
  } catch {
    console.error('Error fetching student bookings:', Error);
    return NextResponse.json(
      { error: 'Failed to fetch student bookings' },
      { status: 500 }
    );
  }
}
