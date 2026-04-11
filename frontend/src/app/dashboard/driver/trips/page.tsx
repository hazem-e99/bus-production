'use client';

import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { useToast } from '@/components/ui/Toast';
import { 
  Clock,
  MapPin,
  Users,
  Search,
  Route as RouteIcon,
  Bus,
  RefreshCw
} from 'lucide-react';
import { 
  tripAPI,
  routeAPI,
  busAPI
} from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/utils/formatDate';
import { useState, useEffect } from 'react';
import { TripViewModel } from '@/types/trip';

interface Trip {
  id: string;
  busId: string;
  routeId: string;
  driverId: string;
  date: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  startTime: string;
  endTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  passengers: number;
  revenue: number;
  assignedStudents?: string[];
  supervisorId?: string;
}

interface Bus {
  id: string;
  busNumber: string;
  capacity: number;
  driverId?: string;
  status: 'active' | 'maintenance' | 'out-of-service';
}

interface Route {
  id: string;
  name: string;
  startPoint: string;
  endPoint: string;
  estimatedDuration: number;
  distance: number;
}

export default function TripHistory() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { showToast } = useToast();

  // Filter states
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch data from db.json
  const fetchTripHistory = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      console.log('🔄 Fetching trip history from db.json...');
      
      // Fetch all trips
      const allTrips = await tripAPI.getAll();
      const driverTrips = allTrips.filter((t: TripViewModel) => t.driverId === user.id);
      console.log('📊 Driver trips loaded:', driverTrips.length);
      setTrips(driverTrips as unknown as Trip[]);
      
      // Fetch routes and buses for additional info
      const allRoutes = await routeAPI.getAll();
      const allBusesResponse = await busAPI.getAll();
      setRoutes(allRoutes);
      setBuses(allBusesResponse.data as unknown as Bus[]);
      
      setLastRefresh(new Date());
      console.log('✅ Trip history loaded successfully');
      
    } catch (error) {
      console.error('❌ Failed to fetch trip history:', error);
      showToast({
        type: 'error',
        title: 'Error!',
        message: 'Failed to load trip history. Please refresh.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchTripHistory();
  }, [user]);

  // Apply filters
  useEffect(() => {
    let filtered = trips;

    // Filter by date
    if (selectedDate) {
      filtered = filtered.filter(trip => 
        trip.date === selectedDate || trip.date.startsWith(selectedDate)
      );
    }

    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter(trip => trip.status === selectedStatus);
    }

    // Filter by route
    if (selectedRoute) {
      filtered = filtered.filter(trip => trip.routeId === selectedRoute);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(trip => {
        const routeName = getRouteName(trip.routeId);
        const busNumber = getBusNumber(trip.busId);
        return (
          routeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          busNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          trip.date.includes(searchTerm) ||
          trip.startTime.includes(searchTerm)
        );
      });
    }

    setFilteredTrips(filtered);
  }, [trips, selectedDate, selectedStatus, selectedRoute, searchTerm]);

  // Helper functions
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'scheduled': { color: 'bg-blue-50 text-blue-700 border-blue-200', text: 'Scheduled' },
      'in-progress': { color: 'bg-amber-50 text-amber-700 border-amber-200', text: 'In Progress' },
      'completed': { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'Completed' },
      'cancelled': { color: 'bg-red-50 text-red-700 border-red-200', text: 'Cancelled' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
    
    return (
      <Badge className={`${config.color} border font-medium px-3 py-1`}>
        {config.text}
      </Badge>
    );
  };

  const getRouteName = (routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    return route ? route.name : 'Unknown Route';
  };

  const getBusNumber = (busId: string) => {
    const bus = buses.find(b => b.id === busId);
    return bus ? bus.busNumber : 'Unknown Bus';
  };

  const getRouteInfo = (routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    return route ? {
      startPoint: route.startPoint,
      endPoint: route.endPoint,
      duration: route.estimatedDuration,
      distance: route.distance
    } : null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-lg text-slate-600 font-medium">Loading trip history...</p>
          <p className="text-sm text-slate-500 mt-2">Fetching data from db.json</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6">
      <div className="max-w-screen-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-lg border border-slate-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-blue-600 bg-clip-text text-transparent">
                Trip History
              </h1>
              <p className="text-slate-600 mt-1">Complete history of all your trips</p>
              <p className="text-xs text-slate-500 mt-1">
                Last updated: {lastRefresh.toLocaleTimeString()} • Data from db.json
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button
                onClick={fetchTripHistory}
                disabled={isLoading}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-4 py-2 rounded-lg w-full sm:w-auto"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Trip History Section */}
        <Card className="bg-white border-0 shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-900">Trip History</CardTitle>
            <CardDescription>
              Showing {filteredTrips.length} of {trips.length} trips
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Filters</h3>
              <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-lg border border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search route, bus, date..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                  <Select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    options={[
                      { value: '', label: 'All Status' },
                      { value: 'scheduled', label: 'Scheduled' },
                      { value: 'in-progress', label: 'In Progress' },
                      { value: 'completed', label: 'Completed' },
                      { value: 'cancelled', label: 'Cancelled' },
                    ]}
                  />
                  <Select
                    value={selectedRoute}
                    onChange={(e) => setSelectedRoute(e.target.value)}
                    options={[
                      { value: '', label: 'All Routes' },
                      ...routes.map(r => ({ value: r.id, label: r.name }))
                    ]}
                  />
                </div>
                <div className="mt-4 flex flex-col sm:flex-row sm:justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedDate('');
                      setSelectedStatus('');
                      setSelectedRoute('');
                      setSearchTerm('');
                    }}
                    className="flex items-center gap-2 w-full sm:w-auto"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Clear Filters
                  </Button>
                </div>
              </div>
            </div>

            {filteredTrips.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="border-slate-200">
                      <TableHead className="text-slate-700 font-semibold text-xs">Date</TableHead>
                      <TableHead className="text-slate-700 font-semibold text-xs">Route</TableHead>
                      <TableHead className="text-slate-700 font-semibold text-xs">Bus</TableHead>
                      <TableHead className="text-slate-700 font-semibold text-xs">Time</TableHead>
                      <TableHead className="text-slate-700 font-semibold text-xs">Passengers</TableHead>
                      <TableHead className="text-slate-700 font-semibold text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrips.map((trip, index) => {
                      const routeInfo = getRouteInfo(trip.routeId);
                      return (
                        <TableRow
                          key={trip.id}
                          className={`border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                        >
                          <TableCell className="font-medium text-slate-900 text-sm">{formatDate(trip.date)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3 text-blue-600" />
                                <span className="font-medium text-sm">{getRouteName(trip.routeId)}</span>
                              </div>
                              {routeInfo && (
                                <div className="text-xs text-slate-500">{routeInfo.startPoint} → {routeInfo.endPoint}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Bus className="h-3 w-3 text-orange-600" />
                              <span className="font-medium text-sm">{getBusNumber(trip.busId)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3 text-emerald-600" />
                                <span className="font-medium text-sm">{trip.startTime}</span>
                              </div>
                              {trip.endTime && (
                                <div className="text-xs text-slate-500">End: {trip.endTime}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Users className="h-3 w-3 text-purple-600" />
                              <span className="font-medium text-sm">{trip.passengers}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(trip.status)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <RouteIcon className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No trips found</h3>
                <p className="text-sm text-slate-500">Try adjusting your filters or search criteria</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Database Status */}
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
            <h3 className="text-sm font-semibold text-emerald-800">Database Connected</h3>
          </div>
          <p className="text-emerald-700 text-xs">
            Trip history data is live and synchronized with db.json • Last refresh: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}
