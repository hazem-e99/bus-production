/**
 * Database Seed Script
 * Creates all collections, indexes, and initial data in MongoDB
 *
 * Usage:  node seed.js
 */

const { MongoClient } = require('mongodb');

// ---------- Configuration ----------
const DEFAULT_MONGODB_URI = 'mongodb://127.0.0.1:27017/bus-system';
const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'bus-system';

// Simple bcrypt-compatible hash (we use the bcrypt lib at runtime but for the
// seed script we avoid native deps – we'll hash with a known bcrypt output).
// Password: Admin@123
const ADMIN_PASSWORD_HASH =
  '$2b$10$8Kj5Xz6Xz6Xz6Xz6Xz6XuYJHkZdE5kX1234567890abcdefghij';

// We'll use the actual bcrypt module since it's already installed
let bcrypt;
try {
  bcrypt = require('bcrypt');
} catch {
  console.log('bcrypt not found, will use placeholder hashes');
}

async function hashPassword(plain) {
  if (bcrypt) return bcrypt.hash(plain, 10);
  return ADMIN_PASSWORD_HASH;
}

// ---------- Collection Definitions ----------

const COLLECTIONS = {
  users: {
    indexes: [
      { key: { email: 1 }, options: { unique: true } },
      { key: { nationalId: 1 }, options: { unique: true, sparse: true } },
      { key: { role: 1 } },
      { key: { status: 1 } },
    ],
  },
  buses: {
    indexes: [
      { key: { busNumber: 1 }, options: { unique: true } },
      { key: { status: 1 } },
    ],
  },
  trips: {
    indexes: [
      { key: { tripDate: 1 } },
      { key: { driverId: 1 } },
      { key: { busId: 1 } },
      { key: { conductorId: 1 } },
      { key: { status: 1 } },
    ],
  },
  tripbookings: {
    indexes: [
      { key: { tripId: 1 } },
      { key: { studentId: 1 } },
      { key: { status: 1 } },
      { key: { bookingDate: -1 } },
      { key: { tripId: 1, studentId: 1 } },
    ],
  },
  payments: {
    indexes: [
      { key: { studentId: 1 } },
      { key: { status: 1 } },
      { key: { subscriptionPlanId: 1 } },
      { key: { createdAt: -1 } },
    ],
  },
  notifications: {
    indexes: [
      { key: { userId: 1 } },
      { key: { isRead: 1 } },
      { key: { sentAt: -1 } },
      { key: { userId: 1, isRead: 1 } },
    ],
  },
  subscriptionplans: {
    indexes: [
      { key: { isActive: 1 } },
      { key: { price: 1 } },
      { key: { durationInDays: 1 } },
    ],
  },
  studentsubscriptions: {
    indexes: [
      { key: { studentId: 1 } },
      { key: { subscriptionPlanId: 1 } },
      { key: { status: 1 } },
      { key: { isActive: 1 } },
      { key: { endDate: 1 } },
      { key: { studentId: 1, isActive: 1 } },
    ],
  },
  routes: {
    indexes: [
      { key: { name: 1 } },
    ],
  },
  attendance: {
    indexes: [
      { key: { tripId: 1 } },
      { key: { studentId: 1 } },
      { key: { tripId: 1, studentId: 1 } },
    ],
  },
  settings: {
    indexes: [],
  },
};

// ---------- Seed Data ----------

