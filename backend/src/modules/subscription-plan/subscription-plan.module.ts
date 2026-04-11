import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionPlanController } from './subscription-plan.controller';
import { SubscriptionPlanService } from './subscription-plan.service';
import { SubscriptionPlan, SubscriptionPlanSchema } from './subscription-plan.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SubscriptionPlan.name, schema: SubscriptionPlanSchema }]),
  ],
  controllers: [SubscriptionPlanController],
  providers: [SubscriptionPlanService],
  exports: [SubscriptionPlanService],
})
export class SubscriptionPlanModule {}
