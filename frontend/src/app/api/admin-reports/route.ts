import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface Trip {
  id: string;
  date: string;
  status: string;
  routeId: string;
  busId: string;
  driverId: string;
  supervisorId: string;
  scheduledTime?: string;
  actualStartTime?: string;
}

interface Booking {
  id: string;
  date: string;
  status: string;
  studentId: string;
  tripId: string;
}

interface Payment {
  id: string;
  date: string;
  status: string;
  amount: number;
  tripId: string;
  bookingId: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  tripId: string;
}

interface MaintenanceRecord {
  id: string;
  status: string;
  priority: string;
  estimatedCost: number;
  actualCost: number;
  busId: string;
  createdAt?: string;
  date?: string;
}

interface Route {
  id: string;
  name: string;
}

interface Bus {
  id: string;
  number: string;
  status: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
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
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const routeId = searchParams.get('routeId');
    const busId = searchParams.get('busId');
    const driverId = searchParams.get('driverId');
    const supervisorId = searchParams.get('supervisorId');

    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    // Get all data
    const trips = db.trips || [];
    const routes = db.routes || [];
    const buses = db.buses || [];
    const users = db.users || [];
    const payments = db.payments || [];
    const bookings = db.bookings || [];
    const attendance = db.attendance || [];
    const maintenance = db.maintenance || [];
    
    // Filter data based on date range
    let filteredTrips = trips;
    let filteredBookings = bookings;
    let filteredPayments = payments;
    let filteredAttendance = attendance;
    let filteredMaintenance = maintenance;
    
    if (dateFrom || dateTo) {
      const fromDate = dateFrom ? new Date(dateFrom) : new Date(0);
      const toDate = dateTo ? new Date(dateTo) : new Date();
      
      filteredTrips = filteredTrips.filter((trip: Trip) => {
        const tripDate = new Date(trip.date);
        return tripDate >= fromDate && tripDate <= toDate;
      });
      
      filteredBookings = filteredBookings.filter((booking: Booking) => {
        const bookingDate = new Date(booking.date);
        return bookingDate >= fromDate && bookingDate <= toDate;
      });
      
      filteredPayments = filteredPayments.filter((payment: Payment) => {
        const paymentDate = new Date(payment.date);
        return paymentDate >= fromDate && paymentDate <= toDate;
      });
      
      filteredAttendance = filteredAttendance.filter((record: AttendanceRecord) => {
        const attendanceDate = new Date(record.date);
        return attendanceDate >= fromDate && attendanceDate <= toDate;
      });
      
      filteredMaintenance = filteredMaintenance.filter((record: MaintenanceRecord) => {
        const maintenanceDate = new Date(record.createdAt || record.date);
        return maintenanceDate >= fromDate && maintenanceDate <= toDate;
      });
    }
    
    // Filter by specific entities if provided
    if (routeId) {
      filteredTrips = filteredTrips.filter((trip: Trip) => trip.routeId === routeId);
    }
    
    if (busId) {
      filteredTrips = filteredTrips.filter((trip: Trip) => trip.busId === busId);
    }
    
    if (driverId) {
      filteredTrips = filteredTrips.filter((trip: Trip) => trip.driverId === driverId);
    }
    
    if (supervisorId) {
      filteredTrips = filteredTrips.filter((trip: Trip) => trip.supervisorId === supervisorId);
    }

    // Generate comprehensive reports based on type
    let reportData = {};
    
