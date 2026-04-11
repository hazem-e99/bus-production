'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LiveTrackingMap } from '@/components/maps/LiveTrackingMap';
import {
  useBusTrackingSocket,
  busTrackingAPI,
  BusLocationData,
} from '@/hooks/useBusTracking';
import { busAPI } from '@/lib/api';
import {
  Radio,
  Bus,
  RefreshCcw,
  MapPin,
  Gauge,
  Clock,
  Wifi,
  WifiOff,
} from 'lucide-react';

export default function MovementManagerTrackingPage() {
  const { locations: socketLocations, isConnected } = useBusTrackingSocket();
  const [initialLocations, setInitialLocations] = useState<BusLocationData[]>([]);
  const [busNames, setBusNames] = useState<Record<number, string>>({});
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    const loadData = async () => {
      try {
        const [locResp, busResp] = await Promise.all([
          busTrackingAPI.getAllLocations(),
          busAPI.getAll(),
        ]);

        const locs = locResp?.data || [];
        setInitialLocations(locs);

        const names: Record<number, string> = {};
        (busResp?.data || []).forEach((b: any) => {
          names[b.id] = b.busNumber || `Bus ${b.id}`;
        });
        setBusNames(names);
        setLastRefresh(new Date());
      } catch (err) {
        console.error('Failed to load tracking data:', err);
      }
    };

    loadData();
  }, []);

  const mergedLocations = (() => {
    const map = new Map<number, BusLocationData>();
    initialLocations.forEach((loc) => map.set(loc.busId, loc));
    socketLocations.forEach((loc) => map.set(loc.busId, loc));
    return Array.from(map.values());
  })();

  const activeBuses = mergedLocations.filter((l) => l.isTracking);
  const inactiveBuses = mergedLocations.filter((l) => !l.isTracking);

  const handleRefresh = async () => {
    try {
      const resp = await busTrackingAPI.getAllLocations();
      setInitialLocations(resp?.data || []);
      setLastRefresh(new Date());
    } catch {}
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-screen-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md">
                <Radio className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-emerald-600 bg-clip-text text-transparent">
                  Live Bus Tracking
                </h1>
                <p className="text-slate-600 mt-1">
                  Monitor all buses in real-time
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                  isConnected
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {isConnected ? (
                  <Wifi className="w-4 h-4" />
                ) : (
                  <WifiOff className="w-4 h-4" />
                )}
                {isConnected ? 'Live' : 'Disconnected'}
              </div>
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="border-slate-200"
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white border-0 shadow-lg rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                    Active Buses
                  </p>
                  <p className="text-3xl font-bold text-green-600 mt-1">
                    {activeBuses.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Bus className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-lg rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                    Total Tracked
                  </p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">
                    {mergedLocations.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-lg rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                    Last Updated
                  </p>
                  <p className="text-lg font-bold text-slate-700 mt-1">
                    {lastRefresh.toLocaleTimeString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map */}
        <Card className="bg-white border-0 shadow-lg rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-emerald-600" />
              Live Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LiveTrackingMap
              locations={mergedLocations}
              height={550}
              busNames={busNames}
            />
          </CardContent>
        </Card>

        {/* Bus List */}
        <Card className="bg-white border-0 shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Bus className="w-5 h-5 text-blue-600" />
              Bus Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mergedLocations.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Radio className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-lg font-semibold">
                  No active tracking data
                </p>
                <p className="text-sm mt-1">
                  Buses will appear here when drivers start tracking
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mergedLocations.map((loc) => (
                  <div
                    key={loc.busId}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      loc.isTracking
                        ? 'border-green-200 bg-green-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Bus className="w-5 h-5 text-blue-600" />
                        <span className="font-bold text-slate-800">
                          {busNames[loc.busId] || `Bus ${loc.busId}`}
                        </span>
                      </div>
                      <Badge
                        className={`px-2 py-1 text-xs ${
                          loc.isTracking
                            ? 'bg-green-100 text-green-700 border-green-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        {loc.isTracking ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>
                          {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Gauge className="w-3.5 h-3.5" />
                        <span>
                          {((loc.speed || 0) * 3.6).toFixed(1)} km/h
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {new Date(loc.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