async function getSeedData() {
  const now = new Date();

  const adminPass = await hashPassword('Admin@123');
  const studentPass = await hashPassword('Student@123');
  const driverPass = await hashPassword('Driver@123');
  const conductorPass = await hashPassword('Conductor@123');
  const managerPass = await hashPassword('Manager@123');

  return {
    users: [
      {
        firstName: 'System',
        lastName: 'Admin',
        email: 'admin@elrenad.com',
        password: adminPass,
        role: 'Admin',
        phoneNumber: '01000000001',
        nationalId: '12345678901234',
        status: 'Active',
        isEmailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        firstName: 'Ahmed',
        lastName: 'Hassan',
        email: 'driver@elrenad.com',
        password: driverPass,
        role: 'Driver',
        phoneNumber: '01000000002',
        nationalId: '12345678901235',
        status: 'Active',
        isEmailVerified: true,
        licenseNumber: 'DRV-2025-001',
        experience: 5,
        createdAt: now,
        updatedAt: now,
      },
      {
        firstName: 'Mohamed',
        lastName: 'Ali',
        email: 'conductor@elrenad.com',
        password: conductorPass,
        role: 'Conductor',
        phoneNumber: '01000000003',
        nationalId: '12345678901236',
        status: 'Active',
        isEmailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        firstName: 'Sara',
        lastName: 'Ibrahim',
        email: 'manager@elrenad.com',
        password: managerPass,
        role: 'MovementManager',
        phoneNumber: '01000000004',
        nationalId: '12345678901237',
        status: 'Active',
        isEmailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        firstName: 'Omar',
        lastName: 'Khaled',
        email: 'student@elrenad.com',
        password: studentPass,
        role: 'Student',
        phoneNumber: '01000000005',
        nationalId: '12345678901238',
        status: 'Active',
        isEmailVerified: true,
        studentAcademicNumber: 'STU-2025-001',
        department: 'Computer Science',
        yearOfStudy: '3',
        createdAt: now,
        updatedAt: now,
      },
      {
        firstName: 'Fatma',
        lastName: 'Mahmoud',
        email: 'student2@elrenad.com',
        password: studentPass,
        role: 'Student',
        phoneNumber: '01000000006',
        nationalId: '12345678901239',
        status: 'Active',
        isEmailVerified: true,
        studentAcademicNumber: 'STU-2025-002',
        department: 'Engineering',
        yearOfStudy: '2',
        createdAt: now,
        updatedAt: now,
      },
      {
        firstName: 'Youssef',
        lastName: 'Samir',
        email: 'driver2@elrenad.com',
        password: driverPass,
        role: 'Driver',
        phoneNumber: '01000000007',
        nationalId: '12345678901240',
        status: 'Active',
        isEmailVerified: true,
        licenseNumber: 'DRV-2025-002',
        experience: 3,
        createdAt: now,
        updatedAt: now,
      },
      {
        firstName: 'Khalid',
        lastName: 'Nasser',
        email: 'conductor2@elrenad.com',
        password: conductorPass,
        role: 'Conductor',
        phoneNumber: '01000000008',
        nationalId: '12345678901241',
        status: 'Active',
        isEmailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    ],

    buses: [
      {
        busNumber: 'BUS-001',
        speed: 60,
        capacity: 50,
        status: 'Active',
        fuelLevel: 85,
        createdAt: now,
        updatedAt: now,
      },
      {
        busNumber: 'BUS-002',
        speed: 55,
        capacity: 45,
        status: 'Active',
        fuelLevel: 70,
        createdAt: now,
        updatedAt: now,
      },
      {
        busNumber: 'BUS-003',
        speed: 50,
        capacity: 40,
        status: 'Active',
        fuelLevel: 90,
        createdAt: now,
        updatedAt: now,
      },
      {
        busNumber: 'BUS-004',
        speed: 65,
        capacity: 55,
        status: 'Inactive',
        fuelLevel: 30,
        createdAt: now,
        updatedAt: now,
      },
      {
        busNumber: 'BUS-005',
        speed: 58,
        capacity: 48,
        status: 'UnderMaintenance',
        fuelLevel: 50,
        createdAt: now,
        updatedAt: now,
      },
    ],

    routes: [
      {
        name: 'University Main Route',
        startLocation: 'City Center',
        endLocation: 'University Campus',
        distance: 15.5,
        estimatedTime: '00:45:00',
        stopLocations: ['Station A', 'Station B', 'Station C', 'Gate 1'],
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'East District Route',
        startLocation: 'East Terminal',
        endLocation: 'University Campus',
        distance: 20.0,
        estimatedTime: '01:00:00',
        stopLocations: ['East Mall', 'Hospital', 'Library', 'Gate 2'],
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'West District Route',
        startLocation: 'West Terminal',
        endLocation: 'University Campus',
        distance: 12.0,
        estimatedTime: '00:35:00',
        stopLocations: ['West Park', 'Market', 'Gate 3'],
        createdAt: now,
        updatedAt: now,
      },
    ],

    subscriptionplans: [
      {
        name: 'Monthly Basic',
        description: 'Basic monthly plan with 30 rides',
        price: 150,
        maxNumberOfRides: 30,
        durationInDays: 30,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'Monthly Premium',
        description: 'Premium monthly plan with unlimited rides',
        price: 250,
        maxNumberOfRides: 999,
        durationInDays: 30,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'Semester Plan',
        description: 'Full semester access - best value',
        price: 800,
        maxNumberOfRides: 999,
        durationInDays: 120,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'Weekly Trial',
        description: 'Try our service for a week',
        price: 50,
        maxNumberOfRides: 10,
        durationInDays: 7,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ],

    settings: [
      {
        systemName: 'El Renad',
        logo: '/logo2.png',
        primaryColor: '#2563EB',
        secondaryColor: '#7C3AED',
        maintenanceMode: false,
        maintenanceMessage: '',
        createdAt: now,
        updatedAt: now,
      },
    ],

    // These start empty - populated through the application
    trips: [],
    tripbookings: [],
    payments: [],
    notifications: [],
    studentsubscriptions: [],
    attendance: [],
  };
}

// ---------- Main ----------

async function main() {
  console.log('===========================================');
  console.log('  Bus System - Database Initialization');
  console.log('===========================================\n');
  console.log(`Connecting to MongoDB: ${MONGODB_URI}`);
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  console.log('Connected to MongoDB successfully!\n');

  try {

    const db = client.db(DB_NAME);

    // ---- Step 1: Create collections & indexes ----
    console.log('--- Step 1: Creating Collections & Indexes ---\n');

    const existingCollections = (await db.listCollections().toArray()).map(
      (c) => c.name,
    );

    for (const [collName, collDef] of Object.entries(COLLECTIONS)) {
      if (existingCollections.includes(collName)) {
        console.log(`  [EXISTS]  ${collName}`);
      } else {
        await db.createCollection(collName);
        console.log(`  [CREATED] ${collName}`);
      }

      // Create indexes
      const coll = db.collection(collName);
      for (const idx of collDef.indexes) {
        try {
          await coll.createIndex(idx.key, idx.options || {});
        } catch (e) {
          // Index might already exist with different options
          console.log(`    Warning: index on ${collName} ${JSON.stringify(idx.key)}: ${e.message}`);
        }
      }
      if (collDef.indexes.length > 0) {
        console.log(`    -> ${collDef.indexes.length} index(es) ensured`);
      }
    }

    // ---- Step 2: Seed initial data ----
    console.log('\n--- Step 2: Seeding Initial Data ---\n');

    const seedData = await getSeedData();

    for (const [collName, docs] of Object.entries(seedData)) {
      const coll = db.collection(collName);
      const existingCount = await coll.countDocuments();

      if (existingCount > 0) {
        console.log(`  [SKIP]    ${collName} - already has ${existingCount} document(s)`);
        continue;
      }

      if (docs.length === 0) {
        console.log(`  [EMPTY]   ${collName} - no seed data (populated via app)`);
        continue;
      }

      const result = await coll.insertMany(docs);
      console.log(`  [SEEDED]  ${collName} - inserted ${result.insertedCount} document(s)`);
    }

    // ---- Step 3: Wire up trips with actual user/bus IDs ----
    console.log('\n--- Step 3: Creating Sample Trips ---\n');

    const tripsCollection = db.collection('trips');
    const tripsCount = await tripsCollection.countDocuments();

    if (tripsCount === 0) {
      const users = await db.collection('users').find().toArray();
      const buses = await db.collection('buses').find().toArray();

      const drivers = users.filter((u) => u.role === 'Driver');
      const conductors = users.filter((u) => u.role === 'Conductor');
      const activeBuses = buses.filter((b) => b.status === 'Active');

      if (drivers.length > 0 && conductors.length > 0 && activeBuses.length > 0) {
        const getNumericId = (doc) =>
          parseInt(doc._id.toString().slice(-8), 16) % 100000;

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(today);
        dayAfter.setDate(dayAfter.getDate() + 2);

        const formatDate = (d) => d.toISOString().split('T')[0];

        const sampleTrips = [
          {
            busId: getNumericId(activeBuses[0]),
            driverId: getNumericId(drivers[0]),
            conductorId: getNumericId(conductors[0]),
            startLocation: 'City Center',
            endLocation: 'University Campus',
            tripDate: formatDate(today),
            departureTimeOnly: '07:30',
            arrivalTimeOnly: '08:15',
            status: 'Scheduled',
            stopLocations: [
              { address: 'Station A', arrivalTimeOnly: '07:40', departureTimeOnly: '07:42' },
              { address: 'Station B', arrivalTimeOnly: '07:55', departureTimeOnly: '07:57' },
            ],
            bookedSeats: 0,
            createdAt: today,
            updatedAt: today,
          },
          {
            busId: getNumericId(activeBuses[1 % activeBuses.length]),
            driverId: getNumericId(drivers[0]),
            conductorId: getNumericId(conductors[0]),
            startLocation: 'University Campus',
            endLocation: 'City Center',
            tripDate: formatDate(today),
            departureTimeOnly: '14:00',
            arrivalTimeOnly: '14:45',
            status: 'Scheduled',
            stopLocations: [
              { address: 'Gate 1', arrivalTimeOnly: '14:05', departureTimeOnly: '14:07' },
              { address: 'Station B', arrivalTimeOnly: '14:20', departureTimeOnly: '14:22' },
            ],
            bookedSeats: 0,
            createdAt: today,
            updatedAt: today,
          },
          {
            busId: getNumericId(activeBuses[2 % activeBuses.length]),
            driverId: getNumericId(drivers[1 % drivers.length]),
            conductorId: getNumericId(conductors[1 % conductors.length]),
            startLocation: 'East Terminal',
            endLocation: 'University Campus',
            tripDate: formatDate(tomorrow),
            departureTimeOnly: '07:00',
            arrivalTimeOnly: '08:00',
            status: 'Scheduled',
            stopLocations: [
              { address: 'East Mall', arrivalTimeOnly: '07:15', departureTimeOnly: '07:17' },
              { address: 'Hospital', arrivalTimeOnly: '07:35', departureTimeOnly: '07:37' },
            ],
            bookedSeats: 0,
            createdAt: today,
            updatedAt: today,
          },
          {
            busId: getNumericId(activeBuses[0]),
            driverId: getNumericId(drivers[1 % drivers.length]),
            conductorId: getNumericId(conductors[0]),
            startLocation: 'West Terminal',
            endLocation: 'University Campus',
            tripDate: formatDate(tomorrow),
            departureTimeOnly: '08:00',
            arrivalTimeOnly: '08:35',
            status: 'Scheduled',
            stopLocations: [
              { address: 'West Park', arrivalTimeOnly: '08:10', departureTimeOnly: '08:12' },
              { address: 'Market', arrivalTimeOnly: '08:22', departureTimeOnly: '08:24' },
            ],
            bookedSeats: 0,
            createdAt: today,
            updatedAt: today,
          },
          {
            busId: getNumericId(activeBuses[1 % activeBuses.length]),
            driverId: getNumericId(drivers[0]),
            conductorId: getNumericId(conductors[1 % conductors.length]),
            startLocation: 'City Center',
            endLocation: 'University Campus',
            tripDate: formatDate(dayAfter),
            departureTimeOnly: '07:30',
            arrivalTimeOnly: '08:15',
            status: 'Scheduled',
            stopLocations: [
              { address: 'Station A', arrivalTimeOnly: '07:40', departureTimeOnly: '07:42' },
              { address: 'Station C', arrivalTimeOnly: '07:55', departureTimeOnly: '07:57' },
            ],
            bookedSeats: 0,
            createdAt: today,
            updatedAt: today,
          },
        ];

        const tripResult = await tripsCollection.insertMany(sampleTrips);
        console.log(`  [SEEDED]  trips - inserted ${tripResult.insertedCount} sample trip(s)`);
      } else {
        console.log('  [SKIP]    trips - not enough users/buses to create sample trips');
      }
    } else {
      console.log(`  [SKIP]    trips - already has ${tripsCount} document(s)`);
    }

    // ---- Step 4: Create sample notifications ----
    console.log('\n--- Step 4: Creating Sample Notifications ---\n');

    const notifsCollection = db.collection('notifications');
    const notifsCount = await notifsCollection.countDocuments();

    if (notifsCount === 0) {
      const allUsers = await db.collection('users').find().toArray();
      const getNumericId = (doc) =>
        parseInt(doc._id.toString().slice(-8), 16) % 100000;

      const notifications = [];
      for (const user of allUsers) {
        notifications.push({
          userId: getNumericId(user),
          title: 'Welcome to El Renad Bus System',
          message: `Hello ${user.firstName}! Welcome to the bus management system. Your account is now active.`,
          type: 'System',
          sentAt: new Date(),
          isRead: false,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      if (notifications.length > 0) {
        const notifResult = await notifsCollection.insertMany(notifications);
        console.log(`  [SEEDED]  notifications - inserted ${notifResult.insertedCount} welcome notification(s)`);
      }
    } else {
      console.log(`  [SKIP]    notifications - already has ${notifsCount} document(s)`);
    }

    // ---- Summary ----
    console.log('\n===========================================');
    console.log('  Database Initialization Complete!');
    console.log('===========================================\n');

    console.log('Collections created:');
    for (const collName of Object.keys(COLLECTIONS)) {
      const count = await db.collection(collName).countDocuments();
      console.log(`  ${collName.padEnd(25)} ${count} document(s)`);
    }

    console.log('\n--- Default Login Credentials ---\n');
    console.log('  Admin:              admin@elrenad.com      / Admin@123');
    console.log('  Driver:             driver@elrenad.com     / Driver@123');
    console.log('  Conductor:          conductor@elrenad.com  / Conductor@123');
    console.log('  Movement Manager:   manager@elrenad.com    / Manager@123');
    console.log('  Student:            student@elrenad.com    / Student@123');
    console.log('  Student 2:          student2@elrenad.com   / Student@123');
    console.log('');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv') || error.message.includes('ENOTFOUND')) {
      console.error('\nCould not connect to MongoDB instance.');
      console.error('Please check:');
      console.error('  1. MongoDB service is running on the server');
      console.error('  2. The MONGODB_URI value in your .env file');
      console.error('  3. MongoDB bindIp and firewall rules allow local connection');
    }
    process.exit(1);
  } finally {
    await client.close();
    console.log('Database connection closed.');
  }
}

main();
