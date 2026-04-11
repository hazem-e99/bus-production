export interface TripRecord {
	id: string;
	date: string;
	startTime?: string;
	endTime?: string;
	status: string;
	updatedAt?: string;
	actualEndTime?: string;
}

// Database interface
interface Database {
	trips: TripRecord[];
}

function isValidDate(dateStr: string): boolean {
	if (!dateStr) return false;
	const d = new Date(dateStr);
	return !isNaN(d.getTime());
}

function toDateTime(dateStr?: string, timeStr?: string): Date | null {
	if (!dateStr || !timeStr) return null;
	if (!isValidDate(dateStr)) return null;
	const dt = new Date(`${dateStr}T${timeStr}`);
	return isNaN(dt.getTime()) ? null : dt;
}

// Updates trips in-place to: scheduled (before start), in-progress (between start/end), completed (after end).
// Leaves cancelled as-is.
export function autoUpdateTripStatuses(db: Database): boolean {
	if (!db || !Array.isArray(db.trips)) return false;
	const now = new Date();
	let changed = false;
	for (const trip of db.trips) {
		if (trip.status === 'cancelled') continue;
		const startDT = toDateTime(trip.date, trip.startTime);
		const endDT = toDateTime(trip.date, trip.endTime);
		let nextStatus = trip.status;
		if (startDT && now < startDT) {
			nextStatus = 'scheduled';
		} else if (startDT && endDT && now >= startDT && now < endDT) {
			nextStatus = 'in-progress';
		} else if (endDT && now >= endDT) {
			nextStatus = 'completed';
		}
		if (nextStatus !== trip.status) {
			trip.status = nextStatus;
			trip.updatedAt = new Date().toISOString();
			changed = true;
		}
	}
	return changed;
}

// Backwards compatibility: previously only auto-completed scheduled trips
export function autoCompleteTrips(db: Database): boolean {
	return autoUpdateTripStatuses(db);
}


