'use client';

import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Bus,
  Users,
  Calendar,
  Clock,
  MapPin,
  TrendingUp,
  Filter,
  Route as RouteIcon,
  Bell,
  List
} from 'lucide-react';
import {
  tripAPI,
  busAPI,
  userAPI
} from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/utils/formatDate';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Trip {
  id: string;
  busId: string;
  driverId: string;
  conductorId?: string;
  tripDate: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  startTime: string;
  endTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  startLocation: string;
  endLocation: string;
  stopLocations?: string[];
  passengers?: number;
  revenue?: number;
  assignedStudents?: string[];
  supervisorId?: string;
}

// Interface to match the API response structure
interface ApiTripViewModel {
  id: number;
  busId: number;
  driverId: number;
  conductorId: number;
  tripDate: string;
  startLocation: string;
  endLocation: string;
  stopLocations?: string[];
  passengers?: number;
  revenue?: number;
  assignedStudents?: number[];
  supervisorId?: number;
}

interface Bus {
  id: number;
  busNumber: string;
  capacity: number;
  status: 'Active' | 'Inactive' | 'UnderMaintenance' | 'OutOfService';
  speed: number;
}

// TODO: This component needs to be updated to work with the new Trip schema
// The new Trip schema uses startLocation/endLocation instead of routeId
// This is a secondary component that can be updated in a future iteration

