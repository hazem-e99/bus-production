import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BusesController } from './buses.controller';
import { BusesService } from './buses.service';
import { Bus, BusSchema } from './bus.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Bus.name, schema: BusSchema }])],
  controllers: [BusesController],
  providers: [BusesService],
  exports: [BusesService],
})
export class BusesModule {}
