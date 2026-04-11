'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Calendar, 
  MapPin, 
  Bus, 
  User, 
  Clock, 
  ArrowLeft,
  Edit,
  Trash2,
  Route,
  Info
} from 'lucide-react';
import type { TripResponse } from '@/types/trip';
import { deriveTripStatus, getRefreshIntervalMs } from '@/lib/tripStatusUtil';
import { useEffect, useState, useMemo } from 'react';
import { useI18n } from '@/contexts/LanguageContext';
import { formatDate as formatWithLocale } from '@/lib/format';

interface TripDetailsProps {
  trip: TripResponse;
  onBack: () => void;
  onEdit: (trip: TripResponse) => void;
  onDelete: (trip: TripResponse) => void;
  /** Base i18n path, e.g., 'pages.movementManager.trips' or 'pages.admin.trips'. Defaults to admin. */
  i18nBase?: string;
}

export default function TripDetails({ 
  trip, 
  onBack, 
  onEdit, 
  onDelete,
  i18nBase = 'pages.admin.trips'
}: TripDetailsProps) {
  const { t, lang } = useI18n();
  const base = useMemo(() => i18nBase, [i18nBase]);
  const L = (suffix: string, fallback: string) => t(`${base}.${suffix}`, t(`pages.admin.trips.${suffix}`, fallback));
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), getRefreshIntervalMs());
    return () => clearInterval(id);
  }, []);
  const formatTime = (value: string) => {
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      return formatWithLocale(lang, d, { hour: '2-digit', minute: '2-digit' });
    } catch { return value; }
  };

  const formatDateLong = (value: string) => {
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      return formatWithLocale(lang, d, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return value; }
  };

  const computeDuration = (start?: string, end?: string): { minutes: number; label: string } | null => {
    if (!start || !end) return null;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    if (![sh, sm, eh, em].every(n => Number.isFinite(n))) return null;
    // compute minutes, handle overnight by adding 24h if needed
    let minutes = (eh * 60 + em) - (sh * 60 + sm);
    if (minutes < 0) minutes += 24 * 60;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
    return { minutes, label };
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', text: string, color: string }> = {
      'scheduled': { variant: 'default', text: t('common.status.scheduled', 'Scheduled'), color: 'bg-blue-100 text-blue-800' },
      'in-progress': { variant: 'secondary', text: t('common.status.inProgress', 'In Progress'), color: 'bg-yellow-100 text-yellow-800' },
      'completed': { variant: 'outline', text: t('common.status.completed', 'Completed'), color: 'bg-green-100 text-green-800' },
      'cancelled': { variant: 'destructive', text: t('common.status.cancelled', 'Cancelled'), color: 'bg-red-100 text-red-800' },
      'delayed': { variant: 'secondary', text: t('common.status.delayed', 'Delayed'), color: 'bg-orange-100 text-orange-800' }
    };
    
    const statusInfo = statusMap[status.toLowerCase()] || { variant: 'outline', text: status, color: 'bg-gray-100 text-gray-800' };
    return <Badge variant={statusInfo.variant} className={statusInfo.color}>{statusInfo.text}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Summary Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-xs text-gray-500">{L('filters.date', 'Date')}</div>
                <div className="text-sm font-semibold text-gray-900">{formatDateLong((trip as any).tripDate || trip.departureTimeOnly)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Duration */}
        {computeDuration(trip.departureTimeOnly, trip.arrivalTimeOnly) && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                  <Clock className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">{L('summary.duration', 'Duration')}</div>
                  <div className="text-sm font-semibold text-gray-900">{computeDuration(trip.departureTimeOnly, trip.arrivalTimeOnly)!.label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {/* Available Seats */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg border border-orange-200">
                <User className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-xs text-gray-500">{L('summary.availableSeats', 'Available Seats')}</div>
                <div className="text-sm font-semibold text-gray-900">{Math.max(0, (trip as any).avalableSeates ?? (trip.totalSeats - trip.bookedSeats))}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Bus ID */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg border border-purple-200">
                <Bus className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-xs text-gray-500">{L('summary.busId', 'Bus ID')}</div>
                <div className="text-sm font-semibold text-gray-900">#{trip.busId}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-10 w-10 p-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{L('details.title', 'Trip Details')}</h1>
            <p className="text-gray-600">{L('details.trip', 'Trip')} #{trip.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => onEdit(trip)}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            {L('actions.edit', 'Edit Trip')}
          </Button>
          <Button
            variant="outline"
            onClick={() => onDelete(trip)}
            className="flex items-center gap-2 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            {L('actions.delete', 'Delete')}
          </Button>
        </div>
      </div>

  {/* Trip Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              {L('sections.basicInfo', 'Basic Information')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">{L('table.status', 'Status')}</span>
              {getStatusBadge(deriveTripStatus({
                tripDate: trip.tripDate,
                departureTimeOnly: trip.departureTimeOnly,
                arrivalTimeOnly: trip.arrivalTimeOnly,
                status: trip.status
              }))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">{L('details.tripId', 'Trip ID')}</span>
              <span className="text-sm text-gray-900">#{trip.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">{L('details.created', 'Created')}</span>
              <span className="text-sm text-gray-900">
                {(trip as any).createdAt ? formatDateLong((trip as any).createdAt) : t('common.na', 'N/A')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">{L('details.lastUpdated', 'Last Updated')}</span>
              <span className="text-sm text-gray-900">
                {(trip as any).updatedAt ? formatDateLong((trip as any).updatedAt) : t('common.na', 'N/A')}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {L('sections.schedule', 'Schedule')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">{L('filters.date', 'Date')}</span>
              <span className="text-sm text-gray-900">
                {formatDateLong(trip.departureTimeOnly)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">{L('details.departureTime', 'Departure Time')}</span>
              <span className="text-sm text-gray-900 flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatTime(trip.departureTimeOnly)}
              </span>
            </div>
            {trip.arrivalTimeOnly && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">{L('details.arrivalTime', 'Arrival Time')}</span>
                <span className="text-sm text-gray-900 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatTime(trip.arrivalTimeOnly)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Route Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              {L('details.routeInformation', L('table.route', 'Route'))}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-gray-500">{
                  t(`${base}.form.fields.startLocation`, t('pages.admin.trips.form.fields.startLocation', 'Start Location'))
                }</span>
              </div>
              <span className="text-sm text-gray-900 ml-6">{(trip as any).startLocation || (trip as any).origin || t('common.na', 'N/A')}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-gray-500">{
                  t(`${base}.form.fields.endLocation`, t('pages.admin.trips.form.fields.endLocation', 'End Location'))
                }</span>
              </div>
              <span className="text-sm text-gray-900 ml-6">{(trip as any).endLocation || (trip as any).destination || t('common.na', 'N/A')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Resources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bus className="h-5 w-5" />
              {L('details.resources', 'Resources')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">{L('table.driver', 'Driver')}</span>
              <span className="text-sm text-gray-900 flex items-center gap-1">
                <User className="h-4 w-4" />
                #{trip.driverId}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">{L('table.bus', 'Bus')}</span>
              <span className="text-sm text-gray-900 flex items-center gap-1">
                <Bus className="h-4 w-4" />
                #{trip.busId}
              </span>
            </div>
            {trip.conductorId && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">{L('details.conductor', 'Conductor')}</span>
                <span className="text-sm text-gray-900 flex items-center gap-1">
                  <User className="h-4 w-4" />
                  #{trip.conductorId}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Details */}
      {((trip as any).notes || (trip as any).description) && (
        <Card>
          <CardHeader>
      <CardTitle>{L('details.additional', 'Additional Details')}</CardTitle>
          </CardHeader>
          <CardContent>
            {(trip as any).notes && (
              <div className="space-y-2">
        <span className="text-sm font-medium text-gray-500">{L('details.notes', 'Notes')}</span>
                <p className="text-sm text-gray-900">{(trip as any).notes}</p>
              </div>
            )}
            {(trip as any).description && (
              <div className="space-y-2 mt-4">
        <span className="text-sm font-medium text-gray-500">{L('details.description', 'Description')}</span>
                <p className="text-sm text-gray-900">{(trip as any).description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
