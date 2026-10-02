import { VotingWindowMigrationService } from './voting-window.migration';

/** Evaluates the subset of MongoDB filter operators the migration uses. */
function matches(doc: any, filter: Record<string, any>): boolean {
  return Object.entries(filter).every(([key, cond]) => {
    const value = doc[key];
    if (key === '_id') return value === cond;
    if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
      if ('$exists' in cond && (value !== undefined) !== cond.$exists) return false;
      if ('$nin' in cond && cond.$nin.some((v: any) => (v === null ? value === null || value === undefined : v === value))) return false;
      return true;
    }
    return value === cond;
  });
}

/** In-memory stand-in for the raw MongoDB collection. */
function fakeCollection(docs: any[]) {
  return {
    docs,
    find: (filter: any) => ({
      project: () => ({ toArray: async () => docs.filter((d) => matches(d, filter)).map((d) => ({ ...d })) }),
    }),
    updateOne: async (filter: any, update: any) => {
      const doc = docs.find((d) => matches(d, filter));
      if (!doc) return { modifiedCount: 0 };
      Object.assign(doc, update.$set);
      return { modifiedCount: 1 };
    },
  };
}

const legacyDocs = () => [
  { _id: 'valid', title: 'Valid legacy', isRecurringDaily: true, dailyOpenTime: '08:00', dailyCloseTime: '14:00' },
  { _id: 'equal', title: 'Equal times', isRecurringDaily: true, dailyOpenTime: '09:00', dailyCloseTime: '09:00' },
  { _id: 'reversed', title: 'Close before open', isRecurringDaily: true, dailyOpenTime: '20:00', dailyCloseTime: '06:00' },
  { _id: 'malformed', title: 'Malformed', isRecurringDaily: true, dailyOpenTime: '9:30', dailyCloseTime: '25:00' },
  { _id: 'missing', title: 'Missing close', isRecurringDaily: true, dailyOpenTime: '08:00' },
  { _id: 'empty', title: 'Empty times', isRecurringDaily: true, dailyOpenTime: '', dailyCloseTime: null },
  { _id: 'once', title: 'Non-recurring', isRecurringDaily: false, dailyOpenTime: '09:00', dailyCloseTime: '17:00' },
  { _id: 'done', title: 'Already migrated', isRecurringDaily: true, dailyOpenTime: '18:30', dailyCloseTime: '09:30', windowSemantics: 'open' },
];

describe('VotingWindowMigrationService', () => {
  let collection: ReturnType<typeof fakeCollection>;
  let service: VotingWindowMigrationService;
  let original: Record<string, any>;
  const byId = (id: string) => collection.docs.find((d) => d._id === id);

  beforeEach(() => {
    collection = fakeCollection(legacyDocs());
    original = Object.fromEntries(legacyDocs().map((d) => [d._id, d]));
    service = new VotingWindowMigrationService({ collection } as any);
  });

  it('converts a valid legacy window 08:00-14:00 (closed) to 14:00 -> 08:00 (open) and marks it', async () => {
    const result = await service.migrate();
    expect(result.migrated).toBe(1);
    expect(byId('valid')).toEqual({ ...original.valid, dailyOpenTime: '14:00', dailyCloseTime: '08:00', windowSemantics: 'open' });
  });

  it.each(['equal', 'reversed', 'malformed'])('leaves %s times unchanged and unmarked, and reports them', async (id) => {
    const result = await service.migrate();
    expect(byId(id)).toEqual(original[id]);
    expect(byId(id)).not.toHaveProperty('windowSemantics');
    const entry = result.skipped.find((s) => s.includes(`_id=${id} `));
    expect(entry).toContain(`title=${JSON.stringify(original[id].title)}`);
    expect(entry).toContain(`dailyOpenTime=${JSON.stringify(original[id].dailyOpenTime)}`);
    expect(entry).toContain(`dailyCloseTime=${JSON.stringify(original[id].dailyCloseTime)}`);
  });

  it.each(['missing', 'empty'])('does not select or modify recurring surveys with %s times', async (id) => {
    const result = await service.migrate();
    expect(byId(id)).toEqual(original[id]);
    expect(result.skipped.some((s) => s.includes(`_id=${id} `))).toBe(false);
  });

  it('does not select or modify non-recurring surveys (no marker added)', async () => {
    await service.migrate();
    expect(byId('once')).toEqual(original.once);
    expect(byId('once')).not.toHaveProperty('windowSemantics');
  });

  it('leaves already migrated surveys unchanged', async () => {
    await service.migrate();
    expect(byId('done')).toEqual(original.done);
  });

  it('is idempotent: a second run converts nothing and retries the skipped documents', async () => {
    await service.migrate();
    const snapshot = JSON.stringify(collection.docs);
    const second = await service.migrate();

    expect(second.migrated).toBe(0);
    expect(second.skipped).toHaveLength(3);
    expect(JSON.stringify(collection.docs)).toBe(snapshot);
  });
});
