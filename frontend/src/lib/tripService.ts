import { api } from './api';
import type { CreateTripDTO, TripResponse, UpdateTripDTO } from '@/types/trip';

// Error response interface
interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

// API response interface
interface ApiResponse<T> {
  data: T;
}

class TripService {
  private baseUrl = '/Trip';

  async getAll(): Promise<TripResponse[]> {
    try {
      const response = await api.get<ApiResponse<TripResponse[]>>(this.baseUrl);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      console.error('Failed to fetch trips:', error);
      throw new Error(apiError?.response?.data?.message || 'Failed to fetch trips');
    }
  }

  async getById(id: number | string): Promise<TripResponse> {
    try {
      const response = await api.get<ApiResponse<TripResponse>>(`${this.baseUrl}/${id}`);
      return response.data;
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      console.error(`Failed to fetch trip ${id}:`, error);
      throw new Error(apiError?.response?.data?.message || `Failed to fetch trip ${id}`);
    }
  }

  async create(tripData: CreateTripDTO): Promise<TripResponse> {
    try {
      const response = await api.post<ApiResponse<TripResponse>>(this.baseUrl, tripData);
      return response.data;
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      console.error('Failed to create trip:', error);
      throw new Error(apiError?.response?.data?.message || 'Failed to create trip');
    }
  }

  async update(id: number | string, tripData: UpdateTripDTO): Promise<TripResponse> {
    try {
      const response = await api.put<ApiResponse<TripResponse>>(`${this.baseUrl}/${id}`, tripData);
      return response.data;
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      console.error(`Failed to update trip ${id}:`, error);
      throw new Error(apiError?.response?.data?.message || `Failed to update trip ${id}`);
    }
  }

  async delete(id: number | string): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/${id}`);
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      console.error(`Failed to delete trip ${id}:`, error);
      throw new Error(apiError?.response?.data?.message || `Failed to delete trip ${id}`);
    }
  }

  async getByDate(date: string): Promise<TripResponse[]> {
    try {
      const response = await api.get<ApiResponse<TripResponse[]>>(`${this.baseUrl}/by-date/${date}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      console.error(`Failed to fetch trips for date ${date}:`, error);
      throw new Error(apiError?.response?.data?.message || `Failed to fetch trips for date ${date}`);
    }
  }

  async getByDriver(driverId: string): Promise<TripResponse[]> {
    try {
      const response = await api.get<ApiResponse<TripResponse[]>>(`${this.baseUrl}/by-driver/${driverId}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      console.error(`Failed to fetch trips for driver ${driverId}:`, error);
      throw new Error(apiError?.response?.data?.message || `Failed to fetch trips for driver ${driverId}`);
    }
  }

  async getByBus(busId: string): Promise<TripResponse[]> {
    try {
      const response = await api.get<ApiResponse<TripResponse[]>>(`${this.baseUrl}/by-bus/${busId}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      console.error(`Failed to fetch trips for bus ${busId}:`, error);
      throw new Error(apiError?.response?.data?.message || `Failed to fetch trips for bus ${busId}`);
    }
  }

  async getByStatus(status: string): Promise<TripResponse[]> {
    try {
      const response = await api.get<ApiResponse<TripResponse[]>>(`${this.baseUrl}/status/${status}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      console.error(`Failed to fetch trips with status ${status}:`, error);
      throw new Error(apiError?.response?.data?.message || `Failed to fetch trips with status ${status}`);
    }
  }

  async getUpcoming(): Promise<TripResponse[]> {
    try {
      const response = await api.get<ApiResponse<TripResponse[]>>(`${this.baseUrl}/upcoming`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      console.error('Failed to fetch upcoming trips:', error);
      throw new Error(apiError?.response?.data?.message || 'Failed to fetch upcoming trips');
    }
  }

  async getCompleted(): Promise<TripResponse[]> {
    try {
      const response = await api.get<ApiResponse<TripResponse[]>>(`/Trip/completed`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      console.error('Failed to fetch completed trips:', error);
      throw new Error(apiError?.response?.data?.message || 'Failed to fetch completed trips');
    }
  }

  async getToday(): Promise<TripResponse[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      return await this.getByDate(today);
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      console.error('Failed to fetch today\'s trips:', error);
      throw new Error(apiError?.response?.data?.message || 'Failed to fetch today\'s trips');
    }
  }

  async search(query: string): Promise<TripResponse[]> {
    try {
      const response = await api.get<ApiResponse<TripResponse[]>>(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      console.error(`Failed to search trips with query "${query}":`, error);
      throw new Error(apiError?.response?.data?.message || `Failed to search trips with query "${query}"`);
    }
  }

  async updateStatus(id: number, status: string): Promise<TripResponse> {
    try {
      const response = await api.put<ApiResponse<TripResponse>>(`${this.baseUrl}/${id}/status`, { status });
      return response.data;
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      console.error(`Failed to update trip ${id} status to ${status}:`, error);
      throw new Error(apiError?.response?.data?.message || `Failed to update trip ${id} status to ${status}`);
    }
  }

  async assignDriver(id: number, driverId: number): Promise<TripResponse> {
    try {
      const response = await api.put<ApiResponse<TripResponse>>(`${this.baseUrl}/${id}/driver`, { driverId });
      return response.data;
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      console.error(`Failed to assign driver ${driverId} to trip ${id}:`, error);
      throw new Error(apiError?.response?.data?.message || `Failed to assign driver ${driverId} to trip ${id}`);
    }
  }

  async assignBus(id: number, busId: number): Promise<TripResponse> {
    try {
      const response = await api.put<ApiResponse<TripResponse>>(`${this.baseUrl}/${id}/bus`, { busId });
      return response.data;
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      console.error(`Failed to assign bus ${busId} to trip ${id}:`, error);
      throw new Error(apiError?.response?.data?.message || `Failed to assign bus ${busId} to trip ${id}`);
    }
  }

  async assignConductor(id: number, conductorId: number): Promise<TripResponse> {
    try {
      const response = await api.put<ApiResponse<TripResponse>>(`${this.baseUrl}/${id}/conductor`, { conductorId });
      return response.data;
    } catch (error: unknown) {
      const apiError = error as ApiErrorResponse;
      console.error(`Failed to assign conductor ${conductorId} to trip ${id}:`, error);
      throw new Error(apiError?.response?.data?.message || `Failed to assign conductor ${conductorId} to trip ${id}`);
    }
  }
}

export const tripService = new TripService();
