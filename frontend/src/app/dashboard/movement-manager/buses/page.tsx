'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import Image from 'next/image';
import busTwo from '@/../public/bus_two.png';
import { 
  Bus, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye
} from 'lucide-react';
import { busAPI } from '@/lib/api';
import { Bus as BusType, BusRequest, BusListParams } from '@/types/bus';
 

export default function MovementManagerBusesPage() {
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive' | 'UnderMaintenance' | 'OutOfService'>('all');
  const [capacityFilter, setCapacityFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedBus, setSelectedBus] = useState<BusType | null>(null);
  const [newBus, setNewBus] = useState<BusRequest>({
    busNumber: '',
    capacity: 50,
    status: 'Active',
    speed: 0
  });
  const [buses, setBuses] = useState<BusType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const buildParams = useCallback((): BusListParams => {
    let minCapacity = 0;
    let maxCapacity = 0;
    if (capacityFilter === 'small') { minCapacity = 0; maxCapacity = 30; }
    if (capacityFilter === 'medium') { minCapacity = 31; maxCapacity = 60; }
    if (capacityFilter === 'large') { minCapacity = 61; maxCapacity = 0; }
    return {
      page: 0,
      pageSize: 0,
      busNumber: searchTerm,
      status: statusFilter === 'all' ? '' : statusFilter as 'Active' | 'Inactive' | 'UnderMaintenance' | 'OutOfService',
      minSpeed: 0,
      maxSpeed: 0,
      minCapacity,
      maxCapacity,
    };
  }, [searchTerm, statusFilter, capacityFilter]);

  const handleApplyFilters = async () => {
    try {
      setIsLoading(true);
      const busesResponse = await busAPI.getAll(buildParams());
      const cleanBusesData = busesResponse.data
        .filter(bus => bus && bus.id)
        .map(bus => ({
          ...bus,
          id: bus.id || 0,
          busNumber: bus.busNumber || 'Unknown',
          capacity: bus.capacity || 50,
          status: bus.status || 'Active',
          speed: bus.speed || 0
        }));
      setBuses(cleanBusesData);
    } catch (error) {
      console.error('Failed to apply filters:', error);
      setBuses([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
  const busesResponse = await busAPI.getAll(buildParams());
        
        // Extract data from the new API response format
        const cleanBusesData = busesResponse.data
          .filter(bus => bus && bus.id)
          .map(bus => ({
            ...bus,
            id: bus.id || 0,
            busNumber: bus.busNumber || 'Unknown',
            capacity: bus.capacity || 50,
            status: bus.status || 'Active',
            speed: bus.speed || 0
          }));
  setBuses(cleanBusesData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setBuses([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [buildParams]);

  const filteredBuses = buses
    .filter(bus => {
      const matchesSearch = bus.busNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || bus.status === statusFilter;
      const matchesCapacity = capacityFilter === 'all' || 
        (capacityFilter === 'small' && bus.capacity <= 30) ||
        (capacityFilter === 'medium' && bus.capacity > 30 && bus.capacity <= 60) ||
        (capacityFilter === 'large' && bus.capacity > 60);
      return matchesSearch && matchesStatus && matchesCapacity;
    })
    .filter((bus, index, self) => index === self.findIndex(b => b.id === bus.id));

  const validateBusDTO = (data: BusRequest) => {
    if (!data.busNumber || data.busNumber.trim().length === 0 || data.busNumber.length > 20) {
      throw new Error('Bus number is required and must be ≤ 20 characters');
    }
    if (typeof data.speed !== 'number' || data.speed < 0 || data.speed > 200) {
      throw new Error('Speed must be between 0 and 200');
    }
    if (!Number.isInteger(data.capacity) || data.capacity < 10 || data.capacity > 100) {
      throw new Error('Capacity must be an integer between 10 and 100');
    }
    const validStatuses = ['Active','Inactive','UnderMaintenance','OutOfService'];
    if (!validStatuses.includes(data.status)) {
      throw new Error('Status must be Active, Inactive, UnderMaintenance, or OutOfService');
    }
  };

  const handleAddBus = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const existingBus = buses.find(bus => bus.busNumber === newBus.busNumber);
      if (existingBus) {
        console.warn('Duplicate bus number');
        return;
      }
      
      const busData: BusRequest = {
        busNumber: newBus.busNumber,
        capacity: newBus.capacity,
        status: newBus.status,
        speed: newBus.speed
      };
      validateBusDTO(busData);
      
      const response = await busAPI.create(busData);
      if (response.success) {
        // Refresh the buses list
        const updatedBusesResponse = await busAPI.getAll(buildParams());
        setBuses(updatedBusesResponse.data);
        console.log('Bus added');
        setShowAddModal(false);
        setNewBus({ busNumber: '', capacity: 50, status: 'Active', speed: 0 });
      }
  } catch {
      console.error('Failed to add bus:', Error);
      console.error(Error instanceof Error ? Error.message : 'Failed to add bus. Please try again.');
  }
  };

  const handleEditBus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBus) return;
    try {
      const busData: BusRequest = {
        busNumber: selectedBus.busNumber,
        capacity: selectedBus.capacity,
        status: selectedBus.status,
        speed: selectedBus.speed
      };
      validateBusDTO(busData);
      
      const response = await busAPI.update(selectedBus.id, busData);
      if (response.success) {
        // Refresh the buses list
        const updatedBusesResponse = await busAPI.getAll(buildParams());
        setBuses(updatedBusesResponse.data);
        console.log('Bus updated');
        setShowEditModal(false);
        setSelectedBus(null);
      }
    } catch {
      console.error('Failed to update bus:', Error);
      console.error(Error instanceof Error ? Error.message : 'Failed to update bus. Please try again.');
    }
  };

  const handleDeleteBus = async (busId: number) => {
    // TODO: replace with confirm dialog
    try {
      const response = await busAPI.delete(busId);
      if (response.success) {
        // Refresh the buses list
        const updatedBusesResponse = await busAPI.getAll();
        setBuses(updatedBusesResponse.data);
        console.log('Bus deleted successfully!');
      }
    } catch {
      console.error('Failed to delete bus:', Error);
      console.error('Failed to delete bus. Please try again.');
    }
  };

  const getUniqueKey = (bus: BusType, index: number) => `${bus.id}-${bus.busNumber}-${index}`;

  const getBusStats = () => {
    if (buses.length === 0) {
      return { total: 0, active: 0, inactive: 0, totalCapacity: 0, avgSpeed: 0 };
    }
    const validBuses = buses.filter(bus => bus && bus.id && bus.status);
    const stats = {
      total: validBuses.length,
      active: validBuses.filter(b => b.status === 'Active').length,
      inactive: validBuses.filter(b => b.status === 'Inactive').length,
      totalCapacity: validBuses.reduce((sum, b) => sum + (b.capacity || 0), 0),
      avgSpeed: validBuses.length > 0 ? Math.round(validBuses.reduce((sum, b) => sum + (b.speed || 0), 0) / validBuses.length) : 0
    };
    return stats;
  };

  const busStats = getBusStats();

  // Note: driver/route lookup helpers removed for now as they are unused.

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto shadow-lg"></div>
            <p className="mt-6 text-text-secondary text-lg font-medium">Loading buses...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('pages.movementManager.buses.title', 'Bus Management')}</h1>
          <p className="text-gray-600">{t('pages.movementManager.buses.subtitle', 'Manage fleet vehicles and their assignments')}</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('pages.movementManager.buses.add', 'Add New Bus')}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{busStats.total}</div>
            <p className="text-xs text-gray-500">{t('pages.movementManager.buses.total', 'Total Buses')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{busStats.active}</div>
            <p className="text-xs text-gray-500">{t('pages.movementManager.buses.active', 'Active')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">{busStats.inactive}</div>
            <p className="text-xs text-gray-500">{t('pages.movementManager.buses.inactive', 'Inactive')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{busStats.totalCapacity}</div>
            <p className="text-xs text-gray-500">{t('pages.movementManager.buses.totalCapacity', 'Total Capacity')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-indigo-600">{busStats.avgSpeed} km/h</div>
            <p className="text-xs text-gray-500">{t('pages.movementManager.buses.avgSpeed', 'Avg Speed')}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('pages.movementManager.buses.searchTitle', 'Search & Filters')}</CardTitle>
          <CardDescription>{t('pages.movementManager.buses.searchSubtitle', 'Find specific buses or filter by criteria')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('pages.movementManager.buses.searchPlaceholder', 'Search buses...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              options={[
                { value: 'all', label: t('pages.movementManager.buses.filters.allStatus', 'All Status') },
                { value: 'Active', label: t('pages.movementManager.buses.filters.active', 'Active') },
                { value: 'Inactive', label: t('pages.movementManager.buses.filters.inactive', 'Inactive') },
                { value: 'UnderMaintenance', label: t('pages.movementManager.buses.filters.underMaintenance', 'Under Maintenance') },
                { value: 'OutOfService', label: t('pages.movementManager.buses.filters.outOfService', 'Out of Service') }
              ]}
              value={statusFilter}
                             onChange={(e) => setStatusFilter(e.target.value as 'all' | 'Active' | 'Inactive' | 'UnderMaintenance' | 'OutOfService')}
            />
            <Select
              options={[
                { value: 'all', label: t('pages.movementManager.buses.filters.allCapacities', 'All Capacities') },
                { value: 'small', label: t('pages.movementManager.buses.filters.small', 'Small (≤30)') },
                { value: 'medium', label: t('pages.movementManager.buses.filters.medium', 'Medium (31-60)') },
                { value: 'large', label: t('pages.movementManager.buses.filters.large', 'Large (>60)') }
              ]}
              value={capacityFilter}
              onChange={(e) => setCapacityFilter(e.target.value)}
            />
            <Button variant="outline" className="w-full" onClick={handleApplyFilters}>
              <Filter className="w-4 h-4 mr-2" />
              {t('pages.movementManager.buses.applyFilters', 'Apply Filters')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('pages.movementManager.buses.fleet', 'Fleet')} ({filteredBuses.length})</CardTitle>
          <CardDescription>{t('pages.movementManager.buses.fleetSubtitle', 'Manage bus assignments and status')}</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredBuses.length === 0 ? (
            <div className="text-center py-8">
              <Bus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">{t('pages.movementManager.buses.noBuses', 'No buses found')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredBuses.map((bus, index) => (
                <div key={getUniqueKey(bus, index)} className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden bg-white">
                  <div className="relative h-36 w-full">
                    <Image src={busTwo} alt="Bus image" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" style={{objectFit:'cover'}} />
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-500">{t('pages.movementManager.buses.table.id', 'ID')}: <span className="font-medium text-gray-700">{bus.id}</span></div>
                        <div className="text-lg font-semibold text-gray-900">{t('pages.movementManager.buses.table.bus', 'Bus')} {bus.busNumber}</div>
                      </div>
                      <Badge variant={bus.status === 'Active' ? 'default' : 'secondary'}>
                        {t(`pages.movementManager.buses.status.${bus.status}`, bus.status)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-2 rounded-md bg-slate-50">
                        <div className="text-gray-500">{t('pages.movementManager.buses.table.capacity', 'Capacity')}</div>
                        <div className="font-medium">{bus.capacity} {t('pages.movementManager.buses.table.seatsLabel', 'seats')}</div>
                      </div>
                      <div className="p-2 rounded-md bg-slate-50">
                        <div className="text-gray-500">{t('pages.movementManager.buses.table.speed', 'Speed')}</div>
                        <div className="font-medium">{bus.speed} {t('pages.movementManager.buses.table.kmh', 'km/h')}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedBus(bus); setShowViewModal(true); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setSelectedBus(bus); setShowEditModal(true); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeleteBus(bus.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t('pages.movementManager.buses.add', 'Add New Bus')}
        size="lg"
      >
        <form onSubmit={handleAddBus} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('pages.movementManager.buses.form.busNumber', 'Bus Number')}
              </label>
              <Input
                value={newBus.busNumber}
                onChange={(e) => setNewBus({ ...newBus, busNumber: e.target.value })}
                placeholder={t('pages.movementManager.buses.form.busNumberPh', 'Enter bus number')}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('pages.movementManager.buses.form.capacity', 'Capacity')}
              </label>
              <Input
                type="number"
                value={newBus.capacity}
                onChange={(e) => setNewBus({ ...newBus, capacity: Number(e.target.value) })}
                placeholder={t('pages.movementManager.buses.form.capacityPh', 'Enter capacity')}
                min="1"
                max="100"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('pages.movementManager.buses.form.status', 'Status')}
              </label>
              <Select
                options={[
                  { value: 'Active', label: t('pages.movementManager.buses.filters.active', 'Active') },
                  { value: 'Inactive', label: t('pages.movementManager.buses.filters.inactive', 'Inactive') },
                  { value: 'UnderMaintenance', label: t('pages.movementManager.buses.filters.underMaintenance', 'Under Maintenance') },
                  { value: 'OutOfService', label: t('pages.movementManager.buses.filters.outOfService', 'Out of Service') }
                ]}
                value={newBus.status}
                onChange={(e) => setNewBus({ ...newBus, status: e.target.value as 'Active' | 'Inactive' | 'UnderMaintenance' | 'OutOfService' })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('pages.movementManager.buses.form.speed', 'Speed (km/h)')}
              </label>
              <Input
                type="number"
                value={newBus.speed}
                onChange={(e) => setNewBus({ ...newBus, speed: Number(e.target.value) })}
                placeholder={t('pages.movementManager.buses.form.speedPh', 'Enter speed')}
                min="0"
                max="200"
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
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit">
              {t('pages.movementManager.buses.add', 'Add New Bus')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={t('pages.movementManager.buses.edit', 'Edit Bus')}
        size="lg"
      >
        {selectedBus && (
          <form onSubmit={handleEditBus} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pages.movementManager.buses.form.busNumber', 'Bus Number')}
                </label>
                <Input
                  value={selectedBus.busNumber}
                  onChange={(e) => setSelectedBus({ ...selectedBus, busNumber: e.target.value })}
                  placeholder={t('pages.movementManager.buses.form.busNumberPh', 'Enter bus number')}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pages.movementManager.buses.form.capacity', 'Capacity')}
                </label>
                <Input
                  type="number"
                  value={selectedBus.capacity}
                  onChange={(e) => setSelectedBus({ ...selectedBus, capacity: Number(e.target.value) })}
                  placeholder={t('pages.movementManager.buses.form.capacityPh', 'Enter capacity')}
                  min="1"
                  max="100"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pages.movementManager.buses.form.status', 'Status')}
                </label>
                <Select
                  options={[
                    { value: 'Active', label: t('pages.movementManager.buses.filters.active', 'Active') },
                    { value: 'Inactive', label: t('pages.movementManager.buses.filters.inactive', 'Inactive') },
                    { value: 'UnderMaintenance', label: t('pages.movementManager.buses.filters.underMaintenance', 'Under Maintenance') },
                    { value: 'OutOfService', label: t('pages.movementManager.buses.filters.outOfService', 'Out of Service') }
                  ]}
                  value={selectedBus.status}
                  onChange={(e) => setSelectedBus({ ...selectedBus, status: e.target.value as 'Active' | 'Inactive' | 'UnderMaintenance' | 'OutOfService' })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pages.movementManager.buses.form.speed', 'Speed (km/h)')}
                </label>
                <Input
                  type="number"
                  value={selectedBus.speed}
                  onChange={(e) => setSelectedBus({ ...selectedBus, speed: Number(e.target.value) })}
                  placeholder={t('pages.movementManager.buses.form.speedPh', 'Enter speed')}
                  min="0"
                  max="200"
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditModal(false)}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit">
                {t('pages.movementManager.buses.update', 'Update Bus')}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title={t('pages.movementManager.buses.details', 'Bus Details')}
        size="md"
      >
        {selectedBus && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Bus className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium">{t('pages.movementManager.buses.table.bus', 'Bus')} {selectedBus.busNumber}</h3>
                <p className="text-sm text-gray-500">{t('pages.movementManager.buses.table.id', 'ID')}: {selectedBus.id}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">{t('pages.movementManager.buses.table.status', 'Status')}:</span>
                <Badge 
                  variant={
                    selectedBus.status === 'Active' ? 'default' : 'secondary'
                  }
                >
                  {t(`pages.movementManager.buses.status.${selectedBus.status}`, selectedBus.status)}
                </Badge>
              </div>
              <div>
                <span className="text-gray-500">{t('pages.movementManager.buses.table.capacity', 'Capacity')}:</span>
                <p className="font-medium">{selectedBus.capacity} {t('pages.movementManager.buses.table.seatsLabel', 'seats')}</p>
              </div>
              <div>
                <span className="text-gray-500">{t('pages.movementManager.buses.table.speed', 'Speed')}:</span>
                <p className="font-medium">{selectedBus.speed} {t('pages.movementManager.buses.table.kmh', 'km/h')}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}


