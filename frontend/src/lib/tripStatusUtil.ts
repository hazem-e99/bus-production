export type DerivedTripStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'delayed';

interface TripLike {
  tripDate: string; // YYYY-MM-DD
  departureTimeOnly: string; // HH:mm
  arrivalTimeOnly: string; // HH:mm
  status?: string | null;
}

const looksLikeFullDateTime = (value?: string): boolean => {
  if (!value) return false;
  return value.includes('T') || value.length > 10;
};

const ensureSeconds = (time?: string): string => {
  if (!time) return '';
  if (/^\d{2}:\d{2}$/.test(time)) return `${time}:00`;
  return time;
};

const toLocalDate = (datePart?: string, timePart?: string): Date => {
  const date = datePart || '';
  const time = ensureSeconds(timePart || '');
  if (looksLikeFullDateTime(date)) return new Date(date);
  if (looksLikeFullDateTime(time)) return new Date(time);
  if (date && time) return new Date(`${date}T${time}`);
  if (date) return new Date(`${date}T00:00:00`);
  // As a last resort, use now so code does not crash
  return new Date();
};

export const deriveTripStatus = (trip: TripLike, now: Date = new Date()): DerivedTripStatus => {
  const rawStatus = (trip.status || '').toLowerCase();
  if (rawStatus.includes('cancel')) return 'cancelled';
  if (rawStatus === 'delayed') return 'delayed';

  try {
    const start = toLocalDate(trip.tripDate, trip.departureTimeOnly);
    let end = toLocalDate(trip.tripDate, trip.arrivalTimeOnly);

    // If arrival is not valid or equals start, assume 1 hour duration
    if (!(end instanceof Date) || isNaN(end.getTime()) || end <= start) {
      end = new Date(start.getTime() + 60 * 60 * 1000);
    }

    if (now < start) return 'scheduled';
    if (now >= start && now <= end) return 'in-progress';
    return 'completed';
  } catch {
    return (rawStatus as DerivedTripStatus) || 'scheduled';
  }
};

// Utility to trigger re-render periodically where needed
export const getRefreshIntervalMs = (): number => 30_000; // 30 seconds


