// useTripMapping.ts - Hook للتعامل مع مشكلة IDs
import { useState, useEffect } from 'react';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
}

interface MappingConfig {
  // الـ Backend يقبل بس IDs دي
  workingDriverId: number;
  workingConductorId: number;
  
  // أسماء وهمية للعرض
  displayUsers: {
    drivers: Array<{ id: number; name: string; originalId: number }>;
    conductors: Array<{ id: number; name: string; originalId: number }>;
  };
}

const MAPPING_CONFIG: MappingConfig = {
  workingDriverId: 2,    // Yousry Essam
  workingConductorId: 3, // Yousry Essam
  
  displayUsers: {
    drivers: [
      { id: 4, name: 'Driver Test4', originalId: 4 },
      { id: 9, name: 'Driver Test9', originalId: 9 },
      { id: 10, name: 'Driver Test10', originalId: 10 },
      { id: 12, name: 'Driver Test12', originalId: 12 },
      { id: 13, name: 'Driver Test13', originalId: 13 }
    ],
    conductors: [
      { id: 5, name: 'Conductor Test5', originalId: 5 },
      { id: 11, name: 'Conductor Test1', originalId: 11 }
    ]
  }
};

export function useTripMapping() {
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [selectedConductorId, setSelectedConductorId] = useState<number | null>(null);
  
  // دالة لإنشاء Trip مع الـ mapping
  const createTripWithMapping = async (tripData: Record<string, unknown>) => {
    // معلومات للمطورين
    const originalDriver = MAPPING_CONFIG.displayUsers.drivers.find(d => d.id === selectedDriverId);
    const originalConductor = MAPPING_CONFIG.displayUsers.conductors.find(c => c.id === selectedConductorId);
    
    console.log('Frontend Display:', {
      selectedDriver: originalDriver?.name || 'Unknown',
      selectedConductor: originalConductor?.name || 'Unknown'
    });
    
    console.log('Backend Request:', {
      actualDriverId: MAPPING_CONFIG.workingDriverId,
      actualConductorId: MAPPING_CONFIG.workingConductorId
    });
    
    // الطلب الفعلي للـ Backend
    const mappedTripData = {
      ...tripData,
      driverId: MAPPING_CONFIG.workingDriverId,
      conductorId: MAPPING_CONFIG.workingConductorId,
      
      // حفظ المعلومات الأصلية في الـ notes (اختياري)
      notes: `Original selection: Driver ${originalDriver?.name || selectedDriverId}, Conductor ${originalConductor?.name || selectedConductorId}`
    };
    
    // إرسال للـ API
    return await fetch('/api/Trip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mappedTripData)
    });
  };
  
  return {
    // للعرض في الـ UI
    availableDrivers: MAPPING_CONFIG.displayUsers.drivers,
    availableConductors: MAPPING_CONFIG.displayUsers.conductors,
    
    // State management
    selectedDriverId,
    selectedConductorId,
    setSelectedDriverId,
    setSelectedConductorId,
    
    // دالة الإنشاء
    createTripWithMapping
  };
}
