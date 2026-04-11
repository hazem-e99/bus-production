import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface User {
  id: string;
  role: string;
  name: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  subscriptionActivatedAt?: string;
  updatedAt?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, planType, method, amount } = body || {};
    if (!studentId || !planType || !method) {
      return NextResponse.json({ error: 'studentId, planType and method are required' }, { status: 400 });
    }

    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    const studentIndex = (db.users || []).findIndex((u: User) => u.id === studentId && u.role === 'student');
    if (studentIndex === -1) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    const student = db.users[studentIndex] as User;

    const normalizedMethod = method === 'cash' ? 'cash' : 'bank';
    const status = normalizedMethod === 'cash' ? 'pending' : 'completed';
    const price = typeof amount === 'number' ? amount : 0;

    if (!db.payments) db.payments = [];
    const payment = {
      id: `payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      studentId,
      tripId: null,
      amount: price,
      method: normalizedMethod,
      status,
      description: `Subscription ${planType}`,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.payments.push(payment);

    const subscriptionStatus = status === 'completed' ? 'active' : 'pending';
    db.users[studentIndex] = {
      ...db.users[studentIndex],
      subscriptionPlan: planType,
      subscriptionStatus,
      subscriptionActivatedAt: status === 'completed' ? new Date().toISOString() : db.users[studentIndex].subscriptionActivatedAt || null,
      updatedAt: new Date().toISOString(),
    };

    // If cash -> notify all admins
    if (normalizedMethod === 'cash') {
      const admins = (db.users || []).filter((u: User) => u.role === 'admin');
      if (!db.notifications) db.notifications = [];
      const timestamp = Date.now();
      for (const admin of admins) {
        db.notifications.push({
          id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          recipientId: admin.id,
          recipientRole: 'admin',
          senderId: studentId,
          message: `New cash payment request from ${student?.name || studentId}`,
          type: 'payment',
          timestamp,
          read: false,
          createdAt: new Date(timestamp).toISOString(),
          updatedAt: new Date(timestamp).toISOString()
        });
      }
    }

    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    return NextResponse.json({ payment, user: db.users[studentIndex] }, { status: 201 });
  } catch (error) {
    console.error('Error updating student subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


