import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Notification interface
interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type?: string;
  priority?: string;
  userId?: string;
  status?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const unread = searchParams.get('unread');

    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    // If userId is provided, filter notifications for that user
    if (userId) {
      let userNotifications = (db.notifications || []).filter(
        (notification: Notification) => notification.userId === userId
      );
      if (unread === 'true') {
        userNotifications = userNotifications.filter((n: Notification) => n.status === 'unread' || n.read === false);
      }
      return NextResponse.json(userNotifications);
    }

    // Otherwise return all notifications
    return NextResponse.json(db.notifications || []);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    if (!db.notifications) db.notifications = [];
    const notification = {
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...body,
      status: body.status || 'unread',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.notifications.push(notification);
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

