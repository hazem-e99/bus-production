"use client";

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import tripService from '@/services/tripService';
import { busAPI, userAPI } from '@/lib/api';
import { getApiConfig } from '@/lib/config';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, BusFront, User as UserIcon, Calendar, Route, MapPin, Plus, Trash2, Save } from 'lucide-react';
import { useI18n } from '@/contexts/LanguageContext';

// Define interfaces
interface User {
  id: string;
  fullName?: string;
  name?: string;
  email?: string;
}

interface TripData {
  id: number;
  busId: number;
  driverId: number;
  conductorId: number;
  startLocation?: string;
  endLocation?: string;
  tripDate: string;
  departureTimeOnly: string;
  arrivalTimeOnly: string;
  stopLocations?: Array<{
    id?: string;
    address?: string;
    stopName?: string;
    arrivalTimeOnly?: string;
    departureTimeOnly?: string;
    stopTime?: string;
  }>;
}

type UpdateTripForm = {
  busId?: string;
  driverId?: string;
  conductorId?: string;
  startLocation?: string;
  endLocation?: string;
  tripDate?: string;
  departureTimeOnly?: string;
  arrivalTimeOnly?: string;
  stopLocations?: Array<{
    address: string;
    arrivalTimeOnly: string;
    departureTimeOnly: string;
  }>;
};

