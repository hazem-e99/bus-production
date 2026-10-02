import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VotingController } from './voting.controller';
import { VotingService } from './voting.service';
import { VotingWindowMigrationService } from './voting-window.migration';
import { VotingSurvey, VotingSurveySchema, VoteResponse, VoteResponseSchema } from './voting.schema';
import { User, UserSchema } from '../users/user.schema';
import { StudentSubscription, StudentSubscriptionSchema } from '../student-subscription/student-subscription.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VotingSurvey.name, schema: VotingSurveySchema },
      { name: VoteResponse.name, schema: VoteResponseSchema },
      { name: User.name, schema: UserSchema },
      // Read-only: used to check that a student has an eligible active subscription before voting.
      { name: StudentSubscription.name, schema: StudentSubscriptionSchema },
    ]),
  ],
  controllers: [VotingController],
  providers: [VotingService, VotingWindowMigrationService],
  exports: [VotingService],
})
export class VotingModule {}
