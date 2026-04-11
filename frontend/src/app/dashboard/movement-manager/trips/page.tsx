'use client';

import { useEffect, useState, useCallback } from 'react';
import TripList from '@/components/trips/TripList';
import TripDetails from '@/components/trips/TripDetails';
import { tripService } from '@/lib/tripService';
import type { TripResponse } from '@/types/trip';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { api, busAPI } from '@/lib/api';
import { useI18n } from '@/contexts/LanguageContext';

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

type Mode = 'list' | 'view';
type TabKey = 'all' | 'filters' | 'completed';

export default function MovementManagerTripsPage() {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('list');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
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
      if (activeTab === 'completed') {
        data = await tripService.getCompleted();
      } else if (activeTab === 'filters') {
        if (filterDate) data = await tripService.getByDate(filterDate);
        else if (filterDriver) data = await tripService.getByDriver(filterDriver);
        else if (filterBus) data = await tripService.getByBus(filterBus);
        else data = await tripService.getAll();
      } else {
        data = await tripService.getAll();
      }
      setItems(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
  const error = e as Error;
  setError(error?.message || t('pages.movementManager.trips.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [activeTab, filterDate, filterDriver, filterBus, t]);

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

  const onView = (t: TripResponse) => { setCurrent(t); setMode('view'); };

  const resetFilters = () => { setFilterDate(''); setFilterDriver(''); setFilterBus(''); };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
  <h1 className="text-xl font-semibold">{t('pages.movementManager.trips.title')}</h1>
      </div>

      {mode === 'list' && (
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-2 border-b">
            <button
              className={`px-3 py-2 text-sm ${activeTab === 'all' ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-600'}`}
              onClick={() => setActiveTab('all')}
            >
              {t('pages.movementManager.trips.tabs.all', 'All')}
            </button>
            <button
              className={`px-3 py-2 text-sm ${activeTab === 'filters' ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-600'}`}
              onClick={() => setActiveTab('filters')}
            >
              {t('pages.movementManager.trips.tabs.filters', 'Filter')}
            </button>
            <button
              className={`px-3 py-2 text-sm ${activeTab === 'completed' ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-600'}`}
              onClick={() => setActiveTab('completed')}
            >
              {t('pages.movementManager.trips.tabs.completed', 'Completed')}
            </button>
          </div>

          {/* Filters only visible in filters tab */}
          {activeTab === 'filters' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-sm font-medium">{t('pages.movementManager.trips.filters.date')}</label>
              <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('pages.movementManager.trips.filters.driver')}</label>
              <Select value={filterDriver} onChange={e => setFilterDriver((e.target as HTMLSelectElement).value)}>
                <option value="">{t('pages.movementManager.trips.filters.allDrivers')}</option>
                {drivers.map(d => (
                  <option key={d.id} value={String(d.id)}>{d.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{t('pages.movementManager.trips.filters.bus')}</label>
              <Select value={filterBus} onChange={e => setFilterBus((e.target as HTMLSelectElement).value)}>
                <option value="">{t('pages.movementManager.trips.filters.allBuses')}</option>
                {buses.map(b => (
                  <option key={b.id} value={String(b.id)}>{b.label}</option>
                ))}
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={load} disabled={loading}>{t('pages.movementManager.trips.filters.apply')}</Button>
              <Button variant="outline" onClick={resetFilters}>{t('pages.movementManager.trips.filters.reset')}</Button>
            </div>
          </div>
          )}

          {error && <div className="text-red-600 text-sm">{t('pages.movementManager.trips.errors.loadFailed', error)}</div>}

          <TripList trips={items} onView={onView} onEdit={() => {}} onDelete={() => {}} i18nBase="pages.movementManager.trips" />
        </div>
      )}

      {mode === 'view' && current && (
        <div className="space-y-4">
          <Button variant="outline" onClick={() => setMode('list')}>{t('common.back')}</Button>
          <TripDetails 
            trip={current} 
            onBack={() => setMode('list')} 
            onEdit={() => {}} 
            onDelete={() => {}} 
            i18nBase="pages.movementManager.trips"
          />
        </div>
      )}
    </div>
  );
}


