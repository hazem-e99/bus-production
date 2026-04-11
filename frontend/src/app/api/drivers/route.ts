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
}

interface Trip {
  id: string;
  driverId: string;
  status: string;
  date: string;
}

export async function GET(request: NextRequest) {
  try {
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    // Get all drivers (users with driver role)
    const drivers = db.users?.filter((user: User) => user.role === 'driver') || [];
    
    // Enrich driver data with additional information
    const enrichedDrivers = drivers.map((driver: User) => {
      const driverTrips = db.trips?.filter((trip: Trip) => trip.driverId === driver.id) || [];
      const activeTrips = driverTrips.filter((trip: Trip) => trip.status === 'active');
      
      return {
        ...driver,
        totalTrips: driverTrips.length,
        activeTrips: activeTrips.length,
        lastTrip: driverTrips.length > 0 ? driverTrips[driverTrips.length - 1] : null
      };
    });
    
    return NextResponse.json(enrichedDrivers);
  } catch {
    console.error('Error reading drivers data:', Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
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
    
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json(newDriver, { status: 201 });
  } catch {
    console.error('Error creating driver:', Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
