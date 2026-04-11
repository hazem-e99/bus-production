import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface User {
  id: string;
  role: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber?: string;
  licenseType?: string;
  licenseExpiry?: string;
  incidents?: number;
  lastIncident?: string;
  avatar?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Trip {
  id: string;
  driverId: string;
  routeId: string;
  busId: string;
  status: string;
  date: string;
  startTime: string;
  endTime: string;
  passengers: number;
  revenue: number;
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

interface MonthlyPerformance {
  trips: number;
  passengers: number;
  revenue: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');

    if (!driverId) {
      return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 });
    }

    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    // Find driver by ID
    const driver = db.users?.find((user: User) => 
      user.id.toString() === driverId && user.role === 'driver'
    );

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    // Get driver's trips
    const driverTrips = db.trips?.filter((trip: Trip) => trip.driverId === driverId) || [];
    const completedTrips = driverTrips.filter((trip: Trip) => trip.status === 'completed');
    const activeTrips = driverTrips.filter((trip: Trip) => trip.status === 'active');
    const scheduledTrips = driverTrips.filter((trip: Trip) => trip.status === 'scheduled');

    // Get driver's recent trips
    const recentTrips = driverTrips
      .sort((a: Trip, b: Trip) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
      .map((trip: Trip) => {
        const route = db.routes?.find((r: Route) => r.id === trip.routeId);
        const bus = db.buses?.find((b: Bus) => b.id === trip.busId);
        return {
          id: trip.id,
          date: trip.date,
          startTime: trip.startTime,
          endTime: trip.endTime,
          status: trip.status,
          passengers: trip.passengers,
          revenue: trip.revenue,
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

    // Calculate performance metrics
    const totalTrips = driverTrips.length;
    const completionRate = totalTrips > 0 ? (completedTrips.length / totalTrips) * 100 : 0;
    const totalPassengers = driverTrips.reduce((sum: number, trip: Trip) => 
      sum + (trip.passengers || 0), 0
    );
    const totalRevenue = driverTrips.reduce((sum: number, trip: Trip) => 
      sum + (trip.revenue || 0), 0
    );

    // Calculate average trip duration
    const completedTripDurations = completedTrips.map((trip: Trip) => {
      if (trip.startTime && trip.endTime) {
        const start = new Date(`2000-01-01T${trip.startTime}`);
        const end = new Date(`2000-01-01T${trip.endTime}`);
        return (end.getTime() - start.getTime()) / (1000 * 60); // in minutes
      }
      return 0;
    }).filter(duration => duration > 0);

    const averageTripDuration = completedTripDurations.length > 0 ? 
      completedTripDurations.reduce((sum: number, duration: number) => sum + duration, 0) / completedTripDurations.length : 0;

    // Calculate monthly performance
    const monthlyPerformance: Record<string, MonthlyPerformance> = {};
    driverTrips.forEach((trip: Trip) => {
      const month = new Date(trip.date).toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyPerformance[month]) {
        monthlyPerformance[month] = {
          trips: 0,
          passengers: 0,
          revenue: 0
        };
      }
      monthlyPerformance[month].trips += 1;
      monthlyPerformance[month].passengers += trip.passengers || 0;
      monthlyPerformance[month].revenue += trip.revenue || 0;
    });

    // Convert monthly performance to array format
    const monthlyPerformanceArray = Object.entries(monthlyPerformance).map(([month, stats]: [string, { trips: number; passengers: number; revenue: number }]) => ({
      month,
      ...stats
    }));

    // Calculate license status
    const licenseExpiry = driver.licenseExpiry ? new Date(driver.licenseExpiry) : null;
    const isLicenseExpired = licenseExpiry ? new Date() > licenseExpiry : false;
    const daysUntilLicenseExpiry = licenseExpiry ? 
      Math.ceil((licenseExpiry.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)) : 
      null;

    // Calculate safety metrics
    const safetyScore = calculateSafetyScore(driver, driverTrips);

    const profileData = {
      id: driver.id,
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      licenseNumber: driver.licenseNumber,
      licenseType: driver.licenseType,
      licenseExpiry: driver.licenseExpiry,
      licenseStatus: isLicenseExpired ? 'expired' : 
                    daysUntilLicenseExpiry && daysUntilLicenseExpiry <= 30 ? 'expiring_soon' : 'valid',
      daysUntilLicenseExpiry,
      avatar: driver.avatar,
      status: driver.status,
      createdAt: driver.createdAt,
      updatedAt: driver.updatedAt,
      performance: {
        totalTrips,
        completedTrips: completedTrips.length,
        activeTrips: activeTrips.length,
        scheduledTrips: scheduledTrips.length,
        completionRate: Math.round(completionRate * 100) / 100,
        totalPassengers,
        totalRevenue,
        averageTripDuration: Math.round(averageTripDuration * 100) / 100
      },
      safety: {
        score: safetyScore,
        rating: safetyScore >= 90 ? 'excellent' : 
               safetyScore >= 80 ? 'good' : 
               safetyScore >= 70 ? 'fair' : 'poor',
        incidents: driver.incidents || 0,
        lastIncident: driver.lastIncident
      },
      monthlyPerformance: monthlyPerformanceArray,
      recentTrips
    };

    return NextResponse.json(profileData);
  } catch (error) {
    console.error('Error fetching driver profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch driver profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');

    if (!driverId) {
      return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 });
    }

    const updateData = await request.json();

    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    // Find driver index
    const driverIndex = db.users?.findIndex((user: User) => 
      user.id.toString() === driverId && user.role === 'driver'
    );

    if (driverIndex === -1 || driverIndex === undefined) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    // Update driver data
    db.users[driverIndex] = {
      ...db.users[driverIndex],
      ...updateData,
      id: driverId, // Ensure ID doesn't change
      role: 'driver', // Ensure role doesn't change
      updatedAt: new Date().toISOString()
    };

    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));

    return NextResponse.json({ 
      message: 'Driver profile updated successfully',
      driver: db.users[driverIndex]
    });
  } catch (error) {
    console.error('Error updating driver profile:', error);
    return NextResponse.json(
      { error: 'Failed to update driver profile' },
      { status: 500 }
    );
  }
}

// Helper function to calculate safety score
function calculateSafetyScore(driver: User, trips: Trip[]): number {
  let score = 100; // Start with perfect score
  
  // Deduct points for incidents
  if (driver.incidents) {
    score -= driver.incidents * 5; // 5 points per incident
  }
  
  // Deduct points for cancelled trips
  const cancelledTrips = trips.filter((trip: Trip) => trip.status === 'cancelled').length;
  score -= cancelledTrips * 2; // 2 points per cancelled trip
  
  // Deduct points for license expiry
  if (driver.licenseExpiry) {
    const daysUntilExpiry = Math.ceil((new Date(driver.licenseExpiry).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000));
    if (daysUntilExpiry < 0) {
      score -= 20; // 20 points for expired license
    } else if (daysUntilExpiry <= 30) {
      score -= 10; // 10 points for expiring soon
    }
  }
  
  // Ensure score doesn't go below 0
  return Math.max(0, score);
}
