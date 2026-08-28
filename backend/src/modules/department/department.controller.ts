import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { DepartmentService } from './department.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

/**
 * Admin-managed "Department" list shown as a dropdown on the student
 * registration form, the student profile edit page, and the admin
 * student-edit page. `active` must stay @Public() — registration happens
 * before login (see AuthenticationController.registerStudent). Every
 * mutating route, plus the full unfiltered list (admin CRUD page only), is
 * @Roles('Admin') — the global RolesGuard is permissive when no @Roles()
 * metadata is present, so this must be explicit or any authenticated user
 * (including students) could create/edit/delete departments.
 */
@Controller('api/Department')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Public()
  @Get('active')
  async getActive() {
    return this.departmentService.getActive();
  }

  @Roles('Admin')
  @Get()
  async getAll() {
    return this.departmentService.getAll();
  }

  @Roles('Admin')
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.departmentService.getById(parseInt(id));
  }

  @Roles('Admin')
  @Post()
  async create(@Body() dto: CreateDepartmentDto) {
    return this.departmentService.create(dto);
  }

  @Roles('Admin')
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentService.update(parseInt(id), dto);
  }

  @Roles('Admin')
  @Put(':id/activate')
  async activate(@Param('id') id: string) {
    return this.departmentService.activate(parseInt(id));
  }

  @Roles('Admin')
  @Put(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    return this.departmentService.deactivate(parseInt(id));
  }

  @Roles('Admin')
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.departmentService.delete(parseInt(id));
  }
}
