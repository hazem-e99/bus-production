import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { PreferredAreaService } from './preferred-area.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreatePreferredAreaDto } from './dto/create-preferred-area.dto';
import { UpdatePreferredAreaDto } from './dto/update-preferred-area.dto';

/**
 * Admin-managed "Preferred Area" list shown as a dropdown on the student
 * registration form. `active` must stay @Public() — registration happens
 * before login (see AuthenticationController.registerStudent). Every
 * mutating route, plus the full unfiltered list (admin CRUD page only), is
 * @Roles('Admin') — the global RolesGuard is permissive when no @Roles()
 * metadata is present, so this must be explicit or any authenticated user
 * (including students) could create/edit/delete areas.
 */
@Controller('api/PreferredArea')
export class PreferredAreaController {
  constructor(private readonly areaService: PreferredAreaService) {}

  @Public()
  @Get('active')
  async getActive() {
    return this.areaService.getActive();
  }

  @Roles('Admin')
  @Get()
  async getAll() {
    return this.areaService.getAll();
  }

  @Roles('Admin')
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.areaService.getById(parseInt(id));
  }

  @Roles('Admin')
  @Post()
  async create(@Body() dto: CreatePreferredAreaDto) {
    return this.areaService.create(dto);
  }

  @Roles('Admin')
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePreferredAreaDto) {
    return this.areaService.update(parseInt(id), dto);
  }

  @Roles('Admin')
  @Put(':id/activate')
  async activate(@Param('id') id: string) {
    return this.areaService.activate(parseInt(id));
  }

  @Roles('Admin')
  @Put(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    return this.areaService.deactivate(parseInt(id));
  }

  @Roles('Admin')
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.areaService.delete(parseInt(id));
  }
}
