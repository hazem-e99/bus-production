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
  licenseExpiry?: string;
  incidents?: number;
  lastIncident?: string;
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, email, phone, avatar } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Supervisor ID is required' },
        { status: 400 }
      );
    }

    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    // Find the supervisor
    const supervisorIndex = db.users.findIndex((user: User) => 
      user.id.toString() === id && user.role === 'supervisor'
    );

    if (supervisorIndex === -1) {
      return NextResponse.json(
        { error: 'Supervisor not found' },
        { status: 404 }
      );
    }

    // Update supervisor data
    const updatedSupervisor = {
      ...db.users[supervisorIndex],
      ...(name && { name }),
      ...(email && { email }),
      ...(phone && { phone }),
      ...(avatar && { avatar }),
      updatedAt: new Date().toISOString()
    };

    db.users[supervisorIndex] = updatedSupervisor;

    // Write updated data back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));

    return NextResponse.json(updatedSupervisor);
  } catch (error) {
    console.error('Error updating supervisor profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Supervisor ID is required' },
        { status: 400 }
      );
    }

    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    const supervisor = db.users.find((user: User) => 
      user.id.toString() === id && user.role === 'supervisor'
    );

    if (!supervisor) {
      return NextResponse.json(
        { error: 'Supervisor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(supervisor);
  } catch (error) {
    console.error('Error reading supervisor profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
