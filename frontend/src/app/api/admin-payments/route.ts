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

interface Payment {
  id: string;
  status: string;
  method: string;
  date: string;
  amount: number;
  studentId: string;
  tripId: string;
}

interface EnrichedPayment extends Payment {
  student: {
    id: string;
    name: string;
    email: string;
    studentId: string;
    department: string;
    year: string;
  } | null;
  trip: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    passengers: number;
  } | null;
  route: {
    id: string;
    name: string;
    startPoint: string;
    endPoint: string;
  } | null;
  bus: {
    id: string;
    number: string;
    model: string;
  } | null;
}

interface Trip {
  id: string;
  routeId: string;
  busId: string;
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
}

interface Bus {
  id: string;
  number: string;
  model: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const method = searchParams.get('method');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    // Get all data
    const payments = db.payments || [];
    const users = db.users || [];
    const trips = db.trips || [];
    const routes = db.routes || [];
    const buses = db.buses || [];
    
    // Filter payments based on parameters
    let filteredPayments = payments;
    
    if (status) {
      filteredPayments = filteredPayments.filter((payment: Payment) => payment.status === status);
    }
    
    if (method) {
      filteredPayments = filteredPayments.filter((payment: Payment) => payment.method === method);
    }
    
    if (startDate && endDate) {
      filteredPayments = filteredPayments.filter((payment: Payment) => 
        payment.date >= startDate && payment.date <= endDate
      );
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredPayments = filteredPayments.filter((payment: Payment) => {
        const student = users.find((u: User) => u.id === payment.studentId);
        const trip = trips.find((t: Trip) => t.id === payment.tripId);
        return (
          payment.id?.toLowerCase().includes(searchLower) ||
          student?.name?.toLowerCase().includes(searchLower) ||
          student?.studentId?.toLowerCase().includes(searchLower) ||
          trip?.id?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Enrich payment data with additional information
    const enrichedPayments = filteredPayments.map((payment: Payment) => {
      const student = users.find((u: User) => u.id === payment.studentId);
      const trip = trips.find((t: Trip) => t.id === payment.tripId);
      const route = trip ? routes.find((r: Route) => r.id === trip.routeId) : null;
      const bus = trip ? buses.find((b: Bus) => b.id === trip.busId) : null;
      
      return {
        ...payment,
        student: student ? {
          id: student.id,
          name: student.name,
          email: student.email,
          studentId: student.studentId,
          department: student.department,
          year: student.year
        } : null,
        trip: trip ? {
          id: trip.id,
          date: trip.date,
          startTime: trip.startTime,
          endTime: trip.endTime,
          status: trip.status,
          passengers: trip.passengers
        } : null,
        route: route ? {
          id: route.id,
          name: route.name,
          startPoint: route.startPoint,
          endPoint: route.endPoint
        } : null,
        bus: bus ? {
          id: bus.id,
          number: bus.number,
          model: bus.model
        } : null
      };
    });

    // Sort payments by date (newest first)
    enrichedPayments.sort((a: EnrichedPayment, b: EnrichedPayment) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate summary statistics
    const totalPayments = enrichedPayments.length;
    const completedPayments = enrichedPayments.filter((p: EnrichedPayment) => p.status === 'completed');
    const pendingPayments = enrichedPayments.filter((p: EnrichedPayment) => p.status === 'pending');
    const failedPayments = enrichedPayments.filter((p: EnrichedPayment) => p.status === 'failed');
    const cancelledPayments = enrichedPayments.filter((p: EnrichedPayment) => p.status === 'cancelled');

    const totalRevenue = completedPayments.reduce((sum: number, p: EnrichedPayment) => sum + (p.amount || 0), 0);
    const pendingRevenue = pendingPayments.reduce((sum: number, p: EnrichedPayment) => sum + (p.amount || 0), 0);
    const failedRevenue = failedPayments.reduce((sum: number, p: EnrichedPayment) => sum + (p.amount || 0), 0);

    // Calculate payment methods distribution
    const paymentMethods: Record<string, number> = {};
    enrichedPayments.forEach((payment: EnrichedPayment) => {
      const method = payment.method || 'unknown';
      paymentMethods[method] = (paymentMethods[method] || 0) + 1;
    });

    // Calculate monthly trends
    const monthlyTrends: Record<string, {
      month: string;
      total: number;
      completed: number;
      pending: number;
      failed: number;
      revenue: number;
    }> = {};
    enrichedPayments.forEach((payment: EnrichedPayment) => {
      const month = new Date(payment.date).toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyTrends[month]) {
        monthlyTrends[month] = {
          month: new Date(payment.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          total: 0,
          completed: 0,
          pending: 0,
          failed: 0,
          revenue: 0
        };
      }
      
      monthlyTrends[month].total += 1;
      if (payment.status === 'completed') {
        monthlyTrends[month].completed += 1;
        monthlyTrends[month].revenue += payment.amount || 0;
      } else if (payment.status === 'pending') {
        monthlyTrends[month].pending += 1;
      } else if (payment.status === 'failed') {
        monthlyTrends[month].failed += 1;
      }
    });

    // Convert monthly trends to array format
    const monthlyTrendsArray = Object.values(monthlyTrends);

    // Calculate status distribution
    const statusDistribution = {
      completed: completedPayments.length,
      pending: pendingPayments.length,
      failed: failedPayments.length,
      cancelled: cancelledPayments.length
    };

    // Calculate average payment amount
    const averagePaymentAmount = totalPayments > 0 ? totalRevenue / totalPayments : 0;
    const averageCompletedPaymentAmount = completedPayments.length > 0 ? 
      totalRevenue / completedPayments.length : 0;

    // Calculate conversion rates
    const completionRate = totalPayments > 0 ? (completedPayments.length / totalPayments) * 100 : 0;
    const failureRate = totalPayments > 0 ? (failedPayments.length / totalPayments) * 100 : 0;

    const summary = {
      totalPayments,
      totalRevenue,
      pendingRevenue,
      failedRevenue,
      netRevenue: totalRevenue - failedRevenue,
      averagePaymentAmount: Math.round(averagePaymentAmount * 100) / 100,
      averageCompletedPaymentAmount: Math.round(averageCompletedPaymentAmount * 100) / 100,
      completionRate: Math.round(completionRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
      statusDistribution,
      paymentMethods
    };

    return NextResponse.json({
      payments: enrichedPayments,
      summary,
      trends: {
        monthly: monthlyTrendsArray
      }
    });
     } catch (error) {
     console.error('Error fetching payments data:', error);
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
    
    // Generate new payment ID
    const newPayment = {
      id: `payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...body,
      status: body.status || 'pending',
      date: body.date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (!db.payments) {
      db.payments = [];
    }
    
    db.payments.push(newPayment);
    
    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json(newPayment, { status: 201 });
     } catch (error) {
     console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
