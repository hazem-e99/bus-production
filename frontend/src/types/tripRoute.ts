export interface TripRoute {
  id: number;
  name: string;
  startLocation: string;
  endLocation: string;
  distance: number;
  estimatedTime: string;
  estimatedTimeFormatted?: string;
  stopLocationsCount?: number;
  tripsCount?: number;
  createdAt?: string;
  updatedAt?: string;
  stopLocations?: string[];
}

export interface TripRouteFilterDTO {
  page: number;
  pageSize: number;
  name: string | null | '';
  startLocation: string | null | '';
  endLocation: string | null | '';
  minDistance: number | null | 0;
  maxDistance: number | null | 0;
  minEstimatedMinutes: number | null | 0;
  maxEstimatedMinutes: number | null | 0;
}

export interface CreateTripRouteDTO {
  name: string;
  startLocation: string;
  endLocation: string;
  distance: number;
  estimatedTime: string;
  stopLocations?: string[] | null;
}

export interface UpdateTripRouteDTO {
  name?: string | null;
  startLocation?: string | null;
  endLocation?: string | null;
  distance?: number | null;
  estimatedTime?: string | null;
}

