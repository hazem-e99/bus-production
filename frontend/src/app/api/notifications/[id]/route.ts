import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
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
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    const notification = (db.notifications || []).find((n: Notification) => n.id === id);

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json(notification);
  } catch {
    console.error('Error fetching notification:', Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    const index = (db.notifications || []).findIndex((n: Notification) => n.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    db.notifications[index] = {
      ...db.notifications[index],
      ...body,
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    return NextResponse.json(db.notifications[index]);
  } catch {
    console.error('Error updating notification:',Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    const index = (db.notifications || []).findIndex((n: Notification) => n.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const deleted = db.notifications.splice(index, 1)[0];

    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    return NextResponse.json({ message: 'Notification deleted', notification: deleted });
  } catch {
    console.error('Error deleting notification:', Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
