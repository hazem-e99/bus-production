import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface Announcement {
  id: string;
  type: string;
  priority: string;
  status: string;
  title: string;
  content: string;
  author: string;
  targetRoles?: string[];
  readBy?: Array<{
    userId: string;
    readAt: string;
  }>;
  expiryDate?: string;
  createdAt: string;
}

interface EnrichedAnnouncement extends Announcement {
  engagement: {
    readCount: number;
    totalTargetUsers: number;
    readPercentage: number;
    unreadCount: number;
  };
  recentReaders: Array<{
    userId: string;
    userName: string;
    userRole: string;
    readAt: string;
  }>;
  isActive: boolean;
  isExpired: boolean;
  daysUntilExpiry: number | null;
}

interface Reader {
  userId: string;
  readAt: string;
}

interface User {
  id: string;
  name: string;
  role: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');
    const status = searchParams.get('status');
    const targetRoles = searchParams.get('targetRoles');
    const search = searchParams.get('search');

    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    // Get all data
    const announcements = db.announcements || [];
    const users = db.users || [];
    
    // Filter announcements based on parameters
    let filteredAnnouncements = announcements;
    
    if (type) {
      filteredAnnouncements = filteredAnnouncements.filter((announcement: Announcement) => announcement.type === type);
    }
    
    if (priority) {
      filteredAnnouncements = filteredAnnouncements.filter((announcement: Announcement) => announcement.priority === priority);
    }
    
    if (status) {
      filteredAnnouncements = filteredAnnouncements.filter((announcement: Announcement) => announcement.status === status);
    }
    
    if (targetRoles) {
      filteredAnnouncements = filteredAnnouncements.filter((announcement: Announcement) => 
        announcement.targetRoles && announcement.targetRoles.includes(targetRoles)
      );
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredAnnouncements = filteredAnnouncements.filter((announcement: Announcement) => 
        announcement.title?.toLowerCase().includes(searchLower) ||
        announcement.content?.toLowerCase().includes(searchLower) ||
        announcement.author?.toLowerCase().includes(searchLower)
      );
    }

    // Enrich announcement data with additional information
    const enrichedAnnouncements = filteredAnnouncements.map((announcement: Announcement) => {
      // Calculate read statistics
      const readCount = announcement.readBy ? announcement.readBy.length : 0;
      const totalTargetUsers = calculateTargetUsersCount(announcement.targetRoles || [], users);
      const readPercentage = totalTargetUsers > 0 ? (readCount / totalTargetUsers) * 100 : 0;
      
      // Calculate engagement metrics
      const engagementMetrics = {
        readCount,
        totalTargetUsers,
        readPercentage: Math.round(readPercentage * 100) / 100,
        unreadCount: totalTargetUsers - readCount
      };
      
      // Get recent readers
      const recentReaders = announcement.readBy ? 
        announcement.readBy
          .sort((a: Reader, b: Reader) => new Date(b.readAt).getTime() - new Date(a.readAt).getTime())
          .slice(0, 5)
          .map((reader: Reader) => {
            const user = users.find((u: User) => u.id === reader.userId);
            return {
              userId: reader.userId,
              userName: user ? user.name : 'Unknown User',
              userRole: user ? user.role : 'Unknown',
              readAt: reader.readAt
            };
          }) : [];

      return {
        ...announcement,
        engagement: engagementMetrics,
        recentReaders,
        isActive: announcement.status === 'active',
        isExpired: announcement.expiryDate ? new Date() > new Date(announcement.expiryDate) : false,
        daysUntilExpiry: announcement.expiryDate ? 
          Math.ceil((new Date(announcement.expiryDate).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)) : 
          null
      };
    });

