// TripBooking Types based on Swagger Schema

export type BookingStatus = 'Confirmed' | 'Cancelled' | 'NoShow' | 'Completed';

export interface TripBookingViewModel {
  id: number;
  tripId: number;
  studentId: number;
  studentName: string | null;
  studentEmail: string | null;
  pickupStopLocationId: number;
  pickupStopName: string | null;
  userSubscriptionId: number;
  status: BookingStatus;
  bookingDate: string; // date-time
  cancellationDate: string | null; // date-time
  tripDate: string; // date
  departureTime: string; // time
  arrivalTime: string; // time
}

export interface CreateTripBookingDTO {
  tripId: number;
  studentId: number;
  pickupStopLocationId: number;
  userSubscriptionId: number;
}

export interface ChangePickupTripBookingDTO {
  pickupStopLocationId?: number | null;
}

export interface TripBookingSearchDTO {
  tripId?: number | null;
  studentId?: number | null;
  status?: BookingStatus | null;
  bookingDateFrom?: string | null; // date
  bookingDateTo?: string | null; // date
  tripDate?: string | null; // date
}

// API Response Types
export interface TripBookingViewModelApiResponse {
  data: TripBookingViewModel;
  count?: number | null;
  message?: string | null;
  success: boolean;
  timestamp: string;
  errorCode?: any;
  requestId?: string | null;
}

export interface TripBookingViewModelIEnumerableApiResponse {
  data: TripBookingViewModel[] | null;
  count?: number | null;
  message?: string | null;
  success: boolean;
  timestamp: string;
  errorCode?: any;
  requestId?: string | null;
}

export interface BooleanApiResponse {
  data: boolean;
  count?: number | null;
  message?: string | null;
  success: boolean;
  timestamp: string;
  errorCode?: any;
  requestId?: string | null;
}
