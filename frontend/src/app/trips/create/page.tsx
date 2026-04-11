"use client";

import TripForm from '@/components/trips/TripForm';
import { useRouter } from 'next/navigation';

export default function CreateTripPage() {
  const router = useRouter();
  return (
    <div className="p-6 space-y-4">
      <TripForm
        mode="create"
        initial={null}
        onCancel={() => router.back()}
        onSuccess={() => router.push('/trips')}
      />
    </div>
  );
}


