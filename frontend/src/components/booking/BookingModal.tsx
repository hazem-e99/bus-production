'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '@/components/ui/Card';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Bus, 
  Users,
  X,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { tripAPI, bookingAPI } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/utils/formatDate';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (booking: unknown) => void;
  preSelectedTrip?: TripWithStops | null;
}

interface BookingFormData { 
  date: string; 
}

interface TripWithStops {
  id: string;
  date: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  departureTimeOnly?: string;
  arrivalTimeOnly?: string;
  busId: string;
  routeId: string;
  capacity?: number;
  startLocation?: string;
  endLocation?: string;
  stops?: { id: string; stopName: string; stopTime: string }[];
}

export const BookingModal = ({ isOpen, onClose, onSuccess, preSelectedTrip }: BookingModalProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1: Date, 2: Trip, 3: Stop, 4: Confirm
  const [formData, setFormData] = useState<BookingFormData>({ date: '' });
  const [tripsByDate, setTripsByDate] = useState<TripWithStops[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<TripWithStops | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Generate available dates (next 30 days)
  const availableDates = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date.toISOString().split('T')[0];
  });

  // Fetch trips for selected date
  useEffect(() => {
    const loadTrips = async () => {
      if (!formData.date) { 
        setTripsByDate([]); 
        return; 
      }
      try {
        const data = await tripAPI.getByDate(formData.date);
        setTripsByDate(Array.isArray(data) ? data as unknown as TripWithStops[] : []);
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error('Failed to load trips:', errorMessage);
        setTripsByDate([]);
      }
    };
    loadTrips();
  }, [formData.date]);

  const handleInputChange = (field: keyof BookingFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSelectedTrip(null);
    setSelectedStopId('');
    setError('');
  };

  const handleTripSelection = async (trip: TripWithStops) => { 
    setSelectedTrip(trip); 
    setSelectedStopId(''); 
    setError(''); 
    
    // Load detailed trip data including stop points
    try {
      setIsLoading(true);
      const detailedTrip = await tripAPI.getById(trip.id);
      if (detailedTrip) {
        // Merge basic trip data with detailed data, coercing ids to strings to satisfy TripWithStops
        const enhancedTrip: TripWithStops = {
          ...trip,
          ...detailedTrip,
          // Map stop locations to the expected format
          stops: detailedTrip.stopLocations?.map((stop: any, index: number) => ({
            id: `stop-${index}`,
            stopName: stop.address || `Stop ${index + 1}`,
            stopTime: stop.departureTimeOnly || stop.arrivalTimeOnly || 'TBD'
          })) || [],
          // Ensure required identifiers are strings
          id: String((detailedTrip as any)?.id ?? trip.id),
          busId: String((detailedTrip as any)?.busId ?? trip.busId),
          routeId: String((detailedTrip as any)?.routeId ?? trip.routeId)
        };
        
        setSelectedTrip(enhancedTrip);
        console.log('Trip details loaded successfully:', enhancedTrip);
      } else {
        console.warn('No detailed trip data received, using basic data');
        // Keep the basic trip data if no detailed data is available
      }
    } catch (error) {
      console.error('Failed to load trip details:', error);
      // Keep the basic trip data even if detailed loading fails
      setError('Failed to load trip details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTrip || !selectedStopId) {
      setError('Please select a trip and stop');
      return;
    }

    if (!user?.id) {
      setError('You must be logged in to book a trip');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const payload = { 
        studentId: user.id.toString(), 
        tripId: selectedTrip.id, 
        stopId: selectedStopId 
      };
      const data = await bookingAPI.create(payload);
      console.log('Booking confirmed successfully');
      // showToast({ type: 'success', title: 'Booking confirmed' });
      onSuccess(data);
      handleClose();
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error('Booking creation failed:', errorMessage);
      setError('Failed to create booking. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFormData({ date: '' });
    setSelectedTrip(null);
    setSelectedStopId('');
    setError('');
    onClose();
  };

  // Handle pre-selected trip
  useEffect(() => {
    if (preSelectedTrip && isOpen) {
      setSelectedTrip(preSelectedTrip);
      setFormData({ date: preSelectedTrip.date });
      setStep(3); // Skip to stop selection step
    }
  }, [preSelectedTrip, isOpen]);

  const canProceedToStep2 = !!formData.date;
  const canProceedToStep3 = !!selectedTrip;
  const canProceedToStep4 = !!selectedStopId;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-text-primary mb-2">Book New Trip</h2>
            <p className="text-text-secondary text-lg">Select your date and choose from available trips</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2.5 hover:bg-card-hover rounded-lg transition-all duration-200 hover:scale-110"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center mb-8">
          {[1, 2, 3, 4].map((stepNumber) => (
            <div key={stepNumber} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                step >= stepNumber 
                  ? 'bg-primary text-white shadow-lg' 
                  : 'bg-border text-text-muted'
              }`}>
                {stepNumber}
              </div>
              {stepNumber < 4 && (
                <div className={`w-20 h-1 mx-3 rounded-full transition-all duration-300 ${
                  step > stepNumber ? 'bg-primary' : 'bg-border'
                }`} />
              )}
            </div>
          ))}
          <div className="ml-6 text-sm text-text-muted font-medium">
            {step === 1 && 'Select Date'}
            {step === 2 && 'Select Trip'}
            {step === 3 && 'Select Stop'}
            {step === 4 && 'Confirm'}
          </div>
        </div>

        {/* Step 1: Date Selection */}
        {step === 1 && (
          <div className="space-y-8">
            <div className="max-w-md">
                <label className="block text-sm font-semibold text-text-primary mb-3">
                  Select Date
                </label>
                <Select
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  options={[
                    { value: '', label: 'Choose a date' },
                    ...availableDates.map(date => ({
                      value: date,
                      label: formatDate(date)
                    }))
                  ]}
                />
              </div>
              
            {formData.date && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-3">
                    <div className="p-2 bg-primary-light rounded-lg">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <span>Available Trips Preview</span>
                  </CardTitle>
                  <CardDescription>
                    {tripsByDate.length} trip{tripsByDate.length !== 1 ? 's' : ''} available for {formatDate(formData.date)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {tripsByDate.length > 0 ? (
                    <div className="space-y-3">
                      {tripsByDate.slice(0, 3).map((t) => (
                        <div key={t.id} className="flex items-center justify-between p-3 bg-card-hover rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Bus className="w-5 h-5 text-primary" />
                            <div>
                              <p className="font-medium text-text-primary">Trip {t.id}</p>
                              <p className="text-sm text-text-secondary">
                                {t.startLocation || 'Start'} → {t.endLocation || 'End'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-text-muted">{t.startTime}</p>
                          </div>
                        </div>
                      ))}
                      {tripsByDate.length > 3 && (
                        <p className="text-sm text-text-muted text-center">
                          And {tripsByDate.length - 3} more trips...
                        </p>
                      )}
                        </div>
                  ) : (
                    <div className="text-center py-6 text-text-muted">
                      <Calendar className="w-12 h-12 mx-auto mb-3 text-border" />
                      <p>No trips available for this date</p>
                      </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!canProceedToStep2}
                size="lg"
                className="px-8"
              >
                Continue
                <Calendar className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Trip Selection */}
        {step === 2 && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-text-primary">Available Trips for {formatDate(formData.date)}</h3>
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                size="sm"
              >
                Back
              </Button>
            </div>

            {tripsByDate.length === 0 ? (
              <div className="text-center py-12 text-text-muted">
                <Bus className="w-20 h-20 mx-auto mb-6 text-border" />
                <p className="text-lg mb-2">No trips available for the selected date</p>
                <p className="text-sm">Try a different date</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tripsByDate.map((t) => (
                  <Card
                    key={t.id}
                    className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                      selectedTrip?.id === t.id
                        ? 'ring-2 ring-primary border-primary/20 shadow-lg'
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => handleTripSelection(t)}
                  >
                    {selectedTrip?.id === t.id && isLoading && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg z-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    )}
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-14 h-14 bg-primary-light rounded-xl flex items-center justify-center">
                            <Bus className="w-7 h-7 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-text-primary text-lg">Trip {t.id}</h4>
                            <p className="text-text-secondary">{t.startLocation || 'Start'} → {t.endLocation || 'End'}</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-text-muted">
                            Capacity: {t.capacity ?? '-'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-6 grid grid-cols-3 gap-6 text-sm">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-text-muted" />
                          <span className="text-text-secondary">{t.startTime} {t.endTime ? `- ${t.endTime}` : ''}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-text-muted" />
                          <span className="text-text-secondary">Trip Capacity</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-text-muted" />
                          <span className="text-text-secondary">Stops: {t.stops?.length || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {selectedTrip && (
              <div className="flex justify-end space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!canProceedToStep3}
                  size="lg"
                  className="px-8"
                >
                  Continue
                  <CheckCircle className="w-5 h-5 ml-2" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Stop Selection */}
        {step === 3 && selectedTrip && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
              <h3 className="text-xl font-semibold text-text-primary">Select Pickup Stop</h3>
                <p className="text-sm text-text-secondary mt-1">
                  Choose your pickup location from the available stops
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                size="sm"
              >
                Back
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Available Stops
                </CardTitle>
                <CardDescription>Select your pickup point from the available stops</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                    <span className="text-text-secondary">Loading trip details...</span>
                  </div>
                ) : (
                <div className="space-y-3">
                    {(selectedTrip.stops || []).map((s, index) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStopId(s.id)}
                        className={`w-full p-4 border rounded-lg text-left transition-all duration-200 ${
                          selectedStopId === s.id 
                            ? 'border-primary bg-primary-light shadow-md' 
                            : 'border-border hover:border-primary/50 hover:shadow-sm'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                              selectedStopId === s.id 
                                ? 'bg-primary text-white' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {index + 1}
                            </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                              <span className="font-medium text-text-primary">{s.stopName}</span>
                            </div>
                        </div>
                        <div className="text-sm text-text-secondary flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                            <span className="font-semibold">{s.stopTime}</span>
                          </div>
                        </div>
                        {selectedStopId === s.id && (
                          <div className="mt-3 pt-3 border-t border-primary/20">
                            <div className="flex items-center gap-2 text-sm text-primary">
                              <CheckCircle className="w-4 h-4" />
                              <span>Selected pickup point</span>
                        </div>
                      </div>
                        )}
                    </button>
                  ))}
                  {(!selectedTrip.stops || selectedTrip.stops.length === 0) && (
                      <div className="text-center py-8 text-text-muted">
                        <MapPin className="w-12 h-12 mx-auto mb-3 text-border" />
                        <p className="text-sm">No stops configured for this trip.</p>
                        <p className="text-xs mt-1">Please contact the administrator.</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trip Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bus className="w-5 h-5 text-primary" />
                  Trip Details
                </CardTitle>
                <CardDescription>Complete information about your selected trip</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-text-muted" />
                      <span className="text-sm text-text-muted">Route:</span>
                      <span className="font-medium text-text-primary">{selectedTrip.startLocation || 'Start'} → {selectedTrip.endLocation || 'End'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-text-muted" />
                      <span className="text-sm text-text-muted">Departure:</span>
                      <span className="font-medium text-text-primary">{selectedTrip.startTime || selectedTrip.departureTimeOnly || 'TBD'}</span>
                    </div>
                    {selectedTrip.endTime || selectedTrip.arrivalTimeOnly ? (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-text-muted" />
                        <span className="text-sm text-text-muted">Arrival:</span>
                        <span className="font-medium text-text-primary">{selectedTrip.endTime || selectedTrip.arrivalTimeOnly}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Bus className="w-4 h-4 text-text-muted" />
                      <span className="text-sm text-text-muted">Bus ID:</span>
                      <span className="font-medium text-text-primary">{selectedTrip.busId}</span>
                    </div>
                    {selectedTrip.capacity && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-text-muted" />
                        <span className="text-sm text-text-muted">Capacity:</span>
                        <span className="font-medium text-text-primary">{selectedTrip.capacity} passengers</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-text-muted" />
                      <span className="text-sm text-text-muted">Stops:</span>
                      <span className="font-medium text-text-primary">{selectedTrip.stops?.length || 0} locations</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking Summary */}
            <Card>
              <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <CheckCircle className="w-5 h-5 text-primary" />
                   Booking Summary
                 </CardTitle>
                 <CardDescription>Review your trip details before confirming</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between py-3 border-b border-border-light">
                    <span className="text-text-muted flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Route:
                    </span>
                    <span className="font-semibold text-text-primary">{selectedTrip.startLocation || 'Start'} → {selectedTrip.endLocation || 'End'}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-border-light">
                    <span className="text-text-muted flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Date:
                    </span>
                    <span className="font-semibold text-text-primary">{formatDate(formData.date)}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-border-light">
                    <span className="text-text-muted flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Departure:
                    </span>
                    <span className="font-semibold text-text-primary">{selectedTrip.startTime || selectedTrip.departureTimeOnly || 'TBD'}</span>
                  </div>
                  {selectedTrip.endTime || selectedTrip.arrivalTimeOnly ? (
                    <div className="flex justify-between py-3 border-b border-border-light">
                      <span className="text-text-muted flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Arrival:
                      </span>
                      <span className="font-semibold text-text-primary">{selectedTrip.endTime || selectedTrip.arrivalTimeOnly}</span>
                  </div>
                  ) : null}
                  <div className="flex justify-between py-3 border-b border-border-light">
                    <span className="text-text-muted flex items-center gap-2">
                      <Bus className="w-4 h-4" />
                      Bus ID:
                    </span>
                    <span className="font-semibold text-text-primary">{selectedTrip.busId}</span>
                  </div>
                  {selectedTrip.capacity && (
                    <div className="flex justify-between py-3 border-b border-border-light">
                      <span className="text-text-muted flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Capacity:
                      </span>
                      <span className="font-semibold text-text-primary">{selectedTrip.capacity} passengers</span>
                    </div>
                  )}
                  {selectedStopId && (
                    <div className="flex justify-between py-3 bg-primary-light/10 rounded-lg p-3">
                      <span className="text-text-muted flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        Pickup Stop:
                      </span>
                      <span className="font-semibold text-primary">
                        {selectedTrip.stops?.find(s => s.id === selectedStopId)?.stopName} 
                        ({selectedTrip.stops?.find(s => s.id === selectedStopId)?.stopTime})
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Error Display */}
            {error && (
              <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-xl text-error">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
              >
                Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                disabled={!canProceedToStep4}
                size="lg"
                className="px-10"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && selectedTrip && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-text-primary">Confirm Booking</h3>
              <Button variant="outline" onClick={() => setStep(3)} size="sm">Back</Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  Final Booking Summary
                </CardTitle>
                <CardDescription>Please review all details before confirming your booking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-primary-light/10 rounded-lg">
                        <Calendar className="w-5 h-5 text-primary" />
                        <div>
                          <div className="text-sm text-text-muted">Travel Date</div>
                          <div className="font-semibold text-text-primary">{formatDate(formData.date)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-primary-light/10 rounded-lg">
                        <Bus className="w-5 h-5 text-primary" />
                        <div>
                          <div className="text-sm text-text-muted">Trip ID</div>
                          <div className="font-semibold text-text-primary">{selectedTrip.id}</div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-primary-light/10 rounded-lg">
                        <MapPin className="w-5 h-5 text-primary" />
                        <div>
                          <div className="text-sm text-text-muted">Route</div>
                          <div className="font-semibold text-text-primary">{selectedTrip.startLocation || 'Start'} → {selectedTrip.endLocation || 'End'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-primary-light/10 rounded-lg">
                        <Clock className="w-5 h-5 text-primary" />
                        <div>
                          <div className="text-sm text-text-muted">Departure Time</div>
                          <div className="font-semibold text-text-primary">{selectedTrip.startTime || selectedTrip.departureTimeOnly || 'TBD'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {selectedStopId && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-green-800">Pickup Location</span>
                      </div>
                      <div className="text-green-700">
                        <div className="font-medium">{selectedTrip.stops?.find(s => s.id === selectedStopId)?.stopName}</div>
                        <div className="text-sm">Pickup Time: {selectedTrip.stops?.find(s => s.id === selectedStopId)?.stopTime}</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-blue-800">Booking Confirmation</span>
                    </div>
                    <div className="text-blue-700 text-sm">
                      Once confirmed, you will receive a booking confirmation and can track your trip status.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {error && (
              <div className="flex items-center space-x-3 p-4 bg-red-50 border border-red-200 rounded-xl text-error">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
              <Button onClick={handleSubmit} disabled={isLoading} className="px-10">
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>Confirm Booking</>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

