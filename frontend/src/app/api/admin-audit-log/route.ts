import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  userId: string;
  severity: string;
  timestamp?: string;
  createdAt?: string;
  description?: string;
  details?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
}

interface EnrichedAuditLog extends AuditLog {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  metadata: {
    ageInMinutes: number;
    ageInHours: number;
    ageInDays: number;
    ageText: string;
    severityLevel: number;
    isCreate: boolean;
    isUpdate: boolean;
    isDelete: boolean;
    isRead: boolean;
    isLogin: boolean;
    isLogout: boolean;
    isAccess: boolean;
    entityType: string;
    entityId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    location: string | null;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const entity = searchParams.get('entity');
    const userId = searchParams.get('userId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const severity = searchParams.get('severity');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    // Get all data
    const auditLogs = db.auditLogs || [];
    const users = db.users || [];
    
    // Filter audit logs based on parameters
    let filteredLogs = auditLogs;
    
    if (action) {
      filteredLogs = filteredLogs.filter((log: AuditLog) => log.action === action);
    }
    
    if (entity) {
      filteredLogs = filteredLogs.filter((log: AuditLog) => log.entity === entity);
    }
    
    if (userId) {
      filteredLogs = filteredLogs.filter((log: AuditLog) => log.userId === userId);
    }
    
    if (severity) {
      filteredLogs = filteredLogs.filter((log: AuditLog) => log.severity === severity);
    }
    
    if (dateFrom || dateTo) {
      const fromDate = dateFrom ? new Date(dateFrom) : new Date(0);
      const toDate = dateTo ? new Date(dateTo) : new Date();
      
            filteredLogs = filteredLogs.filter((log: AuditLog) => {      
        const logDate = new Date(log.timestamp || log.createdAt || new Date().toISOString());  
        return logDate >= fromDate && logDate <= toDate;
      });
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredLogs = filteredLogs.filter((log: AuditLog) => 
        log.description?.toLowerCase().includes(searchLower) ||
        log.details?.toLowerCase().includes(searchLower) ||
        log.entity?.toLowerCase().includes(searchLower) ||
        log.action?.toLowerCase().includes(searchLower)
      );
    }

    // Enrich audit log data with additional information
    const enrichedLogs = filteredLogs.map((log: AuditLog) => {
      const user = users.find((u: User) => u.id === log.userId);
      
             // Calculate log age
       const logDate = new Date(log.timestamp || log.createdAt || new Date().toISOString());
      const today = new Date();
      const ageInMinutes = Math.floor((today.getTime() - logDate.getTime()) / (1000 * 60));
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
      
      // Calculate severity level
      const severityLevel = log.severity === 'critical' ? 4 : 
                           log.severity === 'high' ? 3 : 
                           log.severity === 'medium' ? 2 : 1;
      
      // Calculate action type
      const isCreate = log.action === 'create';
      const isUpdate = log.action === 'update';
      const isDelete = log.action === 'delete';
      const isRead = log.action === 'read';
      const isLogin = log.action === 'login';
      const isLogout = log.action === 'logout';
      const isAccess = log.action === 'access';
      
      // Calculate entity type
      const entityType = log.entity || 'unknown';
      const entityId = log.entityId || null;
      
      // Calculate IP and location info
      const ipAddress = log.ipAddress || null;
      const userAgent = log.userAgent || null;
      const location = log.location || null;

      return {
        ...log,
        user: user ? {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          role: user.role
        } : null,
        metadata: {
          ageInMinutes,
          ageInHours,
          ageInDays,
          ageText,
          severityLevel,
          isCreate,
          isUpdate,
          isDelete,
          isRead,
          isLogin,
          isLogout,
          isAccess,
          entityType,
          entityId,
          ipAddress,
          userAgent,
          location
        }
      };
    });

         // Sort logs by timestamp (newest first)
     enrichedLogs.sort((a: EnrichedAuditLog, b: EnrichedAuditLog) => 
       new Date(b.timestamp || b.createdAt || new Date().toISOString()).getTime() - new Date(a.timestamp || a.createdAt || new Date().toISOString()).getTime()
     );

    // Apply pagination
    const paginatedLogs = enrichedLogs.slice(offset, offset + limit);

    // Calculate audit log summary
    const totalLogs = enrichedLogs.length;
    const criticalLogs = enrichedLogs.filter((log: EnrichedAuditLog) => log.severity === 'critical').length;
    const highLogs = enrichedLogs.filter((log: EnrichedAuditLog) => log.severity === 'high').length;
    const mediumLogs = enrichedLogs.filter((log: EnrichedAuditLog) => log.severity === 'medium').length;
    const lowLogs = enrichedLogs.filter((log: EnrichedAuditLog) => log.severity === 'low').length;
    
    const createActions = enrichedLogs.filter((log: EnrichedAuditLog) => log.action === 'create').length;
    const updateActions = enrichedLogs.filter((log: EnrichedAuditLog) => log.action === 'update').length;
    const deleteActions = enrichedLogs.filter((log: EnrichedAuditLog) => log.action === 'delete').length;
    const readActions = enrichedLogs.filter((log: EnrichedAuditLog) => log.action === 'read').length;
    const loginActions = enrichedLogs.filter((log: EnrichedAuditLog) => log.action === 'login').length;
    const logoutActions = enrichedLogs.filter((log: EnrichedAuditLog) => log.action === 'logout').length;
    const accessActions = enrichedLogs.filter((log: EnrichedAuditLog) => log.action === 'access').length;
    
    const userLogs = enrichedLogs.filter((log: EnrichedAuditLog) => log.entity === 'user').length;
    const tripLogs = enrichedLogs.filter((log: EnrichedAuditLog) => log.entity === 'trip').length;
    const bookingLogs = enrichedLogs.filter((log: EnrichedAuditLog) => log.entity === 'booking').length;
    const paymentLogs = enrichedLogs.filter((log: EnrichedAuditLog) => log.entity === 'payment').length;
    const busLogs = enrichedLogs.filter((log: EnrichedAuditLog) => log.entity === 'bus').length;
    const routeLogs = enrichedLogs.filter((log: EnrichedAuditLog) => log.entity === 'route').length;
    const maintenanceLogs = enrichedLogs.filter((log: EnrichedAuditLog) => log.entity === 'maintenance').length;
    const settingLogs = enrichedLogs.filter((log: EnrichedAuditLog) => log.entity === 'setting').length;
    
    const uniqueUsers = new Set(enrichedLogs.map((log: EnrichedAuditLog) => log.userId)).size;
    const uniqueIPs = new Set(enrichedLogs.filter((log: EnrichedAuditLog) => log.ipAddress).map((log: EnrichedAuditLog) => log.ipAddress)).size;
    
    // Calculate security metrics
    const suspiciousActivities = enrichedLogs.filter((log: EnrichedAuditLog) => 
      log.severity === 'critical' || 
      log.action === 'delete' || 
      log.action === 'access' ||
      log.details?.toLowerCase().includes('failed') ||
      log.details?.toLowerCase().includes('unauthorized')
    ).length;
    
    const securityScore = totalLogs > 0 ? 
      Math.max(0, 100 - (suspiciousActivities / totalLogs) * 100) : 100;

    const summary = {
      totalLogs,
      criticalLogs,
      highLogs,
      mediumLogs,
      lowLogs,
      createActions,
      updateActions,
      deleteActions,
      readActions,
      loginActions,
      logoutActions,
      accessActions,
      userLogs,
      tripLogs,
      bookingLogs,
      paymentLogs,
      busLogs,
      routeLogs,
      maintenanceLogs,
      settingLogs,
      uniqueUsers,
      uniqueIPs,
      suspiciousActivities,
      securityScore: Math.round(securityScore * 100) / 100,
      pagination: {
        limit,
        offset,
        total: totalLogs,
        hasMore: offset + limit < totalLogs
      }
    };

    return NextResponse.json({
      logs: paginatedLogs,
      summary
    });
     } catch (error) {
     console.error('Error fetching audit logs:', error);
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
    
    // Generate new audit log ID
    const newLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...body,
      severity: body.severity || 'low',
      timestamp: body.timestamp || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      ipAddress: body.ipAddress || null,
      userAgent: body.userAgent || null,
      location: body.location || null
    };
    
