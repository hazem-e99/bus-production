import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VotingController } from './voting.controller';
import { VotingService } from './voting.service';
import { VotingSurvey, VotingSurveySchema, VoteResponse, VoteResponseSchema } from './voting.schema';
import { User, UserSchema } from '../users/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VotingSurvey.name, schema: VotingSurveySchema },
      { name: VoteResponse.name, schema: VoteResponseSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [VotingController],
  providers: [VotingService],
  exports: [VotingService],
})
export class VotingModule {}
