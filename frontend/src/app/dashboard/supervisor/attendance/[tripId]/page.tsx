'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { attendanceAPI, bookingAPI, notificationAPI, tripAPI, userAPI } from '@/lib/api';
import { NotificationType } from '@/types/notification';
import { MapPin, Clock, Users, XCircle, CheckCircle } from 'lucide-react';

interface TripWithStops {
	id: string;
	date: string;
	startTime?: string;
	endTime?: string;
	routeId: string;
	busId: string;
	driverId: string;
	supervisorId?: string;
	stops?: { id: string; stopName: string; stopTime: string }[];
	status: string;
}

interface Student {
	id: string;
	name: string;
	email: string;
	role: string;
}

interface Booking {
	id: string;
	studentId: string;
	tripId: string;
	stopId: string;
	status: string;
	date: string;
	createdAt: string;
	updatedAt: string;
}

interface Attendance {
	id: string;
	studentId: string;
	tripId: string;
	status: 'present' | 'absent' | 'late';
	timestamp: string;
	createdAt: string;
	updatedAt: string;
}

interface TableRow {
	id: string;
	studentId: string;
	studentName: string;
	studentEmail: string;
	stopId: string;
	stopName: string;
	stopTime: string;
	bookingStatus: string;
	attendanceStatus: 'present' | 'absent' | 'late' | null;
}

