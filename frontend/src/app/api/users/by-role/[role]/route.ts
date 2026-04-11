import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import * as path from 'path';

interface User {
  id: string;
  role: string;
  name: string;
  email: string;
  phone?: string;
  studentId?: string;
  department?: string;
  year?: string;
  createdAt: string;
  updatedAt: string;
}

interface Context {
  params: Promise<{ role: string }>;
}

export async function GET(
  request: NextRequest,
  context: Context
): Promise<NextResponse> {
  try {
    const { role } = await context.params;
    
    // Validate role parameter
    if (!role || typeof role !== 'string' || role.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid role parameter' },
        { status: 400 }
      );
    }
    
    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent) as { users?: User[] };
    
    // Filter users by role
    const usersByRole = (db.users || []).filter((user: User) => 
      user.role.toLowerCase() === role.toLowerCase()
    );
    
    return NextResponse.json({
      role,
      count: usersByRole.length,
      users: usersByRole
    });
  } catch (error: unknown) {
    console.error('Error reading users by role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
