import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { YearOfStudyController } from './year-of-study.controller';
import { YearOfStudyService } from './year-of-study.service';
import { YearOfStudy, YearOfStudySchema } from './year-of-study.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: YearOfStudy.name, schema: YearOfStudySchema },
    ]),
  ],
  controllers: [YearOfStudyController],
  providers: [YearOfStudyService],
  exports: [YearOfStudyService],
})
export class YearOfStudyModule {}
