import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Setting, SettingDocument } from './setting.schema';

@Injectable()
export class SettingsService {
  constructor(@InjectModel(Setting.name) private settingModel: Model<SettingDocument>) {}

  async get() {
    let settings = await this.settingModel.findOne().exec();
    if (!settings) {
      settings = await this.settingModel.create({
        systemName: 'El Renad',
        logo: '/logo2.png',
        primaryColor: '#2563EB',
        secondaryColor: '#7C3AED',
        maintenanceMode: false,
      });
    }
    return {
      systemName: settings.systemName,
      logo: settings.logo,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
    };
  }

  async update(payload: any) {
    await this.settingModel.findOneAndUpdate({}, { $set: payload }, { upsert: true });
    return { success: true };
  }

  async getMaintenanceMode() {
    const settings = await this.settingModel.findOne().exec();
    return { maintenanceMode: settings?.maintenanceMode || false };
  }
}
