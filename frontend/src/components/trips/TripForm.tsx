"use client";

import { useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useI18n } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { api, busAPI } from '@/lib/api';
import { tripService } from '@/lib/tripService';
import type { CreateTripDTO, TripResponse } from '@/types/trip';
import { BusFront, Calendar, MapPin, Plus, Trash2, User as UserIcon } from 'lucide-react';

type Mode = 'create' | 'edit';

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

interface Bus { id?: number; busId?: number; busNumber?: string }

interface ApiResponse<T> { data: T }

interface TripFormProps {
	mode: Mode;
	initial?: Partial<CreateTripDTO> & { id?: number } | null;
	onCancel: () => void;
	onSuccess: (trip: TripResponse) => void;
}

export default function TripForm({ mode, initial, onCancel, onSuccess }: TripFormProps) {
		const { t } = useI18n();
		const { showToast } = useToast();

	// Build schema with localized messages
	const stopSchema = useMemo(() => z.object({
		address: z.string().min(1, t('pages.admin.trips.form.errors.requiredAddress', 'Address is required')).max(300, t('pages.admin.trips.form.errors.maxChars', 'Max 300 characters')),
		arrivalTimeOnly: z.string().min(1, t('pages.admin.trips.form.errors.requiredArrival', 'Arrival time is required')),
		departureTimeOnly: z.string().min(1, t('pages.admin.trips.form.errors.requiredDeparture', 'Departure time is required')),
	}), [t]);

	const createTripSchema = useMemo(() => z.object({
		busId: z.string().min(1, t('pages.admin.trips.form.errors.requiredBus', 'Bus is required')),
		driverId: z.string().min(1, t('pages.admin.trips.form.errors.requiredDriver', 'Driver is required')),
		conductorId: z.string().min(1, t('pages.admin.trips.form.errors.requiredConductor', 'Conductor is required')),
		startLocation: z.string().min(1, t('pages.admin.trips.form.errors.requiredStart', 'Start location is required')).max(200, t('pages.admin.trips.form.errors.max200', 'Must be at most 200 characters')),
		endLocation: z.string().min(1, t('pages.admin.trips.form.errors.requiredEnd', 'End location is required')).max(200, t('pages.admin.trips.form.errors.max200', 'Must be at most 200 characters')),
		tripDate: z.string().min(1, t('pages.admin.trips.form.errors.requiredDate', 'Trip date is required')),
		departureTimeOnly: z.string().min(1, t('pages.admin.trips.form.errors.requiredDeparture', 'Departure time is required')),
		arrivalTimeOnly: z.string().min(1, t('pages.admin.trips.form.errors.requiredArrival', 'Arrival time is required')),
		stopLocations: z.array(stopSchema),
	}), [stopSchema, t]);

	type CreateTripForm = z.infer<typeof createTripSchema>;

	const form = useForm<CreateTripForm>({
		resolver: zodResolver(createTripSchema),
		defaultValues: {
			busId: initial?.busId != null ? String(initial?.busId) : '',
			driverId: initial?.driverId != null ? String(initial?.driverId) : '',
			conductorId: initial?.conductorId != null ? String(initial?.conductorId) : '',
			startLocation: initial?.startLocation || '',
			endLocation: initial?.endLocation || '',
			tripDate: initial?.tripDate || '',
			departureTimeOnly: initial?.departureTimeOnly || '',
			arrivalTimeOnly: initial?.arrivalTimeOnly || '',
			stopLocations: initial?.stopLocations?.map(s => ({
				address: s.address,
				arrivalTimeOnly: s.arrivalTimeOnly,
				departureTimeOnly: s.departureTimeOnly,
			})) || [],
		},
	});

	const { fields, append, remove } = useFieldArray({ control: form.control, name: 'stopLocations' });

	const [loadingLookups, setLoadingLookups] = useState(true);
	const [buses, setBuses] = useState<Array<{ id: number; label: string }>>([]);
	const [drivers, setDrivers] = useState<Array<{ id: number; name: string }>>([]);
	const [conductors, setConductors] = useState<Array<{ id: number; name: string }>>([]);

	useEffect(() => {
		(async () => {
			try {
				setLoadingLookups(true);
				const [usersRes, busesRes] = await Promise.all([
					api.get<ApiResponse<User[]>>('/Users'),
					busAPI.getAll(),
				]);
				// Users
				const users = Array.isArray((usersRes as ApiResponse<User[]>)?.data)
					? (usersRes as ApiResponse<User[]>)?.data
					: (Array.isArray(usersRes) ? (usersRes as unknown as User[]) : []);
				const toNum = (u: User) => Number(u?.id ?? u?.userId);
				const toName = (u: User) => (u?.fullName || `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || u?.name || u?.email || 'User');
				const role = (u: User) => String(u?.role || '').toLowerCase();
				const driverList = users
					.filter((u) => role(u) === 'driver')
					.map((u) => ({ id: toNum(u), name: `${toName(u)} (#${toNum(u)})` }))
					.filter((d) => Number.isFinite(d.id) && d.id > 0);
				const conductorList = users
					.filter((u) => role(u) === 'conductor')
					.map((u) => ({ id: toNum(u), name: `${toName(u)} (#${toNum(u)})` }))
					.filter((d) => Number.isFinite(d.id) && d.id > 0);
				setDrivers(driverList);
				setConductors(conductorList);

				// Buses
				const busesList = (busesRes as ApiResponse<Bus[]>)?.data ?? [];
				const busOpts = (Array.isArray(busesList) ? busesList : []).map((b: Bus) => {
					const id = Number(b?.id ?? b?.busId);
					const label = b?.busNumber ? `${b.busNumber} (#${id})` : `#${id}`;
					return { id, label };
				}).filter(b => Number.isFinite(b.id) && b.id > 0);
				setBuses(busOpts);
					} catch {
						// silent, form rendering still possible
			} finally {
				setLoadingLookups(false);
			}
		})();
	}, []);

	const onSubmit = async (values: CreateTripForm) => {
		try {
			// Validate selection IDs against loaded lists
			if (!buses.find(b => Number(b.id) === Number(values.busId))) {
				throw new Error(t('pages.admin.trips.form.errors.invalidBus', 'Selected bus is invalid'));
			}
			if (!drivers.find(u => Number(u.id) === Number(values.driverId))) {
				throw new Error(t('pages.admin.trips.form.errors.invalidDriver', 'Selected driver is invalid'));
			}
			if (!conductors.find(u => Number(u.id) === Number(values.conductorId))) {
				throw new Error(t('pages.admin.trips.form.errors.invalidConductor', 'Selected conductor is invalid'));
			}
			if (Number(values.driverId) === Number(values.conductorId)) {
				throw new Error(t('pages.admin.trips.form.errors.sameDriverConductor', 'Driver and Conductor must be different users'));
			}

			const payload: CreateTripDTO = {
				busId: Number(values.busId),
				driverId: Number(values.driverId),
				conductorId: Number(values.conductorId),
				startLocation: values.startLocation,
				endLocation: values.endLocation,
				tripDate: values.tripDate,
				departureTimeOnly: values.departureTimeOnly,
				arrivalTimeOnly: values.arrivalTimeOnly,
				stopLocations: values.stopLocations.map(s => ({
					address: s.address,
					arrivalTimeOnly: s.arrivalTimeOnly,
					departureTimeOnly: s.departureTimeOnly,
				})),
			};

			let result: TripResponse;
					if (mode === 'create') {
						result = await tripService.create(payload);
						showToast({ type: 'success', title: t('pages.admin.trips.toasts.createdTitle', 'Trip Created'), message: t('pages.admin.trips.toasts.createdMsg', 'Trip has been created successfully') });
					} else {
						// edit mode not wired with update here as page does not support it yet; fallback create
						result = await tripService.create(payload);
						showToast({ type: 'success', title: t('pages.admin.trips.toasts.savedTitle', 'Trip Saved'), message: t('pages.admin.trips.toasts.savedMsg', 'Trip details saved successfully') });
					}
			onSuccess(result);
				} catch (e: unknown) {
					const msg = e instanceof Error ? e.message : String(e);
					showToast({ type: 'error', title: t('pages.admin.trips.toasts.errorTitle', 'Error'), message: msg });
		}
	};

	return (
		<div className="space-y-6">
			{/* Hero/summary */}
			<div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 shadow-sm">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-2xl font-bold text-text-primary tracking-tight">
							{mode === 'create' ? t('pages.admin.trips.form.titleCreate', 'Create Trip') : t('pages.admin.trips.form.titleEdit', 'Edit Trip')}
						</h2>
						<p className="text-text-secondary mt-1">{t('pages.admin.trips.form.subtitle', 'Plan route, assign bus and staff, and set schedule')}</p>
					</div>
				</div>
				<div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
					<div className="rounded-xl border bg-white/70 backdrop-blur p-4 flex items-center gap-3">
						<BusFront className="w-5 h-5 text-indigo-600" />
						<div>
							<p className="text-sm text-text-secondary">{t('pages.admin.trips.form.stats.busesLoaded', 'Buses Loaded')}</p>
							<p className="font-semibold">{loadingLookups ? '—' : buses.length}</p>
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

			{/* Assignment + Schedule */}
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
					<Card className="xl:col-span-2 rounded-xl border bg-sky-50/60 p-6">
						<h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><BusFront className="w-5 h-5" /> {t('pages.admin.trips.form.sections.assignment', 'Assignment')}</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium">{t('pages.admin.trips.form.fields.bus', 'Bus')}</label>
								<select {...form.register('busId')} className="mt-1 w-full border rounded px-3 py-2 bg-white">
									<option value="">{loadingLookups ? t('common.loading', 'Loading...') : t('pages.admin.trips.form.placeholders.selectBus', 'Select a bus')}</option>
									{buses.map(b => (
										<option key={b.id} value={String(b.id)}>{b.label}</option>
									))}
								</select>
								{form.formState.errors.busId && <p className="text-red-600 text-sm">{String(form.formState.errors.busId.message)}</p>}
							</div>
							<div>
								<label className="block text-sm font-medium">{t('pages.admin.trips.form.fields.driver', 'Driver')}</label>
								<select {...form.register('driverId')} className="mt-1 w-full border rounded px-3 py-2 bg-white">
									<option value="">{loadingLookups ? t('common.loading', 'Loading...') : t('pages.admin.trips.form.placeholders.selectDriver', 'Select a driver')}</option>
									{drivers.map(u => (
										<option key={u.id} value={String(u.id)}>{u.name}</option>
									))}
								</select>
								{form.formState.errors.driverId && <p className="text-red-600 text-sm">{String(form.formState.errors.driverId.message)}</p>}
							</div>
							<div>
								<label className="block text-sm font-medium">{t('pages.admin.trips.form.fields.conductor', 'Conductor')}</label>
								<select {...form.register('conductorId')} className="mt-1 w-full border rounded px-3 py-2 bg-white">
									<option value="">{loadingLookups ? t('common.loading', 'Loading...') : t('pages.admin.trips.form.placeholders.selectConductor', 'Select a conductor')}</option>
									{conductors.map(u => (
										<option key={u.id} value={String(u.id)}>{u.name}</option>
									))}
								</select>
								{form.formState.errors.conductorId && <p className="text-red-600 text-sm">{String(form.formState.errors.conductorId.message)}</p>}
							</div>
						</div>
					</Card>

					<Card className="rounded-xl border bg-emerald-50/60 p-6">
						<h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5" /> {t('pages.admin.trips.form.sections.schedule', 'Schedule')}</h3>
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium">{t('pages.admin.trips.form.fields.tripDate', 'Trip Date')}</label>
								<Input type="date" {...form.register('tripDate')} />
								{form.formState.errors.tripDate && <p className="text-red-600 text-sm">{String(form.formState.errors.tripDate.message)}</p>}
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium">{t('pages.admin.trips.form.fields.departure', 'Departure')}</label>
									<Input type="time" {...form.register('departureTimeOnly')} />
									{form.formState.errors.departureTimeOnly && <p className="text-red-600 text-sm">{String(form.formState.errors.departureTimeOnly.message)}</p>}
								</div>
								<div>
									<label className="block text-sm font-medium">{t('pages.admin.trips.form.fields.arrival', 'Arrival')}</label>
									<Input type="time" {...form.register('arrivalTimeOnly')} />
									{form.formState.errors.arrivalTimeOnly && <p className="text-red-600 text-sm">{String(form.formState.errors.arrivalTimeOnly.message)}</p>}
								</div>
							</div>
						</div>
					</Card>
				</div>

				{/* Route */}
				<Card className="rounded-xl border bg-white p-6">
					<h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><MapPin className="w-5 h-5" /> {t('pages.admin.trips.form.sections.route', 'Route')}</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium">{t('pages.admin.trips.form.fields.startLocation', 'Start Location')}</label>
							<Input type="text" {...form.register('startLocation')} />
							{form.formState.errors.startLocation && <p className="text-red-600 text-sm">{String(form.formState.errors.startLocation.message)}</p>}
						</div>
						<div>
							<label className="block text-sm font-medium">{t('pages.admin.trips.form.fields.endLocation', 'End Location')}</label>
							<Input type="text" {...form.register('endLocation')} />
							{form.formState.errors.endLocation && <p className="text-red-600 text-sm">{String(form.formState.errors.endLocation.message)}</p>}
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
										{form.formState.errors.stopLocations?.[index]?.address && <p className="text-red-600 text-sm">{String(form.formState.errors.stopLocations?.[index]?.address?.message)}</p>}
									</div>
									<div>
										<label className="block text-sm font-medium">{t('pages.admin.trips.form.fields.stopArrival', 'Arrival')}</label>
										<Input type="time" {...form.register(`stopLocations.${index}.arrivalTimeOnly` as const)} />
										{form.formState.errors.stopLocations?.[index]?.arrivalTimeOnly && <p className="text-red-600 text-sm">{String(form.formState.errors.stopLocations?.[index]?.arrivalTimeOnly?.message)}</p>}
									</div>
									<div>
										<label className="block text-sm font-medium">{t('pages.admin.trips.form.fields.stopDeparture', 'Departure')}</label>
										<Input type="time" {...form.register(`stopLocations.${index}.departureTimeOnly` as const)} />
										{form.formState.errors.stopLocations?.[index]?.departureTimeOnly && <p className="text-red-600 text-sm">{String(form.formState.errors.stopLocations?.[index]?.departureTimeOnly?.message)}</p>}
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
					<Button type="submit">{mode === 'create' ? t('pages.admin.trips.form.actions.create', 'Create Trip') : t('pages.admin.trips.form.actions.save', 'Save')}</Button>
					<Button type="button" variant="secondary" onClick={onCancel}>{t('common.cancel', 'Cancel')}</Button>
				</div>
			</form>
		</div>
	);
}



