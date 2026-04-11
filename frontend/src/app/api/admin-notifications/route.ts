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
  date?: string;
  type?: string;
  priority?: string;
  status?: string;
  senderId?: string;
  userId?: string;
  targetUsers?: string[];
  targetRoles?: string[];
  sender?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  metadata?: {
    ageInMinutes: number;
    ageInHours: number;
    ageInDays: number;
    ageText: string;
    priorityLevel: number;
    isRead: boolean;
    isUnread: boolean;
    isArchived: boolean;
    targetUsersCount: number;
    targetRoles: string[];
    readCount: number;
    engagementRate: number;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    // Get all data
    const notifications = db.notifications || [];
    const users = db.users || [];
    
    // Filter notifications based on parameters
    let filteredNotifications = notifications;
    
    if (type) {
      filteredNotifications = filteredNotifications.filter((notification: Notification) => notification.type === type);
    }
    
    if (priority) {
      filteredNotifications = filteredNotifications.filter((notification: Notification) => notification.priority === priority);
    }
    
    if (status) {
      filteredNotifications = filteredNotifications.filter((notification: Notification) => notification.status === status);
    }
    
    if (userId) {
      filteredNotifications = filteredNotifications.filter((notification: Notification) => 
        notification.userId === userId || notification.targetUsers?.includes(userId)
      );
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredNotifications = filteredNotifications.filter((notification: Notification) => 
        notification.title?.toLowerCase().includes(searchLower) ||
        notification.message?.toLowerCase().includes(searchLower) ||
        notification.type?.toLowerCase().includes(searchLower)
      );
    }

    // Enrich notification data with additional information
    const enrichedNotifications = filteredNotifications.map((notification: Notification) => {
      const sender = users.find((u: User) => u.id === notification.senderId);
      
             // Calculate notification age
       const notificationDate = new Date(notification.createdAt || notification.date || new Date().toISOString());
       const today = new Date();
       const ageInMinutes = Math.floor((today.getTime() - notificationDate.getTime()) / (1000 * 60));
      const ageInHours = Math.floor(ageInMinutes / 60);
      const ageInDays = Math.floor(ageInHours / 24);
      
      let ageText = '';
      if (ageInDays > 0) {
        ageText = `${ageInDays} day${ageInDays > 1 ? 's' : ''} ago`;
      } else if (ageInHours > 0) {
        ageText = `${ageInHours} hour${ageInHours > 1 ? 's' : ''} ago`;
      } else if (ageInMinutes > 0) {
        ageText = `${ageInMinutes} minute${ageInMinutes > 1 ? 's' : ''} ago`;
      } else {
        ageText = 'Just now';
      }
      
      // Calculate priority level
      const priorityLevel = notification.priority === 'high' ? 3 : 
                           notification.priority === 'medium' ? 2 : 1;
      
      // Calculate read status
      const isRead = notification.status === 'read';
      const isUnread = notification.status === 'unread';
      const isArchived = notification.status === 'archived';
      
      // Calculate target users count
      const targetUsersCount = notification.targetUsers ? notification.targetUsers.length : 0;
      const targetRoles = notification.targetRoles || [];
      
      // Calculate engagement metrics
      const readCount = notification.read ? 1 : 0;
      const engagementRate = targetUsersCount > 0 ? (readCount / targetUsersCount) * 100 : 0;

      return {
        ...notification,
        sender: sender ? {
          id: sender.id,
          name: sender.name,
          email: sender.email,
          role: sender.role
        } : null,
        metadata: {
          ageInMinutes,
          ageInHours,
          ageInDays,
          ageText,
          priorityLevel,
          isRead,
          isUnread,
          isArchived,
          targetUsersCount,
          targetRoles,
          readCount,
          engagementRate: Math.round(engagementRate * 100) / 100
        }
      };
    });

         // Sort notifications by priority and date (highest priority and newest first)
     enrichedNotifications.sort((a: Notification, b: Notification) => {
       if (a.metadata.priorityLevel !== b.metadata.priorityLevel) {
         return b.metadata.priorityLevel - a.metadata.priorityLevel;
       }
       return new Date(b.createdAt || b.date || new Date().toISOString()).getTime() - new Date(a.createdAt || a.date || new Date().toISOString()).getTime();
     });

    // Apply pagination
    const paginatedNotifications = enrichedNotifications.slice(offset, offset + limit);

    // Calculate notifications summary
    const totalNotifications = enrichedNotifications.length;
    const unreadNotifications = enrichedNotifications.filter((n: Notification) => n.status === 'unread').length;
    const readNotifications = enrichedNotifications.filter((n: Notification) => n.status === 'read').length;
    const archivedNotifications = enrichedNotifications.filter((n: Notification) => n.status === 'archived').length;
    
    const highPriorityNotifications = enrichedNotifications.filter((n: Notification) => n.priority === 'high').length;
    const mediumPriorityNotifications = enrichedNotifications.filter((n: Notification) => n.priority === 'medium').length;
    const lowPriorityNotifications = enrichedNotifications.filter((n: Notification) => n.priority === 'low').length;
    
    const systemNotifications = enrichedNotifications.filter((n: Notification) => n.type === 'system').length;
    const userNotifications = enrichedNotifications.filter((n: Notification) => n.type === 'user').length;
    const alertNotifications = enrichedNotifications.filter((n: Notification) => n.type === 'alert').length;
    const reminderNotifications = enrichedNotifications.filter((n: Notification) => n.type === 'reminder').length;
    
    const totalTargetUsers = enrichedNotifications.reduce((sum: number, n: Notification) => sum + n.metadata.targetUsersCount, 0);
    const totalReadCount = enrichedNotifications.reduce((sum: number, n: Notification) => sum + n.metadata.readCount, 0);
    const overallEngagementRate = totalTargetUsers > 0 ? (totalReadCount / totalTargetUsers) * 100 : 0;

    const summary = {
      totalNotifications,
      unreadNotifications,
      readNotifications,
      archivedNotifications,
      highPriorityNotifications,
      mediumPriorityNotifications,
      lowPriorityNotifications,
      systemNotifications,
      userNotifications,
      alertNotifications,
      reminderNotifications,
      totalTargetUsers,
      totalReadCount,
      overallEngagementRate: Math.round(overallEngagementRate * 100) / 100,
      pagination: {
        limit,
        offset,
        total: totalNotifications,
        hasMore: offset + limit < totalNotifications
      }
    };

    return NextResponse.json({
      notifications: paginatedNotifications,
      summary
    });
     } catch (error) {
     console.error('Error fetching notifications data:', error);
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
    
    // Generate new notification ID
    const newNotification = {
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...body,
      status: body.status || 'unread',
      priority: body.priority || 'medium',
      type: body.type || 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      readBy: body.readBy || [],
      targetUsers: body.targetUsers || [],
      targetRoles: body.targetRoles || []
    };
    
    if (!db.notifications) {
      db.notifications = [];
    }
    
    db.notifications.push(newNotification);
    
    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json(newNotification, { status: 201 });
     } catch (error) {
     console.error('Error creating notification:', error);
     return NextResponse.json(
       { error: 'Internal server error' },
       { status: 500 }
     );
   }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }
    
    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    if (!db.notifications) {
      return NextResponse.json(
        { error: 'No notifications found' },
        { status: 404 }
      );
    }
    
    const notificationIndex = db.notifications.findIndex((n: Notification) => n.id === id);
    
    if (notificationIndex === -1) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }
    
    // Update notification
    const updatedNotification = {
      ...db.notifications[notificationIndex],
      ...body,
      updatedAt: new Date().toISOString()
    };
    
    db.notifications[notificationIndex] = updatedNotification;
    
    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json(updatedNotification);
     } catch (error) {
     console.error('Error updating notification:', error);
     return NextResponse.json(
       { error: 'Internal server error' },
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
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }
    
    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    if (!db.notifications) {
      return NextResponse.json(
        { error: 'No notifications found' },
        { status: 404 }
      );
    }
    
    const notificationIndex = db.notifications.findIndex((n: Notification) => n.id === id);
    
    if (notificationIndex === -1) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }
    
    // Remove notification
    const deletedNotification = db.notifications.splice(notificationIndex, 1)[0];
    
    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json({ message: 'Notification deleted successfully', deletedNotification });
     } catch (error) {
     console.error('Error deleting notification:', error);
     return NextResponse.json(
       { error: 'Internal server error' },
       { status: 500 }
     );
   }
}