    if (!type || type === 'overview') {
      // Overview report
      reportData = generateOverviewReport(
        filteredTrips, filteredBookings, filteredPayments, 
        filteredAttendance, filteredMaintenance, routes, buses, users
      );
    } else if (type === 'financial') {
      // Financial report
      reportData = generateFinancialReport(
        filteredTrips, filteredPayments, filteredBookings, routes, buses
      );
    } else if (type === 'operational') {
      // Operational report
      reportData = generateOperationalReport(
        filteredTrips, filteredBookings, filteredAttendance, routes, buses, users
      );
    } else if (type === 'performance') {
      // Performance report
      reportData = generatePerformanceReport(
        filteredTrips, filteredAttendance, filteredMaintenance, routes, buses, users
      );
    } else if (type === 'maintenance') {
      // Maintenance report
      reportData = generateMaintenanceReport(
        filteredMaintenance, filteredTrips, buses, users
      );
    } else if (type === 'user') {
      // User activity report
      reportData = generateUserReport(
        filteredTrips, filteredBookings, filteredPayments, filteredAttendance, users
      );
    }

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Error generating reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to generate overview report
function generateOverviewReport(trips: Trip[], bookings: Booking[], payments: Payment[], attendance: AttendanceRecord[], maintenance: MaintenanceRecord[], routes: Route[], buses: Bus[], users: User[]) {
  const totalTrips = trips.length;
  const completedTrips = trips.filter((t: Trip) => t.status === 'completed').length;
  const activeTrips = trips.filter((t: Trip) => t.status === 'active').length;
  const scheduledTrips = trips.filter((t: Trip) => t.status === 'scheduled').length;
  
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter((b: Booking) => b.status === 'confirmed').length;
  const pendingBookings = bookings.filter((b: Booking) => b.status === 'pending').length;
  
  const totalRevenue = payments
    .filter((p: Payment) => p.status === 'completed')
    .reduce((sum: number, p: Payment) => sum + (p.amount || 0), 0);
  
  const totalAttendance = attendance.length;
  const presentAttendance = attendance.filter((a: AttendanceRecord) => a.status === 'present').length;
  const attendanceRate = totalAttendance > 0 ? (presentAttendance / totalAttendance) * 100 : 0;
  
  const totalMaintenance = maintenance.length;
  const openMaintenance = maintenance.filter((m: MaintenanceRecord) => m.status === 'open').length;
  const completedMaintenance = maintenance.filter((m: MaintenanceRecord) => m.status === 'completed').length;
  
  const totalRoutes = routes.length;
  const totalBuses = buses.length;
  const activeBuses = buses.filter((b: Bus) => b.status === 'active').length;
  
  const totalUsers = users.length;
  const students = users.filter((u: User) => u.role === 'student').length;
  const drivers = users.filter((u: User) => u.role === 'driver').length;
  const supervisors = users.filter((u: User) => u.role === 'supervisor').length;
  const admins = users.filter((u: User) => u.role === 'admin').length;

  return {
    type: 'overview',
    summary: {
      trips: {
        total: totalTrips,
        completed: completedTrips,
        active: activeTrips,
        scheduled: scheduledTrips,
        completionRate: totalTrips > 0 ? (completedTrips / totalTrips) * 100 : 0
      },
      bookings: {
        total: totalBookings,
        confirmed: confirmedBookings,
        pending: pendingBookings,
        confirmationRate: totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0
      },
      financial: {
        totalRevenue,
        averageRevenuePerTrip: totalTrips > 0 ? totalRevenue / totalTrips : 0
      },
      attendance: {
        total: totalAttendance,
        present: presentAttendance,
        rate: Math.round(attendanceRate * 100) / 100
      },
      maintenance: {
        total: totalMaintenance,
        open: openMaintenance,
        completed: completedMaintenance,
        completionRate: totalMaintenance > 0 ? (completedMaintenance / totalMaintenance) * 100 : 0
      },
      fleet: {
        totalRoutes,
        totalBuses,
        activeBuses,
        utilizationRate: totalBuses > 0 ? (activeBuses / totalBuses) * 100 : 0
      },
      users: {
        total: totalUsers,
        students,
        drivers,
        supervisors,
        admins
      }
    }
  };
}

// Helper function to generate financial report
function generateFinancialReport(trips: Trip[], payments: Payment[], bookings: Booking[], routes: Route[], buses: Bus[]) {
  const totalRevenue = payments
    .filter((p: Payment) => p.status === 'completed')
    .reduce((sum: number, p: Payment) => sum + (p.amount || 0), 0);
  
  const pendingRevenue = payments
    .filter((p: Payment) => p.status === 'pending')
    .reduce((sum: number, p: Payment) => sum + (p.amount || 0), 0);
  
  const failedRevenue = payments
    .filter((p: Payment) => p.status === 'failed')
    .reduce((sum: number, p: Payment) => sum + (p.amount || 0), 0);
  
  const totalTrips = trips.length;
  const revenuePerTrip = totalTrips > 0 ? totalRevenue / totalTrips : 0;
  
  // Revenue by route
  const revenueByRoute = routes.map((route: Route) => {
    const routeTrips = trips.filter((t: Trip) => t.routeId === route.id);
    const routePayments = payments.filter((p: Payment) => 
      routeTrips.some((t: Trip) => t.id === p.tripId)
    );
    const routeRevenue = routePayments
      .filter((p: Payment) => p.status === 'completed')
      .reduce((sum: number, p: Payment) => sum + (p.amount || 0), 0);
    
    return {
      routeId: route.id,
      routeName: route.name,
      trips: routeTrips.length,
      revenue: routeRevenue,
      averageRevenue: routeTrips.length > 0 ? routeRevenue / routeTrips.length : 0
    };
  });
  
  // Revenue by bus
  const revenueByBus = buses.map((bus: Bus) => {
    const busTrips = trips.filter((t: Trip) => t.busId === bus.id);
    const busPayments = payments.filter((p: Payment) => 
      busTrips.some((t: Trip) => t.id === p.tripId)
    );
    const busRevenue = busPayments
      .filter((p: Payment) => p.status === 'completed')
      .reduce((sum: number, p: Payment) => sum + (p.amount || 0), 0);
    
    return {
      busId: bus.id,
      busNumber: bus.number,
      trips: busTrips.length,
      revenue: busRevenue,
      averageRevenue: busTrips.length > 0 ? busRevenue / busTrips.length : 0
    };
  });

  return {
    type: 'financial',
    summary: {
      totalRevenue,
      pendingRevenue,
      failedRevenue,
      totalTrips,
      revenuePerTrip: Math.round(revenuePerTrip * 100) / 100,
      successRate: (totalRevenue + pendingRevenue + failedRevenue) > 0 ? 
        (totalRevenue / (totalRevenue + pendingRevenue + failedRevenue)) * 100 : 0
    },
    breakdown: {
      byRoute: revenueByRoute,
      byBus: revenueByBus
    }
  };
}

// Helper function to generate operational report
function generateOperationalReport(trips: Trip[], bookings: Booking[], attendance: AttendanceRecord[], routes: Route[], buses: Bus[], users: User[]) {
  const totalTrips = trips.length;
  const completedTrips = trips.filter((t: Trip) => t.status === 'completed').length;
  const cancelledTrips = trips.filter((t: Trip) => t.status === 'cancelled').length;
  
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter((b: Booking) => b.status === 'confirmed').length;
  const cancelledBookings = bookings.filter((b: Booking) => b.status === 'cancelled').length;
  
  const totalAttendance = attendance.length;
  const presentAttendance = attendance.filter((a: AttendanceRecord) => a.status === 'present').length;
  const absentAttendance = attendance.filter((a: AttendanceRecord) => a.status === 'absent').length;
  
  // Operational metrics by route
  const operationalByRoute = routes.map((route: Route) => {
    const routeTrips = trips.filter((t: Trip) => t.routeId === route.id);
    const routeBookings = bookings.filter((b: Booking) => 
      routeTrips.some((t: Trip) => t.id === b.tripId)
    );
    const routeAttendance = attendance.filter((a: AttendanceRecord) => 
      routeTrips.some((t: Trip) => t.id === a.tripId)
    );
    
    return {
      routeId: route.id,
      routeName: route.name,
      trips: routeTrips.length,
      completedTrips: routeTrips.filter((t: Trip) => t.status === 'completed').length,
      bookings: routeBookings.length,
      confirmedBookings: routeBookings.filter((b: Booking) => b.status === 'confirmed').length,
      attendance: routeAttendance.length,
      presentAttendance: routeAttendance.filter((a: AttendanceRecord) => a.status === 'present').length
    };
  });

  return {
    type: 'operational',
    summary: {
      trips: {
        total: totalTrips,
        completed: completedTrips,
        cancelled: cancelledTrips,
        completionRate: totalTrips > 0 ? (completedTrips / totalTrips) * 100 : 0
      },
      bookings: {
        total: totalBookings,
        confirmed: confirmedBookings,
        cancelled: cancelledBookings,
        confirmationRate: totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0
      },
      attendance: {
        total: totalAttendance,
        present: presentAttendance,
        absent: absentAttendance,
        rate: totalAttendance > 0 ? (presentAttendance / totalAttendance) * 100 : 0
      }
    },
    breakdown: {
      byRoute: operationalByRoute
    }
  };
}

// Helper function to generate performance report
function generatePerformanceReport(trips: Trip[], attendance: AttendanceRecord[], maintenance: MaintenanceRecord[], routes: Route[], buses: Bus[], users: User[]) {
  const totalTrips = trips.length;
  const onTimeTrips = trips.filter((t: Trip) => {
    if (!t.scheduledTime || !t.actualStartTime) return false;
    const scheduled = new Date(`2000-01-01T${t.scheduledTime}`);
    const actual = new Date(`2000-01-01T${t.actualStartTime}`);
    const diffMinutes = Math.abs(actual.getTime() - scheduled.getTime()) / (1000 * 60);
    return diffMinutes <= 5; // 5 minutes grace period
  }).length;
  
  const totalAttendance = attendance.length;
  const presentAttendance = attendance.filter((a: AttendanceRecord) => a.status === 'present').length;
  
  const totalMaintenance = maintenance.length;
  const completedMaintenance = maintenance.filter((m: MaintenanceRecord) => m.status === 'completed').length;
  
  // Performance by driver
  const performanceByDriver = users
    .filter((u: User) => u.role === 'driver')
    .map((driver: User) => {
      const driverTrips = trips.filter((t: Trip) => t.driverId === driver.id);
      const driverAttendance = attendance.filter((a: AttendanceRecord) => 
        driverTrips.some((t: Trip) => t.id === a.tripId)
      );
      
      const completedTrips = driverTrips.filter((t: Trip) => t.status === 'completed').length;
      const onTimeTrips = driverTrips.filter((t: Trip) => {
        if (!t.scheduledTime || !t.actualStartTime) return false;
        const scheduled = new Date(`2000-01-01T${t.scheduledTime}`);
        const actual = new Date(`2000-01-01T${t.actualStartTime}`);
        const diffMinutes = Math.abs(actual.getTime() - scheduled.getTime()) / (1000 * 60);
        return diffMinutes <= 5;
      }).length;
      
      const presentAttendance = driverAttendance.filter((a: AttendanceRecord) => a.status === 'present').length;
      
      return {
        driverId: driver.id,
        driverName: driver.name,
        totalTrips: driverTrips.length,
        completedTrips,
        onTimeTrips,
        completionRate: driverTrips.length > 0 ? (completedTrips / driverTrips.length) * 100 : 0,
        onTimeRate: driverTrips.length > 0 ? (onTimeTrips / driverTrips.length) * 100 : 0,
        attendance: driverAttendance.length,
        presentAttendance,
        attendanceRate: driverAttendance.length > 0 ? (presentAttendance / driverAttendance.length) * 100 : 0
      };
    });

  return {
    type: 'performance',
    summary: {
      trips: {
        total: totalTrips,
        onTime: onTimeTrips,
        onTimeRate: totalTrips > 0 ? (onTimeTrips / totalTrips) * 100 : 0
      },
      attendance: {
        total: totalAttendance,
        present: presentAttendance,
        rate: totalAttendance > 0 ? (presentAttendance / totalAttendance) * 100 : 0
      },
      maintenance: {
        total: totalMaintenance,
        completed: completedMaintenance,
        completionRate: totalMaintenance > 0 ? (completedMaintenance / totalMaintenance) * 100 : 0
      }
    },
    breakdown: {
      byDriver: performanceByDriver
    }
  };
}

// Helper function to generate maintenance report
function generateMaintenanceReport(maintenance: MaintenanceRecord[], trips: Trip[], buses: Bus[], users: User[]) {
  const totalMaintenance = maintenance.length;
  const openMaintenance = maintenance.filter((m: MaintenanceRecord) => m.status === 'open').length;
  const inProgressMaintenance = maintenance.filter((m: MaintenanceRecord) => m.status === 'in_progress').length;
  const completedMaintenance = maintenance.filter((m: MaintenanceRecord) => m.status === 'completed').length;
  
  const criticalMaintenance = maintenance.filter((m: MaintenanceRecord) => m.priority === 'critical').length;
  const highMaintenance = maintenance.filter((m: MaintenanceRecord) => m.priority === 'high').length;
  
  const totalEstimatedCost = maintenance.reduce((sum: number, m: MaintenanceRecord) => sum + (m.estimatedCost || 0), 0);
  const totalActualCost = maintenance.reduce((sum: number, m: MaintenanceRecord) => sum + (m.actualCost || 0), 0);
  
  // Maintenance by bus
  const maintenanceByBus = buses.map((bus: Bus) => {
    const busMaintenance = maintenance.filter((m: MaintenanceRecord) => m.busId === bus.id);
    const busTrips = trips.filter((t: Trip) => t.busId === bus.id);
    
    return {
      busId: bus.id,
      busNumber: bus.number,
      maintenanceCount: busMaintenance.length,
      openMaintenance: busMaintenance.filter((m: MaintenanceRecord) => m.status === 'open').length,
      criticalMaintenance: busMaintenance.filter((m: MaintenanceRecord) => m.priority === 'critical').length,
      trips: busTrips.length,
      lastMaintenance: bus.lastMaintenance,
      nextMaintenance: bus.nextMaintenance
    };
  });

  return {
    type: 'maintenance',
    summary: {
      total: totalMaintenance,
      open: openMaintenance,
      inProgress: inProgressMaintenance,
      completed: completedMaintenance,
      critical: criticalMaintenance,
      high: highMaintenance,
      estimatedCost: totalEstimatedCost,
      actualCost: totalActualCost,
      costVariance: totalActualCost - totalEstimatedCost
    },
    breakdown: {
      byBus: maintenanceByBus
    }
  };
}

// Helper function to generate user activity report
function generateUserReport(trips: Trip[], bookings: Booking[], payments: Payment[], attendance: AttendanceRecord[], users: User[]) {
  const students = users.filter((u: User) => u.role === 'student');
  const drivers = users.filter((u: User) => u.role === 'driver');
  const supervisors = users.filter((u: User) => u.role === 'supervisor');
  
  // Student activity
  const studentActivity = students.map((student: User) => {
    const studentBookings = bookings.filter((b: Booking) => b.studentId === student.id);
    const studentPayments = payments.filter((p: Payment) => 
      studentBookings.some((b: Booking) => b.id === p.bookingId)
    );
    const studentAttendance = attendance.filter((a: AttendanceRecord) => 
      studentBookings.some((b: Booking) => b.tripId === a.tripId)
    );
    
    return {
      studentId: student.id,
      studentName: student.name,
      bookings: studentBookings.length,
      confirmedBookings: studentBookings.filter((b: Booking) => b.status === 'confirmed').length,
      payments: studentPayments.length,
      completedPayments: studentPayments.filter((p: Payment) => p.status === 'completed').length,
      attendance: studentAttendance.length,
      presentAttendance: studentAttendance.filter((a: AttendanceRecord) => a.status === 'present').length
    };
  });
  
  // Driver activity
  const driverActivity = drivers.map((driver: User) => {
    const driverTrips = trips.filter((t: Trip) => t.driverId === driver.id);
    const completedTrips = driverTrips.filter((t: Trip) => t.status === 'completed').length;
    
    return {
      driverId: driver.id,
      driverName: driver.name,
      totalTrips: driverTrips.length,
      completedTrips,
      completionRate: driverTrips.length > 0 ? (completedTrips / driverTrips.length) * 100 : 0
    };
  });

  return {
    type: 'user',
    summary: {
      totalUsers: users.length,
      students: students.length,
      drivers: drivers.length,
      supervisors: supervisors.length
    },
    breakdown: {
      studentActivity,
      driverActivity
    }
  };
}
