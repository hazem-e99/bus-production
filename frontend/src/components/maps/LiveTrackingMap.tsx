'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { BusLocationData } from '@/hooks/useBusTracking';

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || 'AIzaSyD-kP77Ud8nIDSHdVXOYAX_GgVxw0IdW80';

let googleMapsLoaded = false;
let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (googleMapsLoaded && window.google?.maps) return Promise.resolve();
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) {
      googleMapsLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&language=ar&region=EG`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      googleMapsLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

function createBusSvgUrl(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
    <circle cx="22" cy="22" r="20" fill="${color}" stroke="white" stroke-width="3"/>
    <g transform="translate(11,11)">
      <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z" fill="white"/>
    </g>
  </svg>`;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

interface LiveTrackingMapProps {
  locations: BusLocationData[];
  height?: number;
  busNames?: Record<number, string>;
}

export const LiveTrackingMap = ({
  locations,
  height = 500,
  busNames = {},
}: LiveTrackingMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<number, google.maps.Marker>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const hasFittedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps().then(() => {
      if (cancelled || !mapContainer.current || mapRef.current) return;

      const gmap = new google.maps.Map(mapContainer.current, {
        center: { lat: 24.7136, lng: 46.6753 },
        zoom: 11,
        gestureHandling: 'greedy',
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        mapTypeControl: false,
      });

      mapRef.current = gmap;
      infoWindowRef.current = new google.maps.InfoWindow();
      setMapReady(true);
    });

    const markers = markersRef.current;
    return () => {
      cancelled = true;
      markers.forEach(m => m.setMap(null));
      markers.clear();
      mapRef.current = null;
      infoWindowRef.current = null;
      setMapReady(false);
      hasFittedRef.current = false;
    };
  }, []);

  const buildInfoContent = useCallback((loc: BusLocationData) => {
    const busLabel = busNames[loc.busId] || `Bus ${loc.busId}`;
    const isActive = loc.isTracking !== false;
    const trackingColor = isActive ? '#22c55e' : '#94a3b8';
    const trackingStatus = isActive ? 'Active' : 'Inactive';
    const speedKmh = ((loc.speed || 0) * 3.6).toFixed(1);
    const updatedAt = loc.timestamp ? new Date(loc.timestamp).toLocaleTimeString() : 'N/A';

    return `<div style="padding:10px;min-width:180px;font-family:system-ui,sans-serif">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div style="width:12px;height:12px;border-radius:50%;background:${trackingColor}"></div>
        <strong style="font-size:15px;color:#1e293b">${busLabel}</strong>
      </div>
      <div style="font-size:13px;color:#475569;line-height:1.8">
        <div>Speed: <b>${speedKmh} km/h</b></div>
        <div>Status: <span style="color:${trackingColor};font-weight:700">${trackingStatus}</span></div>
        <div>Lat: ${loc.latitude.toFixed(6)}</div>
        <div>Lng: ${loc.longitude.toFixed(6)}</div>
        <div>Updated: ${updatedAt}</div>
      </div>
    </div>`;
  }, [busNames]);

  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const activeIds = new Set<number>();

    locations.forEach((loc) => {
      if (!loc.latitude || !loc.longitude) return;
      activeIds.add(loc.busId);

      const isActive = loc.isTracking !== false;
      const position = { lat: loc.latitude, lng: loc.longitude };
      const color = isActive ? '#22c55e' : '#94a3b8';
      const existing = markersRef.current.get(loc.busId);

      if (existing) {
        existing.setPosition(position);
        existing.setIcon({
          url: createBusSvgUrl(color),
          scaledSize: new google.maps.Size(44, 44),
          anchor: new google.maps.Point(22, 22),
        });
      } else {
        const marker = new google.maps.Marker({
          map: mapRef.current!,
          position,
          title: busNames[loc.busId] || `Bus ${loc.busId}`,
          icon: {
            url: createBusSvgUrl(color),
            scaledSize: new google.maps.Size(44, 44),
            anchor: new google.maps.Point(22, 22),
          },
          optimized: false,
        });

        marker.addListener('click', () => {
          if (infoWindowRef.current && mapRef.current) {
            infoWindowRef.current.setContent(buildInfoContent(loc));
            infoWindowRef.current.open(mapRef.current, marker);
          }
        });

        markersRef.current.set(loc.busId, marker);
      }
    });

    markersRef.current.forEach((marker, busId) => {
      if (!activeIds.has(busId)) {
        marker.setMap(null);
        markersRef.current.delete(busId);
      }
    });

    if (!hasFittedRef.current && locations.length > 0 && mapRef.current) {
      hasFittedRef.current = true;
      const validLocs = locations.filter(l => l.latitude && l.longitude);

      if (validLocs.length === 1) {
        mapRef.current.panTo({ lat: validLocs[0].latitude, lng: validLocs[0].longitude });
        mapRef.current.setZoom(15);
      } else if (validLocs.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        validLocs.forEach(l => bounds.extend({ lat: l.latitude, lng: l.longitude }));
        mapRef.current.fitBounds(bounds, 80);
      }
    }
  }, [locations, mapReady, busNames, buildInfoContent]);

  const activeBuses = locations.filter((l) => l.isTracking !== false);

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-lg">
      <div ref={mapContainer} style={{ height: `${height}px`, width: '100%' }} />
      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 z-10">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <span>{activeBuses.length} Active</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500">{locations.length} Total</span>
        </div>
      </div>
    </div>
  );
};
