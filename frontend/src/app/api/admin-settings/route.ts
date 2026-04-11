import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);
    
    // Get system settings
    const systemSettings = db.systemSettings || {
      appName: 'Bus Management System',
      version: '1.0.0',
      maintenanceMode: false,
      notificationsEnabled: true,
      defaultLanguage: 'en',
      timezone: 'UTC',
      currency: 'USD',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h'
    };

    // Get business settings
    const businessSettings = db.businessSettings || {
      companyName: 'Bus Management Company',
      contactEmail: 'admin@busmanagement.com',
      contactPhone: '+1234567890',
      address: '123 Bus Street, City, Country',
      website: 'https://busmanagement.com',
      businessHours: {
        monday: { open: '08:00', close: '18:00' },
        tuesday: { open: '08:00', close: '18:00' },
        wednesday: { open: '08:00', close: '18:00' },
        thursday: { open: '08:00', close: '18:00' },
        friday: { open: '08:00', close: '18:00' },
        saturday: { open: '09:00', close: '16:00' },
        sunday: { open: '10:00', close: '15:00' }
      }
    };

    // Get operational settings
    const operationalSettings = db.operationalSettings || {
      maxBookingDays: 30,
      minBookingHours: 2,
      maxPassengersPerTrip: 50,
      defaultTripDuration: 60, // minutes
      cancellationPolicy: {
        freeCancellationHours: 24,
        cancellationFee: 10, // percentage
        noShowFee: 25 // percentage
      },
      paymentSettings: {
        acceptedMethods: ['credit_card', 'debit_card', 'cash', 'mobile_payment'],
        paymentDueHours: 2,
        autoConfirmPayment: true,
        refundPolicy: {
          fullRefundHours: 24,
          partialRefundHours: 2,
          noRefundHours: 0
        }
      }
    };

    // Get notification settings
    const notificationSettings = db.notificationSettings || {
      email: {
        enabled: true,
        smtpServer: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: 'notifications@busmanagement.com',
        smtpPassword: '',
        fromEmail: 'notifications@busmanagement.com',
        fromName: 'Bus Management System'
      },
      sms: {
        enabled: false,
        provider: 'twilio',
        accountSid: '',
        authToken: '',
        fromNumber: ''
      },
      push: {
        enabled: true,
        vapidPublicKey: '',
        vapidPrivateKey: ''
      },
      templates: {
        bookingConfirmation: true,
        tripReminder: true,
        paymentConfirmation: true,
        tripCancellation: true,
        maintenanceAlert: true
      }
    };

    // Get security settings
    const securitySettings = db.securitySettings || {
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        maxAge: 90 // days
      },
      sessionSettings: {
        sessionTimeout: 30, // minutes
        maxConcurrentSessions: 3,
        requireReauthForSensitive: true
      },
      twoFactorAuth: {
        enabled: false,
        methods: ['email', 'sms', 'authenticator'],
        requiredForAdmins: true
      },
      ipWhitelist: {
        enabled: false,
        allowedIPs: []
      }
    };

    // Get maintenance settings
    const maintenanceSettings = db.maintenanceSettings || {
      autoMaintenance: {
        enabled: true,
        checkInterval: 7, // days
        alertDaysBefore: 3,
        maintenanceTypes: ['oil_change', 'tire_rotation', 'brake_check', 'general_inspection']
      },
      maintenanceSchedule: {
        oilChange: 5000, // km
        tireRotation: 10000, // km
        brakeCheck: 20000, // km
        generalInspection: 50000 // km
      },
      alerts: {
        maintenanceDue: true,
        maintenanceOverdue: true,
        lowFuel: true,
        engineWarning: true
      }
    };

    // Get reporting settings
    const reportingSettings = db.reportingSettings || {
      autoReports: {
        enabled: true,
        daily: false,
        weekly: true,
        monthly: true,
        quarterly: true,
        yearly: true
      },
      reportTypes: {
        financial: true,
        operational: true,
        maintenance: true,
        attendance: true,
        performance: true
      },
      recipients: {
        admins: true,
        managers: true,
        supervisors: false,
        drivers: false
      },
      exportFormats: ['pdf', 'excel', 'csv']
    };

    const allSettings = {
      system: systemSettings,
      business: businessSettings,
      operational: operationalSettings,
      notifications: notificationSettings,
      security: securitySettings,
      maintenance: maintenanceSettings,
      reporting: reportingSettings,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(allSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { section, settings } = body;

    if (!section || !settings) {
      return NextResponse.json(
        { error: 'Section and settings are required' },
        { status: 400 }
      );
    }

    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    // Update the specified section
    const sectionKey = `${section}Settings`;
    if (!db[sectionKey]) {
      db[sectionKey] = {};
    }

    db[sectionKey] = {
      ...db[sectionKey],
      ...settings,
      lastUpdated: new Date().toISOString()
    };

    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));

    return NextResponse.json({
      message: `${section} settings updated successfully`,
      settings: db[sectionKey]
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { section, settings } = body;

    if (!section || !settings) {
      return NextResponse.json(
        { error: 'Section and settings are required' },
        { status: 400 }
      );
    }

    // Read db.json file
    const dbPath = path.join(process.cwd(), 'db.json');
    const dbContent = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(dbContent);

    // Create new section settings
    const sectionKey = `${section}Settings`;
    db[sectionKey] = {
      ...settings,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    // Write back to db.json
    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));

    return NextResponse.json({
      message: `${section} settings created successfully`,
      settings: db[sectionKey]
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