    if (!db.auditLogs) {
      db.auditLogs = [];
    }
    
    db.auditLogs.push(newLog);
    
    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json(newLog, { status: 201 });
     } catch (error) {
     console.error('Error creating audit log:', error);
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
        { error: 'Audit log ID is required' },
        { status: 400 }
      );
    }
    
    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    if (!db.auditLogs) {
      return NextResponse.json(
        { error: 'No audit logs found' },
        { status: 404 }
      );
    }
    
        const logIndex = db.auditLogs.findIndex((log: AuditLog) => log.id === id);

    if (logIndex === -1) {
      return NextResponse.json(
        { error: 'Audit log not found' },
        { status: 404 }
      );
    }

    // Update audit log
    const updatedLog = {
      ...db.auditLogs[logIndex],
      ...body,
      updatedAt: new Date().toISOString()
    };

    db.auditLogs[logIndex] = updatedLog;

    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));

    return NextResponse.json(updatedLog);
     } catch (error) {
     console.error('Error updating audit log:', error);
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
        { error: 'Audit log ID is required' },
        { status: 400 }
      );
    }

    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    if (!db.auditLogs) {
      return NextResponse.json(
        { error: 'No audit logs found' },
        { status: 404 }
      );
    }

    const logIndex = db.auditLogs.findIndex((log: AuditLog) => log.id === id);
    
    if (logIndex === -1) {
      return NextResponse.json(
        { error: 'Audit log not found' },
        { status: 404 }
      );
    }
    
    // Remove audit log
    const deletedLog = db.auditLogs.splice(logIndex, 1)[0];
    
    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json({ message: 'Audit log deleted successfully', deletedLog });
     } catch (error) {
     console.error('Error deleting audit log:', error);
     return NextResponse.json(
       { error: 'Internal server error' },
       { status: 500 }
     );
   }
}
