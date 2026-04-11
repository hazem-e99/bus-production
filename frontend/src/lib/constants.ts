export const APP_NAME = 'El Renad';

export const ROLES = {
  ADMIN: 'admin',
  STUDENT: 'student',
  SUPERVISOR: 'supervisor',
  MOVEMENT_MANAGER: 'movement-manager',
  DRIVER: 'driver',
} as const;

export const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  suspended: 'bg-red-100 text-red-700',
  maintenance: 'bg-orange-100 text-orange-700',
  'out-of-service': 'bg-red-100 text-red-700',
  scheduled: 'bg-orange-100 text-orange-700',
  'in-progress': 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
  pending: 'bg-orange-100 text-orange-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-600',
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-orange-100 text-orange-700',
} as const;

export const PAYMENT_METHODS = {
  card: 'Credit Card',
  'bank-transfer': 'Bank Transfer',
  cash: 'Cash',
} as const;

export const NOTIFICATION_TYPES = {
  info: 'bg-orange-100 text-orange-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-orange-100 text-orange-700',
  error: 'bg-red-100 text-red-700',
} as const;

export const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

export const DEFAULT_MAP_CENTER = {
  lat: 40.7128,
  lng: -74.0060,
} as const;

export const CHART_COLORS = [
  '#FF6B35', '#FF9B7A', '#E85A28', '#FFD6C2', '#D14920', '#FFB89E', '#B93F1C', '#FFEDE5',
] as const;

// API Configuration Constants
export const API_CONSTANTS = {
  // Global API base URL
  GLOBAL_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:7126/api',
  
  // Authentication endpoints
  ENDPOINTS: {
    // Global endpoints
    GLOBAL: {
      REGISTRATION_STUDENT: '/Authentication/registration-student',
      REGISTRATION_STAFF: '/Authentication/registration-staff',
      LOGIN: '/Authentication/login',
      VERIFICATION: '/Authentication/verification',
      FORGOT_PASSWORD: '/Authentication/forgot-password',
      RESET_PASSWORD: '/Authentication/reset-password',
      RESET_PASSWORD_VERIFICATION: '/Authentication/forgot-password', // Use forgot-password endpoint for verification
    },
  },
  
  // Bus API endpoints
  BUS_ENDPOINTS: {
    GET_ALL: '/Buses',
    GET_BY_ID: '/Buses/{id}',
    CREATE: '/Buses',
    UPDATE: '/Buses/{id}',
    DELETE: '/Buses/{id}',
  },
  
  // Student registration schema
  STUDENT_REGISTRATION_SCHEMA: {
    firstName: 'string',
    lastName: 'string',
    nationalId: 'string',
    email: 'string',
    phoneNumber: 'string',
    studentAcademicNumber: 'string',
    department: 'string',
    yearOfStudy: 'string',
    password: 'string',
    confirmPassword: 'string'
  },
  
  // Staff registration schema
  STAFF_REGISTRATION_SCHEMA: {
    firstName: 'string',
    lastName: 'string',
    nationalId: 'string',
    email: 'string',
    phoneNumber: 'string',
    role: 'string'
  }
};

// Helper function to get current configuration
export const getCurrentConfig = () => {
  return {
    baseUrl: API_CONSTANTS.GLOBAL_BASE_URL,
    endpoints: API_CONSTANTS.ENDPOINTS.GLOBAL
  };
};
