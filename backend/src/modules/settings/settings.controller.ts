import { Controller, Get, Put, Body } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('api/Settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async get() {
    return this.settingsService.get();
  }

  @Get('maintenance-mode')
  @Public()
  async getMaintenanceMode() {
    return this.settingsService.getMaintenanceMode();
  }

  @Put()
  async update(@Body() payload: any) {
    return this.settingsService.update(payload);
  }
}
