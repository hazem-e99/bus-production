import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface Announcement {
  id: string;
  type: string;
  priority: string;
  targetRoles?: string[];
  title: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');
    const targetRoles = searchParams.get('targetRoles_like');
    
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    let announcements = db.announcements || [];
    
    // Apply filters
    if (type) {
      announcements = announcements.filter((announcement: Announcement) => announcement.type === type);
    }
    
    if (priority) {
      announcements = announcements.filter((announcement: Announcement) => announcement.priority === priority);
    }
    
    if (targetRoles) {
      announcements = announcements.filter((announcement: Announcement) => 
        announcement.targetRoles && announcement.targetRoles.includes(targetRoles)
      );
    }
    
    return NextResponse.json(announcements);
  } catch {
    console.error('Error reading announcements data:', Error);
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
    
    // Generate new announcement ID
    const newAnnouncement = {
      id: `announcement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (!db.announcements) {
      db.announcements = [];
    }
    
    db.announcements.push(newAnnouncement);
    
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json(newAnnouncement, { status: 201 });
  } catch {
    console.error('Error creating announcement:', Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
