import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import * as path from 'path';

interface User {
  id: string;
  role: string;
  name: string;
  email: string;
  phone: string;
}

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: Context
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    
    // Validate id parameter
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid supervisor ID' },
        { status: 400 }
      );
    }
    
    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent) as { users?: User[] };

    // Find supervisor by ID
    const supervisor = db.users?.find((user: User) => 
      user.id.toString() === id && user.role === 'supervisor'
    );

    if (!supervisor) {
      return NextResponse.json(
        { error: 'Supervisor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(supervisor);
  } catch (error: unknown) {
    console.error('Error reading supervisor data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
