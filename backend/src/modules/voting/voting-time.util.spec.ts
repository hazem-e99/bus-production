import {
  getSurveyAvailability,
  getZonedParts,
  isOpenAt,
  ONE_TIME_VOTE_KEY,
  parseHHmm,
  previousDateKey,
  sessionDateKey,
} from './voting-time.util';

const m = (hhmm: string) => parseHHmm(hhmm) as number;

describe('voting-time.util', () => {
  describe('parseHHmm', () => {
    it('parses valid times', () => {
      expect(parseHHmm('00:00')).toBe(0);
      expect(parseHHmm('09:30')).toBe(570);
      expect(parseHHmm('23:59')).toBe(1439);
    });

    it('rejects invalid times', () => {
      for (const v of ['24:00', '9:30', '12:60', '', 'abc', undefined, null]) {
        expect(parseHHmm(v as any)).toBeNull();
      }
    });
  });

  describe('isOpenAt - overnight 18:30 -> 09:30', () => {
    const cases: Array<[string, boolean]> = [
      ['18:29', false],
      ['18:30', true],
      ['23:59', true],
      ['00:00', true],
      ['06:00', true],
      ['09:29', true],
      ['09:30', false],
      ['12:00', false],
    ];
    it.each(cases)('%s -> open=%s', (now, expected) => {
      expect(isOpenAt(m(now), m('18:30'), m('09:30'))).toBe(expected);
    });
  });

  describe('isOpenAt - same-day 08:00 -> 14:00', () => {
    const cases: Array<[string, boolean]> = [
      ['07:59', false],
      ['08:00', true],
      ['13:59', true],
      ['14:00', false],
      ['23:00', false],
    ];
    it.each(cases)('%s -> open=%s', (now, expected) => {
      expect(isOpenAt(m(now), m('08:00'), m('14:00'))).toBe(expected);
    });
  });

  it('isOpenAt is never open when open === close', () => {
    expect(isOpenAt(m('09:00'), m('09:00'), m('09:00'))).toBe(false);
  });

  describe('sessionDateKey', () => {
    it('keeps the evening part of an overnight window on the same date', () => {
      expect(sessionDateKey('2026-10-02', m('18:30'), m('18:30'), m('09:30'))).toBe('2026-10-02');
      expect(sessionDateKey('2026-10-02', m('23:59'), m('18:30'), m('09:30'))).toBe('2026-10-02');
    });

    it('maps the after-midnight part of an overnight window to the previous date', () => {
      expect(sessionDateKey('2026-10-03', m('00:00'), m('18:30'), m('09:30'))).toBe('2026-10-02');
      expect(sessionDateKey('2026-10-03', m('09:29'), m('18:30'), m('09:30'))).toBe('2026-10-02');
    });

    it('uses today for same-day windows', () => {
      expect(sessionDateKey('2026-10-02', m('08:00'), m('08:00'), m('14:00'))).toBe('2026-10-02');
    });
  });

  describe('previousDateKey', () => {
    it('crosses month, year and leap-day boundaries', () => {
      expect(previousDateKey('2026-10-01')).toBe('2026-09-30');
      expect(previousDateKey('2027-01-01')).toBe('2026-12-31');
      expect(previousDateKey('2028-03-01')).toBe('2028-02-29');
      expect(previousDateKey('2027-03-01')).toBe('2027-02-28');
    });
  });

  describe('getZonedParts (Africa/Cairo)', () => {
    it('converts UTC to Cairo summer time (UTC+3) across midnight', () => {
      expect(getZonedParts(new Date('2026-10-02T22:30:00Z'), 'Africa/Cairo')).toEqual({
        dateKey: '2026-10-03',
        minutes: m('01:30'),
      });
    });

    it('converts UTC to Cairo winter time (UTC+2)', () => {
      expect(getZonedParts(new Date('2026-01-15T22:30:00Z'), 'Africa/Cairo')).toEqual({
        dateKey: '2026-01-16',
        minutes: m('00:30'),
      });
    });

    it('does not depend on the server timezone', () => {
      expect(getZonedParts(new Date('2026-10-02T10:00:00Z'), 'UTC')).toEqual({ dateKey: '2026-10-02', minutes: m('10:00') });
    });
  });

  describe('getSurveyAvailability', () => {
    const overnight = { isActive: true, isRecurringDaily: true, dailyOpenTime: '18:30', dailyCloseTime: '09:30', windowSemantics: 'open' };
    // Cairo is UTC+3 on these dates (summer time).
    const cairo = (date: string, hhmm: string) => {
      const [h, mi] = hhmm.split(':').map(Number);
      return new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), h - 3, mi));
    };

    it('is open in the evening and keys the vote to that date', () => {
      const a = getSurveyAvailability(overnight, cairo('2026-10-02', '23:00'));
      expect(a).toMatchObject({ isOpen: true, closedReason: null, voteDateKey: '2026-10-02' });
    });

    it('is open after midnight and keys the vote to the previous evening session', () => {
      const a = getSurveyAvailability(overnight, cairo('2026-10-03', '01:00'));
      expect(a).toMatchObject({ isOpen: true, voteDateKey: '2026-10-02' });
    });

    it('23:00 and 01:00 in the same overnight session share one dedup key', () => {
      const evening = getSurveyAvailability(overnight, cairo('2026-10-02', '23:00'));
      const night = getSurveyAvailability(overnight, cairo('2026-10-03', '01:00'));
      expect(evening.voteDateKey).toBe(night.voteDateKey);
    });

    it('is closed during the day', () => {
      const a = getSurveyAvailability(overnight, cairo('2026-10-03', '12:00'));
      expect(a).toMatchObject({ isOpen: false, closedReason: 'outsideWindow' });
    });

    it('compares start/end dates against the session date', () => {
      const ending = { ...overnight, endDate: '2026-10-02' };
      expect(getSurveyAvailability(ending, cairo('2026-10-03', '01:00')).isOpen).toBe(true);
      expect(getSurveyAvailability(ending, cairo('2026-10-03', '19:00'))).toMatchObject({ isOpen: false, closedReason: 'ended' });

      const starting = { ...overnight, startDate: '2026-10-03' };
      expect(getSurveyAvailability(starting, cairo('2026-10-03', '01:00'))).toMatchObject({ isOpen: false, closedReason: 'notStarted' });
      expect(getSurveyAvailability(starting, cairo('2026-10-03', '19:00')).isOpen).toBe(true);
    });

    it('reports inactive surveys as closed', () => {
      expect(getSurveyAvailability({ ...overnight, isActive: false }, cairo('2026-10-02', '23:00')).closedReason).toBe('inactive');
    });

    it('treats a misconfigured recurring survey (equal or missing times) as closed', () => {
      expect(getSurveyAvailability({ ...overnight, dailyCloseTime: '18:30' }, cairo('2026-10-02', '23:00')).isOpen).toBe(false);
      expect(getSurveyAvailability({ ...overnight, dailyOpenTime: undefined }, cairo('2026-10-02', '23:00')).isOpen).toBe(false);
    });

    it("uses the 'once' key for non-recurring surveys", () => {
      const a = getSurveyAvailability({ isActive: true, isRecurringDaily: false }, cairo('2026-10-02', '12:00'));
      expect(a).toMatchObject({ isOpen: true, voteDateKey: ONE_TIME_VOTE_KEY });
    });

    it('non-recurring surveys ignore their stored times with or without the marker', () => {
      for (const windowSemantics of [undefined, 'open']) {
        const s = { isActive: true, isRecurringDaily: false, dailyOpenTime: '09:00', dailyCloseTime: '17:00', windowSemantics };
        expect(getSurveyAvailability(s, cairo('2026-10-02', '12:00'))).toMatchObject({ isOpen: true, voteDateKey: ONE_TIME_VOTE_KEY });
      }
    });
  });

  describe('getSurveyAvailability - legacy compatibility (recurring, no marker)', () => {
    const cairo = (date: string, hhmm: string) => {
      const [h, mi] = hhmm.split(':').map(Number);
      return new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), h - 3, mi));
    };
    const legacy = (dailyOpenTime?: string, dailyCloseTime?: string) =>
      ({ isActive: true, isRecurringDaily: true, dailyOpenTime, dailyCloseTime });
    const openAt = (s: any, hhmm: string, date = '2026-10-02') => getSurveyAvailability(s, cairo(date, hhmm)).isOpen;

    it('keeps the old closed-window rule for 08:00-14:00: closed 08:00..14:00 inclusive, open otherwise', () => {
      const s = legacy('08:00', '14:00');
      expect(openAt(s, '07:59')).toBe(true);
      expect(openAt(s, '08:00')).toBe(false);
      expect(openAt(s, '13:59')).toBe(false);
      expect(openAt(s, '14:00')).toBe(false);
      expect(openAt(s, '14:01')).toBe(true);
      expect(openAt(s, '23:30')).toBe(true);
    });

    it('the same times WITH the marker use the new open-window rule instead', () => {
      const s = { ...legacy('08:00', '14:00'), windowSemantics: 'open' };
      expect(openAt(s, '07:59')).toBe(false);
      expect(openAt(s, '08:00')).toBe(true);
      expect(openAt(s, '13:59')).toBe(true);
      expect(openAt(s, '14:00')).toBe(false);
    });

    it('a skipped 20:00 -> 06:00 legacy survey stays always open (the old check never matched) and does not become an overnight window', () => {
      const s = legacy('20:00', '06:00');
      for (const t of ['00:00', '05:59', '06:00', '12:00', '19:59', '20:00', '23:59']) expect(openAt(s, t)).toBe(true);
    });

    it('a skipped equal-time legacy survey is closed only during that minute, as before', () => {
      const s = legacy('09:00', '09:00');
      expect(openAt(s, '08:59')).toBe(true);
      expect(openAt(s, '09:00')).toBe(false);
      expect(openAt(s, '09:01')).toBe(true);
    });

    it('uses the old lenient parser: "9:30" was accepted as 09:30', () => {
      const s = legacy('9:30', '10:00');
      expect(openAt(s, '09:29')).toBe(true);
      expect(openAt(s, '09:30')).toBe(false);
      expect(openAt(s, '10:00')).toBe(false);
      expect(openAt(s, '10:01')).toBe(true);
    });

    it('unparseable or missing legacy times mean "never closed", as before', () => {
      for (const s of [legacy('9:30', '25:00'), legacy('08:00', undefined), legacy(undefined, undefined), legacy('', '')]) {
        for (const t of ['00:00', '09:30', '12:00', '23:59']) expect(openAt(s, t)).toBe(true);
      }
    });

    it('keys votes by calendar date (no overnight sessions) and checks start/end against the calendar date', () => {
      const s = legacy('08:00', '14:00');
      expect(getSurveyAvailability(s, cairo('2026-10-03', '01:00')).voteDateKey).toBe('2026-10-03');
      expect(getSurveyAvailability({ ...s, endDate: '2026-10-02' }, cairo('2026-10-03', '01:00')).closedReason).toBe('ended');
      expect(getSurveyAvailability({ ...s, startDate: '2026-10-03' }, cairo('2026-10-03', '01:00')).isOpen).toBe(true);
    });
  });
});
