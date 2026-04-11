import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    // Return system settings if they exist, otherwise return default settings
    const systemSettings = db.systemSettings || {
      id: 'system-settings',
      systemName: 'Bus Management System',
      logo: '/logo.png',
      primaryColor: '#3B82F6',
      secondaryColor: '#10B981',
      maintenanceMode: false,
      notificationsEnabled: true,
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json(systemSettings);
  } catch {
    console.error('Error fetching system settings:', Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    const current = db.systemSettings || {};
    db.systemSettings = {
      ...current,
      ...body,
      // ensure secondaryColor exists when updating
      secondaryColor: body.secondaryColor || current.secondaryColor || '#10B981',
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    return NextResponse.json(db.systemSettings);
  } catch {
    console.error('Error updating system settings:', Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
