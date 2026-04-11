'use client';

import { Bus } from '@/types/bus';

export interface MapboxMapProps {
  buses?: Bus[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: number;
  showBuses?: boolean;
}

export const MapboxMap = ({
  buses = [],
  height = 400,
  showBuses = true,
}: MapboxMapProps) => {
  const activeBuses = buses.filter(bus => bus.status === 'Active');

  return (
    <div 
      style={{ height: `${height}px` }}
      className="flex items-center justify-center bg-gradient-to-br from-[#E3F2FD] to-[#BBDEFB] border border-[#E3F2FD] rounded-lg"
    >
      <div className="text-center text-[#1565C0]">
        <div className="w-20 h-20 mx-auto mb-4 bg-[#E3F2FD] rounded-full flex items-center justify-center shadow-lg">
          <svg className="w-10 h-10 text-[#2196F3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        
        {showBuses && buses.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-[#1565C0]">Fleet Map</h3>
            <div className="p-4 bg-white rounded-lg border border-[#E3F2FD] shadow-sm">
              <p className="text-sm font-medium text-[#1565C0]">
                Total Buses: {buses.length}
              </p>
              <p className="text-xs text-[#2196F3] mt-1">
                Active: {activeBuses.length} | Inactive: {buses.length - activeBuses.length}
              </p>
              <div className="flex justify-center space-x-4 mt-3 text-xs text-[#1976D2]">
                <span>Fleet Status Overview</span>
              </div>
            </div>
            <p className="text-xs text-[#1976D2]">
              Interactive map will be available with Mapbox integration
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-[#1565C0]">Map View</h3>
            <p className="text-sm text-[#2196F3]">No buses available</p>
            <p className="text-xs text-[#1976D2]">
              Interactive map will be available with Mapbox integration
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
