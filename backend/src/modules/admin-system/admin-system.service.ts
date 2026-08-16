import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { User, UserDocument } from '../users/user.schema';
import { Bus, BusDocument } from '../buses/bus.schema';
import { Trip, TripDocument } from '../trips/trip.schema';
import { TripBooking, TripBookingDocument } from '../trip-booking/trip-booking.schema';
import { Payment, PaymentDocument } from '../payment/payment.schema';
import { Notification, NotificationDocument } from '../notifications/notification.schema';
import { SubscriptionPlan, SubscriptionPlanDocument } from '../subscription-plan/subscription-plan.schema';
import { StudentSubscription, StudentSubscriptionDocument } from '../student-subscription/student-subscription.schema';
import { TripRoute, TripRouteDocument } from '../routes/route.schema';
import { Attendance, AttendanceDocument } from '../attendance/attendance.schema';
import { VotingSurvey, VotingSurveyDocument, VoteResponse, VoteResponseDocument } from '../voting/voting.schema';
import { BusLocation, BusLocationDocument } from '../bus-tracking/bus-location.schema';

import { PurgeDatabaseDto } from './dto/purge-database.dto';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';

/** The admin must type this exact phrase (case-sensitive) to confirm the purge. */
export const PURGE_CONFIRMATION_PHRASE = 'DELETE ALL DATA';

export interface PurgeResult {
  atomic: boolean;
  deleted: Record<string, number>;
  preservedAdmin: { id: string; email: string };
}

@Injectable()
export class AdminSystemService {
  private readonly logger = new Logger(AdminSystemService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Bus.name) private readonly busModel: Model<BusDocument>,
    @InjectModel(Trip.name) private readonly tripModel: Model<TripDocument>,
    @InjectModel(TripBooking.name) private readonly tripBookingModel: Model<TripBookingDocument>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(SubscriptionPlan.name) private readonly subscriptionPlanModel: Model<SubscriptionPlanDocument>,
    @InjectModel(StudentSubscription.name) private readonly studentSubscriptionModel: Model<StudentSubscriptionDocument>,
    @InjectModel(TripRoute.name) private readonly routeModel: Model<TripRouteDocument>,
    @InjectModel(Attendance.name) private readonly attendanceModel: Model<AttendanceDocument>,
    @InjectModel(VotingSurvey.name) private readonly votingSurveyModel: Model<VotingSurveyDocument>,
    @InjectModel(VoteResponse.name) private readonly voteResponseModel: Model<VoteResponseDocument>,
    @InjectModel(BusLocation.name) private readonly busLocationModel: Model<BusLocationDocument>,
  ) {}

  /**
   * Hard-deletes every business/application collection, preserving:
   *  - the `settings` collection entirely (required system configuration), and
   *  - the User document of the admin performing the purge (never deleted, never
   *    recreated — so their password hash, role, and identity are untouched).
   */
  async purgeDatabase(adminUserId: string, dto: PurgeDatabaseDto): Promise<PurgeResult> {
    const admin = await this.userModel.findById(adminUserId).exec();
    if (!admin) {
      // Should be unreachable — the JWT was already validated against this id — but
      // never proceed with a destructive operation on an identity we can't confirm.
      throw new UnauthorizedException('Your session could not be verified.');
    }

    if (dto.confirmationPhrase !== PURGE_CONFIRMATION_PHRASE) {
      throw new AppException(
        400,
        ErrorCodes.CONFIRMATION_PHRASE_MISMATCH,
        `The confirmation phrase does not match. Type "${PURGE_CONFIRMATION_PHRASE}" exactly.`,
      );
    }

    const passwordValid = await bcrypt.compare(dto.password, admin.password);
    if (!passwordValid) {
      throw new AppException(400, ErrorCodes.CURRENT_PASSWORD_INCORRECT, 'Your current password is incorrect.');
    }

    const adminId = admin._id as Types.ObjectId;
    const { deleted, atomic } = await this.runPurge(adminId);

    this.logger.warn(
      `DATABASE_PURGE executed by adminId=${adminId.toString()} email=${admin.email} atomic=${atomic} deleted=${JSON.stringify(deleted)}`,
    );

    return {
      atomic,
      deleted,
      preservedAdmin: { id: adminId.toString(), email: admin.email },
    };
  }

  private async runPurge(adminId: Types.ObjectId): Promise<{ deleted: Record<string, number>; atomic: boolean }> {
    const session = await this.connection.startSession();
    try {
      let deleted: Record<string, number> | undefined;
      await session.withTransaction(async () => {
        deleted = await this.deleteAllCollections(adminId, session);
      });
      if (!deleted) {
        throw new AppException(500, ErrorCodes.PURGE_FAILED, 'The purge failed and no data was deleted.');
      }
      return { deleted, atomic: true };
    } catch (error: any) {
      if (this.isTransactionsUnsupported(error)) {
        this.logger.warn(
          'MongoDB deployment does not support multi-document transactions (likely a standalone instance) — falling back to a sequential, non-atomic purge.',
        );
        const deleted = await this.deleteAllCollections(adminId, undefined);
        return { deleted, atomic: false };
      }
      this.logger.error('Database purge failed; transaction rolled back, no data was deleted.', error?.stack);
      throw new AppException(
        500,
        ErrorCodes.PURGE_FAILED,
        'The purge could not be completed and was rolled back. No data was deleted.',
      );
    } finally {
      await session.endSession();
    }
  }

  private isTransactionsUnsupported(error: any): boolean {
    const message = String(error?.message || '');
    return (
      error?.code === 20 ||
      /Transaction numbers are only allowed/i.test(message) ||
      /Transactions are not supported/i.test(message) ||
      /replica set/i.test(message)
    );
  }

  private async deleteAllCollections(
    adminId: Types.ObjectId,
    session: import('mongoose').ClientSession | undefined,
  ): Promise<Record<string, number>> {
    const options = session ? { session } : {};
    const deleted: Record<string, number> = {};

    const businessCollections: Array<[string, Model<any>]> = [
      ['buses', this.busModel],
      ['trips', this.tripModel],
      ['tripBookings', this.tripBookingModel],
      ['payments', this.paymentModel],
      ['notifications', this.notificationModel],
      ['subscriptionPlans', this.subscriptionPlanModel],
      ['studentSubscriptions', this.studentSubscriptionModel],
      ['routes', this.routeModel],
      ['attendance', this.attendanceModel],
      ['votingSurveys', this.votingSurveyModel],
      ['voteResponses', this.voteResponseModel],
      ['busLocations', this.busLocationModel],
    ];

    for (const [key, model] of businessCollections) {
      const result = await model.deleteMany({}, options).exec();
      deleted[key] = result.deletedCount ?? 0;
    }

    // Users: delete everyone except the admin performing the purge.
    const userResult = await this.userModel.deleteMany({ _id: { $ne: adminId } }, options).exec();
    deleted['users'] = userResult.deletedCount ?? 0;

    return deleted;
  }
}