export default function DriverDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [redirected, setRedirected] = useState(false);
  const didRedirectRef = useRef(false);
  const [isEndingTrip, setIsEndingTrip] = useState(false);
  const [tripEnded, setTripEnded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { showToast } = useToast();

  // Redirect to My Trips page on component mount and avoid triggering data fetch here
  useEffect(() => {
    didRedirectRef.current = true; // synchronous guard for same-tick effects
    router.push('/dashboard/driver/my-trips');
    setRedirected(true);
  }, [router]);

  // Real data from API
  const [driverTrips, setDriverTrips] = useState<Trip[]>([]);
  const [todayTrips, setTodayTrips] = useState<Trip[]>([]);
  const [assignedBus, setAssignedBus] = useState<Bus | null>(null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  // Function to refresh all data via API
  const refreshData = async () => {
    if (!user || redirected || didRedirectRef.current) return;
    
    try {
      setIsLoading(true);
      
      console.log('🔄 Starting driver data refresh...');
      
      // 1. Fetch all trips and filter by driver ID
      const allTrips = await tripAPI.getAll();
      console.log('📊 Fetched trips:', allTrips.length);
      
      // Transform Trip data for this component to match new schema
      const driverTripsData = allTrips
        .filter((trip: any) => trip.driverId.toString() === user.id.toString())
        .map((trip: any) => ({
          id: trip.id.toString(),
          busId: trip.busId.toString(),
          driverId: trip.driverId.toString(),
          conductorId: trip.conductorId.toString(),
          tripDate: trip.tripDate,
          status: 'scheduled' as const, // Default status since new schema doesn't include status
          startTime: '08:00', // Default time since API doesn't provide it
          endTime: '18:00', // Default time since API doesn't provide it
          startLocation: trip.startLocation,
          endLocation: trip.endLocation,
          stopLocations: trip.stopLocations,
          passengers: trip.passengers || 0,
          revenue: trip.revenue || 0,
          assignedStudents: trip.assignedStudents?.map(s => s.toString()),
          supervisorId: trip.supervisorId?.toString()
        })) as Trip[];
      console.log('👨‍✈️ Filtered trips for driver:', driverTripsData.length);
      setDriverTrips(driverTripsData);
      
      // Get today's trips from filtered data
      const today = new Date().toISOString().split('T')[0];
      const todayTripsData = driverTripsData.filter((t: Trip) => 
        t.tripDate === today || t.tripDate.startsWith(today)
      );
      console.log('📅 Today\'s trips:', todayTripsData.length);
      setTodayTrips(todayTripsData);
      
      // 3. Find active trip from today's trips
      const activeTripData = todayTripsData.find((t: Trip) => t.status === 'in-progress') || null;
      console.log('🚌 Active trip found:', activeTripData ? 'Yes' : 'No');
      setActiveTrip(activeTripData);
      
      // 4. Fetch all buses and find assigned bus
      const allBusesResponse = await busAPI.getAll();
      console.log('🚐 Fetched buses:', allBusesResponse.data.length);
      setBuses(allBusesResponse.data);
      
      // Note: New API doesn't support driver filtering, so we'll need to handle this differently
      const assignedBusData = null; // TODO: Implement driver-bus assignment logic
      console.log('🚌 Assigned bus found:', 'Not implemented in new API');
      setAssignedBus(assignedBusData);
      
      // 5. Set initial filtered trips for display
      setFilteredTrips(driverTripsData);
      
      // 6. Update last refresh timestamp
      setLastRefresh(new Date());
      
      console.log('✅ Driver data refreshed successfully:', {
        trips: driverTripsData.length,
        todayTrips: todayTripsData.length,
        assignedBus: assignedBusData?.busNumber || 'None',
        buses: allBusesResponse.data.length
      });
      
    } catch (error) {
      console.error('❌ Failed to fetch driver data:', error);
      // Suppress toast if this page is just redirecting
      if (!didRedirectRef.current) {
        showToast({
          type: 'error',
          title: 'خطأ في الاتصال بالخادم',
          message: 'فشل تحميل بيانات السائق. يرجى التحقق من الاتصال وإعادة المحاولة.'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch real data from API (skip when redirecting)
  useEffect(() => {
    refreshData();
  }, [user, redirected]);

  // Auto-refresh data every 30 seconds (skip when redirecting)
  useEffect(() => {
    if (redirected) return;
    const interval = setInterval(() => {
      refreshData();
    }, 30000);
    return () => clearInterval(interval);
  }, [user, redirected]);

  // Filter trips by selected date
  useEffect(() => {
    if (selectedDate) {
      const filtered = driverTrips.filter((trip: Trip) => 
        trip.tripDate === selectedDate || trip.tripDate.startsWith(selectedDate)
      );
      setFilteredTrips(filtered);
      console.log('🔍 Filtered trips by date:', selectedDate, 'Result:', filtered.length);
    } else {
      setFilteredTrips(driverTrips);
      console.log('🔍 Showing all trips:', driverTrips.length);
    }
  }, [selectedDate, driverTrips]);

  // Validate data connection
  const validateDataConnection = () => {
    const issues = [];
    
    if (driverTrips.length === 0) {
      issues.push('No trips data loaded');
    }
    
    if (assignedBus === null && driverTrips.length > 0) {
      issues.push('Bus assignment not found');
    }
    
    if (issues.length > 0) {
      console.warn('⚠️ Data connection issues detected:', issues);
      return false;
    }
    
    return true;
  };

  // Check data freshness
  const isDataFresh = () => {
    const now = new Date();
    const timeDiff = now.getTime() - lastRefresh.getTime();
    const minutesDiff = Math.floor(timeDiff / (1000 * 60));
    return minutesDiff < 1; // Data is fresh if less than 1 minute old
  };

  const [confirmEndTrip, setConfirmEndTrip] = useState(false);

  const handleEndTrip = async () => {
    if (!activeTrip) return;
    
    setIsEndingTrip(true);
    
    try {
      // Update trip status in API - remove unsupported properties
      await tripAPI.update(activeTrip.id, {
        busId: Number(activeTrip.busId),
        driverId: Number(activeTrip.driverId),
        conductorId: Number(activeTrip.conductorId),
        tripDate: activeTrip.tripDate,
        startLocation: activeTrip.startLocation,
        endLocation: activeTrip.endLocation,
        stopLocations: activeTrip.stopLocations?.map(stop => ({ 
          address: stop, 
          arrivalTimeOnly: '08:00', 
          departureTimeOnly: '08:00' 
        })) || [],
        departureTimeOnly: activeTrip.startTime,
        arrivalTimeOnly: activeTrip.endTime || ''
      });
      
      // Refresh data after updating
      const allTrips = await tripAPI.getAll();
      const driverTripsData = allTrips.filter((t: any) => t.driverId.toString() === user.id.toString());
      setDriverTrips(driverTripsData as unknown as Trip[]);
      
      // Update today's trips
      const today = new Date().toISOString().split('T')[0];
      const todayTripsData = driverTripsData.filter((t: any) => 
        t.tripDate === today || t.tripDate.startsWith(today)
      );
      setTodayTrips(todayTripsData as unknown as Trip[]);
      
      // Clear active trip
      setActiveTrip(null);
      setTripEnded(true);
      
      showToast({
        type: 'success',
        title: 'Trip Ended!',
        message: 'Trip has been ended successfully.'
      });
      
      setTimeout(() => setTripEnded(false), 3000);
      
    } catch (error) {
      console.error('Failed to end trip:', error);
      showToast({
        type: 'error',
        title: 'Error!',
        message: 'Failed to end trip. Please try again.'
      });
    } finally {
      setIsEndingTrip(false);
    }
  };

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

  const getBusLabel = (busId: string) => {
    const bus = buses.find(b => b.id === Number(busId));
    if (bus) {
      return bus.busNumber ? `Bus ${bus.busNumber}` : `Bus ${bus.id}`;
    }
    return 'Unknown Bus';
  };

  const handleTripSelect = (trip: Trip) => {
    setSelectedTrip(trip);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-lg text-slate-600 font-medium">Loading driver dashboard...</p>
          <p className="text-sm text-slate-500 mt-2">Please wait while we fetch your data</p>
        </div>
      </div>
    );
  }

  const inProgressCount = driverTrips.filter(t => t.status === 'in-progress').length;
  const nextTrip = (() => {
    const now = new Date();
    const upcoming = driverTrips
      .filter(t => t.status === 'scheduled')
      .map(t => ({ t, start: new Date(`${t.tripDate}T${t.startTime}`) }))
      .filter(x => !isNaN(x.start.getTime()) && x.start.getTime() > now.getTime())
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    return upcoming.length ? upcoming[0].t : null;
  })();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-screen-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md">
                <Bus className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-blue-600 bg-clip-text text-transparent">Driver Dashboard</h1>
                <p className="text-slate-600 mt-1">Manage your trips and view route information</p>
                <p className="text-xs text-slate-500 mt-1">Last updated: {lastRefresh.toLocaleTimeString()}</p>
              </div>
            </div>
            <div className="hidden md:flex items-end gap-3">
              <Link href="/dashboard/driver/notifications">
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                  <Bell className="w-4 h-4 mr-2" /> Notifications
                </Button>
              </Link>
              <Link href="/dashboard/driver/trips">
                <Button variant="outline">
                  <List className="w-4 h-4 mr-2" /> Trips History
                </Button>
              </Link>
              <Button onClick={refreshData} disabled={isLoading} className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white">
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </Button>
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-2 rounded-lg text-center">
                <p className="text-[10px] opacity-90">Today</p>
                <p className="text-xs font-semibold">{formatDate(new Date().toISOString())}</p>
              </div>
            </div>
          </div>
          {/* Quick actions for mobile */}
          <div className="mt-4 md:hidden grid grid-cols-3 gap-2">
            <Link href="/dashboard/driver/notifications">
              <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <Bell className="w-4 h-4 mr-1" />
                <span className="text-xs">Notifications</span>
              </Button>
            </Link>
            <Link href="/dashboard/driver/trips">
              <Button variant="outline" className="w-full">
                <List className="w-4 h-4 mr-1" />
                <span className="text-xs">Trips</span>
              </Button>
            </Link>
            <Button onClick={refreshData} disabled={isLoading} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
              <span className="text-xs">{isLoading ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
          </div>
        </div>
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white border-0 shadow-lg rounded-xl hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Trips</CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{driverTrips.length}</div>
              <p className="text-xs text-slate-500 mt-1">{driverTrips.filter(t => t.status === 'completed').length} completed</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-lg rounded-xl hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Today&apos;s Trips</CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{todayTrips.length}</div>
              <p className="text-xs text-slate-500 mt-1">{todayTrips.filter(t => t.status === 'completed').length} completed</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-lg rounded-xl hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">In Progress</CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{driverTrips.filter(t => t.status === 'in-progress').length}</div>
              <p className="text-xs text-slate-500 mt-1">Trips currently in progress</p>
            </CardContent>
          </Card>
        </div>
        {/* Upcoming Trip */}
        {(() => {
          const now = new Date();
          const upcoming = driverTrips
            .filter(t => t.status === 'scheduled')
            .map(t => ({ t, start: new Date(`${t.tripDate}T${t.startTime}`) }))
            .filter(x => !isNaN(x.start.getTime()) && x.start.getTime() > now.getTime())
            .sort((a, b) => a.start.getTime() - b.start.getTime());
          const nextTripLocal = upcoming.length ? upcoming[0].t : null;
          return nextTripLocal ? (
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Calendar className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Upcoming Trip</h3>
                    <p className="text-blue-100">{nextTripLocal.startLocation} → {nextTripLocal.endLocation} • {nextTripLocal.startTime}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-90">Date</p>
                  <p className="text-sm font-semibold">{formatDate(nextTripLocal.tripDate)}</p>
                </div>
              </div>
            </div>
          ) : null;
        })()}

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Trip Table */}
          <div className="xl:col-span-2">
            <Card className="bg-white border-0 shadow-lg rounded-xl">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <RouteIcon className="h-4 w-4 text-white" />
                  </div>
                  Trip Information
                </CardTitle>
                <CardDescription className="text-slate-600">
                  View and manage your trips with date filtering
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {/* Date Filter */}
                <div className="flex items-center gap-3 mb-6 p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-600" />
                    <span className="text-sm text-slate-700 font-medium">Filter by Date:</span>
                  </div>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-40 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                    size="sm"
                    className="border-slate-200 hover:bg-slate-100 rounded-lg text-xs"
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedDate('')}
                    size="sm"
                    className="border-slate-200 hover:bg-slate-100 rounded-lg text-xs"
                  >
                    Show All
                  </Button>
                </div>
                
                {/* Instructions */}
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700 font-medium">
                    💡 Click on any trip row to view detailed information
                  </p>
                </div>

                {/* Trips Table */}
                {filteredTrips.length > 0 ? (
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow className="border-slate-200">
                          <TableHead className="text-slate-700 font-semibold text-xs">Date</TableHead>
                          <TableHead className="text-slate-700 font-semibold text-xs">Route</TableHead>
                          <TableHead className="text-slate-700 font-semibold text-xs">Start</TableHead>
                          <TableHead className="text-slate-700 font-semibold text-xs">Passengers</TableHead>
                          <TableHead className="text-slate-700 font-semibold text-xs">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTrips.map((trip, index) => (
                          <TableRow 
                            key={trip.id} 
                            className={`border-slate-100 cursor-pointer transition-all duration-200 hover:bg-blue-50 ${
                              index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                            } ${selectedTrip?.id === trip.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                            onClick={() => handleTripSelect(trip)}
                          >
                            <TableCell className="font-medium text-slate-900 text-sm">
                              {formatDate(trip.tripDate)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                                  <MapPin className="h-3 w-3 text-blue-600" />
                                </div>
                                <span className="font-medium text-sm">{trip.startLocation} → {trip.endLocation}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-emerald-100 rounded flex items-center justify-center">
                                  <Clock className="h-3 w-3 text-emerald-600" />
                                </div>
                                <span className="font-medium text-sm">{trip.startTime}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center">
                                  <Users className="h-3 w-3 text-purple-600" />
                                </div>
                                <span className="font-medium text-sm">{trip.passengers}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(trip.status)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <RouteIcon className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No trips found</h3>
                    <p className="text-sm text-slate-500">Try selecting a different date or show all trips</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Trip Details */}
          <div>
            <Card className="bg-white border-0 shadow-lg rounded-xl sticky top-6">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-lg font-bold text-slate-900">Trip Details</CardTitle>
                <CardDescription className="text-slate-600 text-sm">
                  {selectedTrip ? 'Selected trip information' : 'Click on a trip to view details'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {selectedTrip ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <span className="text-xs text-blue-700 font-medium">Date</span>
                      <span className="font-semibold text-blue-900 text-sm">{formatDate(selectedTrip.tripDate)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-xs text-slate-600 font-medium">Start Location</span>
                      <span className="font-semibold text-slate-900 text-sm">{selectedTrip.startLocation}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-xs text-slate-600 font-medium">End Location</span>
                      <span className="font-semibold text-slate-900 text-sm">{selectedTrip.endLocation}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-xs text-slate-600 font-medium">Assigned Bus</span>
                      <span className="font-semibold text-slate-900 text-sm">{getBusLabel(selectedTrip.busId)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-xs text-slate-600 font-medium">Start Time</span>
                      <span className="font-semibold text-slate-900 text-sm">{selectedTrip.startTime}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-xs text-slate-600 font-medium">End Time</span>
                      <span className="font-semibold text-slate-900 text-sm">{selectedTrip.endTime || 'Not set'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-xs text-slate-600 font-medium">Passengers</span>
                      <span className="font-semibold text-slate-900 text-sm">{selectedTrip.passengers}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-xs text-slate-600 font-medium">Status</span>
                      <div className="text-xs">{getStatusBadge(selectedTrip.status)}</div>
                    </div>
                    
                    {selectedTrip.stopLocations && selectedTrip.stopLocations.length > 0 && (
                      <>
                        <div className="border-t border-slate-200 pt-3 mt-3">
                          <h4 className="text-xs font-medium text-slate-700 mb-2">Stop Locations</h4>
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                              {selectedTrip.stopLocations.map((stop: string, idx: number) => (
                                <span key={idx} className="px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                                  {idx + 1}. {stop}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <RouteIcon className="w-6 h-6 text-slate-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-1">No trip selected</h3>
                    <p className="text-xs text-slate-500">Click on any trip from the table</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-2">
          <nav className="flex justify-center">
            <div className="py-2 px-4 rounded-lg font-medium text-sm text-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
              Overview Dashboard
            </div>
          </nav>
        </div>
        
        {/* Database Status */}
        <div className={`border rounded-xl p-4 text-center ${
          validateDataConnection() && isDataFresh() 
            ? 'bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200' 
            : 'bg-gradient-to-r from-amber-50 to-red-50 border-amber-200'
        }`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
              validateDataConnection() && isDataFresh() ? 'bg-emerald-500' : 'bg-amber-500'
            }`}>
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
            <h3 className={`text-sm font-semibold ${
              validateDataConnection() && isDataFresh() ? 'text-emerald-800' : 'text-amber-800'
            }`}>
              {validateDataConnection() && isDataFresh() ? 'Database Connected' : 'Connection Issues Detected'}
            </h3>
          </div>
          <p className={`text-xs ${
            validateDataConnection() && isDataFresh() ? 'text-emerald-700' : 'text-amber-700'
          }`}>
            {validateDataConnection() && isDataFresh() 
              ? `All data is live and synchronized with db.json • Last refresh: ${lastRefresh.toLocaleTimeString()}`
              : `Data connection issues detected • Last refresh: ${lastRefresh.toLocaleTimeString()} • Click refresh to reconnect`
            }
          </p>
          
          {/* Data Summary */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/50 rounded p-2">
              <span className="font-medium">Trips:</span> {driverTrips.length}
            </div>
            <div className="bg-white/50 rounded p-2">
              <span className="font-medium">Bus:</span> {assignedBus ? 'Assigned' : 'None'}
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={confirmEndTrip}
        title="End this trip?"
        description="This action cannot be undone."
        onCancel={() => setConfirmEndTrip(false)}
        onConfirm={() => { setConfirmEndTrip(false); handleEndTrip(); }}
      />
    </div>
  );
}
