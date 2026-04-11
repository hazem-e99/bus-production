import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StudentSubscriptionController } from './student-subscription.controller';
import { StudentSubscriptionService } from './student-subscription.service';
import { StudentSubscription, StudentSubscriptionSchema } from './student-subscription.schema';
import { User, UserSchema } from '../users/user.schema';
import { SubscriptionPlan, SubscriptionPlanSchema } from '../subscription-plan/subscription-plan.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StudentSubscription.name, schema: StudentSubscriptionSchema },
      { name: User.name, schema: UserSchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
    ]),
  ],
  controllers: [StudentSubscriptionController],
  providers: [StudentSubscriptionService],
  exports: [StudentSubscriptionService],
})
export class StudentSubscriptionModule {}
