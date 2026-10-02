import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VotingSurvey, VotingSurveyDocument } from './voting.schema';
import { OPEN_WINDOW_SEMANTICS, parseHHmm } from './voting-time.util';

export { OPEN_WINDOW_SEMANTICS };

/**
 * One-time conversion of daily survey windows from the legacy CLOSED-window meaning to the
 * OPEN-window meaning.
 *
 * Legacy "closed 08:00-14:00" is the same real-world schedule as "open 14:00 -> 08:00 (overnight)",
 * so swapping the two stored times keeps the survey behaving as before (apart from the single
 * boundary minute 14:00, which used to be closed and is now open).
 *
 * Scope: only unmarked recurring surveys that have both times. Non-recurring surveys are never
 * selected or modified (their times are unused).
 *
 * Only valid same-day legacy windows (both "HH:mm", closedFrom < closedTo) are converted. Anything
 * else (malformed times, equal times, closedTo < closedFrom) has no exact equivalent, so it is left
 * untouched and unmarked, logged on every startup, and retried on the next one. Until then the
 * runtime keeps evaluating it with the legacy closed-window rules (see getSurveyAvailability), so
 * its schedule does not change. Saving the survey in the admin UI stores it with the new meaning
 * and marks it.
 *
 * Idempotent: converted documents get `windowSemantics: 'open'`, and each update is guarded by the
 * marker being absent, so running twice (or on two instances at once) never swaps back.
 */
@Injectable()
export class VotingWindowMigrationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(VotingWindowMigrationService.name);

  constructor(@InjectModel(VotingSurvey.name) private readonly surveyModel: Model<VotingSurveyDocument>) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.migrate();
    } catch (error: any) {
      this.logger.error('❌ Failed to migrate voting survey windows:', error?.stack);
    }
  }

  async migrate(): Promise<{ migrated: number; skipped: string[] }> {
    // Raw collection access: bypasses schema defaults/casting so legacy values are read as stored.
    const collection = this.surveyModel.collection;
    const candidates = await collection
      .find({
        windowSemantics: { $exists: false },
        isRecurringDaily: true,
        dailyOpenTime: { $exists: true, $nin: [null, ''] },
        dailyCloseTime: { $exists: true, $nin: [null, ''] },
      })
      .project({ _id: 1, title: 1, dailyOpenTime: 1, dailyCloseTime: 1 })
      .toArray();

    let migrated = 0;
    const skipped: string[] = [];

    for (const doc of candidates) {
      const closedFrom = parseHHmm(doc.dailyOpenTime);
      const closedTo = parseHHmm(doc.dailyCloseTime);

      if (closedFrom === null || closedTo === null || closedFrom >= closedTo) {
        skipped.push(
          `_id=${doc._id} title=${JSON.stringify(doc.title)} dailyOpenTime=${JSON.stringify(doc.dailyOpenTime)} dailyCloseTime=${JSON.stringify(doc.dailyCloseTime)}`,
        );
        continue;
      }

      const result = await collection.updateOne(
        { _id: doc._id, windowSemantics: { $exists: false } },
        {
          $set: {
            dailyOpenTime: doc.dailyCloseTime,
            dailyCloseTime: doc.dailyOpenTime,
            windowSemantics: OPEN_WINDOW_SEMANTICS,
          },
        },
      );
      if (result.modifiedCount === 1) migrated++;
    }

    if (migrated > 0) {
      this.logger.log(`✅ Voting window migration: converted ${migrated} daily survey(s) from closed-window to open-window times.`);
    }
    if (skipped.length > 0) {
      this.logger.warn(
        `⚠️ Voting window migration skipped ${skipped.length} daily survey(s) whose legacy times cannot be converted safely ` +
        `(left unchanged; will be retried on next startup; re-save them in the admin UI to fix): ${skipped.join('; ')}`,
      );
    }
    return { migrated, skipped };
  }
}
