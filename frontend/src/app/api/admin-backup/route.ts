import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface Backup {
  id: string;
  type: string;
  status: string;
  createdAt?: string;
  date?: string;
  estimatedSize?: number;
  actualSize?: number;
}

interface EnrichedBackup extends Backup {
  metadata: {
    ageInMinutes: number;
    ageInHours: number;
    ageInDays: number;
    ageText: string;
    isSuccessful: boolean;
    isFailed: boolean;
    isInProgress: boolean;
    isPending: boolean;
    estimatedSize: number;
    actualSize: number;
    compressionRatio: number;
    isFullBackup: boolean;
    isIncrementalBackup: boolean;
    isDifferentialBackup: boolean;
    isScheduledBackup: boolean;
    isManualBackup: boolean;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    // Get all data
    const backups = db.backups || [];
    
    // Filter backups based on parameters
    let filteredBackups = backups;
    
    if (type) {
      filteredBackups = filteredBackups.filter((backup: Backup) => backup.type === type);
    }
    
    if (dateFrom || dateTo) {
      const fromDate = dateFrom ? new Date(dateFrom) : new Date(0);
      const toDate = dateTo ? new Date(dateTo) : new Date();
      
            filteredBackups = filteredBackups.filter((backup: Backup) => {
        const backupDate = new Date(backup.createdAt || backup.date || new Date().toISOString());
        return backupDate >= fromDate && backupDate <= toDate;     
      });
    }

    // Enrich backup data with additional information
    const enrichedBackups = filteredBackups.map((backup: Backup) => {
             // Calculate backup age
       const backupDate = new Date(backup.createdAt || backup.date || new Date().toISOString());
      const today = new Date();
      const ageInMinutes = Math.floor((today.getTime() - backupDate.getTime()) / (1000 * 60));
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
      
      // Calculate backup status
      const isSuccessful = backup.status === 'successful';
      const isFailed = backup.status === 'failed';
      const isInProgress = backup.status === 'in_progress';
      const isPending = backup.status === 'pending';
      
      // Calculate backup size (estimated)
      const estimatedSize = backup.estimatedSize || 0;
      const actualSize = backup.actualSize || 0;
      const compressionRatio = actualSize > 0 && estimatedSize > 0 ? 
        ((estimatedSize - actualSize) / estimatedSize) * 100 : 0;
      
      // Calculate backup type details
      const isFullBackup = backup.type === 'full';
      const isIncrementalBackup = backup.type === 'incremental';
      const isDifferentialBackup = backup.type === 'differential';
      const isScheduledBackup = backup.type === 'scheduled';
      const isManualBackup = backup.type === 'manual';

      return {
        ...backup,
        metadata: {
          ageInMinutes,
          ageInHours,
          ageInDays,
          ageText,
          isSuccessful,
          isFailed,
          isInProgress,
          isPending,
          estimatedSize,
          actualSize,
          compressionRatio: Math.round(compressionRatio * 100) / 100,
          isFullBackup,
          isIncrementalBackup,
          isDifferentialBackup,
          isScheduledBackup,
          isManualBackup
        }
      };
    });

         // Sort backups by date (newest first)
     enrichedBackups.sort((a: EnrichedBackup, b: EnrichedBackup) => 
       new Date(b.createdAt || b.date || new Date().toISOString()).getTime() - new Date(a.createdAt || a.date || new Date().toISOString()).getTime()
     );

    // Calculate backup summary
    const totalBackups = enrichedBackups.length;
    const successfulBackups = enrichedBackups.filter((b: EnrichedBackup) => b.status === 'successful').length;
    const failedBackups = enrichedBackups.filter((b: EnrichedBackup) => b.status === 'failed').length;
    const inProgressBackups = enrichedBackups.filter((b: EnrichedBackup) => b.status === 'in_progress').length;
    const pendingBackups = enrichedBackups.filter((b: EnrichedBackup) => b.status === 'pending').length;
    
    const fullBackups = enrichedBackups.filter((b: EnrichedBackup) => b.type === 'full').length;
    const incrementalBackups = enrichedBackups.filter((b: EnrichedBackup) => b.type === 'incremental').length;
    const differentialBackups = enrichedBackups.filter((b: EnrichedBackup) => b.type === 'differential').length;
    const scheduledBackups = enrichedBackups.filter((b: EnrichedBackup) => b.type === 'scheduled').length;
    const manualBackups = enrichedBackups.filter((b: EnrichedBackup) => b.type === 'manual').length;
    
    const totalEstimatedSize = enrichedBackups.reduce((sum: number, b: EnrichedBackup) => sum + (b.metadata.estimatedSize || 0), 0);
    const totalActualSize = enrichedBackups.reduce((sum: number, b: EnrichedBackup) => sum + (b.metadata.actualSize || 0), 0);
    const totalCompressionRatio = totalEstimatedSize > 0 ? 
      ((totalEstimatedSize - totalActualSize) / totalEstimatedSize) * 100 : 0;
    
    const successRate = totalBackups > 0 ? (successfulBackups / totalBackups) * 100 : 0;
    const averageCompressionRatio = enrichedBackups.length > 0 ? 
      enrichedBackups.reduce((sum: number, b: EnrichedBackup) => sum + b.metadata.compressionRatio, 0) / enrichedBackups.length : 0;

    const summary = {
      totalBackups,
      successfulBackups,
      failedBackups,
      inProgressBackups,
      pendingBackups,
      successRate: Math.round(successRate * 100) / 100,
      fullBackups,
      incrementalBackups,
      differentialBackups,
      scheduledBackups,
      manualBackups,
      totalEstimatedSize,
      totalActualSize,
      totalCompressionRatio: Math.round(totalCompressionRatio * 100) / 100,
      averageCompressionRatio: Math.round(averageCompressionRatio * 100) / 100
    };

    return NextResponse.json({
      backups: enrichedBackups,
      summary
    });
     } catch (error) {
     console.error('Error fetching backup data:', error);
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
    
    // Generate new backup ID
    const newBackup = {
      id: `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...body,
      status: body.status || 'pending',
      type: body.type || 'manual',
      createdAt: new Date().toISOString(),
      estimatedSize: body.estimatedSize || 0,
      actualSize: body.actualSize || 0
    };
    
    if (!db.backups) {
      db.backups = [];
    }
    
    db.backups.push(newBackup);
    
    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json(newBackup, { status: 201 });
     } catch (error) {
     console.error('Error creating backup:', error);
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
        { error: 'Backup ID is required' },
        { status: 400 }
      );
    }
    
    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    if (!db.backups) {
      return NextResponse.json(
        { error: 'No backups found' },
        { status: 404 }
      );
    }
    
    const backupIndex = db.backups.findIndex((b: Backup) => b.id === id);
    
    if (backupIndex === -1) {
      return NextResponse.json(
        { error: 'Backup not found' },
        { status: 404 }
      );
    }
    
    // Update backup
    const updatedBackup = {
      ...db.backups[backupIndex],
      ...body,
      updatedAt: new Date().toISOString()
    };
    
    db.backups[backupIndex] = updatedBackup;
    
    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json(updatedBackup);
     } catch (error) {
     console.error('Error updating backup:', error);
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
        { error: 'Backup ID is required' },
        { status: 400 }
      );
    }
    
    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    if (!db.backups) {
      return NextResponse.json(
        { error: 'No backups found' },
        { status: 404 }
      );
    }
    
    const backupIndex = db.backups.findIndex((b: Backup) => b.id === id);
    
    if (backupIndex === -1) {
      return NextResponse.json(
        { error: 'Backup not found' },
        { status: 404 }
      );
    }
    
    // Remove backup
    const deletedBackup = db.backups.splice(backupIndex, 1)[0];
    
    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json({ message: 'Backup deleted successfully', deletedBackup });
     } catch (error) {
     console.error('Error deleting backup:', error);
     return NextResponse.json(
       { error: 'Internal server error' },
       { status: 500 }
     );
   }
}
