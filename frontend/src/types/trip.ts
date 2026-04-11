// Trip types rebuilt to strictly match backend API spec

export interface StopLocationDTO {
  id?: number;
  address: string;
  arrivalTimeOnly: string; // HH:mm
  departureTimeOnly: string; // HH:mm
}

export interface CreateTripDTO {
  busId: number;
  driverId: number;
  conductorId: number;
  startLocation: string; // max 200
  endLocation: string; // max 200
  tripDate: string; // YYYY-MM-DD
  departureTimeOnly: string; // HH:mm
  arrivalTimeOnly: string; // HH:mm
  stopLocations: StopLocationDTO[];
}

export interface TripResponse {
  id: number;
  // Optional display fields provided by TripViewModel in API
  busNumber?: string | null;
  driverName?: string | null;
  conductorName?: string | null;
  busId: number;
  driverId: number;
  conductorId: number;
  totalSeats: number;
  bookedSeats: number;
  avalableSeates: number; // note spelling from backend
  tripDate: string; // YYYY-MM-DD
  departureTimeOnly: string; // HH:mm
  arrivalTimeOnly: string; // HH:mm
  status: string; // e.g., Scheduled
  stopLocations: StopLocationDTO[] | null;
}

// Add missing types for backward compatibility
export interface UpdateTripDTO extends CreateTripDTO {
  id?: number;
}

export interface Trip extends TripResponse {
  // Additional fields if needed
  startLocation?: string;
  endLocation?: string;
}

export interface TripViewModel extends TripResponse {
  // Additional view model fields if needed
  startLocation?: string;
  endLocation?: string;
}


