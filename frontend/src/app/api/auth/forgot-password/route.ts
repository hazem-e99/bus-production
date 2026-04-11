import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface User {
  id: string;
  email: string;
}

interface PasswordReset {
  email: string;
  token: string;
  expiry: string;
  createdAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Read the database to check if user exists
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    // Check if user exists
    const user = db.users?.find((u: User) => u.email === email);
    
    if (!user) {
      // For security reasons, don&apos;t reveal if email exists or not
      return NextResponse.json(
        { message: 'If an account with that email exists, we have sent a password reset link.' },
        { status: 200 }
      );
    }

    // Generate reset token (in production, use a proper JWT or crypto library)
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Store reset token in database (in production, use a separate table)
    if (!db.passwordResets) {
      db.passwordResets = [];
    }

    // Remove existing reset tokens for this user
    db.passwordResets = db.passwordResets.filter((r: PasswordReset) => r.email !== email);

    // Add new reset token
    db.passwordResets.push({
      email,
      token: resetToken,
      expiry: resetTokenExpiry,
      createdAt: new Date().toISOString()
    });

    // Save to database
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));

    // In production, send email here
    // For now, we'll just return the reset link
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    console.log('Password reset link:', resetLink); // Remove in production

    return NextResponse.json({
      message: 'If an account with that email exists, we have sent a password reset link.',
      resetLink // Remove this in production, only for development
    });

  } catch {
    console.error('Forgot password error:', Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
