'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';
import { getTrackingSocketUrl } from '@/lib/backend-url';

export interface BusLocationData {
  busId: number;
  latitude: number;
  longitude: number;
  speed: number;
  driverId: string;
  timestamp: string;
  isTracking?: boolean;
}

const SOCKET_URL = getTrackingSocketUrl();

export function useBusTrackingSocket() {
  const [locations, setLocations] = useState<Map<number, BusLocationData>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('bus-location-update', (data: BusLocationData) => {
      setLocations((prev) => {
        const next = new Map(prev);
        next.set(data.busId, { ...data, isTracking: true });
        return next;
      });
    });

    socket.on('bus-tracking-stopped', (data: { busId: number }) => {
      setLocations((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.busId);
        if (existing) {
          next.set(data.busId, { ...existing, isTracking: false });
        }
        return next;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { locations: Array.from(locations.values()), isConnected };
}

export function useDriverTracking(busId: number | null) {
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const sendLocation = useCallback(
    async (position: GeolocationPosition) => {
      if (!busId) return;
      try {
        await api.post('/BusTracking/location', {
          busId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          speed: position.coords.speed || 0,
        });
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to send location');
      }
    },
    [busId],
  );

  const startTracking = useCallback(() => {
    if (!busId) {
      setError('No bus assigned');
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setIsTracking(true);
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        sendLocation(position);
      },
      (err) => {
        setError(`Geolocation error: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      },
    );

    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => sendLocation(position),
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
      );
    }, 7000);
  }, [busId, sendLocation]);

  const stopTracking = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (busId) {
      try {
        await api.post(`/BusTracking/stop/${busId}`, {});
      } catch {}
    }

    setIsTracking(false);
    setError(null);
  }, [busId]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { isTracking, startTracking, stopTracking, error };
}

export const busTrackingAPI = {
  getLocation: (busId: number) =>
    api.get<any>(`/BusTracking/location/${busId}`),

  getAllLocations: () =>
    api.get<any>('/BusTracking/locations'),

  getAllLocationsIncludingInactive: () =>
    api.get<any>('/BusTracking/locations/all'),
};
