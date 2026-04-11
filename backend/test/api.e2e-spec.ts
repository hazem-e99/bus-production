import * as http from 'http';

const BASE = 'http://localhost:7126';
let ADMIN_TOKEN = '';
let STUDENT_TOKEN = '';
let DRIVER_TOKEN = '';

function req(method: string, path: string, body?: any, token?: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    const url = new URL(path, BASE);
    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      timeout: 10000,
    };
    if (token) options.headers!['Authorization'] = `Bearer ${token}`;
    const request = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed: any;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode!, body: parsed });
      });
    });
    request.on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
    request.on('timeout', () => { request.destroy(); resolve({ status: 0, body: { error: 'TIMEOUT' } }); });
    if (body) request.write(JSON.stringify(body));
    request.end();
  });
}

describe('Bus System API - E2E Test Suite', () => {
  beforeAll(async () => {
    const adminR = await req('POST', '/api/Authentication/login', { email: 'admin@elrenad.com', password: 'Admin@123' });
    ADMIN_TOKEN = adminR.body?.data?.token || '';
    const stuR = await req('POST', '/api/Authentication/login', { email: 'student@elrenad.com', password: 'Student@123' });
    STUDENT_TOKEN = stuR.body?.data?.token || '';
    const drvR = await req('POST', '/api/Authentication/login', { email: 'driver@elrenad.com', password: 'Driver@123' });
    DRIVER_TOKEN = drvR.body?.data?.token || '';
  }, 30000);

  describe('Authentication', () => {
    it('should login admin successfully', async () => {
      const r = await req('POST', '/api/Authentication/login', { email: 'admin@elrenad.com', password: 'Admin@123' });
      expect(r.status).toBe(200);
      expect(r.body.success).toBe(true);
      expect(r.body.data.token).toBeDefined();
      expect(r.body.data.role).toBe('Admin');
    });

    it('should reject invalid credentials', async () => {
      const r = await req('POST', '/api/Authentication/login', { email: 'admin@elrenad.com', password: 'wrong' });
      expect(r.body.success).toBe(false);
    });

    it('should reject non-existent user', async () => {
      const r = await req('POST', '/api/Authentication/login', { email: 'none@test.com', password: 'test' });
      expect(r.body.success).toBe(false);
    });

    it('should reject duplicate student registration', async () => {
      const r = await req('POST', '/api/Authentication/registration-student', {
        firstName: 'Test', lastName: 'User', nationalId: '12345678901238',
        email: 'student@elrenad.com', phoneNumber: '01000000005',
        studentAcademicNumber: 'STU-DUP', department: 'CS', yearOfStudy: '1',
        password: 'Test@123', confirmPassword: 'Test@123',
      });
      expect(r.body.success).toBe(false);
    });

    it('should reject reset password with wrong token', async () => {
      const r = await req('POST', '/api/Authentication/reset-password', {
        email: 'admin@elrenad.com', resetToken: 'bad', newPassword: 'New@123', confirmPassword: 'New@123',
      });
      expect(r.body.success).toBe(false);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const r = await req('GET', '/api/Users');
      expect(r.status).toBe(401);
    });
  });

  describe('Users', () => {
    it('should get all users (admin)', async () => {
      const r = await req('GET', '/api/Users', null, ADMIN_TOKEN);
      expect(r.status).toBe(200);
      expect(Array.isArray(r.body.data)).toBe(true);
      expect(r.body.data.length).toBeGreaterThan(0);
    });

    it('should get users by role', async () => {
      const r = await req('GET', '/api/Users/by-role/Student', null, ADMIN_TOKEN);
      expect(r.status).toBe(200);
      expect(Array.isArray(r.body.data)).toBe(true);
    });

    it('should get profile', async () => {
      const r = await req('GET', '/api/Users/profile', null, ADMIN_TOKEN);
      expect(r.status).toBe(200);
      expect(r.body.data.email).toBe('admin@elrenad.com');
    });

    it('should update profile', async () => {
      const r = await req('PUT', '/api/Users/profile', { firstName: 'System', lastName: 'Admin' }, ADMIN_TOKEN);
      expect(r.status).toBe(200);
    });

    it('should reject wrong current password', async () => {
      const r = await req('POST', '/api/Users/change-password', {
        currentPassword: 'wrong', password: 'New@123', confirmPassword: 'New@123',
      }, ADMIN_TOKEN);
      expect(r.body.success).toBe(false);
    });
  });

  describe('Buses', () => {
    it('should get all buses', async () => {
      const r = await req('GET', '/api/Buses', null, ADMIN_TOKEN);
      expect(r.status).toBe(200);
      expect(Array.isArray(r.body.data)).toBe(true);
    });

    it('should create a bus', async () => {
      const r = await req('POST', '/api/Buses', {
        busNumber: `BUS-JEST-${Date.now()}`, speed: 80, capacity: 45, status: 'Active',
      }, ADMIN_TOKEN);
      expect(r.status).toBe(201);
      expect(r.body.success).toBe(true);
    });

    it('should handle duplicate bus gracefully', async () => {
      const name = `BUS-DUP-${Date.now()}`;
      await req('POST', '/api/Buses', { busNumber: name, speed: 60, capacity: 40, status: 'Active' }, ADMIN_TOKEN);
      const r = await req('POST', '/api/Buses', { busNumber: name, speed: 60, capacity: 40, status: 'Active' }, ADMIN_TOKEN);
      expect(r.status).not.toBe(500);
      expect(r.body.success).toBe(false);
    });
  });

  describe('Trips', () => {
    it('should get all trips', async () => {
      const r = await req('GET', '/api/Trip', null, ADMIN_TOKEN);
      expect(r.status).toBe(200);
      expect(r.body.data).toBeDefined();
    });

    it('should get upcoming trips', async () => {
      const r = await req('GET', '/api/Trip/upcoming', null, ADMIN_TOKEN);
      expect(r.status).toBe(200);
    });

    it('should get completed trips', async () => {
      const r = await req('GET', '/api/Trip/completed', null, ADMIN_TOKEN);
      expect(r.status).toBe(200);
    });

    it('should search trips', async () => {
      const r = await req('GET', '/api/Trip/search?q=BUS', null, ADMIN_TOKEN);
      expect(r.status).toBe(200);
    });

    it('should get trips by status', async () => {
      const r = await req('GET', '/api/Trip/status/Scheduled', null, ADMIN_TOKEN);
      expect(r.status).toBe(200);
    });

    it('should get driver trips', async () => {
      const r = await req('GET', '/api/Trip/my-trips', null, DRIVER_TOKEN);
      expect(r.status).toBe(200);
    });
  });

  describe('TripBooking', () => {
    it('should search bookings', async () => {
      const r = await req('POST', '/api/TripBooking/search', {}, ADMIN_TOKEN);
      expect(r.status).toBe(200);
    });

    it('should check eligibility', async () => {
      const r = await req('GET', '/api/TripBooking/check-eligibility?tripId=1&studentId=1', null, STUDENT_TOKEN);
      expect(r.status).toBe(200);
    });
  });

  describe('Payment', () => {
    it('should get all payments', async () => {
      const r = await req('GET', '/api/Payment', null, ADMIN_TOKEN);
      expect(r.status).toBe(200);
    });

    it('should get payment statistics', async () => {
      const r = await req('GET', '/api/Payment/statistics', null, ADMIN_TOKEN);
      expect(r.status).toBe(200);
      expect(r.body.data.totalPayments).toBeDefined();
    });

    it('should get pending payments', async () => {
      const r = await req('GET', '/api/Payment/pending', null, ADMIN_TOKEN);
      expect(r.status).toBe(200);
    });
  });

  describe('Notifications', () => {
    it('should get notifications', async () => {
      const r = await req('GET', '/api/Notifications', null, ADMIN_TOKEN);
      expect(r.status).toBe(200);
    });

    it('should get unread count', async () => {
      const r = await req('GET', '/api/Notifications/unread-count', null, ADMIN_TOKEN);
      expect(r.status).toBe(200);
    });

    it('should broadcast notification', async () => {
      const r = await req('POST', '/api/Notifications/broadcast', {
        title: 'Jest Test', message: 'Test message', type: 'System',
      }, ADMIN_TOKEN);
      expect(r.status).toBe(201);
    });
  });

  describe('Subscription Plans', () => {
    it('should get all plans', async () => {
      const r = await req('GET', '/api/SubscriptionPlan', null, ADMIN_TOKEN);
      expect(r.status).toBe(200);
      expect(Array.isArray(r.body.data)).toBe(true);
    });

    it('should get active plans', async () => {
      const r = await req('GET', '/api/SubscriptionPlan/active', null, ADMIN_TOKEN);
      expect(r.status).toBe(200);
    });

    it('should filter by price range', async () => {
      const r = await req('GET', '/api/SubscriptionPlan/by-price-range?minPrice=50&maxPrice=300', null, ADMIN_TOKEN);
      expect(r.status).toBe(200);
    });
  });

  describe('Student Subscriptions', () => {
    it('should get my subscriptions', async () => {
      const r = await req('GET', '/api/StudentSubscription/my-subscriptions', null, STUDENT_TOKEN);
      expect(r.status).toBe(200);
    });

    it('should get expiring soon', async () => {
      const r = await req('GET', '/api/StudentSubscription/expiring-soon', null, ADMIN_TOKEN);
      expect(r.status).toBe(200);
    });
  });

  describe('Routes', () => {
    it('should get all routes', async () => {
      const r = await req('GET', '/api/Routes', null, ADMIN_TOKEN);
      expect(r.status).toBe(200);
    });

    it('should get all trip routes', async () => {
      const r = await req('GET', '/api/TripRoutes', null, ADMIN_TOKEN);
      expect(r.status).toBe(200);
    });
  });

  describe('Settings', () => {
    it('should get settings', async () => {
      const r = await req('GET', '/api/Settings', null, ADMIN_TOKEN);
      expect(r.status).toBe(200);
    });

    it('should get maintenance mode (public)', async () => {
      const r = await req('GET', '/api/Settings/maintenance-mode');
      expect(r.status).toBe(200);
      expect(r.body.maintenanceMode).toBeDefined();
    });
  });

  describe('Forms (Public)', () => {
    it('should get forms without auth', async () => {
      const r = await req('GET', '/api/Forms');
      expect(r.status).toBe(200);
      expect(r.body.departments).toBeDefined();
      expect(r.body.departments.length).toBeGreaterThan(0);
    });
  });

  describe('Student Dashboard', () => {
    let studentId: number;
    beforeAll(async () => {
      const login = await req('POST', '/api/Authentication/login', { email: 'student@elrenad.com', password: 'Student@123' });
      studentId = login.body?.data?.id;
    });

    it('should get student stats', async () => {
      const r = await req('GET', `/api/StudentDashboard/${studentId}/stats`, null, STUDENT_TOKEN);
      expect(r.status).toBe(200);
    });

    it('should get recent trips', async () => {
      const r = await req('GET', `/api/StudentDashboard/${studentId}/recent-trips`, null, STUDENT_TOKEN);
      expect(r.status).toBe(200);
    });

    it('should get upcoming trips', async () => {
      const r = await req('GET', `/api/StudentDashboard/${studentId}/upcoming-trips`, null, STUDENT_TOKEN);
      expect(r.status).toBe(200);
    });
  });

  describe('Bookings (Legacy)', () => {
    it('should get all bookings', async () => {
      const r = await req('GET', '/api/Bookings', null, ADMIN_TOKEN);
      expect(r.status).toBe(200);
      expect(Array.isArray(r.body)).toBe(true);
    });
  });
});
