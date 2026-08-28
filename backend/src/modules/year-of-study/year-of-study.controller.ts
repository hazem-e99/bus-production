import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { YearOfStudyService } from './year-of-study.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateYearOfStudyDto } from './dto/create-year-of-study.dto';
import { UpdateYearOfStudyDto } from './dto/update-year-of-study.dto';

/**
 * Admin-managed "Year of Study" list shown as a dropdown on the student
 * registration form, the student profile edit page, and the admin
 * student-edit page. `active` must stay @Public() — registration happens
 * before login (see AuthenticationController.registerStudent). Every
 * mutating route, plus the full unfiltered list (admin CRUD page only), is
 * @Roles('Admin') — the global RolesGuard is permissive when no @Roles()
 * metadata is present, so this must be explicit or any authenticated user
 * (including students) could create/edit/delete years of study.
 */
@Controller('api/YearOfStudy')
export class YearOfStudyController {
  constructor(private readonly yearOfStudyService: YearOfStudyService) {}

  @Public()
  @Get('active')
  async getActive() {
    return this.yearOfStudyService.getActive();
  }

  @Roles('Admin')
  @Get()
  async getAll() {
    return this.yearOfStudyService.getAll();
  }

  @Roles('Admin')
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.yearOfStudyService.getById(parseInt(id));
  }

  @Roles('Admin')
  @Post()
  async create(@Body() dto: CreateYearOfStudyDto) {
    return this.yearOfStudyService.create(dto);
  }

  @Roles('Admin')
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateYearOfStudyDto) {
    return this.yearOfStudyService.update(parseInt(id), dto);
  }

  @Roles('Admin')
  @Put(':id/activate')
  async activate(@Param('id') id: string) {
    return this.yearOfStudyService.activate(parseInt(id));
  }

  @Roles('Admin')
  @Put(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    return this.yearOfStudyService.deactivate(parseInt(id));
  }

  @Roles('Admin')
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.yearOfStudyService.delete(parseInt(id));
  }
}
