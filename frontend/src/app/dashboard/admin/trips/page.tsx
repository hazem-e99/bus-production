'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/contexts/LanguageContext';
import TripList from '@/components/trips/TripList';
import TripDetails from '@/components/trips/TripDetails';
import TripForm from '@/components/trips/TripForm';
import { tripService } from '@/lib/tripService';
import type { TripResponse } from '@/types/trip';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { api, busAPI } from '@/lib/api';
import { useCallback } from 'react';

// User interface
interface User {
  id?: number;
  userId?: number;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  role?: string;
}

// Bus interface
interface Bus {
  id?: number;
  busId?: number;
  busNumber?: string;
}

// API response interfaces
interface ApiResponse<T> {
  data: T;
}

// Driver and bus filter interfaces
interface DriverFilter {
  id: number;
  name: string;
}

interface BusFilter {
  id: number;
  label: string;
}

type Mode = 'list' | 'create' | 'edit' | 'view';

export default function AdminTripsPage() {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('list');
  const [items, setItems] = useState<TripResponse[]>([]);
  const [current, setCurrent] = useState<TripResponse | null>(null);
  const [filterDate, setFilterDate] = useState('');
  const [filterDriver, setFilterDriver] = useState('');
  const [filterBus, setFilterBus] = useState('');
  const [drivers, setDrivers] = useState<DriverFilter[]>([]);
  const [buses, setBuses] = useState<BusFilter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data: TripResponse[] = [];
      if (filterDate) data = await tripService.getByDate(filterDate);
      else if (filterDriver) data = await tripService.getByDriver(filterDriver);
      else if (filterBus) data = await tripService.getByBus(filterBus);
      else data = await tripService.getAll();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
  const error = e as Error;
  setError(error?.message || t('pages.admin.trips.loadFailed', 'Failed to load trips'));
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterDriver, filterBus, t]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const loadRefs = async () => {
      try {
        const [usersRes, busesRes] = await Promise.all([
          api.get<ApiResponse<User[]>>('/Users'),
          busAPI.getAll(),
        ]);
        const users = Array.isArray((usersRes as ApiResponse<User[]>)?.data) ? (usersRes as ApiResponse<User[]>).data : (Array.isArray(usersRes) ? usersRes : []);
        const toNum = (u: User) => Number(u?.id ?? u?.userId);
        const toName = (u: User) => (u?.fullName || `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || u?.name || u?.email || 'User');
        const role = (u: User) => String(u?.role || '').toLowerCase();
        setDrivers(users.filter((u: User) => role(u) === 'driver').map((u: User) => ({ id: toNum(u), name: `${toName(u)} (#${toNum(u)})` })).filter(d => Number.isFinite(d.id) && d.id > 0));
        const busesList = (busesRes as ApiResponse<Bus[]>)?.data ?? [];
        setBuses((Array.isArray(busesList) ? busesList : []).map((b: Bus) => {
          const id = Number(b?.id ?? b?.busId);
          const label = b?.busNumber ? `${b.busNumber} (#${id})` : `#${id}`;
          return { id, label };
        }).filter(b => Number.isFinite(b.id) && b.id > 0));
      } catch {}
    };
    loadRefs();
  }, []);

  const onCreate = () => { setCurrent(null); setMode('create'); };
  const onEdit = (t: TripResponse) => { setCurrent(t); setMode('edit'); };
  const onView = (t: TripResponse) => { setCurrent(t); setMode('view'); };
  const onDelete = async (tr: TripResponse) => {
    if (!confirm(`${t('pages.admin.trips.confirmDeletePrefix', 'Delete trip')} #${tr.id}?`)) return;
    try { 
      await tripService.delete(tr.id); 
      await load(); 
    } catch (e: unknown) { 
      const error = e as Error;
      alert(error?.message || t('pages.admin.trips.deleteFailed', 'Delete failed')); 
    }
  };

  // Note: Trip create/edit forms are not yet implemented

  const resetFilters = () => { setFilterDate(''); setFilterDriver(''); setFilterBus(''); };

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-xl font-semibold">{t('pages.admin.trips.title', 'Trips')}</h1>
        {mode === 'list' && <Button onClick={onCreate} className="w-full sm:w-auto">{t('pages.admin.trips.newTrip', 'New Trip')}</Button>}
      </div>

      {mode === 'list' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-sm font-medium">{t('pages.admin.trips.filters.date', 'Date')}</label>
              <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('pages.admin.trips.filters.driver', 'Driver')}</label>
              <Select value={filterDriver} onChange={e => setFilterDriver((e.target as HTMLSelectElement).value)}>
                <option value="">{t('pages.admin.trips.filters.allDrivers', 'All drivers')}</option>
                {drivers.map(d => (
                  <option key={d.id} value={String(d.id)}>{d.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{t('pages.admin.trips.filters.bus', 'Bus')}</label>
              <Select value={filterBus} onChange={e => setFilterBus((e.target as HTMLSelectElement).value)}>
                <option value="">{t('pages.admin.trips.filters.allBuses', 'All buses')}</option>
                {buses.map(b => (
                  <option key={b.id} value={String(b.id)}>{b.label}</option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={load} disabled={loading} className="w-full sm:w-auto">{t('pages.admin.trips.filters.apply', 'Apply')}</Button>
              <Button variant="outline" onClick={resetFilters} className="w-full sm:w-auto">{t('pages.admin.trips.filters.reset', 'Reset')}</Button>
            </div>
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <TripList trips={items} onView={onView} onEdit={onEdit} onDelete={onDelete} loading={loading} />
        </div>
      )}

      {mode === 'create' && (
        <div className="space-y-4">
          <Button variant="outline" onClick={() => setMode('list')}>{t('common.back', 'Back')}</Button>
          <TripForm 
            mode="create"
            initial={null}
            onCancel={() => setMode('list')}
            onSuccess={async () => { setMode('list'); await load(); }}
          />
        </div>
      )}

      {mode === 'edit' && current && (
        <div className="space-y-4">
          <Button variant="outline" onClick={() => setMode('list')}>{t('common.back', 'Back')}</Button>
          <div className="text-center p-8 text-gray-500">
            {t('pages.admin.trips.editNotAvailable', 'Trip editing form is not available yet.')}
          </div>
        </div>
      )}

      {mode === 'view' && current && (
        <div className="space-y-4">
          <Button variant="outline" onClick={() => setMode('list')}>{t('common.back', 'Back')}</Button>
          <TripDetails 
            trip={current} 
            onBack={() => setMode('list')}
            onEdit={(trip) => { setCurrent(trip); setMode('edit'); }}
            onDelete={(trip) => onDelete(trip)}
          />
        </div>
      )}
    </div>
  );
}


