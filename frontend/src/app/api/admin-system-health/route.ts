import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface User {
  id: string;
  status: string;
}

interface Trip {
  id: string;
  status: string;
  createdAt?: string;
  date?: string;
}

interface Booking {
  id: string;
  status: string;
  createdAt?: string;
  date?: string;
}

interface Payment {
  id: string;
  status: string;
  amount: number;
  createdAt?: string;
  date?: string;
}

interface Bus {
  id: string;
  status: string;
}

interface MaintenanceRecord {
  id: string;
  status: string;
  priority: string;
}

interface AuditLog {
  id: string;
  severity: string;
  action: string;
  details?: string;
}

interface Backup {
  id: string;
  status: string;
  createdAt?: string;
  date?: string;
}

interface Alert {
  level: string;
  message: string;
  category: string;
}

export async function GET(request: NextRequest) {
  try {
    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    // Get all data
    const users = db.users || [];
    const trips = db.trips || [];
    const bookings = db.bookings || [];
    const payments = db.payments || [];
    const attendance = db.attendance || [];
    const buses = db.buses || [];
    const routes = db.routes || [];
    const maintenance = db.maintenance || [];
    const notifications = db.notifications || [];
    const auditLogs = db.auditLogs || [];
    const backups = db.backups || [];
    
    // Calculate system health metrics
    
    // 1. Database Health
    const totalRecords = users.length + trips.length + bookings.length + payments.length + 
                        attendance.length + buses.length + routes.length + maintenance.length + 
                        notifications.length + auditLogs.length + backups.length;
    
    const databaseHealth = {
      totalRecords,
      collections: {
        users: users.length,
        trips: trips.length,
        bookings: bookings.length,
        payments: payments.length,
        attendance: attendance.length,
        buses: buses.length,
        routes: routes.length,
        maintenance: maintenance.length,
        notifications: notifications.length,
        auditLogs: auditLogs.length,
        backups: backups.length
      },
      status: totalRecords > 0 ? 'healthy' : 'empty',
      lastUpdated: new Date().toISOString()
    };
    
    // 2. User Activity Health
    const activeUsers = users.filter((u: User) => u.status === 'active').length;
    const inactiveUsers = users.filter((u: User) => u.status === 'inactive').length;
    const suspendedUsers = users.filter((u: User) => u.status === 'suspended').length;
    
    const userHealth = {
      totalUsers: users.length,
      activeUsers,
      inactiveUsers,
      suspendedUsers,
      activeRate: users.length > 0 ? (activeUsers / users.length) * 100 : 0,
      status: activeUsers > 0 ? 'healthy' : 'warning'
    };
    
    // 3. Trip Performance Health
    const completedTrips = trips.filter((t: Trip) => t.status === 'completed').length;
    const activeTrips = trips.filter((t: Trip) => t.status === 'active').length;
    const cancelledTrips = trips.filter((t: Trip) => t.status === 'cancelled').length;
    
    const tripHealth = {
      totalTrips: trips.length,
      completedTrips,
      activeTrips,
      cancelledTrips,
      completionRate: trips.length > 0 ? (completedTrips / trips.length) * 100 : 0,
      cancellationRate: trips.length > 0 ? (cancelledTrips / trips.length) * 100 : 0,
      status: trips.length > 0 ? 'healthy' : 'warning'
    };
    
    // 4. Financial Health
    const completedPayments = payments.filter((p: Payment) => p.status === 'completed').length;
    const pendingPayments = payments.filter((p: Payment) => p.status === 'pending').length;
    const failedPayments = payments.filter((p: Payment) => p.status === 'failed').length;
    
    const totalRevenue = payments
      .filter((p: Payment) => p.status === 'completed')
      .reduce((sum: number, p: Payment) => sum + (p.amount || 0), 0);
    
    const financialHealth = {
      totalPayments: payments.length,
      completedPayments,
      pendingPayments,
      failedPayments,
      totalRevenue,
      successRate: payments.length > 0 ? (completedPayments / payments.length) * 100 : 0,
      failureRate: payments.length > 0 ? (failedPayments / payments.length) * 100 : 0,
      status: completedPayments > 0 ? 'healthy' : 'warning'
    };
    
    // 5. Fleet Health
    const activeBuses = buses.filter((b: Bus) => b.status === 'active').length;
    const maintenanceBuses = buses.filter((b: Bus) => b.status === 'maintenance').length;
    const inactiveBuses = buses.filter((b: Bus) => b.status === 'inactive').length;
    
    const fleetHealth = {
      totalBuses: buses.length,
      activeBuses,
      maintenanceBuses,
      inactiveBuses,
      availabilityRate: buses.length > 0 ? (activeBuses / buses.length) * 100 : 0,
      maintenanceRate: buses.length > 0 ? (maintenanceBuses / buses.length) * 100 : 0,
      status: activeBuses > 0 ? 'healthy' : 'warning'
    };
    
    // 6. Maintenance Health
    const openMaintenance = maintenance.filter((m: MaintenanceRecord) => m.status === 'open').length;
    const inProgressMaintenance = maintenance.filter((m: MaintenanceRecord) => m.status === 'in_progress').length;
    const completedMaintenance = maintenance.filter((m: MaintenanceRecord) => m.status === 'completed').length;
    
    const criticalMaintenance = maintenance.filter((m: MaintenanceRecord) => m.priority === 'critical').length;
    const highMaintenance = maintenance.filter((m: MaintenanceRecord) => m.priority === 'high').length;
    
    const maintenanceHealth = {
      totalMaintenance: maintenance.length,
      openMaintenance,
      inProgressMaintenance,
      completedMaintenance,
      criticalMaintenance,
      highMaintenance,
      completionRate: maintenance.length > 0 ? (completedMaintenance / maintenance.length) * 100 : 0,
      criticalRate: maintenance.length > 0 ? (criticalMaintenance / maintenance.length) * 100 : 0,
      status: criticalMaintenance === 0 ? 'healthy' : criticalMaintenance <= 2 ? 'warning' : 'critical'
    };
    
    // 7. System Performance Health
    const today = new Date();
    const last24Hours = new Date(today.getTime() - (24 * 60 * 60 * 1000));
    
    const recentBookings = bookings.filter((b: Booking) => 
      new Date(b.createdAt || b.date) >= last24Hours
    ).length;
    
    const recentPayments = payments.filter((p: Payment) => 
      new Date(p.createdAt || p.date) >= last24Hours
    ).length;
    
    const recentTrips = trips.filter((t: Trip) => 
      new Date(t.createdAt || t.date) >= last24Hours
    ).length;
    
    const systemPerformanceHealth = {
      recentBookings,
      recentPayments,
      recentTrips,
      activityLevel: recentBookings + recentPayments + recentTrips,
      status: (recentBookings + recentPayments + recentTrips) > 0 ? 'active' : 'inactive'
    };
    
    // 8. Security Health
    const criticalAuditLogs = auditLogs.filter((log: AuditLog) => log.severity === 'critical').length;
    const highAuditLogs = auditLogs.filter((log: AuditLog) => log.severity === 'high').length;
    const failedLogins = auditLogs.filter((log: AuditLog) => 
      log.action === 'login' && log.details?.toLowerCase().includes('failed')
    ).length;
    
    const securityHealth = {
      totalAuditLogs: auditLogs.length,
      criticalLogs: criticalAuditLogs,
      highLogs: highAuditLogs,
      failedLogins,
      securityScore: Math.max(0, 100 - (criticalAuditLogs * 10) - (highAuditLogs * 5) - (failedLogins * 2)),
      status: criticalAuditLogs === 0 && highAuditLogs <= 5 ? 'secure' : 
              criticalAuditLogs <= 1 && highAuditLogs <= 10 ? 'warning' : 'critical'
    };
    
    // 9. Backup Health
    const recentBackups = backups.filter((b: Backup) => 
      new Date(b.createdAt || b.date) >= last24Hours
    ).length;
    
    const successfulBackups = backups.filter((b: Backup) => b.status === 'successful').length;
    const failedBackups = backups.filter((b: Backup) => b.status === 'failed').length;
    
    const backupHealth = {
      totalBackups: backups.length,
      recentBackups,
      successfulBackups,
      failedBackups,
      successRate: backups.length > 0 ? (successfulBackups / backups.length) * 100 : 0,
      lastBackup: backups.length > 0 ? 
        new Date(Math.max(...backups.map((b: Backup) => new Date(b.createdAt || b.date).getTime()))).toISOString() : null,
      status: successfulBackups > 0 ? 'healthy' : 'warning'
    };
    
    // 10. Overall System Health Score
    const healthScores = [
      userHealth.activeRate,
      tripHealth.completionRate,
      financialHealth.successRate,
      fleetHealth.availabilityRate,
      maintenanceHealth.completionRate,
      securityHealth.securityScore,
      backupHealth.successRate
    ].filter(score => !isNaN(score));
    
    const overallHealthScore = healthScores.length > 0 ? 
      healthScores.reduce((sum: number, score: number) => sum + score, 0) / healthScores.length : 0;
    
    let overallStatus = 'healthy';
    if (overallHealthScore < 50) {
      overallStatus = 'critical';
    } else if (overallHealthScore < 75) {
      overallStatus = 'warning';
    }
    
    // 11. System Recommendations
    const recommendations = [];
    
    if (userHealth.activeRate < 80) {
      recommendations.push('Consider reviewing inactive user accounts and implementing user engagement strategies');
    }
    
    if (tripHealth.cancellationRate > 20) {
      recommendations.push('High trip cancellation rate detected. Review trip planning and communication processes');
    }
    
    if (financialHealth.failureRate > 15) {
      recommendations.push('Payment failure rate is high. Review payment processing and retry mechanisms');
    }
    
    if (fleetHealth.availabilityRate < 70) {
      recommendations.push('Low fleet availability. Consider adding more buses or improving maintenance scheduling');
    }
    
    if (maintenanceHealth.criticalRate > 10) {
      recommendations.push('High number of critical maintenance issues. Prioritize fleet maintenance');
    }
    
    if (securityHealth.securityScore < 70) {
      recommendations.push('Security score is low. Review access controls and audit logs');
    }
    
    if (backupHealth.successRate < 90) {
      recommendations.push('Backup success rate is low. Review backup procedures and storage');
    }
    
    // 12. System Alerts
    const alerts: Alert[] = [];
    
    if (criticalMaintenance > 0) {
      alerts.push({
        level: 'critical',
        message: `${criticalMaintenance} critical maintenance issues require immediate attention`,
        category: 'maintenance'
      });
    }
    
    if (failedLogins > 10) {
      alerts.push({
        level: 'high',
        message: `${failedLogins} failed login attempts detected in the last 24 hours`,
        category: 'security'
      });
    }
    
    if (fleetHealth.availabilityRate < 50) {
      alerts.push({
        level: 'high',
        message: 'Fleet availability is critically low',
        category: 'fleet'
      });
    }
    
    if (backupHealth.successRate < 80) {
      alerts.push({
        level: 'medium',
        message: 'Backup success rate is below acceptable threshold',
        category: 'backup'
      });
    }

    const systemHealth = {
      timestamp: new Date().toISOString(),
      overallStatus,
      overallHealthScore: Math.round(overallHealthScore * 100) / 100,
      database: databaseHealth,
      users: userHealth,
      trips: tripHealth,
      financial: financialHealth,
      fleet: fleetHealth,
      maintenance: maintenanceHealth,
      performance: systemPerformanceHealth,
      security: securityHealth,
      backup: backupHealth,
      recommendations,
      alerts,
      summary: {
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter((a: Alert) => a.level === 'critical').length,
        highAlerts: alerts.filter((a: Alert) => a.level === 'high').length,
        mediumAlerts: alerts.filter((a: Alert) => a.level === 'medium').length,
        totalRecommendations: recommendations.length
      }
    };

    return NextResponse.json(systemHealth);
  } catch (error) {
    console.error('Error checking system health:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
        overallStatus: 'error',
        overallHealthScore: 0
      },
      { status: 500 }
    );
  }
}
