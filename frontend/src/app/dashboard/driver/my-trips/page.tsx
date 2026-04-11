'use client';

import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { 
  Clock,
  MapPin,
  Users,
  Search,
  Bus,
  RefreshCw,
  Calendar,
  Navigation,
  Filter,
  Eye,
  User,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Timer,
  ArrowRight,
  Shield,
  X,
  Route
} from 'lucide-react';
import { tripAPI } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useState, useEffect, useCallback } from 'react';
import { TripViewModel } from '@/types/trip';
import { useI18n } from '@/contexts/LanguageContext';

export default function DriverMyTripsPage() {
  const { t, lang, isRTL } = useI18n();
  const { showToast } = useToast();
  const [trips, setTrips] = useState<TripViewModel[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<TripViewModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [selectedTrip, setSelectedTrip] = useState<TripViewModel | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load driver's trips
  const loadMyTrips = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await tripAPI.getDriverTrips();
      console.log('Driver trips response:', response);
      
      // The API returns TripViewModel[] for driver's assigned trips
      const tripsData = Array.isArray(response) ? response : [];
      setTrips(tripsData);
      setFilteredTrips(tripsData);
    } catch (error) {
      console.error('Error loading driver trips:', error);
      showToast({
        title: t('pages.driver.myTrips.toasts.loadErrorTitle', 'Failed to Load Trips'),
        message: t('pages.driver.myTrips.toasts.loadErrorMessage', 'An error occurred while loading your trips. Please try again.'),
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast, t]);

  // Filter trips based on search and filters
  useEffect(() => {
    let filtered = trips;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(trip => 
        trip.startLocation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.endLocation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.busNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.driverName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(trip => trip.status === statusFilter);
    }

    // Date filter
    if (dateFilter) {
      filtered = filtered.filter(trip => trip.tripDate === dateFilter);
    }

    setFilteredTrips(filtered);
  }, [trips, searchTerm, statusFilter, dateFilter]);

  // Load trips on component mount
  useEffect(() => {
    loadMyTrips();
  }, [loadMyTrips]);

  // Get status badge variant and icon
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return { 
          variant: 'default' as const, 
          text: 'Scheduled', 
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case 'inprogress':
        return { 
          variant: 'secondary' as const, 
          text: 'In Progress', 
          icon: Navigation,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'completed':
        return { 
          variant: 'success' as const, 
          text: 'Completed', 
          icon: CheckCircle2,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'cancelled':
        return { 
          variant: 'destructive' as const, 
          text: 'Cancelled', 
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'delayed':
        return { 
          variant: 'warning' as const, 
          text: 'Delayed', 
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      default:
        return { 
          variant: 'default' as const, 
          text: status, 
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  // Format time
  const formatTime = (time: string) => {
    if (!time) return '-';
    return time.substring(0, 5); // HH:mm format
  };

  // Get occupancy percentage
  const getOccupancyPercentage = (trip: TripViewModel) => {
    if (!trip.totalSeats || trip.totalSeats === 0) return 0;
    return Math.round(((trip.bookedSeats || 0) / trip.totalSeats) * 100);
  };

  // Get occupancy color
  const getOccupancyColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-50 border-red-200';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  // Open trip details modal
  const openTripModal = async (trip: TripViewModel) => {
    try {
      setIsLoading(true);
      // Fetch detailed trip data from /api/Trip/{id}
      const detailedTrip = await tripAPI.getById(trip.id.toString());
      if (detailedTrip) {
        setSelectedTrip(detailedTrip);
        setIsModalOpen(true);
      } else {
        // Fallback to original trip data if detailed fetch fails
        setSelectedTrip(trip);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching trip details:', error);
      showToast({
        title: 'Error Loading Trip Details',
        message: 'Failed to load detailed trip information. Showing basic details.',
        type: 'error',
      });
      // Fallback to original trip data
      setSelectedTrip(trip);
      setIsModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTrip(null);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 text-[#757575]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p>{t('pages.driver.myTrips.loadingYourTrips', 'Loading your trips...')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#212121] flex items-center gap-2">
            <Bus className="w-7 h-7 text-primary" /> 
            {t('pages.driver.myTrips.title', 'My Trips')}
          </h1>
          <p className="text-[#424242]">{t('pages.driver.myTrips.subtitle', 'Track and manage your assigned trips')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Badge variant="outline" className="text-primary border-primary">
            {trips.length} {t('pages.driver.myTrips.total', 'Total Trips')}
          </Badge>
          <Button 
            variant="outline" 
            onClick={loadMyTrips}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <RefreshCw className="w-4 h-4" />
            {t('pages.driver.myTrips.refresh', 'Refresh')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Trips */}
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">{t('pages.driver.myTrips.counts.total', 'Total')}</p>
              <p className="text-2xl font-bold text-blue-900">{trips.length}</p>
            </div>
            <Bus className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        {/* Scheduled Trips */}
        <Card className="p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">{t('common.status.scheduled', 'Scheduled')}</p>
              <p className="text-2xl font-bold text-yellow-900">
                {trips.filter(trip => trip.status.toLowerCase() === 'scheduled').length}
              </p>
            </div>
            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
          </div>
        </Card>

        {/* In Progress */}
        <Card className="p-4 bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">{t('common.status.inProgress', 'In Progress')}</p>
              <p className="text-2xl font-bold text-green-900">
                {trips.filter(trip => trip.status.toLowerCase() === 'inprogress').length}
              </p>
            </div>
            <Navigation className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        {/* Completed */}
        <Card className="p-4 bg-gradient-to-r from-red-50 to-red-100 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">{t('common.status.completed', 'Completed')}</p>
              <p className="text-2xl font-bold text-red-900">
                {trips.filter(trip => trip.status.toLowerCase() === 'completed').length}
              </p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white border-[#E0E0E0]">
        <CardHeader>
          <CardTitle className="text-[#212121]">{t('pages.driver.myTrips.filters', 'Filters & Search')}</CardTitle>
          <CardDescription className="text-[#757575]">
            {t('pages.driver.myTrips.filtersDesc', 'Find the trips you need quickly')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-[#757575]" />
              <Input
                placeholder={t('pages.driver.myTrips.searchPlaceholder', 'Search location, bus number...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: t('pages.driver.myTrips.statusAll', 'All Status') },
                { value: 'Scheduled', label: t('common.status.scheduled', 'Scheduled') },
                { value: 'InProgress', label: t('common.status.inProgress', 'In Progress') },
                { value: 'Completed', label: t('common.status.completed', 'Completed') },
                { value: 'Cancelled', label: t('common.status.cancelled', 'Cancelled') },
                { value: 'Delayed', label: t('common.status.delayed', 'Delayed') },
              ]}
            />

            {/* Date Filter */}
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />

            {/* Results Count */}
            <div className="flex items-center text-sm text-[#757575]">
              <Clock className="w-4 h-4 mr-2" />
              {filteredTrips.length} {t('pages.driver.myTrips.tripsShort', 'trip(s)')}
            </div>
          </div>

          {/* Clear Filters Button */}
          <div className="mt-4 flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setDateFilter('');
              }}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <Filter className="w-4 h-4" />
              {t('pages.driver.myTrips.clearFilters', 'Clear Filters')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Trips List */}
      <Card className="bg-white border-[#E0E0E0]">
        <CardHeader>
          <CardTitle>{t('pages.driver.myTrips.listTitle', 'All Trips')}</CardTitle>
          <CardDescription>
            {isLoading ? t('common.loading', 'Loading...') : `${filteredTrips.length} ${t('pages.driver.myTrips.results', 'results')}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTrips.length === 0 ? (
            <div className="text-center py-12 text-[#757575]">
              <Bus className="w-16 h-16 mx-auto mb-4 text-[#BDBDBD]" />
              <h3 className="text-lg font-medium mb-2">{t('pages.driver.myTrips.empty.title', 'No trips found')}</h3>
              <p className="text-sm">
                {trips.length === 0 
                  ? t('pages.driver.myTrips.empty.noAssigned', "You don't have any assigned trips yet.") 
                  : t('pages.driver.myTrips.empty.noMatch', 'No trips match your current filters.')
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTrips.map((trip) => {
                const statusConfig = getStatusConfig(trip.status);
                const occupancyPercentage = getOccupancyPercentage(trip);
                const occupancyColor = getOccupancyColor(occupancyPercentage);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <Card key={trip.id} className="p-4 bg-white border-[#E0E0E0] hover:border-primary/20 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Trip Header */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                            <Bus className="w-5 h-5 text-blue-500" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-[#212121]">
                              {trip.busNumber || `Bus #${trip.busId}`}
                            </h3>
                            <p className="text-sm text-[#757575]">Trip #{trip.id}</p>
                          </div>
                          <Badge 
                            variant={statusConfig.variant}
                            className={`${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor} border`}
                          >
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {(() => {
                              const s = trip.status.toLowerCase();
                              if (s === 'scheduled') return t('common.status.scheduled', 'Scheduled');
                              if (s === 'inprogress') return t('common.status.inProgress', 'In Progress');
                              if (s === 'completed') return t('common.status.completed', 'Completed');
                              if (s === 'cancelled') return t('common.status.cancelled', 'Cancelled');
                              if (s === 'delayed') return t('common.status.delayed', 'Delayed');
                              return trip.status;
                            })()}
                          </Badge>
                        </div>

                        {/* Route Information */}
                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium text-[#212121]">{trip.startLocation}</span>
                          </div>
                          <ArrowRight className={`w-4 h-4 text-[#757575] ${isRTL ? 'rotate-180' : ''}`} />
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span className="text-sm font-medium text-[#212121]">{trip.endLocation}</span>
                          </div>
                        </div>

                        {/* Trip Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-500" />
                            <div>
                              <p className="text-xs text-[#757575]">{t('pages.driver.myTrips.labels.date', 'Date')}</p>
                              <p className="text-sm font-medium text-[#212121]">{formatDate(lang, trip.tripDate)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-green-500" />
                            <div>
                              <p className="text-xs text-[#757575]">{t('pages.driver.myTrips.labels.departure', 'Departure')}</p>
                              <p className="text-sm font-medium text-[#212121]">{formatTime(trip.departureTimeOnly)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Timer className="w-4 h-4 text-orange-500" />
                            <div>
                              <p className="text-xs text-[#757575]">{t('pages.driver.myTrips.labels.arrival', 'Arrival')}</p>
                              <p className="text-sm font-medium text-[#212121]">{formatTime(trip.arrivalTimeOnly)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-500" />
                            <div>
                              <p className="text-xs text-[#757575]">{t('pages.driver.myTrips.labels.occupancy', 'Occupancy')}</p>
                              <p className="text-sm font-medium text-[#212121]">
                                {trip.bookedSeats || 0}/{trip.totalSeats || 0}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Occupancy Bar */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-[#757575]">{t('pages.driver.myTrips.labels.seatOccupancy', 'Seat Occupancy')}</span>
                            <span className={`text-sm font-medium px-2 py-1 rounded-full ${occupancyColor}`}>
                              {occupancyPercentage}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                occupancyPercentage >= 90 ? 'bg-red-500' :
                                occupancyPercentage >= 70 ? 'bg-yellow-500' : 
                                'bg-green-500'
                              }`}
                              style={{ width: `${occupancyPercentage}%` }}
                            ></div>
                          </div>
                          <div className="flex items-center justify-between mt-1 text-xs text-[#757575]">
                            <span>{trip.bookedSeats || 0} {t('pages.driver.myTrips.labels.booked', 'booked')}</span>
                            <span>{trip.avalableSeates || 0} {t('pages.driver.myTrips.labels.available', 'available')}</span>
                          </div>
                        </div>

                        {/* Conductor Info */}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#E0E0E0]">
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-gray-100 rounded-full">
                              <User className="w-4 h-4 text-[#757575]" />
                            </div>
                            <span className="text-sm text-[#757575]">
                              {t('pages.driver.myTrips.labels.conductor', 'Conductor')}: {trip.conductorName || t('pages.driver.myTrips.labels.unassigned', 'Unassigned')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 hover:bg-blue-50"
                              onClick={() => openTripModal(trip)}
                            >
                              <Eye className="w-4 h-4 text-[#757575]" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trip Details Modal */}
      {isModalOpen && selectedTrip && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl border border-[#E0E0E0]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#E0E0E0]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <Bus className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#212121]">
                    {t('pages.driver.myTrips.labels.trip', 'Trip')} #{selectedTrip.id} {t('pages.driver.myTrips.labels.details', 'Details')}
                  </h2>
                  <p className="text-sm text-[#757575]">
                    {selectedTrip.busNumber || `${t('pages.driver.myTrips.labels.bus', 'Bus')} #${selectedTrip.busId}`}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeModal}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <X className="w-4 h-4 text-[#757575]" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-[#757575]">{t('pages.driver.myTrips.modal.loading', 'Loading trip details...')}</p>
                </div>
              ) : (
                <>
                  {/* Status and Route */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Status Card */}
                <Card className="p-3 bg-white border-[#E0E0E0]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-green-50 rounded-lg border border-green-200">
                      <Shield className="w-4 h-4 text-green-500" />
                    </div>
                    <h3 className="text-base font-semibold text-[#212121]">{t('pages.driver.myTrips.labels.tripStatus', 'Trip Status')}</h3>
                  </div>
                  <Badge 
                    variant={getStatusConfig(selectedTrip.status).variant}
                    className={`${getStatusConfig(selectedTrip.status).bgColor} ${getStatusConfig(selectedTrip.status).color} ${getStatusConfig(selectedTrip.status).borderColor} border`}
                  >
                    {(() => {
                      const StatusIcon = getStatusConfig(selectedTrip.status).icon;
                      return <StatusIcon className="w-3 h-3 mr-1" />;
                    })()}
                    {(() => {
                      const s = selectedTrip.status.toLowerCase();
                      if (s === 'scheduled') return t('common.status.scheduled', 'Scheduled');
                      if (s === 'inprogress') return t('common.status.inProgress', 'In Progress');
                      if (s === 'completed') return t('common.status.completed', 'Completed');
                      if (s === 'cancelled') return t('common.status.cancelled', 'Cancelled');
                      if (s === 'delayed') return t('common.status.delayed', 'Delayed');
                      return selectedTrip.status;
                    })()}
                  </Badge>
                </Card>

                {/* Route Card */}
                <Card className="p-3 bg-white border-[#E0E0E0]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-purple-50 rounded-lg border border-purple-200">
                      <Route className="w-4 h-4 text-purple-500" />
                    </div>
                    <h3 className="text-base font-semibold text-[#212121]">{t('pages.driver.myTrips.labels.route', 'Route')}</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-[#212121]">{selectedTrip.startLocation}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-1">
                      <ArrowRight className={`w-4 h-4 text-[#757575] ${isRTL ? 'rotate-180' : ''}`} />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm font-medium text-[#212121]">{selectedTrip.endLocation}</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Schedule and Timing */}
              <Card className="p-3 bg-white border-[#E0E0E0]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-blue-50 rounded-lg border border-blue-200">
                    <Calendar className="w-4 h-4 text-blue-500" />
                  </div>
                  <h3 className="text-base font-semibold text-[#212121]">{t('pages.driver.myTrips.labels.scheduleTiming', 'Schedule & Timing')}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                    <p className="text-xs text-[#757575] mb-1">{t('pages.driver.myTrips.labels.tripDate', 'Trip Date')}</p>
                    <p className="text-sm font-semibold text-[#212121]">{formatDate(lang, selectedTrip.tripDate)}</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <Clock className="w-5 h-5 text-green-500 mx-auto mb-1" />
                    <p className="text-xs text-[#757575] mb-1">{t('pages.driver.myTrips.labels.departureTime', 'Departure Time')}</p>
                    <p className="text-sm font-semibold text-[#212121]">{formatTime(selectedTrip.departureTimeOnly)}</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <Timer className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                    <p className="text-xs text-[#757575] mb-1">{t('pages.driver.myTrips.labels.arrivalTime', 'Arrival Time')}</p>
                    <p className="text-sm font-semibold text-[#212121]">{formatTime(selectedTrip.arrivalTimeOnly)}</p>
                  </div>
                </div>
              </Card>

              {/* Occupancy Details */}
              <Card className="p-3 bg-white border-[#E0E0E0]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-yellow-50 rounded-lg border border-yellow-200">
                    <Users className="w-4 h-4 text-yellow-500" />
                  </div>
                  <h3 className="text-base font-semibold text-[#212121]">{t('pages.driver.myTrips.labels.seatOccupancy', 'Seat Occupancy')}</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#757575]">{t('pages.driver.myTrips.labels.occupancyRate', 'Occupancy Rate')}</span>
                    <span className={`text-lg font-bold px-3 py-1 rounded-full ${getOccupancyColor(getOccupancyPercentage(selectedTrip))}`}>
                      {getOccupancyPercentage(selectedTrip)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        getOccupancyPercentage(selectedTrip) >= 90 ? 'bg-red-500' :
                        getOccupancyPercentage(selectedTrip) >= 70 ? 'bg-yellow-500' : 
                        'bg-green-500'
                      }`}
                      style={{ width: `${getOccupancyPercentage(selectedTrip)}%` }}
                    ></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-[#757575] mb-1">{t('pages.driver.myTrips.labels.totalSeats', 'Total Seats')}</p>
                      <p className="text-base font-bold text-blue-600">{selectedTrip.totalSeats || 0}</p>
                    </div>
                    <div className="p-2 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs text-[#757575] mb-1">{t('pages.driver.myTrips.labels.booked', 'Booked')}</p>
                      <p className="text-base font-bold text-green-600">{selectedTrip.bookedSeats || 0}</p>
                    </div>
                    <div className="p-2 bg-orange-50 rounded-lg border border-orange-200">
                      <p className="text-xs text-[#757575] mb-1">{t('pages.driver.myTrips.labels.available', 'Available')}</p>
                      <p className="text-base font-bold text-orange-600">{selectedTrip.avalableSeates || 0}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Staff Information */}
              <Card className="p-3 bg-white border-[#E0E0E0]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-purple-50 rounded-lg border border-purple-200">
                    <User className="w-4 h-4 text-purple-500" />
                  </div>
                  <h3 className="text-base font-semibold text-[#212121]">{t('pages.driver.myTrips.labels.staffInfo', 'Staff Information')}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <div className="p-1.5 bg-blue-50 rounded-full">
                      <User className="w-3 h-3 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-[#757575]">{t('pages.driver.myTrips.labels.driver', 'Driver')}</p>
                      <p className="text-sm font-semibold text-[#212121]">{selectedTrip.driverName || t('pages.driver.myTrips.labels.unassigned', 'Unassigned')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <div className="p-1.5 bg-green-50 rounded-full">
                      <Shield className="w-3 h-3 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs text-[#757575]">{t('pages.driver.myTrips.labels.conductor', 'Conductor')}</p>
                      <p className="text-sm font-semibold text-[#212121]">{selectedTrip.conductorName || t('pages.driver.myTrips.labels.unassigned', 'Unassigned')}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Trip Details */}
              <Card className="p-3 bg-white border-[#E0E0E0]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-gray-50 rounded-lg border border-gray-200">
                    <Bus className="w-4 h-4 text-gray-500" />
                  </div>
                  <h3 className="text-base font-semibold text-[#212121]">{t('pages.driver.myTrips.labels.tripDetails', 'Trip Details')}</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-[#757575] mb-1">{t('pages.driver.myTrips.labels.tripId', 'Trip ID')}</p>
                    <p className="font-semibold text-[#212121]">#{selectedTrip.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#757575] mb-1">{t('pages.driver.myTrips.labels.busId', 'Bus ID')}</p>
                    <p className="font-semibold text-[#212121]">#{selectedTrip.busId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#757575] mb-1">{t('pages.driver.myTrips.labels.driverId', 'Driver ID')}</p>
                    <p className="font-semibold text-[#212121]">#{selectedTrip.driverId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#757575] mb-1">{t('pages.driver.myTrips.labels.conductorId', 'Conductor ID')}</p>
                    <p className="font-semibold text-[#212121]">#{selectedTrip.conductorId}</p>
                  </div>
                </div>
              </Card>

              {/* Stop Locations */}
              {selectedTrip.stopLocations && selectedTrip.stopLocations.length > 0 ? (
                <Card className="p-3 bg-white border-[#E0E0E0]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-indigo-50 rounded-lg border border-indigo-200">
                      <MapPin className="w-4 h-4 text-indigo-500" />
                    </div>
                    <h3 className="text-base font-semibold text-[#212121]">{t('pages.driver.myTrips.labels.stopLocations', 'Stop Locations')}</h3>
                    <Badge variant="outline" className="text-xs">
                      {selectedTrip.stopLocations.length} {t('pages.driver.myTrips.labels.stops', 'stops')}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {selectedTrip.stopLocations.map((stop, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[#212121]">{stop.address}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-[#757575]">
                              {t('pages.driver.myTrips.labels.arrival', 'Arrival')}: {formatTime(stop.arrivalTimeOnly)}
                            </span>
                            <span className="text-xs text-[#757575]">
                              {t('pages.driver.myTrips.labels.departure', 'Departure')}: {formatTime(stop.departureTimeOnly)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : (
                <Card className="p-3 bg-white border-[#E0E0E0]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-gray-50 rounded-lg border border-gray-200">
                      <MapPin className="w-4 h-4 text-gray-500" />
                    </div>
                    <h3 className="text-base font-semibold text-[#212121]">{t('pages.driver.myTrips.labels.stopLocations', 'Stop Locations')}</h3>
                  </div>
                  <p className="text-sm text-[#757575]">{t('pages.driver.myTrips.labels.noStops', 'No stop locations available for this trip.')}</p>
                </Card>
              )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-[#E0E0E0] bg-gray-50">
              <Button variant="outline" onClick={closeModal}>
                {t('common.close', 'Close')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}