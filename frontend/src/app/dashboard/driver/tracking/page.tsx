'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { useDriverTracking } from '@/hooks/useBusTracking';
import { busAPI } from '@/lib/api';
import {
  MapPin,
  Play,
  Square,
  Radio,
  AlertTriangle,
  Bus,
  Gauge,
  Clock,
  Satellite,
} from 'lucide-react';

interface BusInfo {
  id: number;
  busNumber: string;
}

export default function DriverTrackingPage() {
  const { user } = useAuth();
  const [assignedBus, setAssignedBus] = useState<BusInfo | null>(null);
  const [selectedBusId, setSelectedBusId] = useState<number | null>(null);
  const [buses, setBuses] = useState<BusInfo[]>([]);
  const [currentPosition, setCurrentPosition] = useState<{
    lat: number;
    lng: number;
    speed: number;
  } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const { isTracking, startTracking, stopTracking, error } =
    useDriverTracking(selectedBusId);

  useEffect(() => {
    const loadBuses = async () => {
      try {
        const resp = await busAPI.getAll();
        const busList = (resp?.data || []).map((b: any) => ({
          id: b.id,
          busNumber: b.busNumber,
        }));
        setBuses(busList);

        if (user && (user as any).assignedBusId) {
          const found = busList.find(
            (b: BusInfo) => b.id === (user as any).assignedBusId,
          );
          if (found) {
            setAssignedBus(found);
            setSelectedBusId(found.id);
          }
        }
      } catch (err) {
        console.error('Failed to load buses:', err);
      }
    };
    loadBuses();
  }, [user]);

  useEffect(() => {
    if (!isTracking) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed: pos.coords.speed || 0,
        });
        setLastUpdate(new Date());
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isTracking]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md">
              <Satellite className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-blue-600 bg-clip-text text-transparent">
                Bus Tracking
              </h1>
              <p className="text-slate-600 mt-1">
                Share your real-time location with the management team
              </p>
            </div>
          </div>
        </div>

        {/* Bus Selection */}
        {!assignedBus && (
          <Card className="bg-white border-0 shadow-lg rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bus className="w-5 h-5 text-blue-600" />
                Select Your Bus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {buses.map((bus) => (
                  <button
                    key={bus.id}
                    onClick={() => setSelectedBusId(bus.id)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedBusId === bus.id
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    <Bus className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                    <p className="text-sm font-semibold text-center">
                      {bus.busNumber}
                    </p>
                  </button>
                ))}
                {buses.length === 0 && (
                  <p className="col-span-full text-center text-slate-500 py-4">
                    No buses available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tracking Status */}
        <Card className="bg-white border-0 shadow-lg rounded-xl overflow-hidden">
          <div
            className={`h-2 ${isTracking ? 'bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse' : 'bg-slate-200'}`}
          />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Radio
                  className={`w-5 h-5 ${isTracking ? 'text-green-500 animate-pulse' : 'text-slate-400'}`}
                />
                <span className="text-lg">Tracking Status</span>
              </div>
              <Badge
                className={`px-4 py-1.5 text-sm font-semibold ${
                  isTracking
                    ? 'bg-green-100 text-green-700 border-green-300'
                    : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}
              >
                {isTracking ? 'ACTIVE' : 'INACTIVE'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selected Bus Info */}
            {selectedBusId && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <Bus className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-700 font-medium">
                    Selected Bus
                  </p>
                  <p className="text-lg font-bold text-blue-900">
                    {assignedBus?.busNumber ||
                      buses.find((b) => b.id === selectedBusId)?.busNumber ||
                      `Bus #${selectedBusId}`}
                  </p>
                </div>
              </div>
            )}

            {/* Start/Stop Button */}
            <div className="flex justify-center py-4">
              {!isTracking ? (
                <Button
                  onClick={startTracking}
                  disabled={!selectedBusId}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-12 py-6 rounded-2xl text-lg font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <Play className="w-6 h-6 mr-3" />
                  Start Tracking
                </Button>
              ) : (
                <Button
                  onClick={stopTracking}
                  className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white px-12 py-6 rounded-2xl text-lg font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                >
                  <Square className="w-6 h-6 mr-3" />
                  Stop Tracking
                </Button>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Live Position Data */}
            {isTracking && currentPosition && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-medium text-slate-600 uppercase">
                      Latitude
                    </span>
                  </div>
                  <p className="text-lg font-bold text-slate-900">
                    {currentPosition.lat.toFixed(6)}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-medium text-slate-600 uppercase">
                      Longitude
                    </span>
                  </div>
                  <p className="text-lg font-bold text-slate-900">
                    {currentPosition.lng.toFixed(6)}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Gauge className="w-4 h-4 text-green-500" />
                    <span className="text-xs font-medium text-slate-600 uppercase">
                      Speed
                    </span>
                  </div>
                  <p className="text-lg font-bold text-slate-900">
                    {((currentPosition.speed || 0) * 3.6).toFixed(1)} km/h
                  </p>
                </div>
              </div>
            )}

            {/* Last Update */}
            {lastUpdate && (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <Clock className="w-4 h-4" />
                <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-lg rounded-xl">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-blue-900 mb-3">
              How it works
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  1
                </span>
                Select or confirm your assigned bus
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  2
                </span>
                Click &quot;Start Tracking&quot; to begin sharing your location
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  3
                </span>
                Your GPS position is sent every 7 seconds to the management
                dashboard
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  4
                </span>
                Click &quot;Stop Tracking&quot; when you are done
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
