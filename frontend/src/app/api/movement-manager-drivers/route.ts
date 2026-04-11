import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface User {
  id: string;
  role: string;
  status?: string;
  licenseNumber?: string;
  licenseType?: string;
  licenseExpiry?: string;
  name: string;
  email: string;
  phone: string;
  incidents?: number;
  lastIncident?: string;
  performance?: {
    totalRevenue: number;
    completionRate: number;
  };
  license?: {
    status: string;
  };
}

interface Trip {
  id: string;
  driverId: string;
  routeId: string;
  status: string;
  date: string;
  startTime: string;
  endTime: string;
  passengers: number;
}

interface Route {
  id: string;
  name: string;
  startPoint: string;
  endPoint: string;
}

interface Booking {
  id: string;
  tripId: string;
  status: string;
}

interface Payment {
  id: string;
  tripId: string;
  status: string;
  amount: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const licenseType = searchParams.get('licenseType');

    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    // Get all data
    const users = db.users || [];
    const trips = db.trips || [];
    const routes = db.routes || [];
    const payments = db.payments || [];
    const bookings = db.bookings || [];
    const attendance = db.attendance || [];
    
    // Get all drivers (users with driver role)
    let drivers = users.filter((user: User) => user.role === 'driver');
    
    // Filter by status if provided
    if (status) {
      drivers = drivers.filter((driver: User) => driver.status === status);
    }
    
    // Filter by license type if provided
    if (licenseType) {
      drivers = drivers.filter((driver: User) => driver.licenseType === licenseType);
    }

    // Enrich driver data with performance metrics
    const enrichedDrivers = drivers.map((driver: User) => {
      const driverTrips = trips.filter((trip: Trip) => trip.driverId === driver.id);
      const completedTrips = driverTrips.filter((trip: Trip) => trip.status === 'completed');
      const activeTrips = driverTrips.filter((trip: Trip) => trip.status === 'active');
      const cancelledTrips = driverTrips.filter((trip: Trip) => trip.status === 'cancelled');
      
      const driverBookings = bookings.filter((booking: Booking) => 
        driverTrips.some((trip: Trip) => trip.id === booking.tripId)
      );
      
      const driverPayments = payments.filter((payment: Payment) => 
        driverTrips.some((trip: Trip) => trip.id === payment.tripId)
      );
      
      const totalRevenue = driverPayments
        .filter((p: Payment) => p.status === 'completed')
        .reduce((sum: number, p: Payment) => sum + (p.amount || 0), 0);
      
      const totalPassengers = driverTrips.reduce((sum: number, trip: Trip) => 
        sum + (trip.passengers || 0), 0
      );
      
      const completionRate = driverTrips.length > 0 ? 
        (completedTrips.length / driverTrips.length) * 100 : 0;
      
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
      
      // Get recent trips
      const recentTrips = driverTrips
        .sort((a: Trip, b: Trip) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)
        .map((trip: Trip) => {
          const route = routes.find((r: Route) => r.id === trip.routeId);
          return {
            id: trip.id,
            date: trip.date,
            startTime: trip.startTime,
            endTime: trip.endTime,
            status: trip.status,
            passengers: trip.passengers,
            route: route ? {
              id: route.id,
              name: route.name,
              startPoint: route.startPoint,
              endPoint: route.endPoint
            } : null
          };
        });

      // Calculate license status
      const licenseExpiry = driver.licenseExpiry ? new Date(driver.licenseExpiry) : null;
      const isLicenseExpired = licenseExpiry ? new Date() > licenseExpiry : false;
      const daysUntilLicenseExpiry = licenseExpiry ? 
        Math.ceil((licenseExpiry.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)) : 
        null;

      // Calculate safety metrics
      const safetyScore = calculateSafetyScore(driver, driverTrips);
      
      return {
        ...driver,
        performance: {
          totalTrips: driverTrips.length,
          completedTrips: completedTrips.length,
          activeTrips: activeTrips.length,
          cancelledTrips: cancelledTrips.length,
          completionRate: Math.round(completionRate * 100) / 100,
          totalBookings: driverBookings.length,
          totalPassengers,
          totalRevenue,
          averageTripDuration: Math.round(averageTripDuration * 100) / 100
        },
        license: {
          licenseNumber: driver.licenseNumber,
          licenseType: driver.licenseType,
          licenseExpiry,
          isLicenseExpired,
          daysUntilLicenseExpiry,
          status: isLicenseExpired ? 'expired' : 
                 daysUntilLicenseExpiry && daysUntilLicenseExpiry <= 30 ? 'expiring_soon' : 'valid'
        },
        safety: {
          score: safetyScore,
          rating: safetyScore >= 90 ? 'excellent' : 
                 safetyScore >= 80 ? 'good' : 
                 safetyScore >= 70 ? 'fair' : 'poor',
          incidents: driver.incidents || 0,
          lastIncident: driver.lastIncident
        },
        recentTrips,
        lastTrip: driverTrips.length > 0 ? driverTrips[driverTrips.length - 1] : null
      };
    });

    // Sort by performance (total revenue)
    enrichedDrivers.sort((a: User, b: User) => b.performance.totalRevenue - a.performance.totalRevenue);

    // Calculate drivers summary
    const driversSummary = {
      totalDrivers: enrichedDrivers.length,
      activeDrivers: enrichedDrivers.filter((driver: User) => driver.status === 'active').length,
      inactiveDrivers: enrichedDrivers.filter((driver: User) => driver.status === 'inactive').length,
      suspendedDrivers: enrichedDrivers.filter((driver: User) => driver.status === 'suspended').length,
      totalRevenue: enrichedDrivers.reduce((sum: number, driver: User) => sum + driver.performance.totalRevenue, 0),
      averageCompletionRate: enrichedDrivers.length > 0 ? 
        enrichedDrivers.reduce((sum: number, driver: User) => sum + driver.performance.completionRate, 0) / enrichedDrivers.length : 0,
      licenseExpiringSoon: enrichedDrivers.filter((driver: User) => 
        driver.license.status === 'expiring_soon'
      ).length,
      licenseExpired: enrichedDrivers.filter((driver: User) => 
        driver.license.status === 'expired'
      ).length
    };

    return NextResponse.json({
      drivers: enrichedDrivers,
      summary: driversSummary
    });
  } catch (error) {
    console.error('Error fetching drivers data:', error);
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
    
    // Generate new driver ID
    const newDriver = {
      id: `driver-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...body,
      role: 'driver', // Ensure role is set to driver
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (!db.users) {
      db.users = [];
    }
    
    db.users.push(newDriver);
    
    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json(newDriver, { status: 201 });
  } catch (error) {
    console.error('Error creating driver:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
