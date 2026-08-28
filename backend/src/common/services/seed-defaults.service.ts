import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DepartmentService } from '../../modules/department/department.service';
import { YearOfStudyService } from '../../modules/year-of-study/year-of-study.service';

/**
 * Seeds the admin-managed Department and YearOfStudy lists with the values
 * that used to be hardcoded in frontend/src/lib/constants.ts, so migrating
 * to admin-managed lists doesn't blank out these dropdowns or break existing
 * students whose saved department/yearOfStudy match these names exactly.
 *
 * Runs on every boot but only inserts names that don't already exist (checked
 * by name), so it's safe to re-run and never resurrects a value the admin has
 * since deleted. Seeding goes through each service's real create() (which
 * calls Model.create(), triggering the schema's pre('save') numericId hook)
 * rather than a raw upsert, so every seeded document gets a correct
 * numericId immediately on first boot.
 */
@Injectable()
export class SeedDefaultsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedDefaultsService.name);

  private readonly DEFAULT_DEPARTMENTS = [
    'علاج طبيعي',
    'طب اسنان',
    'صيدلة',
    'تمريض',
    'ذكاء اصطناعي',
    'حقوق',
    'علوم صحية',
    'علوم حيوية',
    'لغات وترجمه',
    'فنون تطبيقيه',
    'الإدارة و العلوم المالية و الاقتصادية',
  ];

  private readonly DEFAULT_YEARS = [
    'FirstYear',
    'SecondYear',
    'ThirdYear',
    'FourthYear',
    'FifthYear',
  ];

  constructor(
    private readonly departmentService: DepartmentService,
    private readonly yearOfStudyService: YearOfStudyService,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.seed(this.departmentService, this.DEFAULT_DEPARTMENTS, 'department');
      await this.seed(this.yearOfStudyService, this.DEFAULT_YEARS, 'year of study');
    } catch (error: any) {
      this.logger.error('❌ Failed to seed default departments/years of study:', error.stack);
    }
  }

  private async seed(
    service: { getAll(): Promise<{ data: any[] | null }>; create(dto: { name: string; isActive: boolean }): Promise<any> },
    names: string[],
    label: string,
  ) {
    const existing = new Set((await service.getAll()).data?.map((item) => item.name) ?? []);
    let seededCount = 0;
    for (const name of names) {
      if (!existing.has(name)) {
        await service.create({ name, isActive: true });
        seededCount++;
      }
    }
    if (seededCount > 0) {
      this.logger.log(`  Seeded ${seededCount} default ${label}(s).`);
    }
  }
}
