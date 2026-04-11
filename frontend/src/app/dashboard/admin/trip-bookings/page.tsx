'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Plus, Edit, Trash2, X, Search, MapPin, Calendar, User, Bus } from 'lucide-react';
import { tripBookingAPI, tripAPI, studentAPI } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { 
  TripBookingViewModel, 
  CreateTripBookingDTO, 
  ChangePickupTripBookingDTO,
  TripBookingSearchDTO,
  BookingStatus 
} from '@/types/tripBooking';

export default function TripBookingsPage() {
  const [bookings, setBookings] = useState<TripBookingViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [editing, setEditing] = useState<TripBookingViewModel | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<TripBookingViewModel | null>(null);
  const [form, setForm] = useState<CreateTripBookingDTO>({
    tripId: 0,
    studentId: 0,
    pickupStopLocationId: 0,
    userSubscriptionId: 0
  });
  const [pickupForm, setPickupForm] = useState<ChangePickupTripBookingDTO>({
    pickupStopLocationId: 0
  });
  const [searchForm, setSearchForm] = useState<TripBookingSearchDTO>({});
  const [trips, setTrips] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const { showToast } = useToast();
  const [confirmState, setConfirmState] = useState<{ 
    open: boolean; 
    id?: number; 
    action?: 'delete' | 'cancel' | 'updatePickup';
    title?: string;
    description?: string;
  }>({ open: false });

  useEffect(() => { 
    loadData(); 
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load initial bookings
      const searchData: TripBookingSearchDTO = {};
      const bookingsData = await tripBookingAPI.search(searchData);
      setBookings(bookingsData || []);
      
      // Load trips and students for dropdowns
      const [tripsData, studentsData] = await Promise.all([
        tripAPI.getAll().catch(() => []),
        studentAPI.getAll().catch(() => [])
      ]);
      setTrips(tripsData || []);
      setStudents(studentsData || []);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load data';
      setError(errorMessage);
      showToast({ 
        type: 'error', 
        title: 'Load Failed', 
        message: errorMessage 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const searchData: TripBookingSearchDTO = {
        tripId: searchForm.tripId || undefined,
        studentId: searchForm.studentId || undefined,
        status: searchForm.status || undefined,
        bookingDateFrom: searchForm.bookingDateFrom || undefined,
        bookingDateTo: searchForm.bookingDateTo || undefined,
        tripDate: searchForm.tripDate || undefined,
      };
      const bookingsData = await tripBookingAPI.search(searchData);
      setBookings(bookingsData || []);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to search bookings';
      showToast({ 
        type: 'error', 
        title: 'Search Failed', 
        message: errorMessage 
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      tripId: 0,
      studentId: 0,
      pickupStopLocationId: 0,
      userSubscriptionId: 0
    });
    setShowModal(true);
  };

  const openEdit = async (booking: TripBookingViewModel) => {
    try {
      // Fetch the latest booking data by ID
      const fetchedBooking = await tripBookingAPI.getById(booking.id);
      if (fetchedBooking) {
        setEditing(fetchedBooking);
        setForm({
          tripId: fetchedBooking.tripId,
          studentId: fetchedBooking.studentId,
          pickupStopLocationId: fetchedBooking.pickupStopLocationId,
          userSubscriptionId: fetchedBooking.userSubscriptionId
        });
        setShowModal(true);
      } else {
        showToast({ 
          type: 'error', 
          title: 'Error', 
          message: 'Failed to load booking details' 
        });
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load booking details';
      showToast({ 
        type: 'error', 
        title: 'Error', 
        message: errorMessage 
      });
    }
  };

  const openPickupUpdate = (booking: TripBookingViewModel) => {
    setSelectedBooking(booking);
    setPickupForm({
      pickupStopLocationId: booking.pickupStopLocationId
    });
    setShowPickupModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        // For editing, we can only update pickup location
        const response = await tripBookingAPI.updatePickupLocation(editing.id, {
          pickupStopLocationId: form.pickupStopLocationId
        });
        if (response.success) {
          await loadData();
          showToast({ 
            type: 'success', 
            title: 'Booking Updated', 
            message: 'Pickup location updated successfully' 
          });
        } else {
          throw new Error(response.message || 'Update failed');
        }
      } else {
        // Create new booking
        const response = await tripBookingAPI.create(form);
        if (response.success) {
          await loadData();
          showToast({ 
            type: 'success', 
            title: 'Booking Created', 
            message: 'Booking created successfully' 
          });
        } else {
          throw new Error(response.message || 'Creation failed');
        }
      }
      setShowModal(false);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to save booking';
      showToast({ 
        type: 'error', 
        title: 'Save Failed', 
        message: errorMessage 
      });
    }
  };

  const updatePickupLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    
    try {
      const response = await tripBookingAPI.updatePickupLocation(selectedBooking.id, pickupForm);
      if (response.success) {
        await loadData();
        showToast({ 
          type: 'success', 
          title: 'Pickup Updated', 
          message: 'Pickup location updated successfully' 
        });
        setShowPickupModal(false);
      } else {
        throw new Error(response.message || 'Update failed');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to update pickup location';
      showToast({ 
        type: 'error', 
        title: 'Update Failed', 
        message: errorMessage 
      });
    }
  };

  const handleDelete = (id: number) => {
    setConfirmState({ 
      open: true, 
      id, 
      action: 'delete',
      title: 'Delete Booking',
      description: 'Are you sure you want to delete this booking? This action cannot be undone.'
    });
  };

  const handleCancel = (id: number) => {
    setConfirmState({ 
      open: true, 
      id, 
      action: 'cancel',
      title: 'Cancel Booking',
      description: 'Are you sure you want to cancel this booking?'
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmState.id || !confirmState.action) return;
    
    try {
      let response;
      let successMessage = '';
      
      switch (confirmState.action) {
        case 'delete':
          response = await tripBookingAPI.delete(confirmState.id);
          successMessage = 'Booking deleted successfully';
          break;
        case 'cancel':
          response = await tripBookingAPI.cancel(confirmState.id);
          successMessage = 'Booking cancelled successfully';
          break;
      }

      if (response.success) {
        await loadData();
        showToast({ 
          type: 'success', 
          title: 'Success', 
          message: successMessage 
        });
      } else {
        throw new Error(response.message || 'Action failed');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Action failed';
      showToast({ 
        type: 'error', 
        title: 'Action Failed', 
        message: errorMessage 
      });
    } finally {
      setConfirmState({ open: false });
    }
  };

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'Confirmed': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      case 'NoShow': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trip Bookings</h1>
          <p className="text-gray-600">Manage trip bookings and reservations</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Booking</Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Search/Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trip ID</label>
              <Input 
                type="number" 
                value={searchForm.tripId || ''} 
                onChange={e => setSearchForm({ ...searchForm, tripId: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Enter trip ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
              <Input 
                type="number" 
                value={searchForm.studentId || ''} 
                onChange={e => setSearchForm({ ...searchForm, studentId: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Enter student ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select 
                value={searchForm.status || ''} 
                onChange={e => setSearchForm({ ...searchForm, status: e.target.value as BookingStatus || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="NoShow">No Show</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Booking Date From</label>
              <Input 
                type="date" 
                value={searchForm.bookingDateFrom || ''} 
                onChange={e => setSearchForm({ ...searchForm, bookingDateFrom: e.target.value || undefined })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Booking Date To</label>
              <Input 
                type="date" 
                value={searchForm.bookingDateTo || ''} 
                onChange={e => setSearchForm({ ...searchForm, bookingDateTo: e.target.value || undefined })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trip Date</label>
              <Input 
                type="date" 
                value={searchForm.tripDate || ''} 
                onChange={e => setSearchForm({ ...searchForm, tripDate: e.target.value || undefined })}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleSearch}>Search</Button>
            <Button variant="outline" onClick={() => {
              setSearchForm({});
              loadData();
            }}>Clear</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
          <CardDescription>{bookings.length} booking(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Trip ID</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Pickup Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Booking Date</TableHead>
                <TableHead>Trip Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map(booking => (
                <TableRow key={booking.id}>
                  <TableCell className="font-mono text-xs">{booking.id}</TableCell>
                  <TableCell>{booking.tripId}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{booking.studentName || `Student ${booking.studentId}`}</div>
                      <div className="text-sm text-gray-500">{booking.studentEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {booking.pickupStopName || `Location ${booking.pickupStopLocationId}`}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDateTime(booking.bookingDate)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Bus className="w-4 h-4" />
                      {formatDate(booking.tripDate)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => openEdit(booking)}
                        title="Edit Booking"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => openPickupUpdate(booking)}
                        title="Update Pickup Location"
                      >
                        <MapPin className="w-4 h-4" />
                      </Button>
                      {booking.status !== 'Cancelled' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleCancel(booking.id)}
                          title="Cancel Booking"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDelete(booking.id)}
                        title="Delete Booking"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Booking Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Booking' : 'Add Booking'} size="md">
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trip ID *</label>
            <select 
              value={form.tripId} 
              onChange={e => setForm({ ...form, tripId: Number(e.target.value) })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>Select Trip</option>
              {trips.map(trip => (
                <option key={trip.id} value={trip.id}>
                  Trip {trip.id} - {trip.startLocation} to {trip.endLocation}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student ID *</label>
            <select 
              value={form.studentId} 
              onChange={e => setForm({ ...form, studentId: Number(e.target.value) })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>Select Student</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name || student.email} (ID: {student.id})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Stop Location ID *</label>
            <Input 
              type="number" 
              value={form.pickupStopLocationId} 
              onChange={e => setForm({ ...form, pickupStopLocationId: Number(e.target.value) })} 
              required
              placeholder="Enter pickup location ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User Subscription ID *</label>
            <Input 
              type="number" 
              value={form.userSubscriptionId} 
              onChange={e => setForm({ ...form, userSubscriptionId: Number(e.target.value) })} 
              required
              placeholder="Enter subscription ID"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editing ? 'Update Booking' : 'Create Booking'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Update Pickup Location Modal */}
      <Modal isOpen={showPickupModal} onClose={() => setShowPickupModal(false)} title="Update Pickup Location" size="sm">
        <form onSubmit={updatePickupLocation} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Pickup Stop Location ID *</label>
            <Input 
              type="number" 
              value={pickupForm.pickupStopLocationId || ''} 
              onChange={e => setPickupForm({ ...pickupForm, pickupStopLocationId: Number(e.target.value) })} 
              required
              placeholder="Enter new pickup location ID"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowPickupModal(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Update Pickup Location
            </Button>
          </div>
        </form>
      </Modal>
      
      <ConfirmDialog 
        open={confirmState.open} 
        onCancel={() => setConfirmState({ open: false })} 
        onConfirm={handleConfirmAction} 
        title={confirmState.title || 'Confirm Action'}
        description={confirmState.description || 'Are you sure?'}
      />
    </div>
  );
}
