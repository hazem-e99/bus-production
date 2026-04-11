
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { deriveTripStatus, getRefreshIntervalMs } from '@/lib/tripStatusUtil';
import { 
  Edit, 
  Eye, 
  Trash2, 
  Calendar, 
  MapPin, 
  Bus, 
  User,
  Clock
} from 'lucide-react';
import type { TripResponse } from '@/types/trip';
import { formatDate as formatWithLocale } from '@/lib/format';

interface TripListProps {
  trips: TripResponse[];
  onEdit: (trip: TripResponse) => void;
  onView: (trip: TripResponse) => void;
  onDelete: (trip: TripResponse) => void;
  loading?: boolean;
  /** Base i18n path, e.g., 'pages.movementManager.trips' or 'pages.admin.trips'. Defaults to admin. */
  i18nBase?: string;
}

export default function TripList({ 
  trips, 
  onEdit, 
  onView, 
  onDelete, 
  loading = false,
  i18nBase = 'pages.admin.trips'
}: TripListProps) {
  const { t, lang } = useI18n();
  const base = useMemo(() => i18nBase, [i18nBase]);
  const L = (suffix: string, fallback: string) => t(`${base}.${suffix}`, t(`pages.admin.trips.${suffix}`, fallback));
  const [sortField, setSortField] = useState<keyof TripResponse>('departureTimeOnly');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof TripResponse) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // trigger periodic refresh so derived status updates live
  useEffect(() => {
    const id = setInterval(() => {
      // no state to update; rely on parent rerender via state tick
      // trick: update a dummy state to force rerender
      setTick((t) => t + 1);
    }, getRefreshIntervalMs());
    return () => clearInterval(id);
  }, []);

  const [, setTick] = useState(0);

  const sortedTrips = [...trips].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    return 0;
  });

  const formatTime = (value: string) => {
    try {
      // value is expected HH:mm; create a Date for formatting consistency
      const [hh, mm] = (value || '').split(':').map(Number);
      const d = new Date();
      if (Number.isFinite(hh) && Number.isFinite(mm)) {
        d.setHours(hh || 0, mm || 0, 0, 0);
        return formatWithLocale(lang, d, { hour: '2-digit', minute: '2-digit' });
      }
      return value;
    } catch { return value; }
  };

  const formatDate = (value: string) => {
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      return formatWithLocale(lang, d, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return value; }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', text: string }> = {
      'scheduled': { variant: 'default', text: t('common.status.scheduled', 'Scheduled') },
      'in-progress': { variant: 'secondary', text: t('common.status.inProgress', 'In Progress') },
      'completed': { variant: 'outline', text: t('common.status.completed', 'Completed') },
      'cancelled': { variant: 'destructive', text: t('common.status.cancelled', 'Cancelled') },
      'delayed': { variant: 'secondary', text: t('common.status.delayed', 'Delayed') }
    };
    const statusInfo = statusMap[status.toLowerCase()] || { variant: 'outline', text: status };
    return <Badge variant={statusInfo.variant}>{statusInfo.text}</Badge>;
  };

  const getRowClassByStatus = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'in-progress') return 'bg-yellow-50';
    if (s === 'completed') return 'bg-green-50';
    if (s === 'cancelled') return 'bg-red-50';
    if (s === 'delayed') return 'bg-orange-50';
    return 'bg-blue-50'; // scheduled/default
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">{L('loading', 'Loading trips...')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (trips.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Bus className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{L('noTrips', 'No trips found')}</h3>
            <p className="mt-1 text-sm text-gray-500">{L('getStarted', 'Get started by creating a new trip.')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {t(`${base}.title`, t('pages.admin.trips.title', 'Trips'))} ({trips.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th 
                  className="text-left p-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('id')}
                >
                  {t(`${base}.table.id`, t('pages.admin.trips.table.id', 'ID'))}
                  {sortField === 'id' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="text-left p-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('departureTimeOnly')}
                >
                  {t(`${base}.table.dateTime`, t('pages.admin.trips.table.dateTime', 'Date & Time'))}
                  {sortField === 'departureTimeOnly' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="text-left p-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                >
                  {t(`${base}.table.route`, t('pages.admin.trips.table.route', 'Route'))}
                </th>
                <th 
                  className="text-left p-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('driverId')}
                >
                  {t(`${base}.table.driver`, t('pages.admin.trips.table.driver', 'Driver'))}
                  {sortField === 'driverId' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="text-left p-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('busId')}
                >
                  {t(`${base}.table.bus`, t('pages.admin.trips.table.bus', 'Bus'))}
                  {sortField === 'busId' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="text-left p-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('status')}
                >
                  {t(`${base}.table.status`, t('pages.admin.trips.table.status', 'Status'))}
                  {sortField === 'status' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th className="text-left p-3 font-medium text-gray-700">{t(`${base}.table.actions`, t('pages.admin.trips.table.actions', 'Actions'))}</th>
              </tr>
            </thead>
            <tbody>
              {sortedTrips.map((trip) => {
                const derived = deriveTripStatus({
                  tripDate: trip.tripDate,
                  departureTimeOnly: trip.departureTimeOnly,
                  arrivalTimeOnly: trip.arrivalTimeOnly,
                  status: trip.status
                });
                const rowClass = getRowClassByStatus(derived);
                return (
                <tr key={trip.id} className={`border-b border-gray-100 ${rowClass}`}>
                  <td className="p-3 text-sm font-medium text-gray-900">#{trip.id}</td>
                  <td className="p-3 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium">{formatDate((trip as any).tripDate || '')}</div>
                        <div className="text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(trip.departureTimeOnly)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium">{(trip as any).origin || (trip as any).startLocation || t('common.na', 'N/A')}</div>
                        <div className="text-gray-500">→ {(trip as any).destination || (trip as any).endLocation || t('common.na', 'N/A')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>#{trip.driverId}</span>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <Bus className="h-4 w-4 text-gray-400" />
                      <span>#{trip.busId}</span>
                    </div>
                  </td>
                  <td className="p-3">{getStatusBadge(derived)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => onView(trip)}
                        className="h-8 w-8 p-0 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onEdit(trip)}
                        className="h-8 w-8 p-0 bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onDelete(trip)}
                        className="h-8 w-8 p-0 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
