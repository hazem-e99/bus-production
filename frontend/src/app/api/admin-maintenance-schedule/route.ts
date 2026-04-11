import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface Bus {
  id: string;
  number: string;
  model: string;
  capacity: number;
  status: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
}

interface MaintenanceRecord {
  id: string;
  type: string;
  status: string;
  priority: string;
  busId: string;
  scheduledDate?: string;
  createdAt?: string;
  date?: string;
  completedDate?: string;
  actualCost: number;
  description: string;
}

interface Trip {
  id: string;
  busId: string;
  status: string;
  estimatedDistance?: number;
}

interface MaintenanceScheduleItem {
  busId: string;
  busNumber: string;
  busModel: string;
  capacity: number;
  status: string;
  lastMaintenance: Date | null;
  nextMaintenance: Date | null;
  daysSinceLastMaintenance: number | null;
  daysUntilNextMaintenance: number | null;
  maintenanceStatus: string;
  maintenancePriority: string;
  totalTrips: number;
  completedTrips: number;
  activeTrips: number;
  completionRate: number;
  estimatedMileage: number;
  totalMaintenanceCost: number;
  averageMaintenanceCost: number;
  recentMaintenance: any[];
  upcomingMaintenance: any[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const busId = searchParams.get('busId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    // Get all data
    const buses = db.buses || [];
    const maintenance = db.maintenance || [];
    const trips = db.trips || [];
    const users = db.users || [];
    
    // Filter data based on parameters
    let filteredBuses = buses;
    let filteredMaintenance = maintenance;
    
    if (busId) {
      filteredBuses = filteredBuses.filter((bus: Bus) => bus.id === busId);
    }
    
    if (type) {
      filteredMaintenance = filteredMaintenance.filter((m: MaintenanceRecord) => m.type === type);
    }
    
    if (status) {
      filteredMaintenance = filteredMaintenance.filter((m: MaintenanceRecord) => m.status === status);
    }
    
    if (dateFrom || dateTo) {
      const fromDate = dateFrom ? new Date(dateFrom) : new Date(0);
      const toDate = dateTo ? new Date(dateTo) : new Date();
      
      filteredMaintenance = filteredMaintenance.filter((record: MaintenanceRecord) => {
        const maintenanceDate = new Date(record.scheduledDate || record.createdAt || record.date || new Date().toISOString());
        return maintenanceDate >= fromDate && maintenanceDate <= toDate;
      });
    }

    // Generate maintenance schedule for each bus
    const maintenanceSchedule = filteredBuses.map((bus: Bus) => {
      const busMaintenance = filteredMaintenance.filter((m: MaintenanceRecord) => m.busId === bus.id);
      const busTrips = trips.filter((t: Trip) => t.busId === bus.id);
      
      // Calculate maintenance intervals
      const lastMaintenance = bus.lastMaintenance ? new Date(bus.lastMaintenance) : null;
      const nextMaintenance = bus.nextMaintenance ? new Date(bus.nextMaintenance) : null;
      
      // Calculate days since last maintenance
      let daysSinceLastMaintenance = null;
      if (lastMaintenance) {
        const today = new Date();
        daysSinceLastMaintenance = Math.floor((today.getTime() - lastMaintenance.getTime()) / (1000 * 60 * 60 * 24));
      }
      
      // Calculate days until next maintenance
      let daysUntilNextMaintenance = null;
      if (nextMaintenance) {
        const today = new Date();
        daysUntilNextMaintenance = Math.floor((nextMaintenance.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }
      
      // Calculate maintenance status
      let maintenanceStatus = 'up_to_date';
      let maintenancePriority = 'low';
      
      if (daysSinceLastMaintenance !== null) {
        if (daysSinceLastMaintenance > 90) { // Over 3 months
          maintenanceStatus = 'overdue';
          maintenancePriority = 'critical';
        } else if (daysSinceLastMaintenance > 60) { // Over 2 months
          maintenanceStatus = 'due_soon';
          maintenancePriority = 'high';
        } else if (daysSinceLastMaintenance > 30) { // Over 1 month
          maintenanceStatus = 'approaching';
          maintenancePriority = 'medium';
        }
      }
      
      // Calculate bus utilization
      const totalTrips = busTrips.length;
      const completedTrips = busTrips.filter((t: Trip) => t.status === 'completed').length;
      const activeTrips = busTrips.filter((t: Trip) => t.status === 'active').length;
      
      // Calculate mileage (estimated based on trips and routes)
      const estimatedMileage = busTrips.reduce((total: number, trip: Trip) => {
        // This would need route distance data for accurate calculation
        return total + (trip.estimatedDistance || 50); // Default 50km per trip
      }, 0);
      
             // Get recent maintenance records
       const recentMaintenance = busMaintenance
         .sort((a: MaintenanceRecord, b: MaintenanceRecord) => new Date(b.createdAt || b.date || new Date().toISOString()).getTime() - new Date(a.createdAt || a.date || new Date().toISOString()).getTime())
         .slice(0, 5);
      
      // Calculate maintenance costs
      const totalMaintenanceCost = busMaintenance
        .filter((m: MaintenanceRecord) => m.status === 'completed')
        .reduce((sum: number, m: MaintenanceRecord) => sum + (m.actualCost || 0), 0);
      
      const averageMaintenanceCost = busMaintenance.filter((m: MaintenanceRecord) => m.status === 'completed').length > 0 ? 
        totalMaintenanceCost / busMaintenance.filter((m: MaintenanceRecord) => m.status === 'completed').length : 0;

      return {
        busId: bus.id,
        busNumber: bus.number,
        busModel: bus.model,
        capacity: bus.capacity,
        status: bus.status,
        lastMaintenance,
        nextMaintenance,
        daysSinceLastMaintenance,
        daysUntilNextMaintenance,
        maintenanceStatus,
        maintenancePriority,
        totalTrips,
        completedTrips,
        activeTrips,
        completionRate: totalTrips > 0 ? (completedTrips / totalTrips) * 100 : 0,
        estimatedMileage,
        totalMaintenanceCost,
        averageMaintenanceCost: Math.round(averageMaintenanceCost * 100) / 100,
        recentMaintenance: recentMaintenance.map((m: MaintenanceRecord) => ({
          id: m.id,
          type: m.type,
          status: m.status,
          priority: m.priority,
          scheduledDate: m.scheduledDate,
          completedDate: m.completedDate,
          actualCost: m.actualCost,
          description: m.description
        })),
                 upcomingMaintenance: busMaintenance
           .filter((m: MaintenanceRecord) => m.status === 'open' || m.status === 'scheduled')
           .sort((a: MaintenanceRecord, b: MaintenanceRecord) => new Date(a.scheduledDate || a.createdAt || new Date().toISOString()).getTime() - new Date(b.scheduledDate || b.createdAt || new Date().toISOString()).getTime())
           .slice(0, 3)
      };
    });

         // Sort by maintenance priority and status
     maintenanceSchedule.sort((a: MaintenanceScheduleItem, b: MaintenanceScheduleItem) => {
       const priorityOrder: Record<string, number> = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
       const statusOrder: Record<string, number> = { 'overdue': 4, 'due_soon': 3, 'approaching': 2, 'up_to_date': 1 };
       
       if (a.maintenancePriority !== b.maintenancePriority) {
         return priorityOrder[b.maintenancePriority] - priorityOrder[a.maintenancePriority];
       }
       return statusOrder[b.maintenanceStatus] - statusOrder[a.maintenanceStatus];
     });

         // Calculate overall schedule summary
     const totalBuses = maintenanceSchedule.length;
     const overdueMaintenance = maintenanceSchedule.filter((b: MaintenanceScheduleItem) => b.maintenanceStatus === 'overdue').length;
     const dueSoonMaintenance = maintenanceSchedule.filter((b: MaintenanceScheduleItem) => b.maintenanceStatus === 'due_soon').length;
     const approachingMaintenance = maintenanceSchedule.filter((b: MaintenanceScheduleItem) => b.maintenanceStatus === 'approaching').length;
     const upToDateMaintenance = maintenanceSchedule.filter((b: MaintenanceScheduleItem) => b.maintenanceStatus === 'up_to_date').length;
     
     const criticalPriority = maintenanceSchedule.filter((b: MaintenanceScheduleItem) => b.maintenancePriority === 'critical').length;
     const highPriority = maintenanceSchedule.filter((b: MaintenanceScheduleItem) => b.maintenancePriority === 'high').length;
     const mediumPriority = maintenanceSchedule.filter((b: MaintenanceScheduleItem) => b.maintenancePriority === 'medium').length;
     const lowPriority = maintenanceSchedule.filter((b: MaintenanceScheduleItem) => b.maintenancePriority === 'low').length;
     
     const totalMaintenanceCost = maintenanceSchedule.reduce((sum: number, b: MaintenanceScheduleItem) => sum + b.totalMaintenanceCost, 0);
    const averageMaintenanceCost = totalBuses > 0 ? totalMaintenanceCost / totalBuses : 0;

    const summary = {
      totalBuses,
      overdueMaintenance,
      dueSoonMaintenance,
      approachingMaintenance,
      upToDateMaintenance,
      criticalPriority,
      highPriority,
      mediumPriority,
      lowPriority,
      totalMaintenanceCost,
      averageMaintenanceCost: Math.round(averageMaintenanceCost * 100) / 100,
      maintenanceEfficiency: totalBuses > 0 ? (upToDateMaintenance / totalBuses) * 100 : 0
    };

    return NextResponse.json({
      schedule: maintenanceSchedule,
      summary
    });
  } catch (error) {
    console.error('Error fetching maintenance schedule:', error);
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
    
    // Generate new maintenance schedule record ID
    const newSchedule = {
      id: `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...body,
      status: body.status || 'scheduled',
      priority: body.priority || 'medium',
      type: body.type || 'preventive',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (!db.maintenanceSchedule) {
      db.maintenanceSchedule = [];
    }
    
    db.maintenanceSchedule.push(newSchedule);
    
    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json(newSchedule, { status: 201 });
  } catch (error) {
    console.error('Error creating maintenance schedule:', error);
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
        { error: 'Schedule ID is required' },
        { status: 400 }
      );
    }
    
    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    if (!db.maintenanceSchedule) {
      return NextResponse.json(
        { error: 'No maintenance schedule found' },
        { status: 404 }
      );
    }
    
    const scheduleIndex = db.maintenanceSchedule.findIndex((s: MaintenanceRecord) => s.id === id);
    
    if (scheduleIndex === -1) {
      return NextResponse.json(
        { error: 'Maintenance schedule not found' },
        { status: 404 }
      );
    }
    
    // Update maintenance schedule
    const updatedSchedule = {
      ...db.maintenanceSchedule[scheduleIndex],
      ...body,
      updatedAt: new Date().toISOString()
    };
    
    db.maintenanceSchedule[scheduleIndex] = updatedSchedule;
    
    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json(updatedSchedule);
  } catch (error) {
    console.error('Error updating maintenance schedule:', error);
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
        { error: 'Schedule ID is required' },
        { status: 400 }
      );
    }
    
    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    if (!db.maintenanceSchedule) {
      return NextResponse.json(
        { error: 'No maintenance schedule found' },
        { status: 404 }
      );
    }
    
    const scheduleIndex = db.maintenanceSchedule.findIndex((s: MaintenanceRecord) => s.id === id);
    
    if (scheduleIndex === -1) {
      return NextResponse.json(
        { error: 'Maintenance schedule not found' },
        { status: 404 }
      );
    }
    
    // Remove maintenance schedule
    const deletedSchedule = db.maintenanceSchedule.splice(scheduleIndex, 1)[0];
    
    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
    
    return NextResponse.json({ message: 'Maintenance schedule deleted successfully', deletedSchedule });
  } catch (error) {
    console.error('Error deleting maintenance schedule:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
