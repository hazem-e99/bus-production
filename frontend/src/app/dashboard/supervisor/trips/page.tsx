'use client';

import { useState, useEffect, Fragment } from 'react';
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/hooks/useAuth';
import { 
  Route, 
  MapPin, 
  Clock, 
  Bus, 
  User, 
  Users, 
  Search,
  Filter,
  Calendar,
  Navigation,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { tripAPI, routeAPI, busAPI, userAPI, bookingAPI } from '@/lib/api';

interface Trip {
  id: string;
  busId: string;
  routeId: string;
  driverId: string;
  date: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  startTime: string;
  endTime: string;
  passengers: number;
  revenue: number;
  assignedStudents?: string[];
  supervisorId: string;
  stops?: { id: string; stopName: string; stopTime: string }[];
}

interface Route {
  id: string;
  name: string;
  startPoint: string;
  endPoint: string;
  estimatedDuration: number;
  distance: number;
}

interface Bus {
  id: string;
  number: string;
  capacity: number;
  status: string;
}

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
}

interface Booking {
  id: string;
  studentId: string;
  tripId: string;
  date: string;
  status: string;
  seatNumber: number;
  paymentMethod: string;
  price: number;
}

export default function SupervisorTripsPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Fetch data from db.json
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tripsRes, routesRes, busesRes, driversRes, bookingsRes] = await Promise.all([
          tripAPI.getAll(),
          routeAPI.getAll(),
          busAPI.getAll(),
          userAPI.getByRole('driver'),
          bookingAPI.getAll()
        ]);

        // Transform trips data to match Trip interface
        const transformedTrips = (tripsRes as any[]).map((trip: any) => ({
          id: trip.id?.toString() || '',
          busId: trip.busId?.toString() || '',
          routeId: trip.routeId?.toString() || '',
          driverId: trip.driverId?.toString() || '',
          date: trip.tripDate || trip.date || '',
          status: (trip.status || 'scheduled') as 'scheduled' | 'in-progress' | 'completed' | 'cancelled',
          startTime: trip.startTime || '00:00',
          endTime: trip.endTime || '00:00',
          passengers: trip.passengers || 0,
          revenue: trip.revenue || 0,
          assignedStudents: trip.assignedStudents || [],
          supervisorId: trip.supervisorId?.toString() || '',
          stops: trip.stops || []
        }));

        // Transform routes data
        const transformedRoutes = (routesRes as any[]).map((route: any) => ({
          id: route.id?.toString() || '',
          name: route.name || '',
          startPoint: route.startPoint || '',
          endPoint: route.endPoint || '',
          estimatedDuration: route.estimatedDuration || 0,
          distance: route.distance || 0
        }));

        // Transform buses data
        const transformedBuses = (busesRes as any)?.data || busesRes || [];
        const processedBuses = (Array.isArray(transformedBuses) ? transformedBuses : []).map((bus: any) => ({
          id: bus.id?.toString() || '',
          number: bus.busNumber || bus.number || '',
          capacity: bus.capacity || 0,
          status: bus.status || 'active'
        }));

        // Transform drivers data
        const transformedDrivers = (driversRes as any[]).map((driver: any) => ({
          id: driver.id?.toString() || '',
          name: driver.name || driver.fullName || '',
          email: driver.email || '',
          phone: driver.phone || '',
          status: driver.status || 'active'
        }));

        // Transform bookings data
        const transformedBookings = (bookingsRes as any[]).map((booking: any) => ({
          id: booking.id?.toString() || '',
          studentId: booking.studentId?.toString() || '',
          tripId: booking.tripId?.toString() || '',
          date: booking.date || '',
          status: booking.status || '',
          seatNumber: booking.seatNumber || 0,
          paymentMethod: booking.paymentMethod || '',
          price: booking.price || 0
        }));

        setTrips(transformedTrips);
        setRoutes(transformedRoutes);
        setBuses(processedBuses);
        setDrivers(transformedDrivers);
        setBookings(transformedBookings);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  // Get filtered trips
  const getFilteredTrips = () => {
    let filtered = trips;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(trip => trip.status === statusFilter);
    }

    if (dateFilter !== 'all') {
      const today = new Date();
      const tripDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filtered = filtered.filter(trip => {
            tripDate.setTime(Date.parse(trip.date));
            return tripDate.toDateString() === today.toDateString();
          });
          break;
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(trip => {
            tripDate.setTime(Date.parse(trip.date));
            return tripDate >= weekAgo && tripDate <= today;
          });
          break;
        case 'month':
          const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
          filtered = filtered.filter(trip => {
            tripDate.setTime(Date.parse(trip.date));
            return tripDate >= monthAgo && tripDate <= today;
          });
          break;
      }
    }

    if (searchTerm) {
      filtered = filtered.filter(trip => {
        const route = routes.find(r => r.id === trip.routeId);
        const bus = buses.find(b => b.id === trip.busId);
        const driver = drivers.find(d => d.id === trip.driverId);
        
        return (
          route?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bus?.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          driver?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          trip.date.includes(searchTerm) ||
          trip.status.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    return filtered;
  };

  const getStudentCount = (tripId: string) => {
    return bookings.filter(booking => booking.tripId === tripId).length;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'scheduled': { color: 'bg-blue-100 text-blue-800 border-blue-200', text: 'Scheduled', icon: Clock },
      'in-progress': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: 'In Progress', icon: Navigation },
      'completed': { color: 'bg-green-100 text-green-800 border-green-200', text: 'Completed', icon: CheckCircle },
      'cancelled': { color: 'bg-red-100 text-red-800 border-red-200', text: 'Cancelled', icon: XCircle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
    const IconComponent = config.icon;
    
    return (
      <Badge className={`${config.color} border font-medium px-3 py-1 flex items-center gap-2`}>
        <IconComponent className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredTrips = getFilteredTrips();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-lg text-slate-600 font-medium">Loading trips...</p>
          <p className="text-sm text-slate-500 mt-2">Fetching data from db.json</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600 mb-4">Please log in to view your trips.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Trips</h3>
          <p className="text-gray-600 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-screen-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-blue-600 bg-clip-text text-transparent">
                My Trips
              </h1>
              <p className="text-slate-600 mt-1">Manage and monitor your assigned trips</p>
              <p className="text-xs text-slate-500 mt-1">Showing {filteredTrips.length} of {trips.length} trips</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-white border-0 shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search trips, routes, bus, driver..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Status</label>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border-slate-200 rounded-lg"
                >
                  <option value="all">All Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Date Range</label>
                <Select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="border-slate-200 rounded-lg"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setDateFilter('all');
                  }}
                  variant="outline"
                  className="border-slate-200 hover:bg-slate-100 w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trips Table */}
        <Card className="bg-white border-0 shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-900">Trips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left text-sm font-semibold text-slate-700 py-3 px-4">Trip</th>
                    <th className="text-left text-sm font-semibold text-slate-700 py-3 px-4">Date</th>
                    <th className="text-left text-sm font-semibold text-slate-700 py-3 px-4">Time</th>
                    <th className="text-left text-sm font-semibold text-slate-700 py-3 px-4">Route</th>
                    <th className="text-left text-sm font-semibold text-slate-700 py-3 px-4">Bus</th>
                    <th className="text-left text-sm font-semibold text-slate-700 py-3 px-4">Driver</th>
                    <th className="text-left text-sm font-semibold text-slate-700 py-3 px-4">Stops</th>
                    <th className="text-left text-sm font-semibold text-slate-700 py-3 px-4">Students</th>
                    <th className="text-left text-sm font-semibold text-slate-700 py-3 px-4">Status</th>
                    <th className="text-left text-sm font-semibold text-slate-700 py-3 px-4">Details</th>
                    <th className="text-left text-sm font-semibold text-slate-700 py-3 px-4">Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrips.map((trip) => {
              const route = routes.find(r => r.id === trip.routeId);
              const bus = buses.find(b => b.id === trip.busId);
              const driver = drivers.find(d => d.id === trip.driverId);
                    const stops = Array.isArray(trip.stops) ? trip.stops : [];
                    const isExpanded = !!expandedRows[trip.id];
              return (
                      <Fragment key={trip.id}>
                        <tr key={trip.id} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm text-slate-700">{trip.id}</td>
                          <td className="py-3 px-4 text-sm text-slate-700">{formatDate(trip.date)}</td>
                          <td className="py-3 px-4 text-sm text-slate-700">{trip.startTime} - {trip.endTime}</td>
                          <td className="py-3 px-4 text-sm text-slate-700">{route ? `${route.startPoint} → ${route.endPoint}` : '-'}</td>
                          <td className="py-3 px-4 text-sm text-slate-700">{bus ? bus.number : '-'}</td>
                          <td className="py-3 px-4 text-sm text-slate-700">{driver ? driver.name : '-'}</td>
                          <td className="py-3 px-4 text-sm text-slate-700">{stops.length}</td>
                          <td className="py-3 px-4 text-sm text-slate-700">{getStudentCount(trip.id)}</td>
                          <td className="py-3 px-4">{getStatusBadge(trip.status)}</td>
                          <td className="py-3 px-4">
                            <Button size="sm" variant="outline" onClick={() => setExpandedRows(prev => ({ ...prev, [trip.id]: !prev[trip.id] }))}>
                              {isExpanded ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />} Stops
                            </Button>
                          </td>
                          <td className="py-3 px-4">
                            {trip.status === 'in-progress' ? (
                              <Link href={`/dashboard/supervisor/attendance/${trip.id}`} className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700">
                                Take Attendance
                              </Link>
                            ) : (
                              <span className="text-xs text-slate-500">—</span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-b border-slate-200 bg-slate-50/60">
                            <td colSpan={10} className="py-3 px-6">
                              {stops.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {stops.map((s) => (
                                    <div key={s.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-blue-600" />
                                        <span className="text-sm font-medium text-slate-800">{s.stopName}</span>
                    </div>
                                      <div className="text-xs text-slate-600 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        <span>{s.stopTime || '-'}</span>
                        </div>
                      </div>
                                  ))}
                        </div>
                              ) : (
                                <div className="text-sm text-slate-600">No stops configured for this trip.</div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
                    </div>
                  </CardContent>
                </Card>
      </div>
    </div>
  );
}
