/**
 * Pure date/time helpers for Voting. No Nest dependencies so they can be unit-tested directly.
 *
 * Daily recurring surveys define an OPEN window [open, close) in "HH:mm":
 *   - same-day  (open < close): 08:00 -> 14:00 is open from 08:00 up to (not including) 14:00
 *   - overnight (open > close): 18:30 -> 09:30 is open from 18:30 until 09:30 the next morning
 *   - open === close is rejected by validation.
 *
 * All calculations use VOTING_TIMEZONE (Egypt by default) instead of the server's local time,
 * so the result does not depend on how the VPS clock/timezone is configured.
 */

export const VOTING_TIMEZONE = process.env.APP_TIMEZONE || 'Africa/Cairo';

/** Key used for non-recurring surveys: one vote per student, ever. */
export const ONE_TIME_VOTE_KEY = 'once';

export const HH_MM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface ZonedParts {
  /** Calendar date in the target timezone, "YYYY-MM-DD". */
  dateKey: string;
  /** Minutes since midnight in the target timezone (0..1439). */
  minutes: number;
}

export function getZonedParts(now: Date = new Date(), timeZone: string = VOTING_TIMEZONE): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

/** Parses strict "HH:mm" (00:00..23:59) to minutes since midnight, or null when invalid. */
export function parseHHmm(value?: string | null): number | null {
  if (value === undefined || value === null) return null;
  const match = String(value).trim().match(HH_MM_PATTERN);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** "YYYY-MM-DD" of the day before the given "YYYY-MM-DD". */
export function previousDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/** Accepts "YYYY-MM-DD" or ISO-like values and keeps the date part only. */
export function normalizeDateOnly(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed;
}

export function isOvernightWindow(openMin: number, closeMin: number): boolean {
  return openMin > closeMin;
}

/** Whether `nowMin` falls inside the open window [open, close). */
export function isOpenAt(nowMin: number, openMin: number, closeMin: number): boolean {
  if (openMin < closeMin) return nowMin >= openMin && nowMin < closeMin;
  if (openMin > closeMin) return nowMin >= openMin || nowMin < closeMin;
  return false;
}

/**
 * Date of the voting session that `now` belongs to. For an overnight window, the part after
 * midnight belongs to the session that opened the previous evening.
 */
export function sessionDateKey(todayKey: string, nowMin: number, openMin: number, closeMin: number): string {
  if (isOvernightWindow(openMin, closeMin) && nowMin < closeMin) {
    return previousDateKey(todayKey);
  }
  return todayKey;
}

/** Marker stored on surveys whose daily times use the OPEN-window meaning. */
export const OPEN_WINDOW_SEMANTICS = 'open';

// ==================== Legacy closed-window compatibility ====================
// Recurring surveys stored before the OPEN-window change (no `windowSemantics` marker) keep the
// exact rules they had before, until an admin re-saves them. These helpers reproduce the old code.

/** The pre-change time parser: 1-2 digit hour, so "9:30" was accepted. Null when unparseable. */
export function parseLegacyTime(value?: string | null): number | null {
  if (!value) return null;
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/**
 * The pre-change rule: voting was blocked while closedFrom <= now <= closedTo (both inclusive, no
 * midnight crossing). If either time was unparseable the survey was never closed.
 */
export function isInsideLegacyClosedWindow(nowMin: number, closedFrom: number | null, closedTo: number | null): boolean {
  if (closedFrom === null || closedTo === null) return false;
  return nowMin >= closedFrom && nowMin <= closedTo;
}

/** True for recurring surveys that have not been converted to (or re-saved with) OPEN-window times. */
export function usesLegacyClosedWindow(survey: { isRecurringDaily?: boolean; windowSemantics?: string | null }): boolean {
  return !!survey.isRecurringDaily && survey.windowSemantics !== OPEN_WINDOW_SEMANTICS;
}

export type ClosedReason = 'inactive' | 'notStarted' | 'ended' | 'outsideWindow';

export interface SurveySchedule {
  isActive?: boolean;
  isRecurringDaily?: boolean;
  dailyOpenTime?: string | null;
  dailyCloseTime?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  /** 'open' = times are an OPEN window. Absent on unconverted legacy surveys (CLOSED window). */
  windowSemantics?: string | null;
}

export interface SurveyAvailability {
  isOpen: boolean;
  closedReason: ClosedReason | null;
  /** Dedup key for this moment: session date for daily surveys, 'once' otherwise. */
  voteDateKey: string;
  /** Date the start/end range is compared against (session date for daily surveys). */
  sessionDate: string;
}

/**
 * Single source of truth for "can a vote be cast on this survey right now, and under which key".
 * The start/end date range is compared against the session date, so a 01:00 vote that belongs to
 * a session opened on `endDate` is still accepted.
 *
 * Unconverted legacy recurring surveys (see usesLegacyClosedWindow) keep the old rules: their
 * times are a CLOSED window, and the key and date range use the calendar date (no sessions).
 */
export function getSurveyAvailability(
  survey: SurveySchedule,
  now: Date = new Date(),
  timeZone: string = VOTING_TIMEZONE,
): SurveyAvailability {
  const { dateKey: todayKey, minutes: nowMin } = getZonedParts(now, timeZone);

  let sessionDate = todayKey;
  let insideWindow = true;

  if (usesLegacyClosedWindow(survey)) {
    insideWindow = !isInsideLegacyClosedWindow(
      nowMin,
      parseLegacyTime(survey.dailyOpenTime),
      parseLegacyTime(survey.dailyCloseTime),
    );
  } else if (survey.isRecurringDaily) {
    const openMin = parseHHmm(survey.dailyOpenTime);
    const closeMin = parseHHmm(survey.dailyCloseTime);
    if (openMin === null || closeMin === null || openMin === closeMin) {
      // Misconfigured recurring survey: never open rather than guessing.
      insideWindow = false;
    } else {
      insideWindow = isOpenAt(nowMin, openMin, closeMin);
      sessionDate = sessionDateKey(todayKey, nowMin, openMin, closeMin);
    }
  }

  const voteDateKey = survey.isRecurringDaily ? sessionDate : ONE_TIME_VOTE_KEY;
  const startDate = normalizeDateOnly(survey.startDate);
  const endDate = normalizeDateOnly(survey.endDate);

  let closedReason: ClosedReason | null = null;
  if (survey.isActive === false) closedReason = 'inactive';
  else if (startDate && sessionDate < startDate) closedReason = 'notStarted';
  else if (endDate && sessionDate > endDate) closedReason = 'ended';
  else if (!insideWindow) closedReason = 'outsideWindow';

  return { isOpen: closedReason === null, closedReason, voteDateKey, sessionDate };
}
