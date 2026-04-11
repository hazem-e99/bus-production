import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  studentId?: string;
  department?: string;
  year?: string;
}

interface Booking {
  id: string;
  status: string;
  date: string;
  tripId: string;
  studentId: string;
}

interface EnrichedBooking extends Booking {
  trip: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    isUpcoming: boolean;
    isToday: boolean;
    isPast: boolean;
    passengers: number;
  } | null;
  route: {
    id: string;
    name: string;
    startPoint: string;
    endPoint: string;
    distance: number;
    estimatedDuration: number;
  } | null;
  student: {
    id: string;
    name: string;
    email: string;
    studentId: string;
    department: string;
    year: string;
  } | null;
  payment: {
    id: string;
    status: string;
    amount: number;
    date: string;
    method: string;
  } | null;
  metadata: {
    ageInDays: number;
    paymentStatus: string;
    paymentAmount: number;
    paymentDate: string | null;
    isConfirmed: boolean;
    isPending: boolean;
    isCancelled: boolean;
    isUpcoming: boolean;
    isToday: boolean;
    isPast: boolean;
  };
}

interface Trip {
  id: string;
  routeId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  passengers: number;
}

interface Route {
  id: string;
  name: string;
  startPoint: string;
  endPoint: string;
  distance: number;
  estimatedDuration: number;
}

interface Payment {
  id: string;
  status: string;
  amount: number;
  date: string;
  method: string;
  bookingId: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const tripId = searchParams.get('tripId');
    const studentId = searchParams.get('studentId');
    const routeId = searchParams.get('routeId');
    const search = searchParams.get('search');

    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    // Get all data
    const bookings = db.bookings || [];
    const trips = db.trips || [];
    const routes = db.routes || [];
    const users = db.users || [];
    const payments = db.payments || [];
    
    // Filter bookings based on parameters
    let filteredBookings = bookings;
    
    if (status) {
      filteredBookings = filteredBookings.filter((booking: Booking) => booking.status === status);
    }
    
    if (date) {
      filteredBookings = filteredBookings.filter((booking: Booking) => booking.date === date);
    }
    
    if (tripId) {
      filteredBookings = filteredBookings.filter((booking: Booking) => booking.tripId === tripId);
    }
    
    if (studentId) {
      filteredBookings = filteredBookings.filter((booking: Booking) => booking.studentId === studentId);
    }
    
