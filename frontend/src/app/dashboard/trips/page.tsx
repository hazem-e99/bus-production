'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import TripList from '@/components/trips/TripList';
import { tripService as libTripService } from '@/lib/tripService';
import tripService from '@/services/tripService';
import type { TripResponse } from '@/types/trip';

type AdminTab = 'all' | 'completed';

export default function TripsPage() {
  const [tab, setTab] = useState<AdminTab>('all');
  const [items, setItems] = useState<TripResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      let data: TripResponse[] = [];
      if (tab === 'completed') {
        // Use services/tripService to call /Trip/completed
        data = await tripService.getCompleted();
      } else {
        // Default admin list using lib service (or same service)
        data = await libTripService.getAll();
      }
      setItems(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      const err = e as Error;
      setError(err?.message || 'Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tab]);

  return (
    <div className="container mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Trips Management</h1>

      <div className="border-b flex gap-3">
        <button
          className={`px-3 py-2 text-sm ${tab === 'all' ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-600'}`}
          onClick={() => setTab('all')}
        >All</button>
        <button
          className={`px-3 py-2 text-sm ${tab === 'completed' ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-600'}`}
          onClick={() => setTab('completed')}
        >Completed</button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{tab === 'completed' ? 'Completed Trips' : 'All Trips'}</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
          <TripList trips={items} onView={() => {}} onEdit={() => {}} onDelete={() => {}} loading={loading} i18nBase="pages.admin.trips" />
        </CardContent>
      </Card>
    </div>
  );
}