export default function EditTripPage() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  // Build localized validation schemas
  const stopSchema = z.object({
    address: z.string()
      .min(1, t('pages.admin.trips.form.errors.requiredAddress', 'Address is required'))
      .max(300, t('pages.admin.trips.form.errors.maxChars', 'Max 300 characters')),
    arrivalTimeOnly: z.string().min(1, t('pages.admin.trips.form.errors.requiredArrival', 'Arrival time is required')),
    departureTimeOnly: z.string().min(1, t('pages.admin.trips.form.errors.requiredDeparture', 'Departure time is required')),
  });
  const updateTripSchema = z.object({
    busId: z.string().optional(),
    driverId: z.string().optional(),
    conductorId: z.string().optional(),
    startLocation: z.string().max(200, t('pages.admin.trips.form.errors.max200', 'Must be at most 200 characters')).optional(),
    endLocation: z.string().max(200, t('pages.admin.trips.form.errors.max200', 'Must be at most 200 characters')).optional(),
    tripDate: z.string().optional(),
    departureTimeOnly: z.string().optional(),
    arrivalTimeOnly: z.string().optional(),
    stopLocations: z.array(stopSchema).optional(),
  });

  const form = useForm<UpdateTripForm>({
    resolver: zodResolver(updateTripSchema),
    defaultValues: {
      stopLocations: [],
      busId: '',
      driverId: '',
      conductorId: '',
      startLocation: '',
      endLocation: '',
      tripDate: '',
      departureTimeOnly: '',
      arrivalTimeOnly: ''
    }
  });
  const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: 'stopLocations' as const });
  const [loadingLookups, setLoadingLookups] = useState<boolean>(true);
  const [buses, setBuses] = useState<Array<{ id: number; busNumber?: string }>>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [conductors, setConductors] = useState<User[]>([]);
  const [tripId, setTripId] = useState<string>('');

  useEffect(() => {
    const id = params?.id as string;
    if (!id) return;
    setTripId(id);
    (async () => {
      try {
        const data = await tripService.getById(id) as unknown as TripData;
        if (data) {
          form.reset({
            busId: data.busId?.toString() || '',
            driverId: data.driverId?.toString() || '',
            conductorId: data.conductorId?.toString() || '',
            startLocation: data.startLocation ?? '',
            endLocation: data.endLocation ?? '',
            tripDate: data.tripDate || '',
            departureTimeOnly: data.departureTimeOnly || '',
            arrivalTimeOnly: data.arrivalTimeOnly || '',
          });
          
          // Transform stop locations to match the form schema
          const transformedStops = (data.stopLocations || []).map((stop: any) => ({
            address: stop.address || stop.stopName || '',
            arrivalTimeOnly: stop.arrivalTimeOnly || stop.stopTime || '',
            departureTimeOnly: stop.departureTimeOnly || stop.stopTime || ''
          }));
          replace(transformedStops);
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error('Failed to load trip:', errorMessage);
      }
    })();
  }, [params, form, replace]);

  useEffect(() => {
    (async () => {
      try {
        setLoadingLookups(true);
        const [busesResp, driverUsers, conductorUsers] = await Promise.all([
          busAPI.getAll(),
          userAPI.getByRole('Driver'),
          userAPI.getByRole('Conductor'),
        ]);
        const busList = (busesResp as { data?: unknown })?.data ?? busesResp ?? [];
        setBuses(Array.isArray(busList) ? busList : []);
        
        // Transform user data to match User interface
        const transformedDrivers = Array.isArray(driverUsers) ? driverUsers.map(user => ({
          id: user.id?.toString() || '',
          fullName: user.fullName || '',
          name: user.name || '',
          email: user.email || ''
        })) : [];
        setDrivers(transformedDrivers);
        
        const transformedConductors = Array.isArray(conductorUsers) ? conductorUsers.map(user => ({
          id: user.id?.toString() || '',
          fullName: user.fullName || '',
          name: user.name || '',
          email: user.email || ''
        })) : [];
        setConductors(transformedConductors);
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error('Failed to load lookups:', errorMessage);
      } finally {
        setLoadingLookups(false);
      }
    })();
  }, []);

  const onSubmit = async (values: UpdateTripForm) => {
    try {
      const id = params?.id as string;
      const url = getApiConfig().buildUrl(`/Trip/${id}`);

      // read token from localStorage if present
      let token: string | undefined;
      try {
        if (typeof window !== 'undefined') {
          const raw = window.localStorage.getItem('user');
          if (raw) {
            const parsed = JSON.parse(raw);
            token = parsed?.token || parsed?.accessToken;
          }
        }
      } catch {}

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'text/plain',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Transform form values to match API expectations
      const tripData = {
        ...values,
        busId: values.busId ? Number(values.busId) : undefined,
        driverId: values.driverId ? Number(values.driverId) : undefined,
        conductorId: values.conductorId ? Number(values.conductorId) : undefined,
      };

      const resp = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(tripData),
        redirect: 'follow',
      });

      const text = await resp.text();
      if (!resp.ok) {
        // try to extract message from text
        let msg = text || `${resp.status} ${resp.statusText}`;
        try { const j = JSON.parse(text); msg = j?.message || JSON.stringify(j); } catch {}
        throw new Error(msg);
      }

      // success
      console.log('Trip updated successfully');
      showToast({
        type: 'success',
        title: t('pages.admin.trips.toasts.savedTitle', 'Trip Saved'),
        message: t('pages.admin.trips.toasts.savedMsg', 'Trip details saved successfully')
      });
      router.push('/trips');
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error('Update failed:', errorMessage);
      showToast({
        type: 'error',
        title: t('pages.admin.trips.toasts.errorTitle', 'Error'),
        message: errorMessage
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Creative Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => router.push('/trips')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('common.back', 'Back')}
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-text-primary tracking-tight">{t('pages.admin.trips.form.titleEdit', 'Edit Trip')}</h1>
              <p className="text-text-secondary mt-1">{t('pages.admin.trips.form.subtitle', 'Plan route, assign bus and staff, and set schedule')}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border bg-white/70 backdrop-blur p-4 flex items-center gap-3">
            <BusFront className="w-5 h-5 text-indigo-600" />
            <div>
              <p className="text-sm text-text-secondary">{t('pages.movementManager.trips.details.tripId', 'Trip ID')}</p>
              <p className="font-semibold">#{tripId}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-white/70 backdrop-blur p-4 flex items-center gap-3">
            <UserIcon className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-sm text-text-secondary">{t('pages.admin.trips.form.stats.drivers', 'Drivers')}</p>
              <p className="font-semibold">{loadingLookups ? '—' : drivers.length}</p>
            </div>
          </div>
          <div className="rounded-xl border bg-white/70 backdrop-blur p-4 flex items-center gap-3">
            <UserIcon className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-text-secondary">{t('pages.admin.trips.form.stats.conductors', 'Conductors')}</p>
              <p className="font-semibold">{loadingLookups ? '—' : conductors.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Sections */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Assignment */}
        <Card className="xl:col-span-2 rounded-xl border bg-sky-50/60 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><BusFront className="w-5 h-5" /> {t('pages.admin.trips.form.sections.assignment', 'Assignment')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">{t('pages.admin.trips.form.fields.bus', 'Bus')}</label>
              <select {...form.register('busId')} className="mt-1 w-full border rounded px-3 py-2 bg-white">
                  <option value="">{loadingLookups ? t('common.loading', 'Loading...') : t('pages.admin.trips.form.placeholders.selectBus', 'Select a bus')}</option>
                  {buses.map((b) => {
                    const label = `${b.busNumber ? b.busNumber : t('pages.admin.trips.form.fields.bus', 'Bus')} (ID: ${b.id})`;
                    return <option key={b.id} value={b.id}>{label}</option>;
                  })}
                </select>
              {form.formState.errors.busId && <p className="text-red-600 text-sm">{form.formState.errors.busId.message as string}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium">{t('pages.admin.trips.form.fields.driver', 'Driver')}</label>
              <select {...form.register('driverId')} className="mt-1 w-full border rounded px-3 py-2 bg-white">
                <option value="">{loadingLookups ? t('common.loading', 'Loading...') : t('pages.admin.trips.form.placeholders.selectDriver', 'Select a driver')}</option>
                {drivers.map((u) => {
                  const name = u.fullName || u.name || u.email || `User`;
                  const label = `${name} (ID: ${u.id})`;
                  return <option key={u.id} value={u.id}>{label}</option>;
                })}
              </select>
              {form.formState.errors.driverId && <p className="text-red-600 text-sm">{form.formState.errors.driverId.message as string}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium">{t('pages.admin.trips.form.fields.conductor', 'Conductor')}</label>
              <select {...form.register('conductorId')} className="mt-1 w-full border rounded px-3 py-2 bg-white">
                <option value="">{loadingLookups ? t('common.loading', 'Loading...') : t('pages.admin.trips.form.placeholders.selectConductor', 'Select a conductor')}</option>
                {conductors.map((u) => {
                  const name = u.fullName || u.name || u.email || `User`;
                  const label = `${name} (ID: ${u.id})`;
                  return <option key={u.id} value={u.id}>{label}</option>;
                })}
              </select>
              {form.formState.errors.conductorId && <p className="text-red-600 text-sm">{form.formState.errors.conductorId.message as string}</p>}
            </div>
          </div>
        </Card>

        {/* Schedule */}
        <Card className="rounded-xl border bg-emerald-50/60 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5" /> {t('pages.admin.trips.form.sections.schedule', 'Schedule')}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">{t('pages.admin.trips.form.fields.tripDate', 'Trip Date')}</label>
              <Input type="date" {...form.register('tripDate')} />
              {form.formState.errors.tripDate && <p className="text-red-600 text-sm">{form.formState.errors.tripDate.message as string}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium">{t('pages.admin.trips.form.fields.departure', 'Departure')}</label>
              <Input type="time" {...form.register('departureTimeOnly')} />
              {form.formState.errors.departureTimeOnly && <p className="text-red-600 text-sm">{form.formState.errors.departureTimeOnly.message as string}</p>}
            </div>
            <div>
                <label className="block text-sm font-medium">{t('pages.admin.trips.form.fields.arrival', 'Arrival')}</label>
              <Input type="time" {...form.register('arrivalTimeOnly')} />
              {form.formState.errors.arrivalTimeOnly && <p className="text-red-600 text-sm">{form.formState.errors.arrivalTimeOnly.message as string}</p>}
            </div>
          </div>
          </div>
        </Card>
      </div>

      {/* Route */}
      <Card className="rounded-xl border bg-white p-6">
    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Route className="w-5 h-5" /> {t('pages.admin.trips.form.sections.route', 'Route')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
      <label className="block text-sm font-medium">{t('pages.admin.trips.form.fields.startLocation', 'Start Location')}</label>
            <Input type="text" {...form.register('startLocation')} />
            {form.formState.errors.startLocation && <p className="text-red-600 text-sm">{form.formState.errors.startLocation.message as string}</p>}
          </div>
          <div>
      <label className="block text-sm font-medium">{t('pages.admin.trips.form.fields.endLocation', 'End Location')}</label>
            <Input type="text" {...form.register('endLocation')} />
            {form.formState.errors.endLocation && <p className="text-red-600 text-sm">{form.formState.errors.endLocation.message as string}</p>}
          </div>
        </div>
      </Card>

      {/* Stops */}
      <Card className="rounded-xl border bg-white p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2"><MapPin className="w-5 h-5" /> {t('pages.admin.trips.form.sections.stops', 'Stop Locations')}</h3>
          <Button type="button" variant="secondary" onClick={() => append({ address: '', arrivalTimeOnly: '', departureTimeOnly: '' })}><Plus className="w-4 h-4 mr-1" /> {t('pages.admin.trips.form.actions.addStop', 'Add Stop')}</Button>
            </div>
        {fields.length === 0 && (
          <div className="text-sm text-text-secondary">{t('pages.admin.trips.form.empty.noStops', 'No stops added yet.')}</div>
        )}
        <div className="space-y-4">
            {fields.map((field, index) => (
            <Card key={field.id} className="p-4 border bg-slate-50/60">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium">{t('pages.admin.trips.form.fields.stopAddress', 'Address')}</label>
                    <Input type="text" {...form.register(`stopLocations.${index}.address` as const)} />
                    {form.formState.errors.stopLocations?.[index]?.address && <p className="text-red-600 text-sm">{form.formState.errors.stopLocations?.[index]?.address?.message as string}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium">{t('pages.admin.trips.form.fields.stopArrival', 'Arrival')}</label>
                    <Input type="time" {...form.register(`stopLocations.${index}.arrivalTimeOnly` as const)} />
                    {form.formState.errors.stopLocations?.[index]?.arrivalTimeOnly && <p className="text-red-600 text-sm">{form.formState.errors.stopLocations?.[index]?.arrivalTimeOnly?.message as string}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium">{t('pages.admin.trips.form.fields.stopDeparture', 'Departure')}</label>
                    <Input type="time" {...form.register(`stopLocations.${index}.departureTimeOnly` as const)} />
                    {form.formState.errors.stopLocations?.[index]?.departureTimeOnly && <p className="text-red-600 text-sm">{form.formState.errors.stopLocations?.[index]?.departureTimeOnly?.message as string}</p>}
                  </div>
                  <div className="md:col-span-4 flex justify-end">
                  <Button type="button" variant="destructive" onClick={() => remove(index)}><Trash2 className="w-4 h-4 mr-1" /> {t('pages.admin.trips.form.actions.remove', 'Remove')}</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
      </Card>

          <div className="flex gap-2">
        <Button type="submit" onClick={form.handleSubmit(onSubmit as any)} className="flex items-center gap-2">
          <Save className="w-4 h-4" />
          {t('pages.admin.trips.form.actions.save', 'Save')}
        </Button>
            <Button type="button" variant="secondary" onClick={() => history.back()}>{t('common.cancel', 'Cancel')}</Button>
          </div>
    </div>
  );
}


