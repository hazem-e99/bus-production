import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import * as path from 'path';

interface Booking {
  id: string;
  studentId: string;
  tripId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: Context
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    
    // Validate id parameter
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid booking ID' },
        { status: 400 }
      );
    }
    
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent) as { bookings?: Booking[] };
    
    const booking = (db.bookings || []).find((booking: Booking) => booking.id === id);
    
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(booking);
  } catch (error: unknown) {
    console.error('Error reading booking data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: Context
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    
    // Validate id parameter
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid booking ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json() as Partial<Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>>;
    
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent) as { bookings?: Booking[] };
    
    // Ensure bookings array exists
    if (!db.bookings) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    const bookingIndex = db.bookings.findIndex((booking: Booking) => booking.id === id);
    if (bookingIndex === -1) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    // Update only the provided fields
    db.bookings[bookingIndex] = {
      ...db.bookings[bookingIndex],
      ...body,
      updatedAt: new Date().toISOString()
    };
    
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json(db.bookings[bookingIndex]);
  } catch (error: unknown) {
    console.error('Error updating booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: Context
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    
    // Validate id parameter
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid booking ID' },
        { status: 400 }
      );
    }
    
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent) as { bookings?: Booking[] };
    
    // Ensure bookings array exists
    if (!db.bookings) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    const bookingIndex = db.bookings.findIndex((booking: Booking) => booking.id === id);
    if (bookingIndex === -1) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    db.bookings.splice(bookingIndex, 1);
    
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json({ message: 'Booking deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
