import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface MaintenanceRecord {
  id: string;
  status: string;
  type: string;
  priority: string;
  busId: string;
  assignedTo?: string;
  reportedBy?: string;
  title?: string;
  description?: string;
  createdAt?: string;
  date?: string;
  estimatedCost?: number;
  actualCost?: number;
  estimatedDuration?: number;
  actualDuration?: number;
}

interface EnrichedMaintenance extends MaintenanceRecord {
  bus: {
    id: string;
    number: string;
    model: string;
    capacity: number;
    status: string;
    lastMaintenance?: string;
    nextMaintenance?: string;
  } | null;
  assignedUser: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
  } | null;
  reportedByUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  metrics: {
    ageInDays: number;
    priorityLevel: number;
    isOpen: boolean;
    isInProgress: boolean;
    isCompleted: boolean;
    isCancelled: boolean;
    estimatedCost: number;
    actualCost: number;
    costVariance: number;
    costVariancePercentage: number;
    estimatedDuration: number;
    actualDuration: number;
    timeVariance: number;
    timeVariancePercentage: number;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
}

interface Bus {
  id: string;
  number: string;
  model: string;
  capacity: number;
  status: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');
    const busId = searchParams.get('busId');
    const assignedTo = searchParams.get('assignedTo');
    const search = searchParams.get('search');

    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    // Get all data
    const maintenance = db.maintenance || [];
    const buses = db.buses || [];
    const users = db.users || [];
    
    // Filter maintenance records based on parameters
    let filteredMaintenance = maintenance;
    
    if (status) {
      filteredMaintenance = filteredMaintenance.filter((record: MaintenanceRecord) => record.status === status);
    }
    
    if (type) {
      filteredMaintenance = filteredMaintenance.filter((record: MaintenanceRecord) => record.type === type);
    }
    
    if (priority) {
      filteredMaintenance = filteredMaintenance.filter((record: MaintenanceRecord) => record.priority === priority);
    }
    
    if (busId) {
      filteredMaintenance = filteredMaintenance.filter((record: MaintenanceRecord) => record.busId === busId);
    }
    
    if (assignedTo) {
      filteredMaintenance = filteredMaintenance.filter((record: MaintenanceRecord) => record.assignedTo === assignedTo);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredMaintenance = filteredMaintenance.filter((record: MaintenanceRecord) => 
        record.title?.toLowerCase().includes(searchLower) ||
        record.description?.toLowerCase().includes(searchLower) ||
        record.type?.toLowerCase().includes(searchLower)
      );
    }

