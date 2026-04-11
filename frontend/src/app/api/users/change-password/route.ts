import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import * as path from 'path';

interface User {
  id: string;
  role: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
  studentId?: string;
  department?: string;
  year?: string;
  createdAt: string;
  updatedAt: string;
}

interface ChangePasswordRequest {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const body = await request.json() as ChangePasswordRequest;
    const { userId, currentPassword, newPassword } = body;
    
    // Validate required fields
    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, currentPassword, newPassword' },
        { status: 400 }
      );
    }
    
    // Validate password requirements
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }
    
    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent) as { users?: User[] };
    
    // Find user by ID
    const userIndex = (db.users || []).findIndex((user: User) => user.id === userId);
    
    if (userIndex === -1) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const user = db.users[userIndex];
    
    // Verify current password (in a real app, you'd hash and compare)
    if (user.password !== currentPassword) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }
    
    // Update password
    db.users[userIndex] = {
      ...user,
      password: newPassword, // In a real app, you'd hash this
      updatedAt: new Date().toISOString()
    };
    
    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json({
      message: 'Password changed successfully',
      userId: user.id
    });
  } catch (error: unknown) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