    if (routeId) {
      const routeTrips = trips.filter((trip: Trip) => trip.routeId === routeId);
      const routeTripIds = routeTrips.map((trip: Trip) => trip.id);
      filteredBookings = filteredBookings.filter((booking: Booking) => 
        routeTripIds.includes(booking.tripId)
      );
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredBookings = filteredBookings.filter((booking: Booking) => {
        const trip = trips.find((t: Trip) => t.id === booking.tripId);
        const route = trip ? routes.find((r: Route) => r.id === trip.routeId) : null;
        const student = users.find((u: User) => u.id === booking.studentId);
        
        return (
          booking.id?.toLowerCase().includes(searchLower) ||
          trip?.id?.toLowerCase().includes(searchLower) ||
          route?.name?.toLowerCase().includes(searchLower) ||
          student?.name?.toLowerCase().includes(searchLower) ||
          student?.studentId?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Enrich booking data with additional information
    const enrichedBookings = filteredBookings.map((booking: Booking) => {
      const trip = trips.find((t: Trip) => t.id === booking.tripId);
      const route = trip ? routes.find((r: Route) => r.id === trip.routeId) : null;
      const student = users.find((u: User) => u.id === booking.studentId);
      const payment = payments.find((p: Payment) => p.bookingId === booking.id);
      
      // Calculate booking age
      const bookingDate = new Date(booking.date);
      const today = new Date();
      const ageInDays = Math.floor((today.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate payment status
      let paymentStatus = 'unpaid';
      let paymentAmount = 0;
      let paymentDate = null;
      
      if (payment) {
        paymentStatus = payment.status;
        paymentAmount = payment.amount || 0;
        paymentDate = payment.date;
      }
      
      // Calculate trip details
      let tripDetails = null;
      if (trip) {
        const tripDate = new Date(trip.date);
        const isUpcoming = tripDate > today;
        const isToday = tripDate.toDateString() === today.toDateString();
        const isPast = tripDate < today;
        
        tripDetails = {
          id: trip.id,
          date: trip.date,
          startTime: trip.startTime,
          endTime: trip.endTime,
          status: trip.status,
          isUpcoming,
          isToday,
          isPast,
          passengers: trip.passengers || 0
        };
      }
      
      // Calculate route details
      let routeDetails = null;
      if (route) {
        routeDetails = {
          id: route.id,
          name: route.name,
          startPoint: route.startPoint,
          endPoint: route.endPoint,
          distance: route.distance,
          estimatedDuration: route.estimatedDuration
        };
      }
      
      // Calculate student details
      let studentDetails = null;
      if (student) {
        studentDetails = {
          id: student.id,
          name: student.name,
          email: student.email,
          phone: student.phone,
          studentId: student.studentId,
          role: student.role
        };
      }

      return {
        ...booking,
        trip: tripDetails,
        route: routeDetails,
        student: studentDetails,
        payment: {
          status: paymentStatus,
          amount: paymentAmount,
          date: paymentDate,
          id: payment?.id || null
        },
        metadata: {
          ageInDays,
          isConfirmed: booking.status === 'confirmed',
          isPending: booking.status === 'pending',
          isCancelled: booking.status === 'cancelled',
          isUpcoming: tripDetails?.isUpcoming || false,
          isToday: tripDetails?.isToday || false,
          isPast: tripDetails?.isPast || false
        }
      };
    });

    // Sort bookings by date (newest first)
    enrichedBookings.sort((a: EnrichedBooking, b: EnrichedBooking) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate bookings summary
    const totalBookings = enrichedBookings.length;
    const confirmedBookings = enrichedBookings.filter((booking: EnrichedBooking) => booking.status === 'confirmed').length;
    const pendingBookings = enrichedBookings.filter((booking: EnrichedBooking) => booking.status === 'pending').length;
    const cancelledBookings = enrichedBookings.filter((booking: EnrichedBooking) => booking.status === 'cancelled').length;
    const completedBookings = enrichedBookings.filter((booking: EnrichedBooking) => booking.status === 'completed').length;

    const totalRevenue = enrichedBookings
      .filter((booking: EnrichedBooking) => booking.payment?.status === 'completed')
      .reduce((sum: number, booking: EnrichedBooking) => sum + (booking.payment?.amount || 0), 0);
    
    const pendingRevenue = enrichedBookings
      .filter((booking: EnrichedBooking) => booking.payment?.status === 'pending')
      .reduce((sum: number, booking: EnrichedBooking) => sum + (booking.payment?.amount || 0), 0);
    
    const unpaidBookings = enrichedBookings.filter((booking: EnrichedBooking) => booking.payment?.status === 'unpaid').length;
    const paidBookings = enrichedBookings.filter((booking: EnrichedBooking) => booking.payment?.status === 'completed').length;
    
    const upcomingBookings = enrichedBookings.filter((booking: EnrichedBooking) => booking.metadata.isUpcoming).length;
    const todayBookings = enrichedBookings.filter((booking: EnrichedBooking) => booking.metadata.isToday).length;
    const pastBookings = enrichedBookings.filter((booking: EnrichedBooking) => booking.metadata.isPast).length;

    const confirmationRate = totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0;
    const paymentRate = totalBookings > 0 ? (paidBookings / totalBookings) * 100 : 0;
    const cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;

    const summary = {
      totalBookings,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      completedBookings,
      confirmationRate: Math.round(confirmationRate * 100) / 100,
      paymentRate: Math.round(paymentRate * 100) / 100,
      cancellationRate: Math.round(cancellationRate * 100) / 100,
      totalRevenue,
      pendingRevenue,
      unpaidBookings,
      paidBookings,
      upcomingBookings,
      todayBookings,
      pastBookings
    };

    return NextResponse.json({
      bookings: enrichedBookings,
      summary
    });
     } catch (error) {
     console.error('Error fetching bookings data:', error);
     return NextResponse.json(
       { error: 'Internal server error' },
       { status: 500 }
     );
   }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    // Generate new booking ID
    const newBooking = {
      id: `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...body,
      status: body.status || 'pending',
      date: body.date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (!db.bookings) {
      db.bookings = [];
    }
    
    db.bookings.push(newBooking);
    
    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json(newBooking, { status: 201 });
     } catch (error) {
     console.error('Error creating booking:', error);
     return NextResponse.json(
       { error: 'Internal server error' },
       { status: 500 }
     );
   }
}