    // Enrich maintenance data with additional information
    const enrichedMaintenance = filteredMaintenance.map((record: MaintenanceRecord) => {
      const bus = buses.find((b: Bus) => b.id === record.busId);
      const assignedUser = users.find((u: User) => u.id === record.assignedTo);
      const reportedBy = users.find((u: User) => u.id === record.reportedBy);
      
             // Calculate maintenance age
       const maintenanceDate = new Date(record.createdAt || record.date || new Date().toISOString());
       const today = new Date();
       const ageInDays = Math.floor((today.getTime() - maintenanceDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate priority level
      const priorityLevel = record.priority === 'critical' ? 4 : 
                           record.priority === 'high' ? 3 : 
                           record.priority === 'medium' ? 2 : 1;
      
      // Calculate status metrics
      const isOpen = record.status === 'open';
      const isInProgress = record.status === 'in_progress';
      const isCompleted = record.status === 'completed';
      const isCancelled = record.status === 'cancelled';
      
      // Calculate cost metrics
      const estimatedCost = record.estimatedCost || 0;
      const actualCost = record.actualCost || 0;
      const costVariance = actualCost - estimatedCost;
      const costVariancePercentage = estimatedCost > 0 ? (costVariance / estimatedCost) * 100 : 0;
      
      // Calculate time metrics
      const estimatedDuration = record.estimatedDuration || 0; // in hours
      const actualDuration = record.actualDuration || 0; // in hours
      const timeVariance = actualDuration - estimatedDuration;
      const timeVariancePercentage = estimatedDuration > 0 ? (timeVariance / estimatedDuration) * 100 : 0;
      
      // Calculate bus details
      let busDetails = null;
      if (bus) {
        busDetails = {
          id: bus.id,
          number: bus.number,
          model: bus.model,
          capacity: bus.capacity,
          status: bus.status,
          lastMaintenance: bus.lastMaintenance,
          nextMaintenance: bus.nextMaintenance
        };
      }
      
      // Calculate assigned user details
      let assignedUserDetails = null;
      if (assignedUser) {
        assignedUserDetails = {
          id: assignedUser.id,
          name: assignedUser.name,
          email: assignedUser.email,
          phone: assignedUser.phone,
          role: assignedUser.role
        };
      }
      
      // Calculate reported by details
      let reportedByDetails = null;
      if (reportedBy) {
        reportedByDetails = {
          id: reportedBy.id,
          name: reportedBy.name,
          email: reportedBy.email,
          role: reportedBy.role
        };
      }

             return {
         ...record,
         bus: busDetails,
         assignedUser: assignedUserDetails,
         reportedByUser: reportedByDetails,
         metrics: {
          ageInDays,
          priorityLevel,
          isOpen,
          isInProgress,
          isCompleted,
          isCancelled,
          estimatedCost,
          actualCost,
          costVariance,
          costVariancePercentage: Math.round(costVariancePercentage * 100) / 100,
          estimatedDuration,
          actualDuration,
          timeVariance,
          timeVariancePercentage: Math.round(timeVariancePercentage * 100) / 100
        }
      };
    });

         // Sort maintenance by priority and date (highest priority and oldest first)
     enrichedMaintenance.sort((a: EnrichedMaintenance, b: EnrichedMaintenance) => {
       if (a.metrics.priorityLevel !== b.metrics.priorityLevel) {
         return b.metrics.priorityLevel - a.metrics.priorityLevel;
       }
       return new Date(a.createdAt || a.date || new Date().toISOString()).getTime() - new Date(b.createdAt || b.date || new Date().toISOString()).getTime();
     });

    // Calculate maintenance summary
    const totalMaintenance = enrichedMaintenance.length;
    const openMaintenance = enrichedMaintenance.filter((m: EnrichedMaintenance) => m.status === 'open').length;
    const inProgressMaintenance = enrichedMaintenance.filter((m: EnrichedMaintenance) => m.status === 'in_progress').length;
    const completedMaintenance = enrichedMaintenance.filter((m: EnrichedMaintenance) => m.status === 'completed').length;
    const cancelledMaintenance = enrichedMaintenance.filter((m: EnrichedMaintenance) => m.status === 'cancelled').length;
    
    const criticalMaintenance = enrichedMaintenance.filter((m: EnrichedMaintenance) => m.priority === 'critical').length;
    const highMaintenance = enrichedMaintenance.filter((m: EnrichedMaintenance) => m.priority === 'high').length;
    const mediumMaintenance = enrichedMaintenance.filter((m: EnrichedMaintenance) => m.priority === 'medium').length;
    const lowMaintenance = enrichedMaintenance.filter((m: EnrichedMaintenance) => m.priority === 'low').length;
    
    const preventiveMaintenance = enrichedMaintenance.filter((m: EnrichedMaintenance) => m.type === 'preventive').length;
    const correctiveMaintenance = enrichedMaintenance.filter((m: EnrichedMaintenance) => m.type === 'corrective').length;
    const emergencyMaintenance = enrichedMaintenance.filter((m: EnrichedMaintenance) => m.type === 'emergency').length;
    const inspectionMaintenance = enrichedMaintenance.filter((m: EnrichedMaintenance) => m.type === 'inspection').length;
    
         const totalEstimatedCost = enrichedMaintenance.reduce((sum: number, m: EnrichedMaintenance) => sum + (m.metrics.estimatedCost || 0), 0);
     const totalActualCost = enrichedMaintenance.reduce((sum: number, m: EnrichedMaintenance) => sum + (m.metrics.actualCost || 0), 0);
     const totalCostVariance = enrichedMaintenance.reduce((sum: number, m: EnrichedMaintenance) => sum + m.metrics.costVariance, 0);
     
     const totalEstimatedDuration = enrichedMaintenance.reduce((sum: number, m: EnrichedMaintenance) => sum + (m.metrics.estimatedDuration || 0), 0);
     const totalActualDuration = enrichedMaintenance.reduce((sum: number, m: EnrichedMaintenance) => sum + (m.metrics.actualDuration || 0), 0);
     const totalTimeVariance = enrichedMaintenance.reduce((sum: number, m: EnrichedMaintenance) => sum + m.metrics.timeVariance, 0);
    
    const completionRate = totalMaintenance > 0 ? (completedMaintenance / totalMaintenance) * 100 : 0;
    const averageCostVariance = enrichedMaintenance.length > 0 ? totalCostVariance / enrichedMaintenance.length : 0;
    const averageTimeVariance = enrichedMaintenance.length > 0 ? totalTimeVariance / enrichedMaintenance.length : 0;

    const summary = {
      totalMaintenance,
      openMaintenance,
      inProgressMaintenance,
      completedMaintenance,
      cancelledMaintenance,
      completionRate: Math.round(completionRate * 100) / 100,
      criticalMaintenance,
      highMaintenance,
      mediumMaintenance,
      lowMaintenance,
      preventiveMaintenance,
      correctiveMaintenance,
      emergencyMaintenance,
      inspectionMaintenance,
      totalEstimatedCost,
      totalActualCost,
      totalCostVariance,
      totalEstimatedDuration,
      totalActualDuration,
      totalTimeVariance,
      averageCostVariance: Math.round(averageCostVariance * 100) / 100,
      averageTimeVariance: Math.round(averageTimeVariance * 100) / 100
    };

    return NextResponse.json({
      maintenance: enrichedMaintenance,
      summary
    });
     } catch (error) {
     console.error('Error fetching maintenance data:', error);
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
    
    // Generate new maintenance record ID
    const newMaintenance = {
      id: `maintenance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...body,
      status: body.status || 'open',
      priority: body.priority || 'medium',
      type: body.type || 'corrective',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedCost: body.estimatedCost || 0,
      actualCost: body.actualCost || 0,
      estimatedDuration: body.estimatedDuration || 0,
      actualDuration: body.actualDuration || 0
    };
    
    if (!db.maintenance) {
      db.maintenance = [];
    }
    
    db.maintenance.push(newMaintenance);
    
    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json(newMaintenance, { status: 201 });
     } catch (error) {
     console.error('Error creating maintenance record:', error);
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
        { error: 'Maintenance ID is required' },
        { status: 400 }
      );
    }
    
    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    if (!db.maintenance) {
      return NextResponse.json(
        { error: 'No maintenance records found' },
        { status: 404 }
      );
    }
    
        const maintenanceIndex = db.maintenance.findIndex((m: MaintenanceRecord) => m.id === id);

    if (maintenanceIndex === -1) {
      return NextResponse.json(
        { error: 'Maintenance record not found' },
        { status: 404 }
      );
    }

    // Update maintenance record
    const updatedMaintenance = {
      ...db.maintenance[maintenanceIndex],
      ...body,
      updatedAt: new Date().toISOString()
    };

    db.maintenance[maintenanceIndex] = updatedMaintenance;

    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));

    return NextResponse.json(updatedMaintenance);
     } catch (error) {
     console.error('Error updating maintenance record:', error);
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
        { error: 'Maintenance ID is required' },
        { status: 400 }
      );
    }

    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    if (!db.maintenance) {
      return NextResponse.json(
        { error: 'No maintenance records found' },
        { status: 404 }
      );
    }

    const maintenanceIndex = db.maintenance.findIndex((m: MaintenanceRecord) => m.id === id);
    
    if (maintenanceIndex === -1) {
      return NextResponse.json(
        { error: 'Maintenance record not found' },
        { status: 404 }
      );
    }
    
    // Remove maintenance record
    const deletedMaintenance = db.maintenance.splice(maintenanceIndex, 1)[0];
    
    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json({ message: 'Maintenance record deleted successfully', deletedMaintenance });
     } catch (error) {
     console.error('Error deleting maintenance record:', error);
     return NextResponse.json(
       { error: 'Internal server error' },
       { status: 500 }
     );
   }
}
