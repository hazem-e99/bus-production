'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { 
  Route, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  MapPin,
  Clock,
  Users,
  Navigation,
  Bus
} from 'lucide-react';
import { routeAPI } from '@/lib/api';
import { TripRoute as RouteType } from '@/types/tripRoute';
import { TripRouteFilterDTO } from '@/types/tripRoute';
import { formatDate } from '@/utils/formatDate';
import { useToast } from '@/components/ui/Toast';

// Route interface with stops
interface RouteWithStops extends RouteType {
  stops?: Stop[];
}

// Stop interface
interface Stop {
  id?: number;
  stopName?: string;
  name?: string;
  stopTime?: string;
  location?: string;
  order?: number;
}

// Base route interface for filtering
interface BaseRoute {
  id: number;
  name: string;
  startPoint?: string;
  endPoint?: string;
  distance?: number;
  estimatedDuration?: number;
  stops?: Stop[];
}

// Notification interface
interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type?: string;
  priority?: string;
}

export default function RoutesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [distanceFilter, setDistanceFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteType | null>(null);
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();
  const [startLocationFilter, setStartLocationFilter] = useState('');
  const [endLocationFilter, setEndLocationFilter] = useState('');
  const [minEstimatedMinutes, setMinEstimatedMinutes] = useState<string>('');
  const [maxEstimatedMinutes, setMaxEstimatedMinutes] = useState<string>('');
  const buildParams = (): TripRouteFilterDTO => {
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
  };
  const [newRoute, setNewRoute] = useState({
    name: '',
    startPoint: '',
    endPoint: '',
    distance: 0,
    estimatedDuration: 0,
    schedule: {
      frequency: 'daily'
    },
    stops: [] as { stopName: string; stopTime: string }[]
  });

  // Fetch routes from API
  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      setIsLoading(true);
      const response = await routeAPI.getAll();
      setRoutes(response || []);
      // Enrich newly loaded routes with stops if missing
      await enrichRoutesWithStops(response || []);
    } catch {
      console.error('Error fetching routes:', Error);
      setError('Failed to fetch routes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilters = async () => {
    try {
      setIsLoading(true);
      const response = await routeAPI.getAll();
      setRoutes(response || []);
      await enrichRoutesWithStops(response || []);
    } catch (error) {
      console.error('Error fetching routes:', error);
      setError('Failed to fetch routes');
      setRoutes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const enrichRoutesWithStops = async (baseRoutes: RouteType[]) => {
    try {
              const need = (baseRoutes || []).filter((r: BaseRoute) => {
        const have = Array.isArray(r.stops) && r.stops.length > 0;
        return !have;
      });
      if (need.length === 0) return;
              const fulls = await Promise.all(need.map((r: BaseRoute) => routeAPI.getById(r.id)));
              setRoutes(prev => prev.map((r: RouteType) => {
        const idx = need.findIndex((n: BaseRoute) => n.id === r.id);
        const full = fulls[idx];
        if (idx >= 0 && full && Array.isArray(full.stops)) {
          return { ...r, stops: full.stops };
        }
        return r;
      }));
    } catch {}
  };

  // Also enrich when routes list changes (e.g., after pagination/filtering)
  useEffect(() => {
    if (!routes || routes.length === 0) return;
    enrichRoutesWithStops(routes);
  }, [routes.map(r => r.id).join('|')]);

  // Filter routes based on search and filters
  const filteredRoutes = routes.filter(route => {
    const name = (route?.name ?? '').toString().toLowerCase();
    const start = (route?.startLocation ?? '').toString().toLowerCase();
    const end = (route?.endLocation ?? '').toString().toLowerCase();
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
      setError('');
      
      // Create route data with proper structure
      const routeData = {
        name: newRoute.name,
        startPoint: newRoute.startPoint,
        endPoint: newRoute.endPoint,
        distance: newRoute.distance,
        estimatedDuration: newRoute.estimatedDuration,
        schedule: {
          frequency: newRoute.schedule.frequency,
          days: newRoute.schedule.frequency === 'daily' 
            ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            : newRoute.schedule.frequency === 'weekdays'
            ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
            : ['Saturday', 'Sunday']
        },
        status: 'active',
        stops: (newRoute.stops || []).map(s => ({ stopName: s.stopName })),
        assignedBuses: [],
        assignedSupervisors: []
      };

      // Create route via API
      const createdRoute = await routeAPI.create(routeData);
      
      // Add to local state
      setRoutes(prevRoutes => [...prevRoutes, createdRoute]);
      
      // Reset form and close modal
      setShowAddModal(false);
      setNewRoute({
        name: '',
        startPoint: '',
        endPoint: '',
        distance: 0,
        estimatedDuration: 0,
        schedule: {
          frequency: 'daily'
        },
        stops: []
      });
      
      // Show success message
      showToast({ type: 'success', title: 'Route created', message: `${createdRoute.name} added.` });
      
    } catch {
      console.error('Error adding route:', Error);
      setError('Failed to add route');
      showToast({ type: 'error', title: 'Create failed', message: 'Failed to add route.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoute) return;

    try {
      setIsLoading(true);
      setError('');

      const updatedData: Partial<RouteType> = {
        name: selectedRoute.name,
        startLocation: selectedRoute.startLocation,
        endLocation: selectedRoute.endLocation,
        distance: selectedRoute.distance,
        estimatedTime: selectedRoute.estimatedTime,
        stopLocations: (selectedRoute as RouteWithStops)?.stops ? (selectedRoute as RouteWithStops).stops.map((s: Stop) => s.stopName || s.name || '').filter(Boolean) : []
      };

      const updated = await routeAPI.update(selectedRoute.id, updatedData);
      setRoutes(prev => prev.map(r => (r.id === selectedRoute.id ? { ...r, ...updated } : r)));
      showToast({ type: 'success', title: 'Route updated', message: `${updated.name} saved.` });
      setShowEditModal(false);
      setSelectedRoute(null);
    } catch {
      console.error('Error updating route:', Error);
      setError('Failed to update route');
      showToast({ type: 'error', title: 'Update failed', message: 'Failed to update route.' });
    } finally {
      setIsLoading(false);
    }
  };

  const addStop = () => {
    setNewRoute(prev => ({ ...prev, stops: [...(prev.stops || []), { stopName: '', stopTime: '' }] }));
  };

  const removeStop = (index: number) => {
    setNewRoute(prev => ({ ...prev, stops: (prev.stops || []).filter((_, i) => i !== index) }));
  };

  const updateStop = (index: number, key: 'stopName', value: string) => {
    setNewRoute(prev => ({
      ...prev,
      stops: (prev.stops || []).map((s, i) => i === index ? { ...s, [key]: value } : s)
    }));
  };

  const handleDeleteRoute = async (routeId: string) => {
    try {
      setIsLoading(true);
      setError('');
      await routeAPI.delete(routeId);
      setRoutes(prev => prev.filter(r => r.id !== Number(routeId)));
      showToast({ type: 'success', title: 'Route deleted', message: 'Route removed.' });
    } catch {
      console.error('Error deleting route:', Error);
      setError('Failed to delete route');
      showToast({ type: 'error', title: 'Delete failed', message: 'Failed to delete route.' });
    } finally {
      setIsLoading(false);
    }
  };

  const getRouteStats = () => {
    const stats = {
      total: routes.length,
      totalDistance: routes.reduce((sum, r) => sum + r.distance, 0),
      activeBuses: 0, // Not available in TripRoute interface
      totalStops: routes.reduce((sum, r) => sum + (r.stopLocations?.length || 0), 0)
    };
    return stats;
  };

  const routeStats = getRouteStats();

  const getAssignedBuses = (routeId: string) => {
    const route = routes.find(r => r.id === Number(routeId));
    return 0; // Not available in TripRoute interface
  };

  const getAssignedDrivers = (routeId: string) => {
    const route = routes.find(r => r.id === Number(routeId));
    return 0; // Not available in TripRoute interface
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Stats Cards */}
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
        {/* Removed Avg Duration card per request */}
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{routeStats.activeBuses}</div>
            <p className="text-xs text-gray-500">Active Buses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-indigo-600">{routeStats.totalStops}</div>
            <p className="text-xs text-gray-500">Total Stops</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
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

      {/* Routes Table */}
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
                        <p className="text-sm text-gray-500">{route.startLocation} → {route.endLocation}</p>
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
                        {route.estimatedTime ? `${route.estimatedTime} min` : '-'}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-sm">
                      <p className="font-medium">
                                                 {route?.stopLocationsCount || ((route as RouteWithStops).stops?.length || 0)} stops
                      </p>
                                             {(route as RouteWithStops).stops && (route as RouteWithStops).stops.length > 0 && (
                         <p className="text-xs text-gray-500 truncate">
                           {(((route as RouteWithStops).stops || []).slice(0,3).map((s: Stop) => s.stopName || s.name).filter(Boolean) as string[]).join(', ')}
                           {(((route as RouteWithStops).stops || []).length > 3) ? ` +${((route as RouteWithStops).stops || []).length - 3} more` : ''}
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
                              setSelectedRoute(full);
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
                        onClick={() => handleDeleteRoute(route.id.toString())}
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

      {/* Add Route Modal */}
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
                required
              />
            </div>
            
          </div>

          {/* Stops Editor */}
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
                min="0"
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

          {/* Removed Departure and Arrival time fields as requested */}
          
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

      {/* Edit Route Modal */}
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
                  value={selectedRoute.startLocation}
                  onChange={(e) => setSelectedRoute({ ...selectedRoute, startLocation: e.target.value })}
                  placeholder="Enter start point"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Point
                </label>
                <Input
                  value={selectedRoute.endLocation}
                  onChange={(e) => setSelectedRoute({ ...selectedRoute, endLocation: e.target.value })}
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
                  min="0"
                  step="0.1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Duration (min)
                </label>
                <Input
                  type="number"
                  value={selectedRoute.estimatedTime}
                  onChange={(e) => setSelectedRoute({ ...selectedRoute, estimatedTime: e.target.value })}
                  placeholder="Enter duration"
                  min="0"
                  required
                />
              </div>
            </div>

            {/* Edit Stops (names only; times handled per trip) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Stops</label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedRoute({ ...selectedRoute, stops: [ ...((selectedRoute as RouteWithStops)?.stops || []), { stopName: '', stopTime: '' } ] } as RouteWithStops)}
                >
                  + Add Stop
                </Button>
              </div>
                              {((selectedRoute as RouteWithStops)?.stops || []).map((stop: Stop, index: number) => (
                <div key={index} className="grid grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stop Name</label>
                    <Input
                      value={stop.stopName || ''}
                                             onChange={(e) => setSelectedRoute({
                         ...selectedRoute,
                                                  stops: ((selectedRoute as RouteWithStops)?.stops || []).map((s: Stop, i: number) => i === index ? { ...s, stopName: e.target.value } : s)
                       } as RouteWithStops)}
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
                                                  stops: ((selectedRoute as RouteWithStops)?.stops || []).filter((_: Stop, i: number) => i !== index)
                       } as RouteWithStops)}
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

      {/* View Route Modal */}
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
                 <p className="font-medium">{selectedRoute.startLocation}</p>
               </div>
               <div>
                 <span className="text-gray-500">End Point:</span>
                 <p className="font-medium">{selectedRoute.endLocation}</p>
               </div>
              <div>
                <span className="text-gray-500">Distance:</span>
                <p className="font-medium">{selectedRoute.distance} km</p>
              </div>
                             <div>
                 <span className="text-gray-500">Duration:</span>
                 <p className="font-medium">
                   {selectedRoute.estimatedTime ? `${selectedRoute.estimatedTime} min` : '-'}
                 </p>
               </div>
              
                             <div>
                 <span className="text-gray-500">Stops:</span>
                 <p className="font-medium">
                   {selectedRoute?.stopLocationsCount || ((selectedRoute as RouteWithStops).stops?.length || 0)} stops
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

            {(selectedRoute as RouteWithStops).stops && (selectedRoute as RouteWithStops).stops.length > 0 && (
              <div>
                <span className="text-gray-500 text-sm">Stops:</span>
                <div className="mt-2 space-y-1">
                  {(selectedRoute as RouteWithStops).stops.map((stop: Stop, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>{stop.stopName || stop.name}{stop.stopTime ? ` - ${stop.stopTime}` : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
