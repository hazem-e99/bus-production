'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { tripAPI, tripBookingAPI, studentSubscriptionAPI } from '@/lib/api';
import { TripViewModel } from '@/types/trip';
import { TripBookingViewModel } from '@/types/tripBooking';
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { 
  Search, 
  Filter, 
  X, 
  Eye, 
  Calendar, 
  Clock, 
  MapPin, 
  Bus, 
  Users, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useI18n } from '@/contexts/LanguageContext';
import { formatDate } from '@/lib/format';
import { deriveTripStatus, type DerivedTripStatus } from '@/lib/tripStatusUtil';

// Use existing types from the codebase
type Trip = TripViewModel;
type TripBooking = TripBookingViewModel;

type TripStatus = DerivedTripStatus;
// removed unused BookingStatus type

export default function BookTripPage() {
  const { t, isRTL } = useI18n();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<TripBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TripStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'week' | 'custom'>('all');
  const [customDate, setCustomDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [showTripDetails, setShowTripDetails] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedStopId, setSelectedStopId] = useState<number | null>(null);
  const [bookedTrips, setBookedTrips] = useState<Set<number>>(new Set());
  const [checkingBookingStatus, setCheckingBookingStatus] = useState<Set<number>>(new Set());
  const { showToast } = useToast();

  const checkTripBookingStatus = useCallback(async (tripId: number) => {
    try {
      setCheckingBookingStatus(prev => new Set(prev).add(tripId));
      const hasBooked = await tripBookingAPI.hasBooked(tripId);
      setBookedTrips(prev => {
        const newSet = new Set(prev);
        if (hasBooked) {
          newSet.add(tripId);
        } else {
          newSet.delete(tripId);
        }
        return newSet;
      });
    } catch (error) {
      console.error('Error checking booking status for trip', tripId, error);
    } finally {
      setCheckingBookingStatus(prev => {
        const newSet = new Set(prev);
        newSet.delete(tripId);
        return newSet;
      });
    }
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading trips data...');
      
      const [tripsData, bookingsData] = await Promise.all([
        tripAPI.getAll().catch((error) => {
          console.error('❌ Trips API Error:', error);
          return [];
        }),
        tripAPI.getBookingsByStudent(1).catch((error) => {
          console.error('❌ My Bookings API Error:', error);
          return [];
        })
      ]);

      console.log('🚌 Trips data:', tripsData);
      console.log('📋 Bookings data:', bookingsData);

      setTrips(tripsData || []);
      setBookings(bookingsData || []);

      // Check booking status for each trip (do not block UI)
      if (tripsData && tripsData.length > 0) {
        const bookingChecks = tripsData.map(trip => checkTripBookingStatus(trip.id));
        await Promise.allSettled(bookingChecks);
        
        // Success toast intentionally removed per requirement to avoid showing load counts
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
      showToast({ type: 'error', title: t('pages.student.bookTrip.toast.loadFailedTitle', 'Failed to load trips'), message: t('pages.student.bookTrip.toast.tryAgain', 'Please try again') });
    } finally {
      setLoading(false);
    }
  }, [showToast, checkTripBookingStatus, t]);

  // Run once on mount to avoid re-triggering load due to changing deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const derivedStatusForTrip = useCallback((trip: Trip): DerivedTripStatus => {
    return deriveTripStatus({
      tripDate: trip.tripDate,
      departureTimeOnly: trip.departureTimeOnly,
      arrivalTimeOnly: trip.arrivalTimeOnly,
      status: trip.status,
    });
  }, []);

  // Get unique statuses for filter
  const statusOptions = useMemo(() => {
    const uniqueStatuses = new Set<TripStatus>();
    trips.forEach(trip => uniqueStatuses.add(derivedStatusForTrip(trip)));
    return Array.from(uniqueStatuses).sort();
  }, [trips]);

  // Filter by date range
  const getDateRange = useCallback((filter: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filter) {
      case 'today':
        return { from: today, to: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case 'tomorrow':
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        return { from: tomorrow, to: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000) };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { from: weekStart, to: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000) };
      case 'custom':
        return customDate ? { from: new Date(customDate), to: new Date(customDate + 'T23:59:59') } : null;
      default:
        return null;
    }
  }, [customDate]);

  const filteredTrips = useMemo(() => {
    console.log('🔄 Filtering trips with:', { search, statusFilter, dateFilter });
    
    const dateRange = getDateRange(dateFilter);
    
    return trips.filter(trip => {
      // Search filter
      const matchesSearch = !search || 
        trip.busNumber?.toLowerCase().includes(search.toLowerCase()) ||
        trip.driverName?.toLowerCase().includes(search.toLowerCase()) ||
        trip.conductorName?.toLowerCase().includes(search.toLowerCase()) ||
        trip.startLocation?.toLowerCase().includes(search.toLowerCase()) ||
        trip.endLocation?.toLowerCase().includes(search.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || derivedStatusForTrip(trip) === statusFilter;
      
      // Date filter
      const tripDate = new Date(trip.tripDate);
      const matchesDate = !dateRange || 
        (tripDate >= dateRange.from && tripDate < dateRange.to);
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [trips, search, statusFilter, dateFilter, getDateRange]);

  // Check if trip is booked using the new API
  

  // Check if trip is booked (legacy method for backward compatibility)
  const isTripBooked = (tripId: number) => {
    return bookedTrips.has(tripId) || bookings.some(booking => 
      booking.tripId === tripId && 
      (booking.status === 'Confirmed' || booking.status === 'Completed')
    );
  };

  // Localized status label — uses same translation keys as admin TripList
  const statusLabel = (status: TripStatus | string) => {
    const normalized = String(status).replace(/\s+/g, '-').toLowerCase();
    const map: Record<string, string> = {
      'scheduled': t('common.status.scheduled', 'Scheduled'),
      'in-progress': t('common.status.inProgress', 'In Progress'),
      'inprogress': t('common.status.inProgress', 'In Progress'),
      'completed': t('common.status.completed', 'Completed'),
      'cancelled': t('common.status.cancelled', 'Cancelled'),
      'canceled': t('common.status.cancelled', 'Cancelled'),
      'delayed': t('common.status.delayed', 'Delayed'),
    };
    return map[normalized] || String(status);
  };

  // Get trip details
  const handleViewTrip = async (tripId: number) => {
    try {
      console.log('🔍 Fetching trip details for ID:', tripId);
      const tripDetails = await tripAPI.getById(tripId);
      console.log('📋 Trip details:', tripDetails);
      setSelectedTrip(tripDetails);
      setShowTripDetails(true);
    } catch (error) {
      console.error('❌ Error fetching trip details:', error);
      showToast({ type: 'error', title: t('pages.student.bookTrip.toast.tripDetailsFailedTitle', 'Failed to load trip details'), message: t('pages.student.bookTrip.toast.tryAgain', 'Please try again') });
    }
  };

  // Handle booking
  const handleBookTrip = async (trip: Trip) => {
    try {
      setLoading(true);
      console.log('🔍 Fetching trip details for ID:', trip.id);
      
      // Fetch detailed trip data from /api/Trip/{id}
      const tripDetails = await tripAPI.getById(trip.id);
      console.log('📥 Trip details response:', tripDetails);
      
      if (tripDetails) {
        setSelectedTrip(tripDetails);
        setShowBookingModal(true);
      } else {
        showToast({ 
          type: 'error', 
          title: t('common.error', 'Error'),
          message: t('pages.student.bookTrip.toast.tripDetailsFailedTitle', 'Failed to load trip details')
        });
      }
    } catch (error) {
      console.error('❌ Error fetching trip details:', error);
      showToast({ 
        type: 'error', 
        title: t('common.error', 'Error'),
        message: t('pages.student.bookTrip.toast.tripDetailsFailedTitle', 'Failed to load trip details')
      });
    } finally {
      setLoading(false);
    }
  };

  // Confirm booking
  const handleConfirmBooking = async () => {
    if (!selectedTrip || !selectedStopId) {
  showToast({ type: 'error', title: t('pages.student.bookTrip.toast.pickupRequiredTitle', 'Please select a pickup location'), message: t('pages.student.bookTrip.toast.pickupRequiredMsg', 'You must choose a stop point') });
      return;
    }

    try {
      // Get current user from localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const currentStudentId = user?.id || user?.userId;
      
      if (!currentStudentId) {
        showToast({ 
          type: 'error', 
          title: t('pages.student.bookTrip.toast.authErrorTitle', 'Authentication Error'),
          message: t('pages.student.bookTrip.toast.authErrorMsg', 'Please log in again to book a trip')
        });
        return;
      }

      console.log('📋 Creating booking:', { tripId: selectedTrip.id, stopId: selectedStopId });
      console.log('👤 Current user:', user);
      console.log('🆔 Using student ID:', currentStudentId);
      
      // Try to get user's active subscription (optional — booking still works without one)
      let userSubscriptionId: number | null = null;
      try {
        const activeSubscription = await studentSubscriptionAPI.getMyActiveSubscription();
        if (activeSubscription?.id) {
          userSubscriptionId = activeSubscription.id;
        }
      } catch {
        console.warn('Could not fetch active subscription, proceeding without it');
      }
      
      const bookingData = {
        tripId: selectedTrip.id,
        studentId: currentStudentId,
        pickupStopLocationId: selectedStopId,
        userSubscriptionId: userSubscriptionId ?? 0
      };

      console.log('📤 Sending booking data to /api/TripBooking:', bookingData);
      const result = await tripAPI.createBooking(bookingData);
      console.log('📥 Booking API response:', result);
      
      if (result?.success) {
        showToast({ 
          type: 'success', 
          title: t('pages.student.bookTrip.toast.bookingConfirmedTitle', 'Booking Confirmed!'),
          message: t('pages.student.bookTrip.toast.bookingConfirmedMsg', 'Your trip has been successfully booked')
        });
        setShowBookingModal(false);
        setSelectedStopId(null);
        
        // Update booking status for the specific trip
        if (selectedTrip) {
          setBookedTrips(prev => new Set(prev).add(selectedTrip.id));
        }
        
        await load(); // Refresh data
      } else {
        console.error('❌ Booking failed with result:', result);
        const errorMessage = result?.message || result?.errorCode || 'Booking failed';
        showToast({ 
          type: 'error', 
          title: t('pages.student.bookTrip.toast.bookingFailedTitle', 'Booking Failed'),
          message: `${t('common.error', 'Error')}: ${errorMessage}`
        });
        return;
      }
    } catch (error) {
      console.error('❌ Error creating booking:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      let errorMessage = t('pages.student.bookTrip.toast.tryAgain', 'Please try again');
      if (error.message) {
        errorMessage = error.message;
      } else if (error.status) {
        errorMessage = `Server error: ${error.status}`;
      }
      
      showToast({ 
        type: 'error', 
        title: t('pages.student.bookTrip.toast.bookingFailedTitle', 'Booking Failed'),
        message: `${t('common.error', 'Error')}: ${errorMessage}`
      });
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDateFilter('all');
    setCustomDate('');
  };

  // Check if any filters are active
  const hasActiveFilters = search || statusFilter !== 'all' || dateFilter !== 'all';

  const getStatusBadge = (status: DerivedTripStatus) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: React.ReactNode }> = {
      'scheduled': { variant: 'default', icon: <Calendar className="w-3 h-3 mr-1" /> },
      'in-progress': { variant: 'secondary', icon: <Clock className="w-3 h-3 mr-1" /> },
      'completed': { variant: 'outline', icon: <CheckCircle className="w-3 h-3 mr-1" /> },
      'cancelled': { variant: 'destructive', icon: <X className="w-3 h-3 mr-1" /> },
      'delayed': { variant: 'secondary', icon: <AlertCircle className="w-3 h-3 mr-1" /> },
    };
    const info = statusMap[status] || { variant: 'outline' as const, icon: null };
    return <Badge variant={info.variant}>{info.icon}{statusLabel(status)}</Badge>;
  };

  if (loading) return <div className="p-4 sm:p-6">{t('common.loading', 'Loading...')}</div>;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-green-50 via-white to-blue-50 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">{t('pages.student.bookTrip.title', 'Book Your Trip')}</h1>
            <p className="text-text-secondary mt-1">{t('pages.student.bookTrip.subtitle', 'Find and book available bus trips')}</p>
          </div>
          <div className="w-full sm:w-64">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input 
                placeholder={t('pages.student.bookTrip.search', 'Search trips...')} 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="rounded-xl border bg-white/70 backdrop-blur p-4 flex items-center gap-3">
            <Bus className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm text-text-secondary">{t('pages.student.bookTrip.availableTrips', 'Available Trips')}</p>
              <p className="font-semibold">{filteredTrips.length}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-white/70 backdrop-blur p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-text-secondary">{t('pages.student.bookTrip.myBookings', 'My Bookings')}</p>
              <p className="font-semibold">{bookings.length}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-white/70 backdrop-blur p-4 flex items-center gap-3">
            <Users className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-sm text-text-secondary">{t('pages.student.bookTrip.totalSeats', 'Total Seats')}</p>
              <p className="font-semibold">{trips.reduce((sum, trip) => sum + trip.totalSeats, 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <Card className="rounded-xl border bg-white">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              <CardTitle>{t('pages.student.bookTrip.advancedFilters', 'Advanced Filters')}</CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4 mr-1" />
                  {t('pages.student.bookTrip.clearAll', 'Clear All')}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? t('pages.student.bookTrip.hideFilters', 'Hide Filters') : t('pages.student.bookTrip.showFilters', 'Show Filters')}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t('pages.trips.table.status', 'Status')}</label>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as TripStatus | 'all')}
                >
                  <option value="all">{t('pages.student.bookTrip.filters.allStatus', 'All Status')}</option>
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{statusLabel(status)}</option>
                  ))}
                </Select>
              </div>

              {/* Date Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t('pages.student.bookTrip.filters.dateRange', 'Date Range')}</label>
                <Select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                >
                  <option value="all">{t('pages.student.bookTrip.filters.allDates', 'All Dates')}</option>
                  <option value="today">{t('pages.student.bookTrip.filters.today', 'Today')}</option>
                  <option value="tomorrow">{t('pages.student.bookTrip.filters.tomorrow', 'Tomorrow')}</option>
                  <option value="week">{t('pages.student.bookTrip.filters.thisWeek', 'This Week')}</option>
                  <option value="custom">{t('pages.student.bookTrip.filters.customDate', 'Custom Date')}</option>
                </Select>
              </div>

              {/* Custom Date */}
              {dateFilter === 'custom' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{t('pages.student.bookTrip.filters.selectDate', 'Select Date')}</label>
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    placeholder={t('pages.student.bookTrip.filters.chooseDate', 'Choose date')}
                  />
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Trips Table */}
      <Card className="rounded-xl border bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bus className="w-5 h-5" />
            {t('pages.student.bookTrip.availableTrips', 'Available Trips')}
      {hasActiveFilters && (
              <Badge variant="outline" className="ml-2">
        {filteredTrips.length} {t('pages.student.bookTrip.filtered', 'filtered')}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {filteredTrips.length} {t('pages.student.bookTrip.availableForBooking', 'trip(s) available for booking')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
          <Table className="min-w-[820px] sm:min-w-0">
            <TableHeader>
              <TableRow>
        <TableHead>{t('pages.student.bookTrip.table.busRoute', 'Bus & Route')}</TableHead>
        <TableHead>{t('pages.trips.table.dateTime', 'Date & Time')}</TableHead>
        <TableHead>{t('pages.student.bookTrip.table.seats', 'Seats')}</TableHead>
        <TableHead>{t('pages.trips.table.status', 'Status')}</TableHead>
        <TableHead>{t('pages.trips.table.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                      <AlertCircle className="w-12 h-12 text-gray-400" />
                        <div className="text-lg font-medium text-gray-500">{t('pages.student.bookTrip.noTrips', 'No Trips Found')}</div>
                        <div className="text-sm text-gray-400">{t('pages.student.bookTrip.noTripsMsg', 'No trips match your current filters')}</div>
                      <Button 
                        onClick={load} 
                        variant="outline" 
                        className="mt-2"
                      >
                        {t('pages.student.bookTrip.refresh', 'Refresh Data')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrips.map(trip => (
                  <TableRow key={trip.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          <Bus className="w-4 h-4" />
                          {trip.busNumber || 'Bus #' + trip.id}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {trip.startLocation} {isRTL ? '←' : '→'} {trip.endLocation}
                        </div>
                        <div className="text-xs text-gray-400">
                          {t('pages.trips.form.fields.driver', 'Driver')}: {trip.driverName || t('common.na', 'N/A')} | {t('pages.trips.form.fields.conductor', 'Conductor')}: {trip.conductorName || t('common.na', 'N/A')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(isRTL ? 'ar' : 'en', trip.tripDate)}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {isRTL ? (
                            <>{trip.arrivalTimeOnly} - {trip.departureTimeOnly}</>
                          ) : (
                            <>{trip.departureTimeOnly} - {trip.arrivalTimeOnly}</>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-green-600">
                          {trip.avalableSeates} / {trip.totalSeats} {t('pages.student.bookTrip.available', 'available')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {trip.bookedSeats} {t('pages.student.bookTrip.booked', 'booked')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(derivedStatusForTrip(trip))}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewTrip(trip.id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          {t('pages.student.bookTrip.view', 'View')}
                        </Button>
                        {isTripBooked(trip.id) ? (
                          <Button
                            size="sm"
                            disabled
                            className="bg-green-600 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {t('pages.student.bookTrip.alreadyBooked', 'Already Booked')}
                          </Button>
                        ) : checkingBookingStatus.has(trip.id) ? (
                          <Button
                            size="sm"
                            disabled
                            className="bg-gray-400 text-white"
                          >
                            {t('pages.student.bookTrip.checking', 'Checking...')}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleBookTrip(trip)}
                            disabled={trip.avalableSeates === 0 || !['scheduled', 'in-progress'].includes(derivedStatusForTrip(trip))}
                          >
                            {t('pages.student.bookTrip.bookNow', 'Book Now')}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Trip Details Modal */}
      <Modal
        isOpen={showTripDetails}
        onClose={() => setShowTripDetails(false)}
        title={t('pages.student.bookTrip.tripDetailsTitle', 'Trip Details')}
        size="lg"
      >
        {selectedTrip && (
          <div className="space-y-6">
            {/* Trip Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
        <h3 className="font-semibold text-lg">{t('pages.student.bookTrip.tripInfo', 'Trip Information')}</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Bus className="w-4 h-4 text-gray-500" />
          <span className="font-medium">{t('pages.student.bookTrip.fields.bus', 'Bus')}:</span>
          <span>{selectedTrip.busNumber || t('pages.student.bookTrip.fields.bus', 'Bus') + ' #' + selectedTrip.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
          <span className="font-medium">{t('pages.student.bookTrip.fields.driver', 'Driver')}:</span>
          <span>{selectedTrip.driverName || t('common.na', 'N/A')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
          <span className="font-medium">{t('pages.student.bookTrip.fields.conductor', 'Conductor')}:</span>
          <span>{selectedTrip.conductorName || t('common.na', 'N/A')}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
        <h3 className="font-semibold text-lg">{t('pages.student.bookTrip.routeAndTiming', 'Route & Timing')}</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
          <span className="font-medium">{t('pages.student.bookTrip.fields.origin', 'Origin')}:</span>
                    <span>{selectedTrip.startLocation}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
          <span className="font-medium">{t('pages.student.bookTrip.fields.destination', 'Destination')}:</span>
                    <span>{selectedTrip.endLocation}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
          <span className="font-medium">{t('pages.student.bookTrip.fields.date', 'Date')}:</span>
                    <span>{formatDate(isRTL ? 'ar' : 'en', selectedTrip.tripDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{isRTL ? t('pages.student.bookTrip.fields.timeRangeLabelRtl', 'Time (Arrival / Departure)') : t('pages.student.bookTrip.fields.timeRangeLabel', 'Time (Departure / Arrival)')}:</span>
                    <span>{isRTL ? `${selectedTrip.arrivalTimeOnly} - ${selectedTrip.departureTimeOnly}` : `${selectedTrip.departureTimeOnly} - ${selectedTrip.arrivalTimeOnly}`}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Seats Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3">{t('pages.student.bookTrip.seatAvailability', 'Seat Availability')}</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{selectedTrip.avalableSeates}</div>
                  <div className="text-sm text-gray-600">{t('pages.student.bookTrip.available', 'available')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{selectedTrip.bookedSeats}</div>
                  <div className="text-sm text-gray-600">{t('pages.student.bookTrip.booked', 'booked')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-600">{selectedTrip.totalSeats}</div>
                  <div className="text-sm text-gray-600">{t('pages.student.bookTrip.total', 'Total')}</div>
                </div>
              </div>
            </div>

            {/* Stop Locations */}
      {selectedTrip.stopLocations && selectedTrip.stopLocations.length > 0 && (
              <div>
        <h3 className="font-semibold text-lg mb-3">{t('pages.student.bookTrip.stopsTitle', 'Stop Locations')}</h3>
                <div className="space-y-2">
                  {selectedTrip.stopLocations.map((stop, index) => (
                    <div key={stop.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{stop.address}</div>
                          <div className="text-sm text-gray-500">
              {t('pages.student.bookTrip.stopArrival', 'Arrival')}: {stop.arrivalTimeOnly} | {t('pages.student.bookTrip.stopDeparture', 'Departure')}: {stop.departureTimeOnly}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowTripDetails(false)}
              >
                {t('common.close', 'Close')}
              </Button>
              {!isTripBooked(selectedTrip.id) && !checkingBookingStatus.has(selectedTrip.id) && (
                <Button
                  onClick={() => {
                    setShowTripDetails(false);
                    handleBookTrip(selectedTrip);
                  }}
                  disabled={selectedTrip.avalableSeates === 0 || !['scheduled', 'in-progress'].includes(derivedStatusForTrip(selectedTrip))}
                >
                  {t('pages.student.bookTrip.bookNow', 'Book Now')}
                </Button>
              )}
              {isTripBooked(selectedTrip.id) && (
                <Button
                  disabled
                  className="bg-green-600 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  {t('pages.student.bookTrip.alreadyBooked', 'Already Booked')}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Booking Modal */}
      <Modal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        title={t('pages.student.bookTrip.bookTrip', 'Book Trip')}
        size="md"
      >
        {selectedTrip && (
          <div className="space-y-6">
            {/* Trip Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border">
        <h3 className="font-bold text-xl mb-4 text-gray-800">{t('pages.student.bookTrip.tripDetailsTitle', 'Trip Details')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Bus className="h-4 w-4 text-blue-600" />
          <span className="font-medium">{t('pages.student.bookTrip.fields.bus', 'Bus')}:</span>
          <span>{selectedTrip.busNumber || t('pages.student.bookTrip.fields.bus', 'Bus') + ' #' + selectedTrip.id}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-green-600" />
          <span className="font-medium">{t('pages.student.bookTrip.routeAndTiming', 'Route & Timing')}:</span>
                  <span>{selectedTrip.startLocation} {isRTL ? '←' : '→'} {selectedTrip.endLocation}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-purple-600" />
          <span className="font-medium">{t('pages.student.bookTrip.fields.date', 'Date')}:</span>
                  <span>{new Date(selectedTrip.tripDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="font-medium">{isRTL ? t('pages.student.bookTrip.fields.timeRangeLabelRtl', 'Time (Arrival / Departure)') : t('pages.student.bookTrip.fields.timeRangeLabel', 'Time (Departure / Arrival)')}:</span>
                  <span>{isRTL ? `${selectedTrip.arrivalTimeOnly} - ${selectedTrip.departureTimeOnly}` : `${selectedTrip.departureTimeOnly} - ${selectedTrip.arrivalTimeOnly}`}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-red-600" />
          <span className="font-medium">{t('pages.student.bookTrip.availableSeats', 'Available Seats')}:</span>
                  <span className="font-bold text-green-600">{selectedTrip.avalableSeates}</span>
                </div>
                <div className="flex items-center space-x-2">
          <span className="font-medium">{t('pages.trips.table.status', 'Status')}:</span>
                  {getStatusBadge(derivedStatusForTrip(selectedTrip))}
                </div>
              </div>
            </div>

            {/* Additional Trip Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-semibold text-lg mb-3 text-gray-700">{t('pages.student.bookTrip.additionalInfo', 'Additional Information')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">{t('pages.student.bookTrip.fields.driver', 'Driver')}:</span>
          <span className="ml-2">{selectedTrip.driverName || t('pages.student.bookTrip.notAssigned', 'Not assigned')}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">{t('pages.student.bookTrip.fields.conductor', 'Conductor')}:</span>
          <span className="ml-2">{selectedTrip.conductorName || t('pages.student.bookTrip.notAssigned', 'Not assigned')}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">{t('pages.student.bookTrip.totalSeats', 'Total Seats')}:</span>
                  <span className="ml-2">{selectedTrip.totalSeats}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">{t('pages.student.bookTrip.bookedSeats', 'Booked Seats')}:</span>
                  <span className="ml-2">{selectedTrip.bookedSeats}</span>
                </div>
              </div>
            </div>

            {/* Pickup Location Selection */}
            <div>
        <h3 className="font-semibold text-lg mb-3">{t('pages.student.bookTrip.selectPickup', 'Select Pickup Location')}</h3>
              {selectedTrip.stopLocations && selectedTrip.stopLocations.length > 0 ? (
                <div className="space-y-2">
                  {selectedTrip.stopLocations.map((stop) => (
                    <div
                      key={stop.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedStopId === stop.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedStopId(stop.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          selectedStopId === stop.id
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedStopId === stop.id && (
                            <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{stop.address}</div>
                          <div className="text-sm text-gray-500">
                            {t('pages.student.bookTrip.stopArrival', 'Arrival')}: {stop.arrivalTimeOnly} | {t('pages.student.bookTrip.stopDeparture', 'Departure')}: {stop.departureTimeOnly}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>{t('pages.student.bookTrip.noStops', 'No stop locations available for this trip')}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowBookingModal(false)}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                onClick={handleConfirmBooking}
                disabled={!selectedStopId}
              >
                {t('pages.student.bookTrip.confirmBooking', 'Confirm Booking')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
