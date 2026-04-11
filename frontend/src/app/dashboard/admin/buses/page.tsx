'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { 
  Bus, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  BusFront,
  Settings
} from 'lucide-react';
import { busAPI } from '@/lib/api';
import { Bus as BusType, BusRequest, BusListParams } from '@/types/bus';
import { formatDate } from '@/utils/formatDate';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import Image from 'next/image';
import busTwo from '@/../public/bus_two.png';

export default function BusesPage() {
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
  const [, setIsAddingBus] = useState(false);
  const [addMessage, setAddMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editMessage, setEditMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { showToast } = useToast();
  const [confirmState, setConfirmState] = useState<{ open: boolean; busId?: number; message?: string }>({ open: false });
  const [hiddenDeletedIds, setHiddenDeletedIds] = useState<Set<string>>(new Set());
  const buildParams = (): BusListParams => {
    let minCapacity = 0;
    let maxCapacity = 0;
    if (capacityFilter === 'small') { minCapacity = 0; maxCapacity = 30; }
    if (capacityFilter === 'medium') { minCapacity = 31; maxCapacity = 60; }
    if (capacityFilter === 'large') { minCapacity = 61; maxCapacity = 0; }
    return {
      page: 0,
      pageSize: 1000, // Get all buses initially
      busNumber: searchTerm,
      status: statusFilter === 'all' ? '' : (statusFilter as 'Active' | 'Inactive' | 'UnderMaintenance' | 'OutOfService'),
      minSpeed: 0,
      maxSpeed: 0,
      minCapacity,
      maxCapacity,
    };
  };

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

  const checkBusNumberExists = async (busNumber: string): Promise<boolean> => {
    try {
      // Check if bus number exists in current loaded buses
      const existingBus = buses.find(bus => bus.busNumber === busNumber);
      if (existingBus) return true;
      
      // Also check against server to catch any duplicates not in current list
      const response = await busAPI.getAll({ 
        page: 0, 
        pageSize: 1000, 
        busNumber: busNumber,
        status: '',
        minSpeed: 0,
        maxSpeed: 0,
        minCapacity: 0,
        maxCapacity: 0
      });
      
      const busesList = Array.isArray(response) ? response : (response?.data || []);
      return busesList.some((bus: BusType) => bus.busNumber === busNumber);
    } catch (error) {
      console.error('Error checking bus number existence:', error);
      // If we can&apos;t check server, fall back to local check
      return buses.find(bus => bus.busNumber === busNumber) !== undefined;
    }
  };

  // Fetch data from API
  useEffect(() => {
    // Load hidden deleted ids from storage to avoid reappearing items after refresh until server confirms deletion
    try {
      const raw = localStorage.getItem('hiddenDeletedBuses');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setHiddenDeletedIds(new Set(arr.map(String)));
      }
    } catch {}

    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Use default params for initial load (no filters)
        const initialParams: BusListParams = {
          page: 0,
          pageSize: 1000,
          busNumber: '',
          status: '',
          minSpeed: 0,
          maxSpeed: 0,
          minCapacity: 0,
          maxCapacity: 0,
        };
        
        console.log('🔍 Fetching buses with initial params:', initialParams);
    const busesResponse = await busAPI.getAll(initialParams);
        
        console.log('📡 Raw buses response:', busesResponse);
        
        // Extract data from the new API response format (wrapped) or fallback to array
        const busesList = Array.isArray(busesResponse) ? busesResponse : (busesResponse?.data || []);
        console.log('📋 Extracted buses list:', busesList);
        
        const cleanBusesData = busesList
          .filter((bus: BusType) => bus && bus.id)
          .filter((bus: BusType) => !hiddenDeletedIds.has(String(bus.id)))
          .map((bus: BusType) => ({
            ...bus,
            id: bus.id || 0,
            busNumber: bus.busNumber || 'Unknown',
            capacity: bus.capacity || 50,
            status: bus.status || 'Active',
            speed: bus.speed || 0,
            fuelLevel: bus.fuelLevel ?? 0,
            location: bus.location && typeof bus.location === 'object'
              ? { lat: Number(bus.location.lat) || 0, lng: Number(bus.location.lng) || 0 }
              : { lat: 0, lng: 0 }
          }));
        
        console.log('✨ Clean buses data:', cleanBusesData);
        setBuses(cleanBusesData);
        
        if (cleanBusesData.length === 0) {
          console.log('ℹ️ No buses found in the system');
        } else {
          console.log(`✅ Successfully loaded ${cleanBusesData.length} buses`);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        // Set empty arrays on error to prevent crashes
        setBuses([]);
        
        // Show error toast
        showToast({ 
          type: 'error', 
          title: t('pages.admin.buses.toast.loadFailedTitle', 'Failed to load buses'), 
          message: t('pages.admin.buses.toast.loadFailedMsg', 'Please check your connection and try again.') 
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [hiddenDeletedIds, showToast, t]);

  // Filter buses based on search and filters
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
    // Remove duplicates based on ID
    .filter((bus, index, self) => 
      index === self.findIndex(b => b.id === bus.id)
    );

  const handleApplyFilters = async () => {
    try {
      setIsLoading(true);
      const updatedBusesResponse = await busAPI.getAll(buildParams());
      const busesList = Array.isArray(updatedBusesResponse) ? updatedBusesResponse : (updatedBusesResponse?.data || []);
      const cleanBusesData = busesList
        .filter((bus: BusType) => bus && bus.id)
        .filter((bus: BusType) => !hiddenDeletedIds.has(String(bus.id)))
        .map((bus: BusType) => ({
          ...bus,
          id: bus.id || 0,
          busNumber: bus.busNumber || 'Unknown',
          capacity: bus.capacity || 50,
          status: bus.status || 'Active',
          speed: bus.speed || 0,
          fuelLevel: bus.fuelLevel ?? 0,
          location: bus.location && typeof bus.location === 'object'
            ? { lat: Number(bus.location.lat) || 0, lng: Number(bus.location.lng) || 0 }
            : { lat: 0, lng: 0 }
        }));
      setBuses(cleanBusesData);
    } catch (error) {
      console.error('Failed to apply filters:', error);
      setBuses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBus = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingBus(true);
    setAddMessage(null);
    
    try {
      // Validate bus number uniqueness (check both local and server)
      const busNumberExists = await checkBusNumberExists(newBus.busNumber);
      if (busNumberExists) {
        showToast({ type: 'warning', title: 'Duplicate bus number', message: `Bus number ${newBus.busNumber} already exists. Please use a different number.` });
        setIsAddingBus(false);
        return;
      }
      
      // Create bus data with proper structure for new API
      const busData: BusRequest = {
        busNumber: newBus.busNumber,
        capacity: newBus.capacity,
        status: newBus.status,
        speed: newBus.speed
      };
      validateBusDTO(busData);

      // Create bus via API
      const response = await busAPI.create(busData);
      
      if (response && (response as { success: boolean }).success) {
        // Refresh the buses list
        const updatedBusesResponse = await busAPI.getAll(buildParams());
        const busesList = Array.isArray(updatedBusesResponse) ? updatedBusesResponse : (updatedBusesResponse?.data || []);
        const cleanBusesData = busesList
          .filter((bus: BusType) => bus && bus.id)
          .map((bus: BusType) => ({
            ...bus,
            id: bus.id || 0,
            busNumber: bus.busNumber || 'Unknown',
            capacity: bus.capacity || 50,
            status: bus.status || 'Active',
            speed: bus.speed || 0,
            fuelLevel: bus.fuelLevel ?? 0,
            location: bus.location && typeof bus.location === 'object'
              ? { lat: Number(bus.location.lat) || 0, lng: Number(bus.location.lng) || 0 }
              : { lat: 0, lng: 0 }
          }));
        setBuses(cleanBusesData);
        
        showToast({ type: 'success', title: 'Bus added', message: `Bus ${newBus.busNumber} added successfully.` });
        if ((response as { message?: string }).message) setAddMessage({ type: 'success', text: String((response as { message?: string }).message) });
        
        setShowAddModal(false);
        setNewBus({ 
          busNumber: '', 
          capacity: 50, 
          status: 'Active', 
          speed: 0
        });
      } else {
        const msg = (response as { message?: string })?.message || 'Server rejected create request.';
        setAddMessage({ type: 'error', text: msg });
      }
    } catch (error) {
      console.error('Failed to add bus:', error);
      const message = error instanceof Error ? error.message : 'Failed to add bus. Please try again.';
      showToast({ type: 'error', title: 'Add failed', message });
      setAddMessage({ type: 'error', text: message });
    } finally {
      setIsAddingBus(false);
    }
  };

  const handleEditBus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBus) return;
    setEditMessage(null);
    
    try {
      // Check if bus number is being changed and if it conflicts with existing buses
      // We need to compare against the original bus number from when edit was opened
      const originalBus = buses.find(bus => bus.id === selectedBus.id);
      if (originalBus && selectedBus.busNumber !== originalBus.busNumber) {
        const busNumberExists = await checkBusNumberExists(selectedBus.busNumber);
        if (busNumberExists) {
          showToast({ type: 'warning', title: 'Duplicate bus number', message: `Bus number ${selectedBus.busNumber} already exists. Please use a different number.` });
          return;
        }
      }

      // Update bus data with proper structure for new API
      const busData: BusRequest = {
        busNumber: selectedBus.busNumber,
        capacity: selectedBus.capacity,
        status: selectedBus.status,
        speed: selectedBus.speed
      };
      validateBusDTO(busData);
      
      // Update bus via API
      const response = await busAPI.update(selectedBus.id, busData);
      
      if (response && (response as { success: boolean }).success) {
        // Refresh the buses list
        const updatedBusesResponse = await busAPI.getAll(buildParams());
        const busesList = Array.isArray(updatedBusesResponse) ? updatedBusesResponse : (updatedBusesResponse?.data || []);
        const cleanBusesData = busesList
          .filter((bus: BusType) => bus && bus.id)
          .map((bus: BusType) => ({
            ...bus,
            id: bus.id || 0,
            busNumber: bus.busNumber || 'Unknown',
            capacity: bus.capacity || 50,
            status: bus.status || 'Active',
            speed: bus.speed || 0
          }));
        setBuses(cleanBusesData);
        
        showToast({ type: 'success', title: 'Bus updated', message: `Bus ${selectedBus.busNumber} updated successfully.` });
        if ((response as { message?: string }).message) setEditMessage({ type: 'success', text: String((response as { message?: string }).message) });
        setShowEditModal(false);
        setSelectedBus(null);
      } else {
        const msg = (response as { message?: string })?.message || 'Server rejected update request.';
        setEditMessage({ type: 'error', text: msg });
      }
    } catch (error) {
      console.error('Failed to update bus:', error);
      const message = error instanceof Error ? error.message : 'Failed to update bus. Please try again.';
      showToast({ type: 'error', title: 'Update failed', message });
      setEditMessage({ type: 'error', text: message });
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmState.busId) return;
    try {
      const response = await busAPI.delete(confirmState.busId);
      if (response.success) {
        // Refresh the buses list
        const updatedBusesResponse = await busAPI.getAll(buildParams());
        const busesList = Array.isArray(updatedBusesResponse) ? updatedBusesResponse : (updatedBusesResponse?.data || []);
        let cleanBusesData = busesList
          .filter((bus: BusType) => bus && bus.id)
          .map((bus: BusType) => ({
            ...bus,
            id: bus.id || 0,
            busNumber: bus.busNumber || 'Unknown',
            capacity: bus.capacity || 50,
            status: bus.status || 'Active',
            speed: bus.speed || 0,
            fuelLevel: bus.fuelLevel ?? 0,
            location: bus.location && typeof bus.location === 'object'
              ? { lat: Number(bus.location.lat) || 0, lng: Number(bus.location.lng) || 0 }
              : { lat: 0, lng: 0 }
          }));

        // Always hide the deleted id locally immediately
        cleanBusesData = cleanBusesData.filter((b: BusType) => String(b.id) !== String(confirmState.busId));
        const newHidden = new Set(hiddenDeletedIds);
        newHidden.add(String(confirmState.busId));
        setHiddenDeletedIds(newHidden);
        try {
          localStorage.setItem('hiddenDeletedBuses', JSON.stringify(Array.from(newHidden)));
        } catch {}

        // Background verification: poll GET /Buses/{id} a few times; if 404, remove from hidden list
        (async () => {
          const idStr = String(confirmState.busId);
          for (let i = 0; i < 5; i++) {
            try {
              await new Promise(r => setTimeout(r, 1500));
              const verify = await busAPI.getById(Number(idStr));
              const stillExists = verify && (verify as { data?: unknown }).data;
              if (!stillExists) {
                const updated = new Set(newHidden);
                updated.delete(idStr);
                setHiddenDeletedIds(updated);
                try { localStorage.setItem('hiddenDeletedBuses', JSON.stringify(Array.from(updated))); } catch {}
                break;
              }
            } catch {
              // treat errors as not found
              const updated = new Set(hiddenDeletedIds);
              updated.delete(idStr);
              setHiddenDeletedIds(updated);
              try { localStorage.setItem('hiddenDeletedBuses', JSON.stringify(Array.from(updated))); } catch {}
              break;
            }
          }
        })();

        setBuses(cleanBusesData);
        showToast({ type: 'success', title: 'Bus deleted' });
      }
    } catch (error) {
      console.error('Failed to delete bus:', error);
      showToast({ type: 'error', title: 'Delete failed', message: 'Failed to delete bus. Please try again.' });
    } finally {
      setConfirmState({ open: false });
    }
  };

  const getBusStats = () => {
    if (buses.length === 0) {
      return {
        total: 0,
        active: 0,
        maintenance: 0,
        outOfService: 0,
        totalCapacity: 0
      };
    }
    
    // Filter out invalid buses
    const validBuses = buses.filter(bus => bus && bus.id && bus.status);
    
    const stats = {
      total: validBuses.length,
      active: validBuses.filter(b => b.status === 'Active').length,
      maintenance: validBuses.filter(b => b.status === 'UnderMaintenance').length,
      outOfService: validBuses.filter(b => b.status === 'OutOfService').length,
      totalCapacity: validBuses.reduce((sum, b) => sum + (b.capacity || 0), 0)
    };
    return stats;
  };

  const busStats = getBusStats();

  if (isLoading) {
    return (
      <div className="space-y-8 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto shadow-lg"></div>
            <p className="mt-6 text-text-secondary text-lg font-medium">{t('pages.admin.buses.loading', 'Loading buses...')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('pages.admin.buses.title', 'Bus Management')}</h1>
          <p className="text-gray-600">{t('pages.admin.buses.subtitle', 'Manage fleet vehicles and their assignments')}</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          {t('pages.admin.buses.add', 'Add New Bus')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="rounded-2xl border border-gray-100 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="text-2xl font-bold text-blue-600">{busStats.total}</div>
            <p className="text-xs text-gray-500">{t('pages.admin.buses.total', 'Total Buses')}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-gray-100 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="text-2xl font-bold text-green-600">{busStats.active}</div>
            <p className="text-xs text-gray-500">{t('pages.admin.buses.active', 'Active')}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-gray-100 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="text-2xl font-bold text-yellow-600">{busStats.maintenance}</div>
            <p className="text-xs text-gray-500">{t('pages.admin.buses.maintenance', 'Maintenance')}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-gray-100 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="text-2xl font-bold text-red-600">{busStats.outOfService}</div>
            <p className="text-xs text-gray-500">{t('pages.admin.buses.outOfService', 'Out of Service')}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-gray-100 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="text-2xl font-bold text-purple-600">{busStats.totalCapacity}</div>
            <p className="text-xs text-gray-500">{t('pages.admin.buses.totalCapacity', 'Total Capacity')}</p>
          </CardContent>
        </Card>
        {/* Removed Avg Fuel card per request */}
      </div>

      {/* Filters and Search */}
  <Card>
        <CardHeader>
      <CardTitle>{t('pages.admin.buses.searchTitle', 'Search & Filters')}</CardTitle>
      <CardDescription>{t('pages.admin.buses.searchSubtitle', 'Find specific buses or filter by criteria')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
        placeholder={t('pages.admin.buses.searchPlaceholder', 'Search buses...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              options={[
        { value: 'all', label: t('pages.admin.buses.filters.allStatus', 'All Status') },
        { value: 'Active', label: t('pages.admin.buses.filters.active', 'Active') },
        { value: 'Inactive', label: t('pages.admin.buses.filters.inactive', 'Inactive') },
        { value: 'UnderMaintenance', label: t('pages.admin.buses.filters.underMaintenance', 'Under Maintenance') },
        { value: 'OutOfService', label: t('pages.admin.buses.filters.outOfService', 'Out of Service') },
              ]}
              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'Active' | 'Inactive' | 'UnderMaintenance' | 'OutOfService')}
            />
            <Select
              options={[
        { value: 'all', label: t('pages.admin.buses.filters.allCapacities', 'All Capacities') },
        { value: 'small', label: t('pages.admin.buses.filters.small', 'Small (≤30)') },
        { value: 'medium', label: t('pages.admin.buses.filters.medium', 'Medium (31-60)') },
        { value: 'large', label: t('pages.admin.buses.filters.large', 'Large (>60)') }
              ]}
              value={capacityFilter}
              onChange={(e) => setCapacityFilter(e.target.value)}
            />
            <Button variant="outline" className="w-full" onClick={handleApplyFilters}>
              <Filter className="w-4 h-4 mr-2" />
      {t('pages.admin.buses.applyFilters', 'Apply Filters')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Buses Grid (Cards) */}
      <Card>
        <CardHeader>
          <CardTitle>{t('pages.admin.buses.fleet', 'Fleet')} ({buses.length} {t('pages.admin.buses.totalShort', 'total')}, {filteredBuses.length} {t('pages.admin.buses.filteredShort', 'filtered')})</CardTitle>
          <CardDescription>{t('pages.admin.buses.fleetSubtitle', 'Manage bus assignments and status')}</CardDescription>
        </CardHeader>
        <CardContent>
          {buses.length === 0 ? (
            <div className="text-center py-8">
              <Bus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('pages.admin.buses.noBuses', 'No buses found')}</h3>
              <p className="text-gray-500 mb-4">{t('pages.admin.buses.getStarted', 'Get started by adding your first bus to the fleet.')}</p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('pages.admin.buses.addFirst', 'Add First Bus')}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredBuses.map((bus) => (
                <div key={bus.id} className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden bg-white">
                  <div className="relative h-36 w-full">
                    <Image src={busTwo} alt="Bus image" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" style={{objectFit:'cover'}} priority />
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-500">{t('pages.admin.buses.table.id', 'ID')}: <span className="font-medium text-gray-700">{bus.id}</span></div>
                        <div className="text-lg font-semibold text-gray-900">{t('pages.admin.buses.table.bus', 'Bus')} {bus.busNumber}</div>
                      </div>
                      <Badge variant={bus.status === 'Active' ? 'default' : bus.status === 'OutOfService' ? 'destructive' : 'secondary'}>
                        {bus.status === 'UnderMaintenance' ? t('pages.admin.buses.status.UnderMaintenance', 'Under Maintenance') : bus.status === 'OutOfService' ? t('pages.admin.buses.status.OutOfService', 'Out of Service') : t(`pages.admin.buses.status.${bus.status}`, bus.status)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-2 rounded-md bg-slate-50">
                        <div className="text-gray-500">{t('pages.admin.buses.table.capacity', 'Capacity')}</div>
                        <div className="font-medium">{bus.capacity} {t('pages.admin.buses.table.seatsLabel', 'seats')}</div>
                      </div>
                      <div className="p-2 rounded-md bg-slate-50">
                        <div className="text-gray-500">{t('pages.admin.buses.table.speed', 'Speed')}</div>
                        <div className="font-medium">{bus.speed} {t('pages.admin.buses.table.kmh', 'km/h')}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedBus(bus); setShowViewModal(true); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setSelectedBus(bus); setShowEditModal(true); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setConfirmState({ open: true, busId: bus.id, message: `${t('pages.admin.buses.confirmDeletePrefix', 'Delete bus')} ${bus.busNumber}?` })}>
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

      {/* Add Bus Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t('pages.admin.buses.add', 'Add New Bus')}
        size="lg"
      >
        <form onSubmit={handleAddBus} className="space-y-4">
          {addMessage && (
            <div className={addMessage.type === 'error' ? 'text-red-600 text-sm' : 'text-green-600 text-sm'}>
              {addMessage.text}
            </div>
          )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pages.admin.buses.form.busNumber', 'Bus Number')}
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {t('pages.admin.buses.form.busNumberHint', 'Must be unique. Only letters, numbers, spaces, hyphens, and underscores allowed.')}
                </p>
                <Input
                  value={newBus.busNumber}
                  onChange={(e) => setNewBus({ ...newBus, busNumber: e.target.value })}
                  placeholder={t('pages.admin.buses.form.busNumberPh', 'Enter bus number')}
                  required
                  minLength={1}
                  maxLength={20}
                  pattern="^[a-zA-Z0-9\s\-_]+$"
                  title={t('pages.admin.buses.form.busNumberTitle', 'Bus number can contain letters, numbers, spaces, hyphens, and underscores. Maximum 20 characters.')}
                />
              </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('pages.admin.buses.form.capacity', 'Capacity')}
              </label>
              <Input
                type="number"
                value={newBus.capacity}
                onChange={(e) => setNewBus({ ...newBus, capacity: Number(e.target.value) })}
                placeholder={t('pages.admin.buses.form.capacityPh', 'Enter capacity')}
                min="10"
                max="100"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('pages.admin.buses.form.status', 'Status')}
              </label>
              <Select
                options={[
                  { value: 'Active', label: t('pages.admin.buses.filters.active', 'Active') },
                  { value: 'Inactive', label: t('pages.admin.buses.filters.inactive', 'Inactive') },
                  { value: 'UnderMaintenance', label: t('pages.admin.buses.filters.underMaintenance', 'Under Maintenance') },
                  { value: 'OutOfService', label: t('pages.admin.buses.filters.outOfService', 'Out of Service') }
                ]}
                value={newBus.status}
                onChange={(e) => setNewBus({ ...newBus, status: e.target.value as 'Active' | 'Inactive' | 'UnderMaintenance' | 'OutOfService' })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('pages.admin.buses.form.speed', 'Speed (km/h)')}
              </label>
              <Input
                type="number"
                value={newBus.speed}
                onChange={(e) => setNewBus({ ...newBus, speed: Number(e.target.value) })}
                placeholder={t('pages.admin.buses.form.speedPh', 'Enter speed')}
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
              {t('pages.admin.buses.addShort', 'Add Bus')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Bus Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={t('pages.admin.buses.edit', 'Edit Bus')}
        size="lg"
      >
        {selectedBus && (
          <form onSubmit={handleEditBus} className="space-y-4">
            {editMessage && (
              <div className={editMessage.type === 'error' ? 'text-red-600 text-sm' : 'text-green-600 text-sm'}>
                {editMessage.text}
              </div>
            )}

            {/* Basic Information */}
            <div className="rounded-xl border bg-sky-50/60 p-4 space-y-4">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <BusFront className="w-4 h-4 text-blue-600" /> {t('pages.admin.buses.sections.basicInfo', 'Basic Information')}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('pages.admin.buses.form.busNumber', 'Bus Number')}
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    {t('pages.admin.buses.form.busNumberHint', 'Must be unique. Only letters, numbers, spaces, hyphens, and underscores allowed.')}
                  </p>
                  <Input
                    value={selectedBus.busNumber}
                    onChange={(e) => setSelectedBus({ ...selectedBus, busNumber: e.target.value })}
                    placeholder={t('pages.admin.buses.form.busNumberEg', 'e.g. A-102 or Campus_7')}
                    required
                    minLength={1}
                    maxLength={20}
                    pattern="^[a-zA-Z0-9\s\-_]+$"
                    title={t('pages.admin.buses.form.busNumberTitle', 'Bus number can contain letters, numbers, spaces, hyphens, and underscores. Maximum 20 characters.')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('pages.admin.buses.form.capacity', 'Capacity')}
                  </label>
                  <p className="text-xs text-gray-500 mb-2">{t('pages.admin.buses.form.capacityHint', 'Integer between 10 and 100 seats.')}</p>
                  <Input
                    type="number"
                    value={selectedBus.capacity}
                    onChange={(e) => setSelectedBus({ ...selectedBus, capacity: Number(e.target.value) })}
                    placeholder={t('pages.admin.buses.form.capacityEg', 'e.g. 50')}
                    min="10"
                    max="100"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Status & Performance */}
            <div className="rounded-xl border bg-emerald-50/60 p-4 space-y-4">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-700" /> {t('pages.admin.buses.sections.statusPerformance', 'Status & Performance')}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('pages.admin.buses.form.status', 'Status')}
                  </label>
                  <p className="text-xs text-gray-500 mb-2">{t('pages.admin.buses.form.statusHint', 'Current operational state of the bus.')}</p>
                  <Select
                    options={[
                      { value: 'Active', label: t('pages.admin.buses.filters.active', 'Active') },
                      { value: 'Inactive', label: t('pages.admin.buses.filters.inactive', 'Inactive') },
                      { value: 'UnderMaintenance', label: t('pages.admin.buses.filters.underMaintenance', 'Under Maintenance') },
                      { value: 'OutOfService', label: t('pages.admin.buses.filters.outOfService', 'Out of Service') }
                    ]}
                    value={selectedBus.status}
                    onChange={(e) => setSelectedBus({ ...selectedBus, status: e.target.value as 'Active' | 'Inactive' | 'UnderMaintenance' | 'OutOfService' })}
                    required
                  />
                  <div className="mt-2">
                    <Badge
                      variant={
                        selectedBus.status === 'Active' ? 'default' :
                        selectedBus.status === 'UnderMaintenance' ? 'secondary' :
                        selectedBus.status === 'Inactive' ? 'secondary' : 'destructive'
                      }
                    >
                      {selectedBus.status === 'UnderMaintenance' ? t('pages.admin.buses.status.UnderMaintenance', 'Under Maintenance') : selectedBus.status === 'OutOfService' ? t('pages.admin.buses.status.OutOfService', 'Out of Service') : t(`pages.admin.buses.status.${selectedBus.status}`, selectedBus.status)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('pages.admin.buses.form.speed', 'Speed (km/h)')}
                  </label>
                  <p className="text-xs text-gray-500 mb-2">{t('pages.admin.buses.form.speedHint', 'Recommended range 0–200 km/h.')}</p>
                  <Input
                    type="number"
                    value={selectedBus.speed}
                    onChange={(e) => setSelectedBus({ ...selectedBus, speed: Number(e.target.value) })}
                    placeholder={t('pages.admin.buses.form.speedEg', 'e.g. 80')}
                    min="0"
                    max="200"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditModal(false)}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit">
                {t('pages.admin.buses.update', 'Update Bus')}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* View Bus Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title={t('pages.admin.buses.details', 'Bus Details')}
        size="md"
      >
        {selectedBus && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center shadow">
                  <Bus className="w-10 h-10 text-blue-600" />
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{t('pages.admin.buses.table.bus', 'Bus')} {selectedBus.busNumber ?? '—'}</h3>
                    <p className="text-sm text-gray-500">{t('pages.admin.buses.table.id', 'ID')}: <span className="font-medium text-gray-700">{selectedBus.id ?? 'N/A'}</span></p>
                  </div>

                  <div>
                    <Badge
                      variant={
                        selectedBus.status === 'Active' ? 'default' :
                        selectedBus.status === 'UnderMaintenance' ? 'secondary' :
                        selectedBus.status === 'Inactive' ? 'secondary' : 'destructive'
                      }
                    >
                      {selectedBus.status ? (selectedBus.status === 'UnderMaintenance' ? t('pages.admin.buses.status.UnderMaintenance', 'Under Maintenance') : selectedBus.status === 'OutOfService' ? t('pages.admin.buses.status.OutOfService', 'Out of Service') : t(`pages.admin.buses.status.${selectedBus.status}`, selectedBus.status)) : t('pages.admin.buses.unknown', 'Unknown')}
                    </Badge>
                  </div>
                </div>

                <p className="mt-2 text-sm text-gray-600">{t('pages.admin.buses.overview', 'A quick overview of the vehicle status and recent telemetry.')}</p>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-gradient-to-br from-white to-slate-50 rounded-lg shadow-sm">
                <p className="text-xs text-gray-400">{t('pages.admin.buses.table.capacity', 'Capacity')}</p>
                <div className="mt-1 text-lg font-semibold text-gray-800">{selectedBus.capacity ?? 'N/A'} {t('pages.admin.buses.table.seatsLabel', 'seats')}</div>
              </div>

              <div className="p-3 bg-gradient-to-br from-white to-slate-50 rounded-lg shadow-sm">
                <p className="text-xs text-gray-400">{t('pages.admin.buses.table.speed', 'Speed')}</p>
                <div className="mt-1 text-lg font-semibold text-gray-800">{selectedBus.speed != null ? `${selectedBus.speed} ${t('pages.admin.buses.table.kmh', 'km/h')}` : 'N/A'}</div>
              </div>

              {/* Removed Fuel Level section per request */}
            </div>

            {/* Footer lines */}
            {(
              (selectedBus.updatedAt) ||
              (selectedBus.location && selectedBus.location.lat != null && selectedBus.location.lng != null && (Number(selectedBus.location.lat) !== 0 || Number(selectedBus.location.lng) !== 0))
            ) && (
              <div className="flex items-center justify-between text-sm text-gray-500">
                {selectedBus.updatedAt && (
                  <div>{t('pages.admin.buses.lastUpdated', 'Last updated')}: <span className="text-gray-700 font-medium">{formatDate(selectedBus.updatedAt)}</span></div>
                )}
                {selectedBus.location && selectedBus.location.lat != null && selectedBus.location.lng != null && (Number(selectedBus.location.lat) !== 0 || Number(selectedBus.location.lng) !== 0) && (
                  <div>{t('pages.admin.buses.location', 'Location')}: <span className="text-gray-700 font-medium">{`${String(selectedBus.location.lat).slice(0,10)}, ${String(selectedBus.location.lng).slice(0,10)}`}</span></div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowViewModal(false)}>{t('common.close', 'Close')}</Button>
              <Button type="button" onClick={() => { setShowEditModal(true); setShowViewModal(false); }}>{t('pages.admin.buses.edit', 'Edit Bus')}</Button>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={confirmState.open}
        title={t('pages.admin.buses.confirmDeleteTitle', 'Delete bus?')}
        description={confirmState.message}
        onCancel={() => setConfirmState({ open: false })}
        onConfirm={handleDeleteConfirmed}
      />
    </div>
  );
}
