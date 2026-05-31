import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attendance, AttendanceDocument } from './attendance.schema';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name) private attendanceModel: Model<AttendanceDocument>,
  ) {}

  private getNumericId(doc: any): number {
    return parseInt((doc._id as any).toString().slice(-8), 16) % 100000;
  }

  private toViewModel(att: AttendanceDocument): any {
    return {
      id: this.getNumericId(att),
      tripId: att.tripId,
      studentId: att.studentId,
      status: att.status,
      markedAt: att.markedAt?.toISOString(),
      notes: att.notes,
      createdAt: (att as any).createdAt,
      updatedAt: (att as any).updatedAt,
    };
  }

  async getAll(query?: any): Promise<any[]> {
    const filter: any = {};
    if (query?.tripId) filter.tripId = parseInt(query.tripId);
    if (query?.studentId) filter.studentId = parseInt(query.studentId);
    const records = await this.attendanceModel.find(filter).exec();
    return records.map((a) => this.toViewModel(a));
  }

  async getById(id: string): Promise<any> {
    const numId = parseInt(id);
    const record = await this.attendanceModel.findOne({ numericId: numId }).exec();
    if (!record) throw new NotFoundException('Attendance record not found');
    return this.toViewModel(record);
  }

  async create(dto: any): Promise<any> {
    const record = await this.attendanceModel.create(dto);
    return this.toViewModel(record);
  }

  async update(id: string, dto: any): Promise<any> {
    const numId = parseInt(id);
    const updated = await this.attendanceModel
      .findOneAndUpdate({ numericId: numId }, { $set: dto }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Attendance record not found');
    return this.toViewModel(updated);
  }

  async delete(id: string): Promise<any> {
    const numId = parseInt(id);
    const deleted = await this.attendanceModel.findOneAndDelete({ numericId: numId }).exec();
    if (!deleted) throw new NotFoundException('Attendance record not found');
    return { success: true, message: 'Attendance deleted' };
  }
}