    // Sort announcements by priority and creation date
    enrichedAnnouncements.sort((a: EnrichedAnnouncement, b: EnrichedAnnouncement) => {
      const priorityOrder: Record<string, number> = { 'high': 1, 'medium': 2, 'low': 3 };
      const priorityDiff = (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Calculate summary statistics
    const totalAnnouncements = enrichedAnnouncements.length;
    const activeAnnouncements = enrichedAnnouncements.filter((a: EnrichedAnnouncement) => a.status === 'active').length;
    const draftAnnouncements = enrichedAnnouncements.filter((a: EnrichedAnnouncement) => a.status === 'draft').length;
    const archivedAnnouncements = enrichedAnnouncements.filter((a: EnrichedAnnouncement) => a.status === 'archived').length;
    
    const highPriorityAnnouncements = enrichedAnnouncements.filter((a: EnrichedAnnouncement) => a.priority === 'high').length;
    const mediumPriorityAnnouncements = enrichedAnnouncements.filter((a: EnrichedAnnouncement) => a.priority === 'medium').length;
    const lowPriorityAnnouncements = enrichedAnnouncements.filter((a: EnrichedAnnouncement) => a.priority === 'low').length;
    
    const expiredAnnouncements = enrichedAnnouncements.filter((a: EnrichedAnnouncement) => a.isExpired).length;
    const expiringSoonAnnouncements = enrichedAnnouncements.filter((a: EnrichedAnnouncement) => 
      a.daysUntilExpiry && a.daysUntilExpiry <= 7 && a.daysUntilExpiry > 0
    ).length;

    // Calculate type distribution
    const typeDistribution: Record<string, number> = {};
    enrichedAnnouncements.forEach((announcement: EnrichedAnnouncement) => {
      const type = announcement.type || 'general';
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });

    // Calculate average engagement
    const averageReadPercentage = enrichedAnnouncements.length > 0 ? 
      enrichedAnnouncements.reduce((sum: number, a: EnrichedAnnouncement) => sum + a.engagement.readPercentage, 0) / enrichedAnnouncements.length : 0;

    const summary = {
      totalAnnouncements,
      activeAnnouncements,
      draftAnnouncements,
      archivedAnnouncements,
      highPriorityAnnouncements,
      mediumPriorityAnnouncements,
      lowPriorityAnnouncements,
      expiredAnnouncements,
      expiringSoonAnnouncements,
      typeDistribution,
      averageReadPercentage: Math.round(averageReadPercentage * 100) / 100
    };

    return NextResponse.json({
      announcements: enrichedAnnouncements,
      summary
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    // Generate new announcement ID
    const newAnnouncement = {
      id: `announcement-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...body,
      status: body.status || 'draft',
      priority: body.priority || 'medium',
      type: body.type || 'general',
      targetRoles: body.targetRoles || ['all'],
      readBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (!db.announcements) {
      db.announcements = [];
    }
    
    db.announcements.push(newAnnouncement);
    
    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json(newAnnouncement, { status: 201 });
  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Announcement ID is required' },
        { status: 400 }
      );
    }

    const updateData = await request.json();

    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    // Find announcement index
    const announcementIndex = db.announcements?.findIndex((announcement: Announcement) => announcement.id === id);

    if (announcementIndex === -1 || announcementIndex === undefined) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    // Update announcement data
    db.announcements[announcementIndex] = {
      ...db.announcements[announcementIndex],
      ...updateData,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };

    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));

    return NextResponse.json({ 
      message: 'Announcement updated successfully',
      announcement: db.announcements[announcementIndex]
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    return NextResponse.json(
      { error: 'Failed to update announcement' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Announcement ID is required' },
        { status: 400 }
      );
    }

    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    // Find announcement index
    const announcementIndex = db.announcements?.findIndex((announcement: Announcement) => announcement.id === id);

    if (announcementIndex === -1 || announcementIndex === undefined) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    // Remove announcement
    const deletedAnnouncement = db.announcements.splice(announcementIndex, 1)[0];

    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));

    return NextResponse.json({ 
      message: 'Announcement deleted successfully',
      deletedAnnouncement
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json(
      { error: 'Failed to delete announcement' },
      { status: 500 }
    );
  }
}

// Helper function to calculate target users count
function calculateTargetUsersCount(targetRoles: string[], users: User[]): number {
  if (!targetRoles || targetRoles.includes('all')) {
    return users.length;
  }
  
  return users.filter((user: User) => targetRoles.includes(user.role)).length;
}
