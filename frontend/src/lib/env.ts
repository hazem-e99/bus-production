// API Configuration
export const API_CONFIG = {
  // Global API base URL
  GLOBAL_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:7126/api',
  
  // Authentication endpoints
  AUTH: {
    REGISTRATION_STUDENT: '/Authentication/registration-student',
    REGISTRATION_STAFF: '/Authentication/registration-staff',
    LOGIN: '/Authentication/login',
    VERIFICATION: '/Authentication/verification',
    FORGOT_PASSWORD: '/Authentication/forgot-password',
    RESET_PASSWORD: '/Authentication/reset-password',
    RESET_PASSWORD_VERIFICATION: '/Authentication/forgot-password',
  },
  
  // Bus API endpoints
  BUS_ENDPOINTS: {
    GET_ALL: '/Buses',
    GET_BY_ID: '/Buses/{id}',
    CREATE: '/Buses',
    UPDATE: '/Buses/{id}',
    DELETE: '/Buses/{id}',
  },
  
  // Trip Routes API endpoints
  TRIP_ROUTES_ENDPOINTS: {
    GET_ALL: '/TripRoutes',
    GET_BY_ID: '/TripRoutes/{id}',
    CREATE: '/TripRoutes',
    UPDATE: '/TripRoutes/{id}',
    DELETE: '/TripRoutes/{id}',
  },
  
  // User API endpoints
  USER_ENDPOINTS: {
    GET_ALL: '/Users',
    GET_BY_ID: '/Users/{id}',
    CREATE: '/Users',
    UPDATE: '/Users/{id}',
    DELETE: '/Users/{id}',
  },
  
  // Trip API endpoints
  TRIP_ENDPOINTS: {
    GET_ALL: '/Trip',
    GET_BY_ID: '/Trip/{id}',
    CREATE: '/Trip',
    UPDATE: '/Trip/{id}',
    DELETE: '/Trip/{id}',
  },
  
  // Payment API endpoints
  PAYMENT_ENDPOINTS: {
    GET_ALL: '/Payments',
    GET_BY_ID: '/Payments/{id}',
    CREATE: '/Payments',
    UPDATE: '/Payments/{id}',
    DELETE: '/Payments/{id}',
  },
  
  // Notification API endpoints
  NOTIFICATION_ENDPOINTS: {
    GET_ALL: '/Notifications',
    GET_BY_ID: '/Notifications/{id}',
    CREATE: '/Notifications',
    UPDATE: '/Notifications/{id}',
    DELETE: '/Notifications/{id}',
  },
  
  // Booking API endpoints
  BOOKING_ENDPOINTS: {
    GET_ALL: '/Bookings',
    GET_BY_ID: '/Bookings/{id}',
    CREATE: '/Bookings',
    UPDATE: '/Bookings/{id}',
    DELETE: '/Bookings/{id}',
  },
  
  // Attendance API endpoints
  ATTENDANCE_ENDPOINTS: {
    GET_ALL: '/Attendance',
    GET_BY_ID: '/Attendance/{id}',
    CREATE: '/Attendance',
    UPDATE: '/Attendance/{id}',
    DELETE: '/Attendance/{id}',
  },
  
  // Settings API endpoints
  SETTINGS_ENDPOINTS: {
    GET: '/Settings',
    UPDATE: '/Settings',
    GET_MAINTENANCE_MODE: '/Settings/maintenance-mode',
  },
  
  // Student Profile API endpoints
  STUDENT_PROFILE_ENDPOINTS: {
    GET: '/StudentProfiles/{id}',
    CREATE: '/StudentProfiles',
    UPDATE: '/StudentProfiles/{id}',
  },
  
  // Student Dashboard API endpoints
  STUDENT_DASHBOARD_ENDPOINTS: {
    GET_STATS: '/StudentDashboard/{id}/stats',
    GET_RECENT_TRIPS: '/StudentDashboard/{id}/recent-trips',
    GET_UPCOMING_TRIPS: '/StudentDashboard/{id}/upcoming-trips',
    GET_PAYMENT_HISTORY: '/StudentDashboard/{id}/payments',
  },
  
  // Student Avatar API endpoints
  STUDENT_AVATAR_ENDPOINTS: {
    UPLOAD: '/StudentAvatars/{id}',
    GET: '/StudentAvatars/{id}',
    DELETE: '/StudentAvatars/{id}',
  },
  
  // Subscription Plans API endpoints
  SUBSCRIPTION_PLANS_ENDPOINTS: {
    GET_ALL: '/SubscriptionPlans',
    GET_BY_ID: '/SubscriptionPlans/{id}',
    CREATE: '/SubscriptionPlans',
    UPDATE: '/SubscriptionPlans/{id}',
    DELETE: '/SubscriptionPlans/{id}',
  },
  
  // Forms API endpoints
  FORMS_ENDPOINTS: {
    GET: '/Forms',
  },

  // Bus Tracking API endpoints
  BUS_TRACKING_ENDPOINTS: {
    SEND_LOCATION: '/BusTracking/location',
    GET_LOCATION: '/BusTracking/location/{busId}',
    GET_ALL_LOCATIONS: '/BusTracking/locations',
    GET_ALL_LOCATIONS_ALL: '/BusTracking/locations/all',
    STOP_TRACKING: '/BusTracking/stop/{busId}',
  },
};
