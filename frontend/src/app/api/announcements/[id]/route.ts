import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import * as path from 'path';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
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
        { error: 'Invalid announcement ID' },
        { status: 400 }
      );
    }
    
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent) as { announcements?: Announcement[] };
    
    const announcement = (db.announcements || []).find((announcement: Announcement) => announcement.id === id);
    
    if (!announcement) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(announcement);
  } catch (error: unknown) {
    console.error('Error reading announcement data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: Context
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    
    // Validate id parameter
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid announcement ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json() as Partial<Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>>;
    
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent) as { announcements?: Announcement[] };
    
    // Ensure announcements array exists
    if (!db.announcements) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      );
    }
    
    const announcementIndex = db.announcements.findIndex((announcement: Announcement) => announcement.id === id);
    if (announcementIndex === -1) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      );
    }
    
    // Update only the provided fields
    db.announcements[announcementIndex] = {
      ...db.announcements[announcementIndex],
      ...body,
      updatedAt: new Date().toISOString()
    };
    
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json(db.announcements[announcementIndex]);
  } catch (error: unknown) {
    console.error('Error updating announcement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: Context
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    
    // Validate id parameter
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid announcement ID' },
        { status: 400 }
      );
    }
    
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent) as { announcements?: Announcement[] };
    
    // Ensure announcements array exists
    if (!db.announcements) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      );
    }
    
    const announcementIndex = db.announcements.findIndex((announcement: Announcement) => announcement.id === id);
    if (announcementIndex === -1) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      );
    }
    
    db.announcements.splice(announcementIndex, 1);
    
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json({ message: 'Announcement deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
