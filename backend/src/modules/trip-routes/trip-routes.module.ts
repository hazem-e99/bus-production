import { Module } from '@nestjs/common';
import { TripRoutesController } from './trip-routes.controller';
import { RoutesModule } from '../routes/routes.module';

@Module({
  imports: [RoutesModule],
  controllers: [TripRoutesController],
})
export class TripRoutesModule {}
