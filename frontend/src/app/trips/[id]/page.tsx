'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import tripService from '@/services/tripService';
import { TripViewModel } from '@/types/trip';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { MapPin, Clock, Calendar, Users, Bus, ArrowLeft, Edit, Route } from 'lucide-react';
import { useI18n } from '@/contexts/LanguageContext';
import { formatDate as formatWithLocale } from '@/lib/format';

export default function TripDetailsPage() {
  const params = useParams();
  const { toast } = useToast();
  const { t, lang } = useI18n();
  const [trip, setTrip] = useState<TripViewModel | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const id = params?.id as string;
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const data = await tripService.getById(id);
        setTrip(data);
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error('Failed to load trip:', errorMessage);
      } finally {
        setLoading(false);
      }
    })();
  }, [params, toast]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled': return 'bg-blue-100 text-blue-800';
      case 'InProgress': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      case 'Delayed': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const statusText = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'scheduled') return t('common.status.scheduled', 'Scheduled');
    if (s === 'inprogress' || s === 'in-progress') return t('common.status.inProgress', 'In Progress');
    if (s === 'completed') return t('common.status.completed', 'Completed');
    if (s === 'cancelled') return t('common.status.cancelled', 'Cancelled');
    if (s === 'delayed') return t('common.status.delayed', 'Delayed');
    return status;
  };

  const formatTime = (value?: string) => {
    if (!value) return '—';
    const [hh, mm] = value.split(':').map(Number);
    const d = new Date();
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return value;
    d.setHours(hh || 0, mm || 0, 0, 0);
    return formatWithLocale(lang, d, { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (value?: string) => {
    if (!value) return '—';
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      return formatWithLocale(lang, d, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return value!; }
  };

  if (loading) return <TripDetailsSkeleton />;
  if (!trip) return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card className="p-6 text-center">
        <h1 className="text-2xl font-semibold mb-4">{t('pages.movementManager.trips.notFound.title', 'Trip not found')}</h1>
        <p className="text-gray-600 mb-6">{t('pages.movementManager.trips.notFound.message', "The trip you're looking for doesn't exist or may have been removed.")}</p>
        <Link href="/trips">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back', 'Back')}
          </Button>
        </Link>
      </Card>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Creative Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/trips">
              <Button variant="outline" size="icon" className="rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-text-primary tracking-tight">{t('pages.movementManager.trips.details.trip', 'Trip')} #{trip.id}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getStatusColor(trip.status)}>
                  {statusText(trip.status)}
                </Badge>
                <span className="text-sm text-text-secondary">• {t('pages.movementManager.trips.details.tripId', 'Trip ID')}: {trip.id}</span>
              </div>
            </div>
          </div>
          <Link href={`/trips/edit/${trip.id}`}>
            <Button className="gap-2">
              <Edit className="h-4 w-4" />
              {t('pages.movementManager.trips.actions.edit', 'Edit Trip')}
            </Button>
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-white/70 backdrop-blur p-4 flex items-center gap-3">
            <Bus className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-text-secondary">{t('pages.movementManager.trips.summary.busId', 'Bus ID')}</p>
              <p className="font-semibold">{trip.busId}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-white/70 backdrop-blur p-4 flex items-center gap-3">
            <Users className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm text-text-secondary">{t('pages.movementManager.trips.summary.availableSeats', 'Available Seats')}</p>
              <p className="font-semibold">{trip.avalableSeates}/{trip.totalSeats}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-white/70 backdrop-blur p-4 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-sm text-text-secondary">{t('pages.movementManager.trips.filters.date', 'Date')}</p>
              <p className="font-semibold">{formatDate(trip.tripDate)}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-white/70 backdrop-blur p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-orange-600" />
            <div>
              <p className="text-sm text-text-secondary">{t('pages.movementManager.trips.summary.duration', 'Duration')}</p>
              <p className="font-semibold">{formatTime(trip.departureTimeOnly)} - {formatTime(trip.arrivalTimeOnly)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trip Details */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card className="rounded-xl border bg-sky-50/60">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Route className="w-5 h-5" />
              {t('pages.movementManager.trips.details.title', 'Trip Details')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailItem label={t('pages.driver.myTrips.labels.driverId', 'Driver ID')} value={trip.driverId} />
              <DetailItem label={t('pages.driver.myTrips.labels.conductorId', 'Conductor ID')} value={trip.conductorId} />
              <DetailItem label={t('pages.movementManager.trips.details.departureTime', 'Departure Time')} value={formatTime(trip.departureTimeOnly)} />
              <DetailItem label={t('pages.movementManager.trips.details.arrivalTime', 'Arrival Time')} value={formatTime(trip.arrivalTimeOnly)} />
              <DetailItem label={t('pages.driver.myTrips.labels.totalSeats', 'Total Seats')} value={trip.totalSeats} />
              <DetailItem label={t('pages.driver.myTrips.labels.booked', 'Booked')} value={trip.bookedSeats} />
            </div>
          </div>
        </Card>

        {/* Route Information */}
        <Card className="rounded-xl border bg-emerald-50/60">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              {t('pages.movementManager.trips.details.routeInformation', 'Route Information')}
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-white/70 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-medium">{t('pages.admin.trips.form.fields.startLocation', 'Start Location')}</span>
                </div>
                <p className="text-gray-700 ml-6">{trip.startLocation}</p>
              </div>
              <div className="p-4 bg-white/70 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="font-medium">{t('pages.admin.trips.form.fields.endLocation', 'End Location')}</span>
                </div>
                <p className="text-gray-700 ml-6">{trip.endLocation}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Stop Locations */}
      <Card className="rounded-xl border bg-white">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              {t('pages.movementManager.trips.stopLocations.title', 'Stop Locations')}
            </h2>
            <Badge variant="outline">
              {trip.stopLocations?.length || 0} {t('pages.movementManager.trips.stopLocations.stops', 'stops')}
            </Badge>
          </div>
          
          {trip.stopLocations && trip.stopLocations.length > 0 ? (
            <div className="space-y-4">
              {trip.stopLocations.map((stop, index) => (
                <div key={index} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col items-center pt-1">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-xs font-semibold text-blue-800">{index + 1}</span>
                    </div>
                    {index < trip.stopLocations.length - 1 && (
                      <div className="w-0.5 h-12 bg-gray-200 my-1"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{stop.address}</h3>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {t('pages.admin.trips.form.stopArrival', 'Arrival')}: {formatTime(stop.arrivalTimeOnly)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {t('pages.admin.trips.form.stopDeparture', 'Departure')}: {formatTime(stop.departureTimeOnly)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t('pages.admin.trips.form.empty.noStops', 'No stops added yet.')}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// Component for detail items
const DetailItem = ({ label, value }: { label: string, value: string | number }) => (
  <div>
    <p className="text-sm text-gray-600">{label}</p>
    <p className="font-medium">{value}</p>
  </div>
);

// Skeleton loader for better loading experience
const TripDetailsSkeleton = () => (
  <div className="p-6 space-y-6">
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div>
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-6 w-24" />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="rounded-xl border bg-white/70 backdrop-blur p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <div>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Card className="rounded-xl border bg-sky-50/60 p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i}>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-5 w-32" />
            </div>
          ))}
        </div>
      </Card>
      <Card className="rounded-xl border bg-emerald-50/60 p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-4">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </Card>
    </div>

    <Card className="rounded-xl border bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    </Card>
  </div>
);