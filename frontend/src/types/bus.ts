export interface Location {
  lat: number;
  lng: number;
}

export interface Bus {
  id: number;
  busNumber: string;
  speed: number;
  capacity: number;
  status: 'Active' | 'Inactive' | 'UnderMaintenance' | 'OutOfService';
  fuelLevel?: number;
  location?: Location;
  updatedAt?: string;
}

// API Response Schema
export interface BusApiResponse<T> {
  data: T;
  count: number;
  message: string;
  success: boolean;
  timestamp: string;
  errorCode: string;
  requestId: string;
}

// Bus Request Body for POST/PUT
export interface BusRequest {
  busNumber: string;
  speed: number;
  capacity: number;
  status: 'Active' | 'Inactive' | 'UnderMaintenance' | 'OutOfService';
}

// Bus list filters & pagination (used by GET /Buses)
export interface BusListParams {
  page: number;
  pageSize: number;
  busNumber: string;
  status: 'Active' | 'Inactive' | 'UnderMaintenance' | 'OutOfService' | '';
  minSpeed: number;
  maxSpeed: number;
  minCapacity: number;
  maxCapacity: number;
}
