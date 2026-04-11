'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { 
  Route, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye
} from 'lucide-react';
import { routeAPI } from '@/lib/api';
// Local UI type aligned with TripRoutes mapping
interface UiStop { id: string; stopName: string; stopTime: string }
interface UiRoute {
  id: string;
  name: string;
  startPoint: string;
  endPoint: string;
  stops: UiStop[];
  estimatedDuration: number;
  distance: number;
  status?: 'active' | 'inactive';
  stopLocationsCount?: number;
  tripsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
import { TripRouteFilterDTO } from '@/types/tripRoute';
import { formatDate } from '@/utils/formatDate';
import { useToast } from '@/components/ui/Toast';

export default function MovementManagerRoutesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [distanceFilter, setDistanceFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<UiRoute | null>(null);
  const [routes, setRoutes] = useState<UiRoute[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const [startLocationFilter, setStartLocationFilter] = useState('');
  const [endLocationFilter, setEndLocationFilter] = useState('');
  const [minEstimatedMinutes, setMinEstimatedMinutes] = useState<string>('');
  const [maxEstimatedMinutes, setMaxEstimatedMinutes] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [newRoute, setNewRoute] = useState({
    name: '',
    startPoint: '',
    endPoint: '',
    distance: 0,
    estimatedDuration: 0,
    stops: [] as { stopName: string; stopTime: string }[]
  });

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    return '';
  };

  const mapFromLegacy = useCallback((r: unknown): UiRoute => {
    const rec = (r || {}) as Record<string, unknown>;
    const getVal = (o: Record<string, unknown>, key: string): unknown => (o && Object.prototype.hasOwnProperty.call(o, key)) ? o[key] : undefined;
    const getString = (v: unknown): string => (typeof v === 'string' ? v : '');
    const getNumber = (v: unknown): number => (typeof v === 'number' ? v : Number(v ?? 0) || 0);
    const stopsVal = getVal(rec, 'stops');
    const stopLocsVal = getVal(rec, 'stopLocations');
    const rawStops: unknown[] = Array.isArray(stopsVal) ? (stopsVal as unknown[]) : Array.isArray(stopLocsVal) ? (stopLocsVal as unknown[]) : [];
    const stops: UiStop[] = rawStops.map((s: unknown, index: number) => {
      const so = (s || {}) as Record<string, unknown>;
      const hasStopName = typeof so.stopName === 'string';
      if (hasStopName) {
        return {
          id: typeof so.id === 'string' ? so.id : `stop-${index}`,
          stopName: String(so.stopName || ''),
          stopTime: typeof so.stopTime === 'string' ? so.stopTime : ''
        };
      }
      const name = typeof so.name === 'string' ? so.name : (typeof s === 'string' ? s : '');
      return { id: `stop-${index}`, stopName: name as string, stopTime: '' };
    });
    return {
      id: String(getVal(rec, 'id') ?? ''),
      name: getString(getVal(rec, 'name') ?? ''),
      startPoint: getString(getVal(rec, 'startPoint') ?? getVal(rec, 'startLocation') ?? ''),
      endPoint: getString(getVal(rec, 'endPoint') ?? getVal(rec, 'endLocation') ?? ''),
      stops,
      estimatedDuration: getNumber(getVal(rec, 'estimatedDuration') ?? 0),
      distance: getNumber(getVal(rec, 'distance') ?? 0),
      status: getVal(rec, 'status') as UiRoute['status'],
      stopLocationsCount: getVal(rec, 'stopLocationsCount') as number | undefined,
      tripsCount: getVal(rec, 'tripsCount') as number | undefined,
      createdAt: getVal(rec, 'createdAt') as string | undefined,
      updatedAt: getVal(rec, 'updatedAt') as string | undefined,
    };
  }, []);

  const buildParams = useCallback((): TripRouteFilterDTO => {
    let minDistance = 0;
    let maxDistance = 0;
    if (distanceFilter === 'short') { minDistance = 0; maxDistance = 10; }
    if (distanceFilter === 'medium') { minDistance = 11; maxDistance = 25; }
    if (distanceFilter === 'long') { minDistance = 26; maxDistance = 0; }
    return {
      page: 0,
      pageSize: 0,
      name: searchTerm || '',
      startLocation: startLocationFilter || '',
      endLocation: endLocationFilter || '',
      minDistance,
      maxDistance,
      minEstimatedMinutes: minEstimatedMinutes ? Number(minEstimatedMinutes) : 0,
      maxEstimatedMinutes: maxEstimatedMinutes ? Number(maxEstimatedMinutes) : 0,
    };
  }, [distanceFilter, endLocationFilter, maxEstimatedMinutes, minEstimatedMinutes, searchTerm, startLocationFilter]);

  const fetchRoutes = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await routeAPI.getAll();
      const ui = (response || []).map(mapFromLegacy);
      setRoutes(ui);
      // Enrich stops for items that have counts but no names
      // Note: call enrich after it's defined to satisfy linter; handled in effect below
    } catch {
      console.error('Error fetching routes:', Error);
      showToast({ type: 'error', title: 'Fetch failed', message: 'Failed to fetch routes' });
    } finally {
      setIsLoading(false);
    }
  }, [buildParams, mapFromLegacy, showToast]);

  useEffect(() => {
    (async () => {
      await fetchRoutes();
      // After initial fetch, attempt to enrich with stops
      if (routes && routes.length > 0) {
        await enrichRoutesWithStops(routes);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilters = async () => {
    try {
      setIsLoading(true);
      const response = await routeAPI.getAll();
      const ui = (response || []).map(mapFromLegacy);
      setRoutes(ui);
      await enrichRoutesWithStops(ui);
    } catch {
      console.error('Error fetching routes:', Error);
      showToast({ type: 'error', title: 'Fetch failed', message: 'Failed to apply filters' });
      setRoutes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const enrichRoutesWithStops = useCallback(async (base: UiRoute[]) => {
    const targets = (base || []).filter(r => (r.stopLocationsCount || 0) > 0 && (!Array.isArray(r.stops) || r.stops.length === 0));
    if (targets.length === 0) return;
    try {
      const fulls = await Promise.all(targets.map(r => routeAPI.getById(r.id)));
      const mapped = fulls.map(f => (f ? mapFromLegacy(f) : null));
      setRoutes(prev => prev.map(r => {
        const idx = targets.findIndex(t => t.id === r.id);
        const m = idx >= 0 ? mapped[idx] : null;
        return m && Array.isArray(m.stops) && m.stops.length > 0 ? { ...r, stops: m.stops } : r;
      }));
    } catch {
      // ignore enrich errors
    }
  }, [mapFromLegacy]);


  const filteredRoutes = routes.filter(route => {
    const name = (route?.name ?? '').toString().toLowerCase();
    const start = (route?.startPoint ?? '').toString().toLowerCase();
    const end = (route?.endPoint ?? '').toString().toLowerCase();
    const term = (searchTerm ?? '').toLowerCase();
    const matchesSearch = name.includes(term) || start.includes(term) || end.includes(term);
    const distanceNum = Number(route?.distance ?? 0);
    const matchesDistance = distanceFilter === 'all' || 
      (distanceFilter === 'short' && distanceNum <= 10) ||
      (distanceFilter === 'medium' && distanceNum > 10 && distanceNum <= 25) ||
      (distanceFilter === 'long' && distanceNum > 25);
    return matchesSearch && matchesDistance;
  });

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      // Client-side validation per DTO
      const name = (newRoute.name || '').trim();
      const startPoint = (newRoute.startPoint || '').trim();
      const endPoint = (newRoute.endPoint || '').trim();
      let distance = Number(newRoute.distance || 0);
      if (name.length < 3 || name.length > 100) {
        showToast({ type: 'error', title: 'Invalid name', message: 'Name must be 3-100 characters.' });
        return;
      }
      if (!startPoint || !endPoint) {
        showToast({ type: 'error', title: 'Missing locations', message: 'Start and end locations are required.' });
        return;
      }
      if (startPoint.length > 200 || endPoint.length > 200) {
        showToast({ type: 'error', title: 'Invalid locations', message: 'Locations must be ≤ 200 characters.' });
        return;
      }
      if (!isFinite(distance) || distance < 0.1) distance = 0.1;
      if (distance > 1000) distance = 1000;
      const estimatedMinutes = Number(newRoute.estimatedDuration || 0);
      if (!isFinite(estimatedMinutes) || estimatedMinutes <= 0) {
        showToast({ type: 'error', title: 'Invalid duration', message: 'Estimated time is required.' });
        return;
      }
      
      const routeData = {
        name,
        startPoint,
        endPoint,
        distance,
        estimatedDuration: estimatedMinutes,
        stops: (newRoute.stops || []).map(s => ({ stopName: s.stopName })),
      };
      const createdRoute = await routeAPI.create(routeData);
      const ui = mapFromLegacy(createdRoute);
      setRoutes(prevRoutes => [...prevRoutes, ui]);
      setShowAddModal(false);
      setNewRoute({
        name: '',
        startPoint: '',
        endPoint: '',
        distance: 0,
        estimatedDuration: 0,
        stops: [] });
      showToast({ type: 'success', title: 'Route created', message: `${createdRoute.name} added.` });
    } catch {
      console.error('Error adding route:', Error);
      showToast({ type: 'error', title: 'Create failed', message: 'Failed to add route' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoute) return;
    try {
      // Basic client validations to avoid 400 from backend
      const name = (selectedRoute.name || '').trim();
      const startPoint = (selectedRoute.startPoint || '').trim();
      const endPoint = (selectedRoute.endPoint || '').trim();
      let distance = Number(selectedRoute.distance || 0);
      if (name.length < 3) {
        showToast({ type: 'error', title: 'Invalid name', message: 'Name must be at least 3 characters.' });
        return;
      }
      if (!startPoint || !endPoint) {
        showToast({ type: 'error', title: 'Missing locations', message: 'Start and end points are required.' });
        return;
      }
      if (!isFinite(distance) || distance <= 0) distance = 0.1;
      if (distance > 1000) distance = 1000;

      const payload: {
        id: string;
        name: string;
        startPoint: string;
        endPoint: string;
        distance: number;
        estimatedDuration: number;
        stops: { stopName: string }[];
      } = {
        id: selectedRoute.id,
        name,
        startPoint,
        endPoint,
        distance,
        // estimatedDuration (minutes) handled by routeAPI.update → estimatedTime
        estimatedDuration: selectedRoute.estimatedDuration,
        // include stops so backend receives stopLocations
        stops: (selectedRoute.stops || []).map((s) => ({ stopName: s.stopName }))
      };

      const updated = await routeAPI.update(selectedRoute.id, payload);
      const ui = mapFromLegacy(updated as unknown);
      setRoutes(prev => prev.map(r => r.id === selectedRoute.id ? { ...r, ...ui } : r));
        setShowEditModal(false);
        setSelectedRoute(null);
        showToast({ type: 'success', title: 'Route updated', message: `${payload.name} saved.` });
    } catch (err: unknown) {
        console.error('Error updating route:', err);
      const message = getErrorMessage(err).includes('Unauthorized')
        ? 'Unauthorized. Please login and try again.'
        : 'Bad request. Ensure name ≥ 3, distance 0.1–1000, and valid fields.';
      showToast({ type: 'error', title: 'Update failed', message });
    }
  };
  const addStop = () => { setNewRoute(prev => ({ ...prev, stops: [...(prev.stops || []), { stopName: '', stopTime: '' }] })); };
  const removeStop = (index: number) => { setNewRoute(prev => ({ ...prev, stops: (prev.stops || []).filter((_, i) => i !== index) })); };
  const updateStop = (index: number, key: 'stopName' | 'stopTime', value: string) => {
    setNewRoute(prev => ({ ...prev, stops: (prev.stops || []).map((s, i) => i === index ? { ...s, [key]: value } : s) }));
  };

  const handleDeleteRoute = (routeId: string) => {
    setConfirmDeleteId(routeId);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      setIsLoading(true);
      const resp = await routeAPI.delete(confirmDeleteId);
      const ok = Boolean((resp as { success?: boolean } | null | undefined)?.success ?? true);
      if (ok) {
        setRoutes(prev => prev.filter((r) => String(r.id) !== String(confirmDeleteId)));
        showToast({ type: 'success', title: 'Route deleted', message: 'Route has been removed.' });
      } else {
        showToast({ type: 'error', title: 'Delete failed', message: 'Server rejected delete.' });
      }
    } catch (err: unknown) {
      console.error('Error deleting route:', err);
      const message = getErrorMessage(err).includes('Unauthorized')
        ? 'Unauthorized. Please login and try again.'
        : 'Delete failed. Please try again.';
      showToast({ type: 'error', title: 'Delete failed', message });
    } finally {
      setIsLoading(false);
      setConfirmDeleteId(null);
    }
  };

  const getRouteStats = () => {
    const stats = {
      total: routes.length,
      totalDistance: routes.reduce((sum, r) => sum + (Number(r.distance) || 0), 0),
      totalStops: routes.reduce((sum, r) => sum + (r.stops?.length || 0), 0)
    };
    return stats;
  };

  const routeStats = getRouteStats();

  

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Route Management</h1>
          <p className="text-gray-600">Manage bus routes and schedules</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Route
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{routeStats.total}</div>
            <p className="text-xs text-gray-500">Total Routes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{routeStats.totalDistance} km</div>
            <p className="text-xs text-gray-500">Total Distance</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-indigo-600">{routeStats.totalStops}</div>
            <p className="text-xs text-gray-500">Total Stops</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filters</CardTitle>
          <CardDescription>Find specific routes or filter by criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search routes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              options={[
                { value: 'all', label: 'All Distances' },
                { value: 'short', label: 'Short (≤10 km)' },
                { value: 'medium', label: 'Medium (11-25 km)' },
                { value: 'long', label: 'Long (>25 km)' }
              ]}
              value={distanceFilter}
              onChange={(e) => setDistanceFilter(e.target.value)}
            />
            <Input
              placeholder="Start location"
              value={startLocationFilter}
              onChange={(e) => setStartLocationFilter(e.target.value)}
            />
            <Input
              placeholder="End location"
              value={endLocationFilter}
              onChange={(e) => setEndLocationFilter(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <Input
              type="number"
              placeholder="Min estimated minutes"
              value={minEstimatedMinutes}
              onChange={(e) => setMinEstimatedMinutes(e.target.value)}
              min="0"
            />
            <Input
              type="number"
              placeholder="Max estimated minutes"
              value={maxEstimatedMinutes}
              onChange={(e) => setMaxEstimatedMinutes(e.target.value)}
              min="0"
            />
            <div className="hidden md:block" />
            <div className="hidden md:block" />
            <Button variant="outline" className="w-full" onClick={handleApplyFilters}>
              <Filter className="w-4 h-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Routes ({filteredRoutes.length})</CardTitle>
          <CardDescription>Manage route configurations and assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Stops</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoutes.map((route) => (
                <TableRow key={route.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Route className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{route.name}</p>
                        <p className="text-sm text-gray-500">{route.startPoint} → {route.endPoint}</p>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm">
                      <p className="font-medium">{route.distance} km</p>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-sm">
                      <p className="font-medium">
                        {route.estimatedDuration ? `${route.estimatedDuration} min` : '-'}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-sm">
                      <p className="font-medium">
                        {route?.stopLocationsCount || (route.stops?.length || 0)} stops
                      </p>
                      {route.stops && route.stops.length > 0 && (
                        <p className="text-xs text-gray-500 truncate">
                          {((route.stops || []).slice(0,3).map((s) => s.stopName).filter(Boolean) as string[]).join(', ')}
                          {((route.stops || []).length > 3) ? ` +${(route.stops || []).length - 3} more` : ''}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  
                  
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            setSelectedRoute(route);
                            setShowViewModal(true);
                            const full = await routeAPI.getById(route.id);
                            if (full) {
                              setSelectedRoute(mapFromLegacy(full));
                            }
                          } catch {}
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRoute(route);
                          setShowEditModal(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteRoute(route.id)}
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

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Route"
        size="lg"
      >
        <form onSubmit={handleAddRoute} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Route Name
              </label>
              <Input
                value={newRoute.name}
                onChange={(e) => setNewRoute({ ...newRoute, name: e.target.value })}
                placeholder="Enter route name"
                minLength={3}
                maxLength={100}
                required
              />
            </div>
            
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Stops</label>
              <Button type="button" variant="outline" onClick={addStop}>+ Add Stop</Button>
            </div>
            {(newRoute.stops || []).map((stop, index) => (
              <div key={index} className="grid grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stop Name</label>
                  <Input value={stop.stopName} onChange={(e) => updateStop(index, 'stopName', e.target.value)} placeholder="e.g., Main Gate" required />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1"></div>
                  <Button type="button" variant="outline" onClick={() => removeStop(index)}>-</Button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Point
              </label>
              <Input
                value={newRoute.startPoint}
                onChange={(e) => setNewRoute({ ...newRoute, startPoint: e.target.value })}
                placeholder="Enter start point"
                maxLength={200}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Point
              </label>
              <Input
                value={newRoute.endPoint}
                onChange={(e) => setNewRoute({ ...newRoute, endPoint: e.target.value })}
                placeholder="Enter end point"
                maxLength={200}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Distance (km)
              </label>
              <Input
                type="number"
                value={newRoute.distance}
                onChange={(e) => setNewRoute({ ...newRoute, distance: Number(e.target.value) })}
                placeholder="Enter distance"
                min="0.1"
                max="1000"
                step="0.1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Duration (minutes)
              </label>
              <Input
                type="number"
                value={newRoute.estimatedDuration}
                onChange={(e) => setNewRoute({ ...newRoute, estimatedDuration: Number(e.target.value) })}
                placeholder="e.g., 45"
                min="1"
                step="1"
                required
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              Add Route
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Route"
        size="lg"
      >
        {selectedRoute && (
          <form onSubmit={handleEditRoute} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Route Name
                </label>
                <Input
                  value={selectedRoute.name}
                  onChange={(e) => setSelectedRoute({ ...selectedRoute, name: e.target.value })}
                  placeholder="Enter route name"
                  required
                />
              </div>
              
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Point
                </label>
                <Input
                  value={selectedRoute.startPoint}
                  onChange={(e) => setSelectedRoute({ ...selectedRoute, startPoint: e.target.value })}
                  placeholder="Enter start point"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Point
                </label>
                <Input
                  value={selectedRoute.endPoint}
                  onChange={(e) => setSelectedRoute({ ...selectedRoute, endPoint: e.target.value })}
                  placeholder="Enter end point"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Distance (km)
                </label>
                <Input
                  type="number"
                  value={selectedRoute.distance}
                  onChange={(e) => setSelectedRoute({ ...selectedRoute, distance: Number(e.target.value) })}
                  placeholder="Enter distance"
                  min="0.1"
                  max="1000"
                  step="0.1"
                  required
                />
              </div>
            </div>

            {/* Edit Stops */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Stops</label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedRoute({ ...selectedRoute, stops: [ ...(selectedRoute?.stops || []), { id: `tmp-${Date.now()}`, stopName: '', stopTime: '' } ] })}
                >
                  + Add Stop
                </Button>
              </div>
              {(selectedRoute?.stops || []).map((stop: UiStop, index: number) => (
                <div key={index} className="grid grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stop Name</label>
                    <Input
                      value={stop.stopName || ''}
                      onChange={(e) => setSelectedRoute({
                        ...selectedRoute,
                        stops: (selectedRoute?.stops || []).map((s, i: number) => i === index ? { ...s, stopName: e.target.value } : s)
                      })}
                      placeholder="e.g., Main Gate"
                      required
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1"></div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedRoute({
                        ...selectedRoute,
                        stops: (selectedRoute?.stops || []).filter((_, i: number) => i !== index)
                      })}
                    >
                      -
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Update Route
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="Route Details"
        size="md"
      >
        {selectedRoute && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Route className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium">{selectedRoute.name}</h3>
                <p className="text-sm text-gray-500">ID: {selectedRoute.id}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Start Point:</span>
                <p className="font-medium">{selectedRoute.startPoint}</p>
              </div>
              <div>
                <span className="text-gray-500">End Point:</span>
                <p className="font-medium">{selectedRoute.endPoint}</p>
              </div>
              <div>
                <span className="text-gray-500">Distance:</span>
                <p className="font-medium">{selectedRoute.distance} km</p>
              </div>
              
              <div>
                <span className="text-gray-500">Estimated Duration:</span>
                <p className="font-medium">
                  {selectedRoute.estimatedDuration ? `${selectedRoute.estimatedDuration} min` : '-'}
                </p>
              </div>
              
              <div>
                <span className="text-gray-500">Stops:</span>
                <p className="font-medium">
                  {selectedRoute?.stopLocationsCount || (selectedRoute.stops?.length || 0)} stops
                </p>
              </div>

              <div>
                <span className="text-gray-500">Trips:</span>
                <p className="font-medium">
                  {selectedRoute?.tripsCount || 0} trips
                </p>
              </div>

              <div>
                <span className="text-gray-500">Created:</span>
                <p className="font-medium">
                  {selectedRoute?.createdAt ? formatDate(selectedRoute.createdAt) : '-'}
                </p>
              </div>

              <div>
                <span className="text-gray-500">Updated:</span>
                <p className="font-medium">
                  {selectedRoute?.updatedAt ? formatDate(selectedRoute.updatedAt) : '-'}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete route?"
        description="This will permanently delete the route."
        confirmText={isLoading ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}


