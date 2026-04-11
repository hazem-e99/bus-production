import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const apiDocumentation = {
      title: 'Bus Management System API Documentation',
      version: '1.0.0',
      description: 'Comprehensive API documentation for the Bus Management System',
      baseUrl: '/api',
      lastUpdated: new Date().toISOString(),
      
      authentication: {
        description: 'The system uses role-based authentication. Users must be logged in to access protected endpoints.',
        roles: ['admin', 'supervisor', 'movement-manager', 'driver', 'student'],
        headers: {
          'Authorization': 'Bearer {token} (if implemented)',
          'Content-Type': 'application/json'
        }
      },
      
      endpoints: {
        admin: {
          description: 'Administrator endpoints for system management',
          basePath: '/admin',
          endpoints: [
            {
              path: '/admin-analytics',
              method: 'GET',
              description: 'Get comprehensive system analytics and metrics',
              parameters: {
                dateFrom: 'string (optional) - Start date for analytics',
                dateTo: 'string (optional) - End date for analytics'
              },
              response: 'Analytics data with summary and breakdowns'
            },
            {
              path: '/admin-users',
              method: 'GET',
              description: 'Get all users with filtering and search',
              parameters: {
                role: 'string (optional) - Filter by user role',
                status: 'string (optional) - Filter by user status',
                search: 'string (optional) - Search in user names and emails'
              },
              response: 'User data with summary statistics'
            },
            {
              path: '/admin-users',
              method: 'POST',
              description: 'Create a new user',
              body: 'User object with required fields',
              response: 'Created user object'
            },
            {
              path: '/admin-buses',
              method: 'GET',
              description: 'Get all buses with performance metrics',
              parameters: {
                status: 'string (optional) - Filter by bus status',
                search: 'string (optional) - Search in bus numbers and models'
              },
              response: 'Bus data with performance and maintenance metrics'
            },
            {
              path: '/admin-buses',
              method: 'POST',
              description: 'Add a new bus to the fleet',
              body: 'Bus object with required fields',
              response: 'Created bus object'
            },
            {
              path: '/admin-routes',
              method: 'GET',
              description: 'Get all routes with performance metrics',
              parameters: {
                search: 'string (optional) - Search in route names and points'
              },
              response: 'Route data with performance and efficiency metrics'
            },
            {
              path: '/admin-routes',
              method: 'POST',
              description: 'Create a new route',
              body: 'Route object with required fields',
              response: 'Created route object'
            },
            {
              path: '/admin-trips',
              method: 'GET',
              description: 'Get all trips with comprehensive data',
              parameters: {
                status: 'string (optional) - Filter by trip status',
                date: 'string (optional) - Filter by trip date',
                routeId: 'string (optional) - Filter by route',
                driverId: 'string (optional) - Filter by driver',
                busId: 'string (optional) - Filter by bus'
              },
              response: 'Trip data with enriched information and summary'
            },
            {
              path: '/admin-trips',
              method: 'POST',
              description: 'Create a new trip',
              body: 'Trip object with required fields',
              response: 'Created trip object'
            },
            {
              path: '/admin-bookings',
              method: 'GET',
              description: 'Get all bookings with detailed information',
              parameters: {
                status: 'string (optional) - Filter by booking status',
                date: 'string (optional) - Filter by booking date',
                tripId: 'string (optional) - Filter by trip',
                studentId: 'string (optional) - Filter by student'
              },
              response: 'Booking data with trip, route, and student details'
            },
            {
              path: '/admin-bookings',
              method: 'POST',
              description: 'Create a new booking',
              body: 'Booking object with required fields',
              response: 'Created booking object'
            },
            {
              path: '/admin-payments',
              method: 'GET',
              description: 'Get all payments with financial summaries',
              parameters: {
                status: 'string (optional) - Filter by payment status',
                date: 'string (optional) - Filter by payment date',
                studentId: 'string (optional) - Filter by student'
              },
              response: 'Payment data with financial summaries and trends'
            },
            {
              path: '/admin-payments',
              method: 'POST',
              description: 'Create a new payment record',
              body: 'Payment object with required fields',
              response: 'Created payment object'
            },
            {
              path: '/admin-attendance',
              method: 'GET',
              description: 'Get all attendance records with metrics',
              parameters: {
                status: 'string (optional) - Filter by attendance status',
                date: 'string (optional) - Filter by attendance date',
                tripId: 'string (optional) - Filter by trip',
                studentId: 'string (optional) - Filter by student'
              },
              response: 'Attendance data with performance metrics and summary'
            },
            {
              path: '/admin-attendance',
              method: 'POST',
              description: 'Create a new attendance record',
              body: 'Attendance object with required fields',
              response: 'Created attendance object'
            },
            {
              path: '/admin-maintenance',
              method: 'GET',
              description: 'Get all maintenance records with status tracking',
              parameters: {
                status: 'string (optional) - Filter by maintenance status',
                type: 'string (optional) - Filter by maintenance type',
                priority: 'string (optional) - Filter by priority level',
                busId: 'string (optional) - Filter by bus'
              },
              response: 'Maintenance data with cost and time metrics'
            },
            {
              path: '/admin-maintenance',
              method: 'POST',
              description: 'Create a new maintenance record',
              body: 'Maintenance object with required fields',
              response: 'Created maintenance object'
            },
            {
              path: '/admin-maintenance-schedule',
              method: 'GET',
              description: 'Get maintenance schedule for all buses',
              parameters: {
                busId: 'string (optional) - Filter by specific bus',
                type: 'string (optional) - Filter by maintenance type',
                status: 'string (optional) - Filter by maintenance status'
              },
              response: 'Maintenance schedule with priority and status information'
            },
            {
              path: '/admin-notifications',
              method: 'GET',
              description: 'Get all notifications with engagement metrics',
              parameters: {
                type: 'string (optional) - Filter by notification type',
                priority: 'string (optional) - Filter by priority',
                status: 'string (optional) - Filter by read status',
                userId: 'string (optional) - Filter by target user'
              },
              response: 'Notification data with engagement metrics and pagination'
            },
            {
              path: '/admin-notifications',
              method: 'POST',
              description: 'Create a new notification',
              body: 'Notification object with required fields',
              response: 'Created notification object'
            },
            {
              path: '/admin-announcements',
              method: 'GET',
              description: 'Get all announcements with engagement metrics',
              parameters: {
                search: 'string (optional) - Search in announcement content',
                status: 'string (optional) - Filter by announcement status'
              },
              response: 'Announcement data with engagement metrics and pagination'
            },
            {
              path: '/admin-announcements',
              method: 'POST',
              description: 'Create a new announcement',
              body: 'Announcement object with required fields',
              response: 'Created announcement object'
            },
            {
              path: '/admin-reports',
              method: 'GET',
              description: 'Generate comprehensive system reports',
              parameters: {
                type: 'string (optional) - Report type (overview, financial, operational, performance, maintenance, user)',
                dateFrom: 'string (optional) - Start date for report',
                dateTo: 'string (optional) - End date for report',
                routeId: 'string (optional) - Filter by route',
                busId: 'string (optional) - Filter by bus'
              },
              response: 'Comprehensive report data based on type and filters'
            },
            {
              path: '/admin-audit-log',
              method: 'GET',
              description: 'Get system audit logs with security metrics',
              parameters: {
                action: 'string (optional) - Filter by action type',
                entity: 'string (optional) - Filter by entity type',
                userId: 'string (optional) - Filter by user',
                severity: 'string (optional) - Filter by severity level',
                dateFrom: 'string (optional) - Start date for logs',
                dateTo: 'string (optional) - End date for logs'
              },
              response: 'Audit log data with security metrics and pagination'
            },
            {
              path: '/admin-backup',
              method: 'GET',
              description: 'Get backup information and status',
              parameters: {
                type: 'string (optional) - Filter by backup type',
                dateFrom: 'string (optional) - Start date for backups',
                dateTo: 'string (optional) - End date for backups'
              },
              response: 'Backup data with success rates and compression metrics'
            },
            {
              path: '/admin-backup',
              method: 'POST',
              description: 'Create a new backup',
              body: 'Backup configuration object',
              response: 'Created backup object'
            },
            {
              path: '/admin-system-health',
              method: 'GET',
              description: 'Get comprehensive system health status',
              response: 'System health data with metrics, alerts, and recommendations'
            },
            {
              path: '/admin-import-export',
              method: 'GET',
              description: 'Import or export data in various formats',
              parameters: {
                action: 'string (required) - "import" or "export"',
                entity: 'string (optional) - Specific entity to import/export',
                format: 'string (optional) - Format: json, csv, or xml (default: json)'
              },
              response: 'File download for export or import confirmation'
            },
            {
              path: '/admin-settings',
              method: 'GET',
              description: 'Get system settings for all categories',
              response: 'System settings organized by category'
            },
            {
              path: '/admin-settings',
              method: 'PUT',
              description: 'Update system settings',
              body: 'Settings object with category and key-value pairs',
              response: 'Updated settings object'
            }
          ]
        },
        
        supervisor: {
          description: 'Supervisor endpoints for trip and attendance management',
          basePath: '/supervisor',
          endpoints: [
            {
              path: '/supervisor-trips',
              method: 'GET',
              description: 'Get trips assigned to a supervisor',
              parameters: {
                supervisorId: 'string (required) - Supervisor ID',
                status: 'string (optional) - Filter by trip status',
                date: 'string (optional) - Filter by trip date'
              },
              response: 'Trip data with route, bus, driver, and booking information'
            },
            {
              path: '/supervisor-attendance',
              method: 'GET',
              description: 'Get attendance records for supervisor trips',
              parameters: {
                supervisorId: 'string (required) - Supervisor ID',
                tripId: 'string (optional) - Filter by specific trip',
                date: 'string (optional) - Filter by date'
              },
              response: 'Attendance data with student and trip details'
            },
            {
              path: '/supervisor-attendance',
              method: 'POST',
              description: 'Create attendance record for a trip',
              body: 'Attendance object with required fields',
              response: 'Created attendance object'
            },
            {
              path: '/supervisor-reports',
              method: 'GET',
              description: 'Generate reports for supervisor activities',
              parameters: {
                supervisorId: 'string (required) - Supervisor ID',
                dateFrom: 'string (optional) - Start date for report',
                dateTo: 'string (optional) - End date for report'
              },
              response: 'Comprehensive report with trip, attendance, and payment data'
            },
            {
              path: '/supervisor-payments',
              method: 'GET',
              description: 'Get payment information for supervisor trips',
              parameters: {
                supervisorId: 'string (required) - Supervisor ID',
                dateFrom: 'string (optional) - Start date for payments',
                dateTo: 'string (optional) - End date for payments'
              },
              response: 'Payment data with trip and student information'
            }
          ]
        },
        
        movementManager: {
          description: 'Movement Manager endpoints for fleet and driver management',
          basePath: '/movement-manager',
          endpoints: [
            {
              path: '/movement-manager-analytics',
              method: 'GET',
              description: 'Get fleet and driver performance analytics',
              response: 'Comprehensive analytics for fleet, driver, and route performance'
            },
            {
              path: '/movement-manager-fleet',
              method: 'GET',
              description: 'Get fleet information with performance metrics',
              response: 'Fleet data with performance, maintenance, and trip information'
            },
            {
              path: '/movement-manager-fleet',
              method: 'POST',
              description: 'Add new bus to fleet',
              body: 'Bus object with required fields',
              response: 'Created bus object'
            },
            {
              path: '/movement-manager-drivers',
              method: 'GET',
              description: 'Get driver information with performance metrics',
              response: 'Driver data with performance, license status, and safety scores'
            },
            {
              path: '/movement-manager-drivers',
              method: 'POST',
              description: 'Add new driver',
              body: 'Driver object with required fields',
              response: 'Created driver object'
            },
            {
              path: '/movement-manager-trips',
              method: 'GET',
              description: 'Get trip information with fleet and driver details',
              response: 'Trip data with comprehensive fleet and driver information'
            },
            {
              path: '/movement-manager-trips',
              method: 'POST',
              description: 'Create new trip with fleet assignment',
              body: 'Trip object with fleet and driver assignments',
              response: 'Created trip object'
            }
          ]
        },
        
        driver: {
          description: 'Driver endpoints for trip and profile management',
          basePath: '/driver',
          endpoints: [
            {
              path: '/driver-profile',
              method: 'GET',
              description: 'Get driver profile with performance metrics',
              parameters: {
                driverId: 'string (required) - Driver ID'
              },
              response: 'Driver profile with performance, license status, and safety score'
            },
            {
              path: '/driver-profile',
              method: 'PUT',
              description: 'Update driver profile information',
              body: 'Updated driver profile object',
              response: 'Updated driver profile'
            },
            {
              path: '/driver-trips',
              method: 'GET',
              description: 'Get trips assigned to a driver',
              parameters: {
                driverId: 'string (required) - Driver ID',
                status: 'string (optional) - Filter by trip status',
                date: 'string (optional) - Filter by trip date'
              },
              response: 'Trip data with route, bus, and passenger information'
            }
          ]
        },
        
        student: {
          description: 'Student endpoints for booking and profile management',
          basePath: '/student',
          endpoints: [
            {
              path: '/student-profile',
              method: 'GET',
              description: 'Get student profile information',
              parameters: {
                studentId: 'string (required) - Student ID'
              },
              response: 'Student profile data'
            },
            {
              path: '/student-bookings',
              method: 'GET',
              description: 'Get student booking history',
              parameters: {
                studentId: 'string (required) - Student ID',
                status: 'string (optional) - Filter by booking status'
              },
              response: 'Booking data with trip and route information'
            },
            {
              path: '/student-payments',
              method: 'GET',
              description: 'Get student payment history',
              parameters: {
                studentId: 'string (required) - Student ID',
                status: 'string (optional) - Filter by payment status'
              },
              response: 'Payment data with booking and trip information'
            },
            {
              path: '/student-settings',
              method: 'GET',
              description: 'Get student account settings',
              parameters: {
                studentId: 'string (required) - Student ID'
              },
              response: 'Student settings data'
            },
            {
              path: '/student-settings',
              method: 'PUT',
              description: 'Update student account settings',
              body: 'Updated settings object',
              response: 'Updated settings'
            },
            {
              path: '/student-stats',
              method: 'GET',
              description: 'Get student statistics and metrics',
              parameters: {
                studentId: 'string (required) - Student ID'
              },
              response: 'Student statistics and performance metrics'
            },
            {
              path: '/student-reservations',
              method: 'GET',
              description: 'Get current student reservations',
              parameters: {
                studentId: 'string (required) - Student ID'
              },
              response: 'Current reservation data'
            },
            {
              path: '/student-avatar',
              method: 'GET',
              description: 'Get student avatar image',
              parameters: {
                studentId: 'string (required) - Student ID'
              },
              response: 'Avatar image file'
            },
            {
              path: '/student-avatar',
              method: 'POST',
              description: 'Upload student avatar',
              body: 'Form data with avatar file',
              response: 'Avatar upload confirmation'
            }
          ]
        },
        
        general: {
          description: 'General system endpoints',
          basePath: '/',
          endpoints: [
            {
              path: '/users',
              method: 'GET',
              description: 'Get all users with optional filtering',
              parameters: {
                role: 'string (optional) - Filter by user role',
                status: 'string (optional) - Filter by user status'
              },
              response: 'User data array'
            },
            {
              path: '/trips',
              method: 'GET',
              description: 'Get all trips with basic information',
              response: 'Trip data array'
            },
            {
              path: '/trips',
              method: 'POST',
              description: 'Create a new trip',
              body: 'Trip object with required fields',
              response: 'Created trip object'
            },
            {
              path: '/bookings',
              method: 'GET',
              description: 'Get all bookings with basic information',
              response: 'Booking data array'
            },
            {
              path: '/bookings',
              method: 'POST',
              description: 'Create a new booking',
              body: 'Booking object with required fields',
              response: 'Created booking object'
            },
            {
              path: '/payments',
              method: 'GET',
              description: 'Get all payments with basic information',
              response: 'Payment data array'
            },
            {
              path: '/payments',
              method: 'POST',
              description: 'Create a new payment',
              body: 'Payment object with required fields',
              response: 'Created payment object'
            },
            {
              path: '/attendance',
              method: 'GET',
              description: 'Get all attendance records',
              response: 'Attendance data array'
            },
            {
              path: '/attendance',
              method: 'POST',
              description: 'Create a new attendance record',
              body: 'Attendance object with required fields',
              response: 'Created attendance object'
            },
            {
              path: '/buses',
              method: 'GET',
              description: 'Get all buses with basic information',
              response: 'Bus data array'
            },
            {
              path: '/routes',
              method: 'GET',
              description: 'Get all routes with basic information',
              response: 'Route data array'
            },
            {
              path: '/notifications',
              method: 'GET',
              description: 'Get notifications for a user',
              parameters: {
                userId: 'string (optional) - Filter by user ID'
              },
              response: 'Notification data array'
            },
            {
              path: '/settings',
              method: 'GET',
              description: 'Get system settings',
              response: 'System settings object'
            },
            {
              path: '/analytics',
              method: 'GET',
              description: 'Get general system analytics',
              response: 'General analytics data'
            },
            {
              path: '/announcements',
              method: 'GET',
              description: 'Get system announcements',
              response: 'Announcement data array'
            },
            {
              path: '/maintenance-check',
              method: 'GET',
              description: 'Check system maintenance status',
              response: 'Maintenance status information'
            }
          ]
        }
      },
      
      dataModels: {
        user: {
          description: 'User entity representing all system users',
          fields: {
            id: 'string - Unique user identifier',
            name: 'string - User full name',
            email: 'string - User email address',
            phone: 'string - User phone number',
            role: 'string - User role (admin, supervisor, movement-manager, driver, student)',
            status: 'string - User status (active, inactive, suspended)',
            createdAt: 'string - ISO timestamp of creation',
            updatedAt: 'string - ISO timestamp of last update'
          }
        },
        trip: {
          description: 'Trip entity representing bus journeys',
          fields: {
            id: 'string - Unique trip identifier',
            routeId: 'string - Associated route ID',
            busId: 'string - Associated bus ID',
            driverId: 'string - Associated driver ID',
            supervisorId: 'string - Associated supervisor ID',
            date: 'string - Trip date (YYYY-MM-DD)',
            startTime: 'string - Trip start time (HH:MM)',
            endTime: 'string - Trip end time (HH:MM)',
            status: 'string - Trip status (scheduled, active, completed, cancelled)',
            passengers: 'number - Number of passengers',
            createdAt: 'string - ISO timestamp of creation',
            updatedAt: 'string - ISO timestamp of last update'
          }
        },
        booking: {
          description: 'Booking entity representing student trip reservations',
          fields: {
            id: 'string - Unique booking identifier',
            studentId: 'string - Associated student ID',
            tripId: 'string - Associated trip ID',
            status: 'string - Booking status (pending, confirmed, cancelled, completed)',
            date: 'string - Booking date (YYYY-MM-DD)',
            createdAt: 'string - ISO timestamp of creation',
            updatedAt: 'string - ISO timestamp of last update'
          }
        },
        payment: {
          description: 'Payment entity representing financial transactions',
          fields: {
            id: 'string - Unique payment identifier',
            bookingId: 'string - Associated booking ID',
            tripId: 'string - Associated trip ID',
            studentId: 'string - Associated student ID',
            amount: 'number - Payment amount',
            status: 'string - Payment status (pending, completed, failed)',
            method: 'string - Payment method (cash, card, online)',
            date: 'string - Payment date (YYYY-MM-DD)',
            createdAt: 'string - ISO timestamp of creation',
            updatedAt: 'string - ISO timestamp of last update'
          }
        },
        attendance: {
          description: 'Attendance entity representing student trip attendance',
          fields: {
            id: 'string - Unique attendance identifier',
            studentId: 'string - Associated student ID',
            tripId: 'string - Associated trip ID',
            status: 'string - Attendance status (present, absent, late)',
            date: 'string - Attendance date (YYYY-MM-DD)',
            checkInTime: 'string - Check-in time (HH:MM)',
            checkOutTime: 'string - Check-out time (HH:MM)',
            createdAt: 'string - ISO timestamp of creation',
            updatedAt: 'string - ISO timestamp of last update'
          }
        },
        bus: {
          description: 'Bus entity representing fleet vehicles',
          fields: {
            id: 'string - Unique bus identifier',
            number: 'string - Bus number/plate',
            model: 'string - Bus model',
            capacity: 'number - Passenger capacity',
            status: 'string - Bus status (active, maintenance, inactive)',
            lastMaintenance: 'string - Last maintenance date (YYYY-MM-DD)',
            nextMaintenance: 'string - Next maintenance date (YYYY-MM-DD)',
            createdAt: 'string - ISO timestamp of creation',
            updatedAt: 'string - ISO timestamp of last update'
          }
        },
        route: {
          description: 'Route entity representing bus routes',
          fields: {
            id: 'string - Unique route identifier',
            name: 'string - Route name',
            startPoint: 'string - Route starting point',
            endPoint: 'string - Route ending point',
            distance: 'number - Route distance in kilometers',
            estimatedDuration: 'number - Estimated duration in minutes',
            createdAt: 'string - ISO timestamp of creation',
            updatedAt: 'string - ISO timestamp of last update'
          }
        }
      },
      
      errorCodes: {
        '400': 'Bad Request - Invalid parameters or request format',
        '401': 'Unauthorized - Authentication required',
        '403': 'Forbidden - Insufficient permissions',
        '404': 'Not Found - Resource not found',
        '500': 'Internal Server Error - Server-side error'
      },
      
      rateLimiting: {
        description: 'API rate limiting may be implemented for production use',
        limits: 'To be determined based on system requirements'
      },
      
      pagination: {
        description: 'Endpoints that return large datasets support pagination',
        parameters: {
          limit: 'number - Number of items per page (default: 50, max: 100)',
          offset: 'number - Number of items to skip (default: 0)'
        },
        response: 'Paginated response with summary and pagination metadata'
      },
      
      filtering: {
        description: 'Most endpoints support filtering by various parameters',
        commonFilters: [
          'status - Filter by entity status',
          'date - Filter by date (YYYY-MM-DD format)',
          'search - Text search in relevant fields',
          'role - Filter by user role',
          'entityId - Filter by related entity ID'
        ]
      },
      
      examples: {
        getTrips: {
          description: 'Get all trips with filtering',
          url: '/api/admin-trips?status=active&date=2024-01-15',
          response: 'Returns active trips for January 15, 2024'
        },
        createUser: {
          description: 'Create a new user',
          url: '/api/admin-users',
          method: 'POST',
          body: {
            name: 'John Doe',
            email: 'john.doe@example.com',
            phone: '+1234567890',
            role: 'driver',
            status: 'active'
          }
        },
        getAnalytics: {
          description: 'Get system analytics',
          url: '/api/admin-analytics?dateFrom=2024-01-01&dateTo=2024-01-31',
          response: 'Returns analytics for January 2024'
        }
      }
    };

    return NextResponse.json(apiDocumentation);
  } catch (error) {
    console.error('Error generating API documentation:', error);
    return NextResponse.json(
      { error: 'Failed to generate API documentation' },
      { status: 500 }
    );
  }
}