export default function TripAttendancePage() {
	const params = useParams();
	const tripId = (params?.tripId as string) || '';
	const { user } = useAuth();
	const { showToast } = useToast();
	const [trip, setTrip] = useState<TripWithStops | null>(null);
	const [students, setStudents] = useState<Student[]>([]);
	const [bookings, setBookings] = useState<Booking[]>([]);
	const [attendances, setAttendances] = useState<Attendance[]>([]);
	const [stopFilter, setStopFilter] = useState<string>('all');
	const [search, setSearch] = useState<string>('');
	const [loading, setLoading] = useState(true);
	const [attendanceByBooking, setAttendanceByBooking] = useState<Record<string, 'present' | 'absent' | 'late'>>({});

	useEffect(() => {
		const load = async () => {
			if (!tripId) return;
			try {
				setLoading(true);
				const [t, bks, allStudents, atts] = await Promise.all([
					tripAPI.getById(tripId),
					bookingAPI.getByTrip(tripId),
					userAPI.getByRole('student'),
					attendanceAPI.getByTrip(tripId)
				]);
				
				// Transform trip data to match TripWithStops interface
				const tripData = t as any;
				const transformedTrip: TripWithStops = {
					id: tripData.id,
					date: tripData.date || new Date().toISOString().split('T')[0],
					startTime: tripData.startTime,
					endTime: tripData.endTime,
					routeId: tripData.routeId || '',
					busId: tripData.busId || '',
					driverId: tripData.driverId || '',
					supervisorId: tripData.supervisorId,
					stops: tripData.stops || [],
					status: tripData.status || 'active'
				};
				
				setTrip(transformedTrip);
				setBookings(Array.isArray(bks) ? bks as Booking[] : []);
				setStudents(Array.isArray(allStudents) ? allStudents as Student[] : []);
				setAttendances(Array.isArray(atts) ? atts as Attendance[] : []);
			} catch (error) {
				console.error('Failed to load data:', error);
				setTrip(null);
				setBookings([]);
				setStudents([]);
				setAttendances([]);
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [tripId]);

	// Build attendance map from saved records whenever records or bookings change
	useEffect(() => {
		if (!Array.isArray(attendances) || attendances.length === 0 || bookings.length === 0) return;
		// Choose latest record per student for this trip by timestamp
		const latestByStudent = new Map<string, Attendance>();
		for (const rec of attendances) {
			if (rec.tripId !== tripId) continue;
			const prev = latestByStudent.get(rec.studentId);
			if (!prev || new Date(rec.timestamp).getTime() > new Date(prev.timestamp).getTime()) {
				latestByStudent.set(rec.studentId, rec);
			}
		}
		const map: Record<string, 'present' | 'absent' | 'late'> = {};
		for (const bk of bookings) {
			const rec = latestByStudent.get(bk.studentId);
			if (rec && (rec.status === 'present' || rec.status === 'absent' || rec.status === 'late')) {
				map[bk.id] = rec.status;
			}
		}
		setAttendanceByBooking(map);
	}, [attendances, bookings, tripId]);

	const stopOptions = useMemo(() => {
		const options = [{ value: 'all', label: 'All stops' }];
		(trip?.stops || []).forEach(s => options.push({ value: s.id, label: `${s.stopName} ${s.stopTime ? `(${s.stopTime})` : ''}` }));
		return options;
	}, [trip?.stops]);

	const rows = useMemo(() => {
		const list = bookings
			.map(bk => {
				const student = students.find(s => s.id === bk.studentId);
				const stop = (trip?.stops || []).find(s => s.id === bk.stopId);
				return {
					id: bk.id,
					studentId: bk.studentId,
					studentName: student?.name || bk.studentId,
					studentEmail: student?.email || '',
					stopId: bk.stopId,
					stopName: stop?.stopName || '-',
					stopTime: stop?.stopTime || '-',
					bookingStatus: bk.status || 'confirmed',
					attendanceStatus: attendanceByBooking[bk.id] || null,
				};
			})
			.filter(r => (stopFilter === 'all' || r.stopId === stopFilter) && (search === '' || r.studentName.toLowerCase().includes(search.toLowerCase()) || r.studentEmail.toLowerCase().includes(search.toLowerCase())));
		return list;
	}, [bookings, students, trip?.stops, stopFilter, search, attendanceByBooking]);

	const refreshAttendance = async () => {
		try { 
			const atts = await attendanceAPI.getByTrip(tripId); 
			setAttendances(Array.isArray(atts) ? atts as Attendance[] : []); 
		} catch (error) {
			console.error('Failed to refresh attendance:', error);
		}
	};

	const markPresent = async (row: { studentId: string; id: string; studentName: string }) => {
		try {
			await attendanceAPI.create({ studentId: row.studentId, tripId, status: 'present', timestamp: new Date().toISOString() });
			setAttendanceByBooking(prev => ({ ...prev, [row.id]: 'present' }));
			showToast({ type: 'success', title: 'Marked present', message: `${row.studentName} marked present.` });
			refreshAttendance();
		} catch (error) {
			console.error('Failed to mark present:', error);
			showToast({ type: 'error', title: 'Failed', message: 'Could not mark present.' });
		}
	};

	const markAbsent = async (row: { studentId: string; id: string; studentName: string }) => {
		try {
			await attendanceAPI.create({ studentId: row.studentId, tripId, status: 'absent', timestamp: new Date().toISOString() });
			await bookingAPI.update(row.id, { status: 'cancelled' });
			await notificationAPI.create({ userId: parseInt(row.studentId), type: NotificationType.Alert, title: 'غياب عن الرحلة', message: `تم تسجيلك غائبًا عن الرحلة ${tripId} بتاريخ ${trip?.date}. تم إلغاء حجزك.` });
			setAttendanceByBooking(prev => ({ ...prev, [row.id]: 'absent' }));
			setBookings(prev => prev.map(b => b.id === row.id ? { ...b, status: 'cancelled' } : b));
			showToast({ type: 'success', title: 'Marked absent', message: `${row.studentName} marked absent and booking cancelled.` });
			refreshAttendance();
		} catch (error) {
			console.error('Failed to mark absent:', error);
			showToast({ type: 'error', title: 'Failed', message: 'Could not mark absent.' });
		}
	};

	if (loading) {
		return (
			<div className="p-6">Loading...</div>
		);
	}

	return (
		<div className="space-y-6 p-6">
			<div className="flex items-center justify_between">
				<div>
					<h1 className="text-2xl font-bold">Trip Attendance</h1>
					<p className="text-sm text-[#757575]">Trip {trip?.id} • {trip?.date} • {trip?.startTime} - {trip?.endTime}</p>
				</div>
			</div>

			<Card className="bg-white border-[#E0E0E0]">
				<CardHeader>
					<CardTitle className="text-[#212121]">Filters</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<Input placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)} />
						<Select value={stopFilter} onChange={e => setStopFilter(e.target.value)} options={stopOptions} />
						<div className="flex items-center text-sm text-[#757575]"><Users className="w-4 h-4 mr-2" /> {rows.length} record(s)</div>
					</div>
				</CardContent>
			</Card>

			<Card className="bg-white border-[#E0E0E0]">
				<CardHeader>
					<CardTitle>Students</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Student</TableHead>
								<TableHead>Stop</TableHead>
								<TableHead>Time</TableHead>
								<TableHead>Attendance</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map(r => (
								<TableRow key={r.id}>
									<TableCell>
										<div className="font-medium">{r.studentName}</div>
										<div className="text-xs text-[#757575]">{r.studentEmail}</div>
									</TableCell>
									<TableCell className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />{r.stopName}</TableCell>
									<TableCell className="text-sm"><Clock className="w-4 h-4 inline mr-1" />{r.stopTime}</TableCell>
									<TableCell>
										{r.attendanceStatus === 'present' && <Badge className="bg-green-100 text-green-800">Present</Badge>}
										{r.attendanceStatus === 'absent' && <Badge className="bg-red-100 text-red-800">Absent</Badge>}
										{!r.attendanceStatus && <Badge className="bg-slate-100 text-slate-700">—</Badge>}
									</TableCell>
									<TableCell className="space-x-2">
										<Button size="sm" onClick={() => markPresent(r)} className="bg-green-600 hover:bg-green-700 text-white"><CheckCircle className="w-4 h-4 mr-1" /> Present</Button>
										<Button size="sm" variant="destructive" onClick={() => markAbsent(r)}><XCircle className="w-4 h-4 mr-1" /> Absent</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
