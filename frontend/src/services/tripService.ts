import { api } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/backend-url";
import { CreateTripDTO, UpdateTripDTO, TripViewModel, TripResponse } from "@/types/trip";

// Central Trip Service matching backend endpoints using env-driven API base URL
// Endpoints (relative to /api):
// GET    /Trip
// GET    /Trip/{id}
// POST   /Trip
// PUT    /Trip/{id}
// DELETE /Trip/{id}
// GET    /Trip/by-date/{date}
// GET    /Trip/by-driver/{driverId}
// GET    /Trip/by-bus/{busId}

const unwrap = (resp: unknown) => (resp as { data?: unknown })?.data ?? resp ?? null;

export const tripService = {
  // List all trips
  async getAll(): Promise<TripResponse[]> {
    const resp = await api.get<{ data: TripResponse[] }>("/Trip");
    const list = resp?.data ?? resp ?? [];
    return Array.isArray(list) ? list : [];
  },

  // Trip details
  async getById(id: number | string): Promise<TripResponse | null> {
    const resp = await api.get<{ data: TripResponse }>(`/Trip/${id}`);
    const item = resp?.data ?? resp ?? null;
    return item as TripResponse | null;
  },

  // Create trip using the specified API format
  async create(payload: CreateTripDTO): Promise<TripResponse> {
    const baseUrl = getApiBaseUrl();

    // Get token from localStorage
    const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token');

    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Accept", "text/plain");
    
    // Add authorization header with token from localStorage
    if (token) {
      myHeaders.append("Authorization", `Bearer ${token}`);
    } else {
      console.warn('No authentication token found in localStorage');
    }

    const body = {
      arrivalTimeOnly: payload.arrivalTimeOnly,
      busId: Number(payload.busId),
      conductorId: Number(payload.conductorId),
      departureTimeOnly: payload.departureTimeOnly,
      driverId: Number(payload.driverId),
      endLocation: payload.endLocation,
      startLocation: payload.startLocation,
      tripDate: payload.tripDate,
      stopLocations: payload.stopLocations || [],
    };

    const raw = JSON.stringify(body);

    const requestOptions: RequestInit = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow" as RequestRedirect,
    };

    try {
      const response = await fetch(`${baseUrl}/Trip`, requestOptions);
      const result = await response.text();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${result}`);
      }

      // Try to parse as JSON, fallback to text
      try {
        return JSON.parse(result) as TripResponse;
      } catch (e: unknown) {
        return result as unknown as TripResponse;
      }
    } catch (error: unknown) {
      console.error("Trip creation error:", error);
      throw new Error((error as Error)?.message || "Trip creation failed");
    }
  },

  // Update trip
  async update(id: number | string, payload: UpdateTripDTO): Promise<TripResponse> {
    const body = { ...payload } as UpdateTripDTO;
    if (Array.isArray(body.stopLocations) && body.stopLocations.length === 0) {
      body.stopLocations = undefined;
    }
    const resp = await api.put<{ success: boolean; message?: string }>(`/Trip/${id}`, body);
    if (
      resp &&
      typeof resp === "object" &&
      "success" in resp &&
      resp.success === false
    ) {
      throw new Error(resp.message || "Trip update failed");
    }
    return resp as unknown as TripResponse;
  },

  // Delete trip
  async remove(id: number | string): Promise<void> {
    const resp = await api.delete<{ success: boolean; message?: string }>(`/Trip/${id}`);
    if (
      resp &&
      typeof resp === "object" &&
      "success" in resp &&
      resp.success === false
    ) {
      throw new Error(resp.message || "Trip delete failed");
    }
    return;
  },

  // Filters
  async getByDate(date: string): Promise<TripResponse[]> {
    const resp = await api.get<{ data: TripResponse[] }>(
      `/Trip/by-date/${encodeURIComponent(date)}`
    );
    const list = resp?.data ?? resp ?? [];
    return Array.isArray(list) ? list : [];
  },

  async getByDriver(driverId: number | string): Promise<TripResponse[]> {
    const resp = await api.get<{ data: TripResponse[] }>(`/Trip/by-driver/${driverId}`);
    const list = resp?.data ?? resp ?? [];
    return Array.isArray(list) ? list : [];
  },

  async getByBus(busId: number | string): Promise<TripResponse[]> {
    const resp = await api.get<{ data: TripResponse[] }>(`/Trip/by-bus/${busId}`);
    const list = resp?.data ?? resp ?? [];
    return Array.isArray(list) ? list : [];
  },

  // Completed trips
  async getCompleted(): Promise<TripResponse[]> {
    const resp = await api.get<{ data: TripResponse[] }>(`/Trip/completed`);
    const list = resp?.data ?? resp ?? [];
    return Array.isArray(list) ? list : [];
  },

  // Renew a completed trip
  async renew(id: number | string): Promise<TripResponse> {
    // api.post requires (endpoint, body [, options]); send empty object body
    const resp = await api.post<{ data: TripResponse }>(`/Trip/renew/${id}`, {});
    const item = (resp?.data ?? resp) as TripResponse;
    return item;
  },
};

export default tripService;
