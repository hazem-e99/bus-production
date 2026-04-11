import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface User {
  id: string;
  name: string;
  role: string;
}

interface Bus {
  id: string;
  driverId?: string;
  assignedSupervisorId?: string;
  updatedAt?: string;
}

interface Trip {
  id: string;
  driverId?: string;
  supervisorId?: string;
  updatedAt?: string;
}

// Admin/Movement Manager can assign drivers and supervisors to buses or trips
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entity, entityId, role, userId } = body || {};
    if (!entity || !entityId || !role || !userId) {
      return NextResponse.json({ error: 'entity, entityId, role, and userId are required' }, { status: 400 });
    }

    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    const user = (db.users || []).find((u: User) => u.id === userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (entity === 'bus') {
      const index = (db.buses || []).findIndex((b: Bus) => b.id === entityId);
      if (index === -1) return NextResponse.json({ error: 'Bus not found' }, { status: 404 });
      const bus = db.buses[index];
      if (role === 'driver') db.buses[index] = { ...bus, driverId: userId, updatedAt: new Date().toISOString() };
      else if (role === 'supervisor') db.buses[index] = { ...bus, assignedSupervisorId: userId, updatedAt: new Date().toISOString() };
      else return NextResponse.json({ error: 'Unsupported role for bus assignment' }, { status: 400 });
    } else if (entity === 'trip') {
      const index = (db.trips || []).findIndex((t: Trip) => t.id === entityId);
      if (index === -1) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
      const trip = db.trips[index];
      if (role === 'driver') db.trips[index] = { ...trip, driverId: userId, updatedAt: new Date().toISOString() };
      else if (role === 'supervisor') db.trips[index] = { ...trip, supervisorId: userId, updatedAt: new Date().toISOString() };
      else return NextResponse.json({ error: 'Unsupported role for trip assignment' }, { status: 400 });
    } else {
      return NextResponse.json({ error: 'Unsupported entity' }, { status: 400 });
    }

    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    return NextResponse.json({ success: true });
  } catch {
    console.error('Error assigning user:', Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


