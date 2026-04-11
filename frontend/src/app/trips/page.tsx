'use client';

import Link from 'next/link';
import { useEffect, useReducer, useState } from 'react';
import tripService from '@/services/tripService';
import { TripViewModel } from '@/types/trip';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { deriveTripStatus, getRefreshIntervalMs } from '@/lib/tripStatusUtil';
import { useI18n } from '@/contexts/LanguageContext';

export default function TripsPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<'all' | 'completed'>('all');
  const [trips, setTrips] = useState<TripViewModel[]>([]);
  const [allTrips, setAllTrips] = useState<TripViewModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dateFilter, setDateFilter] = useState<string>('');
  const [busNumberFilter, setBusNumberFilter] = useState<string>('');
  const [driverNameFilter, setDriverNameFilter] = useState<string>('');
  const [supervisorNameFilter, setSupervisorNameFilter] = useState<string>('');
  const [dateOptions, setDateOptions] = useState<string[]>([]);
  const [busNumberOptions, setBusNumberOptions] = useState<string[]>([]);
  const [driverNameOptions, setDriverNameOptions] = useState<string[]>([]);
  const [supervisorNameOptions, setSupervisorNameOptions] = useState<string[]>([]);
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [now, setNow] = useState<Date | null>(null);
  const [renewingId, setRenewingId] = useState<number | null>(null);
  const [autoRenewedIds, setAutoRenewedIds] = useState<Set<number>>(new Set());
  const [autoRenewEnabled, setAutoRenewEnabled] = useState<boolean>(false);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const data: TripViewModel[] = tab === 'completed'
        ? await tripService.getCompleted() as unknown as TripViewModel[]
        : await tripService.getAll();
      setAllTrips(data);
      // Build dropdown options
      const unique = (arr: string[]) => Array.from(new Set(arr.filter(Boolean))).sort();
      setDateOptions(unique(data.map(t => String(t.tripDate || ''))));
      setBusNumberOptions(unique(data.map(t => String((t.busNumber ?? t.busId) || ''))));
      setDriverNameOptions(unique(data.map(t => String((t.driverName ?? t.driverId ?? '') || ''))));
      setSupervisorNameOptions(unique(data.map(t => String((t.conductorName ?? t.conductorId ?? '') || ''))));
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error('Failed to load trips:', errorMessage);
      // toast({ title: 'Failed to load trips', description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [tab]);

  // establish stable now after mount and periodically update
  useEffect(() => {
    // Load auto-renew preference
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem('autoRenewTrips') : null;
      if (saved != null) setAutoRenewEnabled(saved === 'true');
    } catch {}
    setNow(new Date());
    const id = setInterval(() => {
      setNow(new Date());
      force();
    }, getRefreshIntervalMs());
    return () => clearInterval(id);
  }, []);

  // Auto-reschedule trips that have completed status (run once per trip per session)
  useEffect(() => {
    if (!autoRenewEnabled) return;
    if (!now || renewingId) return;
    const candidates = trips.filter((trip) => {
      const derived = deriveTripStatus({
        tripDate: trip.tripDate as unknown as string,
        departureTimeOnly: trip.departureTimeOnly as unknown as string,
        arrivalTimeOnly: trip.arrivalTimeOnly as unknown as string,
        status: trip.status as unknown as string
      }, now);
      return derived === 'completed' && !autoRenewedIds.has(Number(trip.id));
    });
    if (candidates.length === 0) return;

    const nextTrip = candidates[0];
    const idNum = Number(nextTrip.id);
    setAutoRenewedIds(prev => new Set(prev).add(idNum));
    onRenew(idNum).catch(() => {
      // If failed, allow retry in a future tick by removing from set
      setAutoRenewedIds(prev => {
        const copy = new Set(prev);
        copy.delete(idNum);
        return copy;
      });
    });
  }, [now, trips, renewingId, autoRenewedIds, autoRenewEnabled]);

  // Apply client-side filters reactively
  useEffect(() => {
    const normalized = (v: unknown) => String(v ?? '').toLowerCase();
    const filtered = allTrips.filter((t) => {
      const matchesDate = !dateFilter || String(t.tripDate || '') === dateFilter;
      const matchesBus = !busNumberFilter || String(t.busNumber ?? t.busId) === busNumberFilter;
      const matchesDriver = !driverNameFilter || normalized(t.driverName ?? t.driverId).includes(normalized(driverNameFilter));
      const matchesSupervisor = !supervisorNameFilter || normalized(t.conductorName ?? t.conductorId).includes(normalized(supervisorNameFilter));
      return matchesDate && matchesBus && matchesDriver && matchesSupervisor;
    });
    setTrips(filtered);
  }, [dateFilter, busNumberFilter, driverNameFilter, supervisorNameFilter, allTrips]);

  const onDelete = async (id: number) => {
    try {
      await tripService.remove(id);
      console.log('Trip deleted successfully');
      // toast({ title: 'Trip deleted' });
      fetchTrips();
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error('Delete failed:', errorMessage);
      // toast({ title: 'Delete failed', description: errorMessage });
    }
  };

  const onRenew = async (id: number) => {
    try {
      setRenewingId(id);
      await tripService.renew(id);
      await fetchTrips();
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error('Renew failed:', errorMessage);
    } finally {
      setRenewingId(null);
    }
  };

  const getRowClassByStatus = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'in-progress') return 'bg-yellow-50';
    if (s === 'completed') return 'bg-green-50';
    if (s === 'cancelled') return 'bg-red-50';
    if (s === 'delayed') return 'bg-orange-50';
    return 'bg-blue-50';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">{t('pages.trips.title', 'Trips')}</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRenewEnabled}
              onChange={(e) => {
                const v = e.target.checked;
                setAutoRenewEnabled(v);
                try { window.localStorage.setItem('autoRenewTrips', String(v)); } catch {}
              }}
            />
            {t('pages.trips.autoRenew', 'Auto reschedule completed trips')}
          </label>
          <Badge>عدد الرحلات: {trips.length}</Badge>
          <Link href="/trips/create"><Button>{t('pages.trips.newTrip', 'New Trip')}</Button></Link>
        </div>
      </div>

      <div className="border-b flex gap-3">
        <button
          className={`px-3 py-2 text-sm ${tab === 'all' ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-600'}`}
          onClick={() => setTab('all')}
        >{t('pages.trips.tabs.all', 'All')}</button>
        <button
          className={`px-3 py-2 text-sm ${tab === 'completed' ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-600'}`}
          onClick={() => setTab('completed')}
        >{t('pages.trips.tabs.completed', 'Completed')}</button>
      </div>

      {tab === 'all' && (
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
              <option value="">{t('pages.trips.filters.allDates', 'All Dates')}</option>
              {dateOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>
            <Select value={busNumberFilter} onChange={(e) => setBusNumberFilter(e.target.value)}>
              <option value="">{t('pages.trips.filters.allBuses', 'All Buses')}</option>
              {busNumberOptions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </Select>
            <Select value={driverNameFilter} onChange={(e) => setDriverNameFilter(e.target.value)}>
              <option value="">{t('pages.trips.filters.allDrivers', 'All Drivers')}</option>
              {driverNameOptions.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
            <Select value={supervisorNameFilter} onChange={(e) => setSupervisorNameFilter(e.target.value)}>
              <option value="">{t('pages.trips.filters.allSupervisors', 'All Supervisors')}</option>
              {supervisorNameOptions.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
          </div>
        </Card>
      )}

      {loading ? (
        <Card className="p-6">{t('common.loading', 'Loading...')}</Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="p-3">{t('pages.trips.table.id', 'ID')}</th>
                  <th className="p-3">{t('pages.trips.table.bus', 'Bus')}</th>
                  <th className="p-3">{t('pages.trips.table.driver', 'Driver')}</th>
                  <th className="p-3">{t('pages.trips.table.conductor', 'Conductor')}</th>
                  <th className="p-3">{t('pages.trips.table.date', 'Date')}</th>
                  <th className="p-3">{t('pages.trips.table.departure', 'Departure')}</th>
                  <th className="p-3">{t('pages.trips.table.arrival', 'Arrival')}</th>
                  <th className="p-3">{t('pages.trips.table.status', 'Status')}</th>
                  <th className="p-3">{t('pages.trips.table.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((trip) => {
                  const derived = deriveTripStatus({
                    tripDate: trip.tripDate as unknown as string,
                    departureTimeOnly: trip.departureTimeOnly as unknown as string,
                    arrivalTimeOnly: trip.arrivalTimeOnly as unknown as string,
                    status: trip.status as unknown as string
                  }, now ?? new Date(0));
                  const rowClass = getRowClassByStatus(derived);
                  return (
                  <tr key={trip.id} className={`border-t ${rowClass}`}>
                    <td className="p-3">{trip.id}</td>
                    <td className="p-3">{trip.busNumber ?? trip.busId}</td>
                    <td className="p-3">{trip.driverName ?? trip.driverId}</td>
                    <td className="p-3">{trip.conductorName ?? trip.conductorId}</td>
                    <td className="p-3">{trip.tripDate}</td>
                    <td className="p-3">{trip.departureTimeOnly}</td>
                    <td className="p-3">{trip.arrivalTimeOnly}</td>
                    <td className="p-3">
                      {(() => {
                        const variant = derived === 'cancelled' ? 'destructive'
                          : derived === 'in-progress' ? 'secondary'
                          : derived === 'completed' ? 'outline'
                          : 'default';
                        const label = derived === 'scheduled' ? t('pages.admin.trips.status.scheduled', 'Scheduled')
                          : derived === 'in-progress' ? t('pages.admin.trips.status.inProgress', 'In Progress')
                          : derived === 'completed' ? t('pages.admin.trips.status.completed', 'Completed')
                          : derived === 'cancelled' ? t('pages.admin.trips.status.cancelled', 'Cancelled')
                          : derived === 'delayed' ? t('pages.admin.trips.status.delayed', 'Delayed')
                          : String(derived);
                        return <Badge variant={variant}>{label}</Badge>;
                      })()}
                    </td>
                    <td className="p-3 flex gap-2">
                      {derived === 'completed' ? (
                        <Button size="sm" onClick={() => onRenew(trip.id)} disabled={renewingId === trip.id}>
                          {renewingId === trip.id ? t('pages.trips.actions.rescheduling', 'Rescheduling...') : t('pages.trips.actions.reschedule', 'Reschedule')}
                        </Button>
                      ) : (
                        <>
                          <Link href={`/trips/${trip.id}`}><Button variant="secondary" size="sm">{t('pages.trips.actions.view', 'View')}</Button></Link>
                          <Link href={`/trips/edit/${trip.id}`}><Button variant="outline" size="sm">{t('pages.trips.actions.edit', 'Edit')}</Button></Link>
                          <Button variant="destructive" size="sm" onClick={() => onDelete(trip.id)}>{t('pages.trips.actions.delete', 'Delete')}</Button>
                        </>
                      )}
                    </td>
                  </tr>
                );})}
                {trips.length === 0 && (
                  <tr>
                    <td className="p-10 text-center text-gray-500" colSpan={9}>{t('pages.trips.empty.noTrips', 'No trips found. Try adjusting filters or create a new trip.')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}








