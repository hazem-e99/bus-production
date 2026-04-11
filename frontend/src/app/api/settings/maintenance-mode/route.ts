import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(_request: NextRequest) {
  try {
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    const maintenance = Boolean(db?.systemSettings?.maintenanceMode);
    return NextResponse.json({ maintenanceMode: maintenance });
  } catch {
    console.error('Error fetching maintenance mode:', Error);
    return NextResponse.json({ maintenanceMode: false });
  }
}


