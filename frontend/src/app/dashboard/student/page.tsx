'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { paymentAPI, bookingAPI, notificationAPI, tripAPI, subscriptionPlansAPI } from '@/lib/api';
import { Calendar, MapPin, Clock, Users, Bell, TrendingUp, Bus, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';

// Define proper types for the data
interface StudentProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  year: number;
  studentId: string;
  avatar?: string | null;
  createdAt: string;
  updatedAt: string;
  subscriptionStatus?: string;
  subscriptionPlan?: any;
  paymentMethod?: string;
}

interface Payment {
  id: string;
  studentId: string;
  tripId?: string;
  amount: number;
  method: 'bank' | 'cash';
  status: 'pending' | 'completed' | 'failed';
  description: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

interface Booking {
  id: string;
  tripId: string;
  studentId: string;
  stopId: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  date: string;
  createdAt: string;
  updatedAt: string;
}

interface Notification {
  id: string;
  userId: string;
  senderId?: string;
  type: string;
  priority: 'low' | 'medium' | 'high';
  status: 'unread' | 'read';
  read: boolean;
  title: string;
  message: string;
  busId?: string;
  tripId?: string;
  stopId?: string;
  stopName?: string;
  stopTime?: string;
  actionUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface Trip {
  id: string;
  startLocation: string;
  endLocation: string;
  startTime: string;
  endTime: string;
}

interface Plan {
  id: string;
  name: string;
  description?: string;
  price: number;
  type?: string;
  maxNumberOfRides?: number;
  durationInDays?: number;
  isActive?: boolean;
}

export default function StudentDashboard() {
	const { user } = useAuth();
	const router = useRouter();

	// Temporary redirect: make book-trip the landing page for students
	useEffect(() => {
		router.replace('/dashboard/student/book-trip');
	}, [router]);

	return null;
	const { showToast } = useToast();
	const [isLoading, setIsLoading] = useState(true);
	const [stats, setStats] = useState<any>({});
	const [latestBooking, setLatestBooking] = useState<Booking | null>(null);
	const [latestTrip, setLatestTrip] = useState<Trip | null>(null);
	const [currentPlanName, setCurrentPlanName] = useState<string | null>(null);
	const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
	const [activeBookingsCount, setActiveBookingsCount] = useState<number>(0);
	const [plans, setPlans] = useState<Plan[]>([]);

	// Fetch student dashboard data
	useEffect(() => {
		const fetchStudentData = async () => {
			if (!user) return;
			try {
				setIsLoading(true);
				setStats({});
				
				try {
					const [paymentsRes, plansData, bookingsRes, notifRes] = await Promise.all([
						paymentAPI.getByStudent(user.id.toString()),
						subscriptionPlansAPI.getAll().catch(() => []),
						bookingAPI.getByStudent(user.id.toString()),
						notificationAPI.getAll()
					]);
					const payments = paymentsRes as unknown as Payment[];
					setPlans(plansData as Plan[] || []);
					const bookings = bookingsRes as Booking[];
					const notifications = (notifRes as any)?.data || [];

					// determine current plan name (if any)
					const lastSubPayment = (Array.isArray(payments) ? payments : []).filter((x: Payment) => !x.tripId)
						.sort((a: Payment, b: Payment) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
					const planFromPayment = lastSubPayment?.description ? String(lastSubPayment.description).replace(/^Subscription\s+/i, '') : '';
					const resolvedPlan = planFromPayment || null;
					setCurrentPlanName(resolvedPlan);

					// latest booking + trip
					const latest = (Array.isArray(bookings) ? bookings : [])
						.filter((b: Booking) => b && b.date)
						.sort((a: Booking, b: Booking) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
					setLatestBooking(latest || null);
					if (latest?.tripId) {
						try {
							const tRes = await tripAPI.getById(latest.tripId);
							const trip = tRes as any;
							setLatestTrip({
								id: trip.id,
								startLocation: trip.startLocation || '',
								endLocation: trip.endLocation || '',
								startTime: trip.startTime || '',
								endTime: trip.endTime || ''
							});
						} catch {}
					} else {
						setLatestTrip(null);
					}

					// quick stats
					setActiveBookingsCount((Array.isArray(bookings) ? bookings : []).filter((b: Booking) => b.status === 'confirmed').length);
					setUnreadNotifications((Array.isArray(notifications) ? notifications : []).filter((n: Notification) => n.read !== true && n.status !== 'read').length);
				} catch {}
			} catch (error) {
				console.error('Failed to fetch student data:', error);
				showToast({ type: 'error', title: 'Error!', message: 'Failed to load dashboard data. Please try again.' });
			} finally {
				setIsLoading(false);
			}
		};
		fetchStudentData();
	}, [user, showToast]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
			</div>
		);
	}

	return (
		<div className="space-y-8 p-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-text-primary">مرحباً {user?.name || 'Student'}!</h1>
					<p className="text-text-secondary mt-2">مرحباً بك في لوحة تحكم الطالب</p>
				</div>
				<div className="flex items-center gap-4">
					{currentPlanName && (
						<Badge variant="secondary" className="flex items-center gap-2">
							<CreditCard className="w-4 h-4" />
							{currentPlanName}
						</Badge>
					)}
					<Badge variant="outline" className="flex items-center gap-2">
						<Users className="w-4 h-4" />
						Student
					</Badge>
				</div>
			</div>

			{/* Quick Stats */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
				>
					<Card className="hover:shadow-lg transition-shadow">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">الحجوزات النشطة</CardTitle>
							<Calendar className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{activeBookingsCount}</div>
							<p className="text-xs text-muted-foreground">حجوزات مؤكدة</p>
						</CardContent>
					</Card>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.1 }}
				>
					<Card className="hover:shadow-lg transition-shadow">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">الإشعارات الجديدة</CardTitle>
							<Bell className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{unreadNotifications}</div>
							<p className="text-xs text-muted-foreground">إشعارات غير مقروءة</p>
						</CardContent>
					</Card>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.2 }}
				>
					<Card className="hover:shadow-lg transition-shadow">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">الرحلات المتاحة</CardTitle>
							<Bus className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">∞</div>
							<p className="text-xs text-muted-foreground">جميع الرحلات متاحة</p>
						</CardContent>
					</Card>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.3 }}
				>
					<Card className="hover:shadow-lg transition-shadow">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">الحالة</CardTitle>
							<TrendingUp className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-green-600">نشط</div>
							<p className="text-xs text-muted-foreground">يمكنك الوصول لجميع الميزات</p>
						</CardContent>
					</Card>
				</motion.div>
			</div>

			{/* Latest Booking */}
			{latestBooking && latestTrip && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.4 }}
				>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Calendar className="w-5 h-5" />
								آخر حجز
							</CardTitle>
							<CardDescription>تفاصيل آخر رحلة حجزتها</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<div className="flex items-center gap-2">
										<MapPin className="w-4 h-4 text-muted-foreground" />
										<span className="text-sm">
											<strong>من:</strong> {latestTrip.startLocation}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<MapPin className="w-4 h-4 text-muted-foreground" />
										<span className="text-sm">
											<strong>إلى:</strong> {latestTrip.endLocation}
										</span>
									</div>
								</div>
								<div className="space-y-2">
									<div className="flex items-center gap-2">
										<Clock className="w-4 h-4 text-muted-foreground" />
										<span className="text-sm">
											<strong>وقت الانطلاق:</strong> {latestTrip.startTime}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<Clock className="w-4 h-4 text-muted-foreground" />
										<span className="text-sm">
											<strong>وقت الوصول:</strong> {latestTrip.endTime}
										</span>
									</div>
								</div>
							</div>
							<div className="mt-4 flex gap-2">
								<Button variant="outline" size="sm">
									عرض التفاصيل
								</Button>
								<Button size="sm">
									حجز رحلة جديدة
								</Button>
							</div>
						</CardContent>
					</Card>
				</motion.div>
			)}

			{/* Quick Actions */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.5 }}
			>
				<Card>
					<CardHeader>
						<CardTitle>إجراءات سريعة</CardTitle>
						<CardDescription>الوصول السريع للميزات المهمة</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<Button variant="outline" className="h-20 flex flex-col gap-2">
								<Calendar className="w-6 h-6" />
								<span>حجز رحلة</span>
							</Button>
							<Button variant="outline" className="h-20 flex flex-col gap-2">
								<Bell className="w-6 h-6" />
								<span>الإشعارات</span>
							</Button>
							<Button variant="outline" className="h-20 flex flex-col gap-2">
								<CreditCard className="w-6 h-6" />
								<span>الاشتراكات</span>
							</Button>
						</div>
					</CardContent>
				</Card>
			</motion.div>
		</div>
	);
}
