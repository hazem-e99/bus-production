import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface Payment {
  id: string;
  studentId: string;
  bookingId: string;
  amount: number;
  status: string;
  method: string;
  date: string;
}

interface Booking {
  id: string;
  tripId: string;
  date: string;
  status: string;
}

interface Trip {
  id: string;
  routeId: string;
  date: string;
  startTime: string;
  endTime: string;
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

    // Get student payments
    const studentPayments = db.payments?.filter((payment: Payment) => 
      payment.studentId === studentId
    ) || [];

    // Enrich payments with booking information
    const enrichedPayments = studentPayments.map((payment: Payment) => {
      const booking = db.bookings?.find((b: Booking) => b.id === payment.bookingId);
      const trip = booking ? db.trips?.find((t: Trip) => t.id === booking.tripId) : null;
      const route = trip ? db.routes?.find((r: Route) => r.id === trip.routeId) : null;
      
      return {
        ...payment,
        booking: booking ? {
          id: booking.id,
          date: booking.date,
          status: booking.status
        } : null,
        trip: trip ? {
          id: trip.id,
          date: trip.date,
          startTime: trip.startTime,
          endTime: trip.endTime
        } : null,
        route: route ? {
          id: route.id,
          name: route.name,
          startPoint: route.startPoint,
          endPoint: route.endPoint
        } : null
      };
    });

    return NextResponse.json(enrichedPayments);
  } catch {
    console.error('Error fetching student payments:', Error);
    return NextResponse.json(
      { error: 'Failed to fetch student payments' },
      { status: 500 }
    );
  }
}
