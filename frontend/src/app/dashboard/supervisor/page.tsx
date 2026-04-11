'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  Bus, 
  User, 
  MapPin, 
  Clock, 
  Users, 
  Fuel, 
  Gauge,
  Route,
  Phone,
  Mail,
  AlertTriangle,
  Calendar,
  TrendingUp,
  XCircle,
  Clock3,
  Activity,
  Bell,
  Eye,
  Navigation,
  Car,
  Timer,
  Target,
  Award,
  Zap,
  UserCheck,
  UserX,
  FileText,
  BarChart3,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { userAPI, tripAPI, busAPI, notificationAPI } from '@/lib/api';

interface TripData {
  id: string;
  busId: string;
  routeId: string;
  driverId: string;
  supervisorId: string;
  date: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  startTime: string;
  endTime: string;
  passengers: number;
  revenue: number;
  assignedStudents?: string[];
}

interface BusData {
  id: string;
  number: string;
  capacity: number;
  driverId: string | null;
  status: string;
  location: {
    lat: number;
    lng: number;
  };
  currentRouteId: string | null;
  lastUpdated: string;
  fuelLevel: number;
  speed: number;
  assignedStudents: string[];
  assignedSupervisorId: string | null;
}

interface DriverData {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  status: string;
  avatar: string;
}

interface RouteData {
  id: string;
  name: string;
  startPoint: string;
  endPoint: string;
  stops: Array<{
    lat: number;
    lng: number;
    name: string;
  }>;
  schedule: {
    departureTime: string;
    arrivalTime: string;
    days: string[];
  };
  estimatedDuration: number;
  distance: number;
  status: string;
  assignedBuses: string[];
  assignedSupervisors: string[];
}

interface SupervisorData {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  status: string;
  avatar: string;
  assignedBusId: string;
  assignedRouteId: string;
  assignedStudents: string[];
  assignedDrivers: string[];
}

interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  status: string;
  read: boolean;
  createdAt: string;
}

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [supervisorData, setSupervisorData] = useState<SupervisorData | null>(null);

  // Redirect to My Trips page on component mount
  useEffect(() => {
    router.push('/dashboard/supervisor/my-trips');
  }, [router]);
  const [nextTrip, setNextTrip] = useState<TripData | null>(null);
  const [tripBus, setTripBus] = useState<BusData | null>(null);
  const [tripDriver, setTripDriver] = useState<DriverData | null>(null);
  const [tripRoute, setTripRoute] = useState<RouteData | null>(null);
  const [allTrips, setAllTrips] = useState<TripData[]>([]);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch data from global API
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!user?.id) {
          setSupervisorData(null);
          setNextTrip(null);
          setTripBus(null);
          setTripDriver(null);
          setTripRoute(null);
          setAllTrips([]);
          setNotifications([]);
          setLoading(false);
          return;
        }
        const supervisorId = user.id.toString();
        
        // Fetch supervisor data by id (global backend)
        const supervisor = await userAPI.getById(String(supervisorId));
        if (!supervisor) {
          // No supervisor data yet; show empty state gracefully
          setSupervisorData(null);
          setNextTrip(null);
          setTripBus(null);
          setTripDriver(null);
          setTripRoute(null);
          setAllTrips([]);
          setNotifications([]);
          setLoading(false);
          return;
        }

        // Transform supervisor data to match SupervisorData interface
        const transformedSupervisor: SupervisorData = {
          id: supervisor.id?.toString() || '',
          name: supervisor.name || supervisor.fullName || '',
          email: supervisor.email || '',
          role: supervisor.role || 'supervisor',
          phone: supervisor.phone || '',
          status: supervisor.status || 'active',
          avatar: supervisor.avatar || '',
          assignedBusId: (supervisor as any).assignedBusId || '',
          assignedRouteId: (supervisor as any).assignedRouteId || '',
          assignedStudents: (supervisor as any).assignedStudents || [],
          assignedDrivers: (supervisor as any).assignedDrivers || []
        };

        // Fetch trips (global backend). If supervisor filter not supported, filter client-side
        const tripsRes = await tripAPI.getAll();
        
        // Transform trips data to match TripData interface
        const transformedTrips = (tripsRes as any[]).map((trip: any) => ({
          id: trip.id?.toString() || '',
          busId: trip.busId?.toString() || '',
          routeId: trip.routeId?.toString() || '',
          driverId: trip.driverId?.toString() || '',
          supervisorId: trip.supervisorId?.toString() || '',
          date: trip.tripDate || trip.date || '',
          status: (trip.status || 'scheduled') as 'scheduled' | 'in-progress' | 'completed' | 'cancelled',
          startTime: trip.startTime || '00:00',
          endTime: trip.endTime || '00:00',
          passengers: trip.passengers || 0,
          revenue: trip.revenue || 0,
          assignedStudents: trip.assignedStudents || []
        }));

        setAllTrips(transformedTrips);

        // Filter trips for this supervisor and find the next one
        const supervisorTrips = transformedTrips.filter((trip: TripData) => 
          trip.supervisorId === supervisorId && 
          trip.status === 'scheduled'
        );

        // Sort trips by date and time to find the next one
        const now = new Date();
        const nextTrip = supervisorTrips
          .filter((trip: TripData) => {
            const tripDateTime = new Date(`${trip.date}T${trip.startTime}`);
            return tripDateTime > now;
          })
          .sort((a: TripData, b: TripData) => {
            const dateA = new Date(`${a.date}T${a.startTime}`);
            const dateB = new Date(`${b.date}T${b.startTime}`);
            return dateA.getTime() - dateB.getTime();
          })[0];

        if (nextTrip) {
          setNextTrip(nextTrip);

          // Fetch related data for the next trip
          const [bus, driver, route] = await Promise.all([
            busAPI.getById(Number(nextTrip.busId)).catch(() => null),
            userAPI.getById(String(nextTrip.driverId)).catch(() => null),
            Promise.resolve(null), // No longer using routes
          ]);
          
          if (bus) {
            const transformedBus: BusData = {
              id: bus.id?.toString() || '',
              number: bus.busNumber || bus.number || '',
              capacity: bus.capacity || 0,
              driverId: bus.driverId?.toString() || null,
              status: bus.status || 'active',
              location: bus.location || { lat: 0, lng: 0 },
              currentRouteId: bus.currentRouteId?.toString() || null,
              lastUpdated: bus.lastUpdated || new Date().toISOString(),
              fuelLevel: bus.fuelLevel || 0,
              speed: bus.speed || 0,
              assignedStudents: bus.assignedStudents || [],
              assignedSupervisorId: bus.assignedSupervisorId?.toString() || null
            };
            setTripBus(transformedBus);
          }
          
          if (driver) {
            const transformedDriver: DriverData = {
              id: driver.id?.toString() || '',
              name: driver.name || driver.fullName || '',
              email: driver.email || '',
              role: driver.role || 'driver',
              phone: driver.phone || '',
              status: driver.status || 'active',
              avatar: driver.avatar || ''
            };
            setTripDriver(transformedDriver);
          }
          
          if (route) setTripRoute(route);
        }

        // Fetch notifications
        try {
          const notificationsData = await notificationAPI.getAll();
          const transformedNotifications = ((notificationsData as any)?.data || []).map((notification: any) => ({
            id: notification.id?.toString() || '',
            title: notification.title || '',
            message: notification.message || '',
            type: notification.type || '',
            priority: notification.priority || 'medium',
            status: notification.status || 'unread',
            read: notification.read || false,
            createdAt: notification.createdAt || new Date().toISOString()
          }));
          setNotifications(transformedNotifications.slice(0, 4));
        } catch (error) {
          console.log('No notifications available');
        }

        setSupervisorData(transformedSupervisor);
        
        console.log('✅ Dashboard data loaded from global API:', {
          supervisor: transformedSupervisor.name,
          nextTrip: nextTrip ? `${nextTrip.date} at ${nextTrip.startTime}` : 'No upcoming trips',
          totalTrips: transformedTrips.length
        });
        
        setLoading(false);
    } catch (error) {
        console.error('Error fetching data from global API:', error);
        setError('Failed to load dashboard data. Please refresh the page.');
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Calculate statistics
  const calculateStats = () => {
    if (!allTrips.length) return {
      totalTrips: 0,
      completedTrips: 0,
      inProgressTrips: 0,
      cancelledTrips: 0,
      totalPassengers: 0,
      completionRate: 0
    };

    const totalTrips = allTrips.length;
    const completedTrips = allTrips.filter(t => t.status === 'completed').length;
    const inProgressTrips = allTrips.filter(t => t.status === 'in-progress').length;
    const cancelledTrips = allTrips.filter(t => t.status === 'cancelled').length;
    const totalPassengers = allTrips.reduce((sum, trip) => sum + (trip.passengers || 0), 0);
    const completionRate = totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 0;

    return {
      totalTrips,
      completedTrips,
      inProgressTrips,
      cancelledTrips,
      totalPassengers,
      completionRate
    };
  };

  // Get recent trips
  const getRecentTrips = () => {
    return allTrips
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4);
  };

  // Get unread notifications count
  const getUnreadCount = () => {
    return notifications.filter(n => !n.read).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-6 text-lg text-gray-600 font-medium">Loading dashboard...</p>
          <p className="mt-2 text-gray-500">Please wait while we gather your information</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  if (!supervisorData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-8 w-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600">Unable to load supervisor dashboard data</p>
        </div>
      </div>
    );
  }

  const stats = calculateStats();
  const recentTrips = getRecentTrips();
  const unreadCount = getUnreadCount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl">
                  <User className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-gray-900">Supervisor Dashboard</h1>
                  <p className="text-lg text-gray-600">Welcome back, {supervisorData?.name}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={supervisorData?.status === 'active' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
                {supervisorData?.status === 'active' ? 'Active' : 'Inactive'}
              </Badge>
              <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-blue-800">Total Trips</CardTitle>
              <div className="p-2 bg-blue-200 rounded-lg">
                <Route className="h-5 w-5 text-blue-700" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">{stats.totalTrips.toLocaleString()}</div>
              <p className="text-sm text-blue-700 mt-1">All time trips</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-green-800">Completed</CardTitle>
              <div className="p-2 bg-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-700" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900">{stats.completedTrips.toLocaleString()}</div>
              <p className="text-sm text-green-700 mt-1">{stats.completionRate}% success rate</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-purple-800">In Progress</CardTitle>
              <div className="p-2 bg-purple-200 rounded-lg">
                <Clock3 className="h-5 w-5 text-purple-700" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900">{stats.inProgressTrips.toLocaleString()}</div>
              <p className="text-sm text-purple-700 mt-1">Currently active</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-orange-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 bg-gradient-to-r from-orange-50 to-orange-100">
              <CardTitle className="text-sm font-medium text-gray-900">Total Passengers</CardTitle>
              <div className="p-2 bg-orange-500 rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.totalPassengers.toLocaleString()}</div>
              <p className="text-sm text-gray-600 mt-1">Across all trips</p>
            </CardContent>
          </Card>
        </div>

        {/* Next Trip Information */}
        <Card className="bg-white shadow-sm border-gray-100 rounded-2xl">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Next Trip
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {nextTrip ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Trip Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    Trip Details
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm text-gray-600">Trip ID</span>
                      <span className="font-mono text-sm font-semibold text-blue-700">#{nextTrip.id.slice(-6)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm text-gray-600">Date</span>
                      <span className="font-semibold text-gray-900">{new Date(nextTrip.date).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm text-gray-600">Start Time</span>
                      <span className="font-semibold text-gray-900">{nextTrip.startTime}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm text-gray-600">End Time</span>
                      <span className="font-semibold text-gray-900">{nextTrip.endTime || 'TBD'}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm text-gray-600">Expected Passengers</span>
                      <span className="font-semibold text-gray-900">{nextTrip.passengers}</span>
                    </div>
                  </div>
                </div>

                {/* Route Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-green-600" />
                    Route Information
                  </h3>
                  
                  {tripRoute ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="text-sm text-gray-600">Route Name</span>
                        <span className="font-semibold text-gray-900">{tripRoute.name}</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="text-sm text-gray-600">Start Point</span>
                        <span className="font-semibold text-gray-900">{tripRoute.startPoint}</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="text-sm text-gray-600">End Point</span>
                        <span className="font-semibold text-gray-900">{tripRoute.endPoint}</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="text-sm text-gray-600">Distance</span>
                        <span className="font-semibold text-gray-900">{tripRoute.distance} km</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="text-sm text-gray-600">Duration</span>
                        <span className="font-semibold text-gray-900">{tripRoute.estimatedDuration} min</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Navigation className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>Route information not available</p>
                    </div>
                  )}
                </div>

                {/* Bus & Driver Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Car className="h-5 w-5 text-purple-600" />
                    Bus & Driver
                  </h3>
                  
                  {tripBus && (
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <span className="text-sm text-gray-600">Bus Number</span>
                        <span className="font-semibold text-gray-900">{tripBus.number}</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <span className="text-sm text-gray-600">Capacity</span>
                        <span className="font-semibold text-gray-900">{tripBus.capacity}</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <span className="text-sm text-gray-600">Status</span>
                        <Badge variant={tripBus.status === 'active' ? 'default' : 'secondary'}>
                          {tripBus.status}
                        </Badge>
                      </div>
                    </div>
                  )}
                  
                  {tripDriver ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <span className="text-sm text-gray-600">Driver Name</span>
                        <span className="font-semibold text-gray-900">{tripDriver.name}</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <span className="text-sm text-gray-600">Phone</span>
                        <span className="font-semibold text-gray-900">{tripDriver.phone}</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <span className="text-sm text-gray-600">Status</span>
                        <Badge variant={tripDriver.status === 'active' ? 'default' : 'secondary'}>
                          {tripDriver.status}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <User className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No driver assigned</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Route className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No upcoming trips scheduled</p>
                <p className="text-gray-400 text-sm mt-1">Check back later for new assignments</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Trips & Notifications */}
        <div className="space-y-8">
          {/* Recent Trips */}
          <Card className="bg-white shadow-sm border-gray-100 rounded-2xl">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Recent Trips
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {recentTrips.length > 0 ? (
                  recentTrips.map((trip) => (
                    <div key={trip.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          trip.status === 'completed' ? 'bg-green-500' :
                          trip.status === 'in-progress' ? 'bg-blue-500' :
                          trip.status === 'scheduled' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}></div>
                        <div>
                          <p className="font-medium text-gray-900">Trip #{trip.id.slice(-6)}</p>
                          <p className="text-sm text-gray-500">{new Date(trip.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={
                          trip.status === 'completed' ? 'default' :
                          trip.status === 'in-progress' ? 'secondary' :
                          trip.status === 'scheduled' ? 'outline' :
                          'destructive'
                        } className="capitalize">
                          {trip.status}
                        </Badge>
                        <Button variant="outline" size="sm" className="border-gray-300 hover:bg-gray-50">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No trips available</p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <Link href="/dashboard/supervisor/trips">
                  <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                    See more
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Recent Notifications */}
          <Card className="bg-white shadow-sm border-gray-100 rounded-2xl">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Bell className="h-5 w-5 text-green-600" />
                Recent Notifications
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    {unreadCount} new
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div key={notification.id} className={`p-4 rounded-lg border-l-4 ${
                      notification.read 
                        ? 'bg-gray-50 border-gray-300' 
                        : 'bg-blue-50 border-blue-500'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`font-medium ${
                            notification.read ? 'text-gray-700' : 'text-blue-900'
                          }`}>
                            {notification.title}
                          </p>
                          <p className={`text-sm mt-1 ${
                            notification.read ? 'text-gray-500' : 'text-blue-700'
                          }`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Bell className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No notifications available</p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <Link href="/dashboard/supervisor/notifications">
                  <Button variant="outline" className="border-gray-300 hover:bg-gray-50">
                    See more
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-white shadow-sm border-gray-100 rounded-2xl">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white h-12">
                <Route className="w-5 h-5 mr-2" />
                View All Trips
              </Button>
              <Button variant="outline" className="border-gray-300 hover:bg-gray-50 h-12">
                <Bell className="w-5 h-5 mr-2" />
                View Notifications
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
