import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface Booking {
  id: string;
  studentId: string;
  status: string;
  date: string;
}

interface Payment {
  id: string;
  studentId: string;
  amount: number;
  status: string;
  method: string;
  date: string;
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

    // Get student payments
    const studentPayments = db.payments?.filter((payment: Payment) => 
      payment.studentId === studentId
    ) || [];

    // Calculate statistics
    const totalBookings = studentBookings.length;
    const activeBookings = studentBookings.filter((booking: Booking) => 
      ['confirmed', 'pending'].includes(booking.status)
    ).length;
    const completedBookings = studentBookings.filter((booking: Booking) => 
      booking.status === 'completed'
    ).length;

    const totalPayments = studentPayments.reduce((sum: number, payment: Payment) => 
      sum + (payment.amount || 0), 0
    );
    const completedPayments = studentPayments.filter((payment: Payment) => 
      payment.status === 'completed'
    ).reduce((sum: number, payment: Payment) => sum + (payment.amount || 0), 0);
    const pendingPayments = studentPayments.filter((payment: Payment) => 
      payment.status === 'pending'
    ).reduce((sum: number, payment: Payment) => sum + (payment.amount || 0), 0);

    // Get monthly booking trends for charts
    const monthlyBookings: Record<string, number> = {};
    const monthlyPayments: Record<string, number> = {};
    
    studentBookings.forEach((booking: Booking) => {
      const month = new Date(booking.date).toISOString().slice(0, 7); // YYYY-MM
      monthlyBookings[month] = (monthlyBookings[month] || 0) + 1;
    });

    studentPayments.forEach((payment: Payment) => {
      const month = new Date(payment.date).toISOString().slice(0, 7); // YYYY-MM
      monthlyPayments[month] = (monthlyPayments[month] || 0) + (payment.amount || 0);
    });

    // Get payment methods distribution
    const paymentMethods: Record<string, number> = {};
    studentPayments.forEach((payment: Payment) => {
      const method = payment.method || 'unknown';
      paymentMethods[method] = (paymentMethods[method] || 0) + 1;
    });

    // Get booking status distribution
    const bookingStatuses: Record<string, number> = {};
    studentBookings.forEach((booking: Booking) => {
      const status = booking.status || 'unknown';
      bookingStatuses[status] = (bookingStatuses[status] || 0) + 1;
    });

    const stats = {
      totalBookings,
      activeBookings,
      completedBookings,
      totalPayments,
      completedPayments,
      pendingPayments,
      monthlyBookings,
      monthlyPayments,
      paymentMethods,
      bookingStatuses
    };

    return NextResponse.json(stats);
  } catch {
    console.error('Error fetching student stats:', Error);
    return NextResponse.json(
      { error: 'Failed to fetch student statistics' },
      { status: 500 }
    );
  }
}
