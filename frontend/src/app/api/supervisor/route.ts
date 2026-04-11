import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface User {
  id: string;
  role: string;
  name: string;
  email: string;
  phone: string;
}

interface Trip {
  id: string;
  supervisorId: string;
  status: string;
  date: string;
}

export async function GET(request: NextRequest) {
  try {
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    // Get all supervisors (users with supervisor role)
    const supervisors = db.users?.filter((user: User) => user.role === 'supervisor') || [];
    
    // Enrich supervisor data with additional information
    const enrichedSupervisors = supervisors.map((supervisor: User) => {
      const supervisorTrips = db.trips?.filter((trip: Trip) => trip.supervisorId === supervisor.id) || [];
      const activeTrips = supervisorTrips.filter((trip: Trip) => trip.status === 'active');
      const completedTrips = supervisorTrips.filter((trip: Trip) => trip.status === 'completed');
      
      return {
        ...supervisor,
        totalTrips: supervisorTrips.length,
        activeTrips: activeTrips.length,
        completedTrips: completedTrips.length,
        lastTrip: supervisorTrips.length > 0 ? supervisorTrips[supervisorTrips.length - 1] : null
      };
    });
    
    return NextResponse.json(enrichedSupervisors);
  } catch (error) {
    console.error('Error reading supervisors data:', error);
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
    
    // Generate new supervisor ID
    const newSupervisor = {
      id: `supervisor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...body,
      role: 'supervisor', // Ensure role is set to supervisor
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (!db.users) {
      db.users = [];
    }
    
    db.users.push(newSupervisor);
    
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json(newSupervisor, { status: 201 });
  } catch (error) {
    console.error('Error creating supervisor:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
