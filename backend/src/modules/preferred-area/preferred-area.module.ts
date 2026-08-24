import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PreferredAreaController } from './preferred-area.controller';
import { PreferredAreaService } from './preferred-area.service';
import { PreferredArea, PreferredAreaSchema } from './preferred-area.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PreferredArea.name, schema: PreferredAreaSchema },
    ]),
  ],
  controllers: [PreferredAreaController],
  providers: [PreferredAreaService],
  exports: [PreferredAreaService],
})
export class PreferredAreaModule {}
