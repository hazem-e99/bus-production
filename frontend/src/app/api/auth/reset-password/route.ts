import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface User {
  id: string;
  email: string;
  password: string;
  updatedAt?: string;
}

interface PasswordReset {
  email: string;
  token: string;
  expiry: string;
}

export async function POST(request: NextRequest) {
  try {
    const { token, email, password } = await request.json();

    if (!token || !email || !password) {
      return NextResponse.json(
        { error: 'Token, email, and password are required' },
        { status: 400 }
      );
    }

    // Read the database
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    // Find the reset token
    const resetRecord = db.passwordResets?.find((r: PasswordReset) => 
      r.token === token && r.email === email
    );

    if (!resetRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (new Date(resetRecord.expiry) < new Date()) {
      // Remove expired token
      db.passwordResets = db.passwordResets.filter((r: PasswordReset) => r.token !== token);
      await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
      
      return NextResponse.json(
        { error: 'Reset token has expired' },
        { status: 400 }
      );
    }

    // Find and update the user
    const userIndex = db.users?.findIndex((u: User) => u.email === email);
    
    if (userIndex === -1) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user password
    db.users[userIndex].password = password;
    db.users[userIndex].updatedAt = new Date().toISOString();

    // Remove the used reset token
    db.passwordResets = db.passwordResets.filter((r: PasswordReset) => r.token !== token);

    // Save to database
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));

    return NextResponse.json({
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
