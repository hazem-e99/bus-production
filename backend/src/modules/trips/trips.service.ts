import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Trip, TripDocument } from './trip.schema';
import { Bus, BusDocument } from '../buses/bus.schema';
import { User, UserDocument } from '../users/user.schema';
import { Notification, NotificationDocument } from '../notifications/notification.schema';
import { createApiResponse, ApiResponse } from '../../common/interfaces/api-response.interface';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    @InjectModel(Trip.name) private tripModel: Model<TripDocument>,
    @InjectModel(Bus.name) private busModel: Model<BusDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Notification.name) private notifModel: Model<NotificationDocument>,
  ) {}

  private getNumericId(doc: any): number {
    return parseInt((doc._id as any).toString().slice(-8), 16) % 100000;
  }

  private async toViewModel(trip: TripDocument) {
    const id = this.getNumericId(trip);
    const bus = await this.findEntityByNumericId(this.busModel, trip.busId);
    const driver = await this.findEntityByNumericId(this.userModel, trip.driverId);
    const conductor = await this.findEntityByNumericId(this.userModel, trip.conductorId);

    return {
      id,
      busNumber: bus?.busNumber || null,
      driverName: driver ? `${driver.firstName} ${driver.lastName}` : null,
      conductorName: conductor ? `${conductor.firstName} ${conductor.lastName}` : null,
      busId: trip.busId,
      driverId: trip.driverId,
      conductorId: trip.conductorId,
      totalSeats: bus?.capacity || 0,
      bookedSeats: trip.bookedSeats || 0,
      avalableSeates: (bus?.capacity || 0) - (trip.bookedSeats || 0),
      tripDate: trip.tripDate,
      departureTimeOnly: trip.departureTimeOnly,
      arrivalTimeOnly: trip.arrivalTimeOnly,
      status: trip.status,
      startLocation: trip.startLocation,
      endLocation: trip.endLocation,
      stopLocations: (trip.stopLocations || []).map((s, i) => ({
        id: i + 1,
        address: s.address,
        arrivalTimeOnly: s.arrivalTimeOnly,
        departureTimeOnly: s.departureTimeOnly,
      })),
    };
  }

  private async findEntityByNumericId(model: Model<any>, numericId: number): Promise<any> {
    return model.findOne({ numericId }).exec();
  }

  async findTripByNumericId(numericId: number): Promise<TripDocument | null> {
    return this.tripModel.findOne({ numericId }).exec();
  }

  async getAll(): Promise<any> {
    const trips = await this.tripModel.find().sort({ tripDate: -1 }).exec();
    const viewModels = await Promise.all(trips.map((t) => this.toViewModel(t)));
    return createApiResponse(viewModels, null, true, viewModels.length);
  }

  async getById(id: number): Promise<any> {
    const trip = await this.findTripByNumericId(id);
    if (!trip) throw new NotFoundException('Trip not found');
    const vm = await this.toViewModel(trip);
    return createApiResponse(vm);
  }

  async getByDate(date: string): Promise<any> {
    const trips = await this.tripModel.find({ tripDate: date }).exec();
    const vms = await Promise.all(trips.map((t) => this.toViewModel(t)));
    return createApiResponse(vms, null, true, vms.length);
  }

  async getByDriver(driverId: number): Promise<any> {
    const trips = await this.tripModel.find({ driverId }).exec();
    const vms = await Promise.all(trips.map((t) => this.toViewModel(t)));
    return createApiResponse(vms, null, true, vms.length);
  }

  async getByBus(busId: number): Promise<any> {
    const trips = await this.tripModel.find({ busId }).exec();
    const vms = await Promise.all(trips.map((t) => this.toViewModel(t)));
    return createApiResponse(vms, null, true, vms.length);
  }

  async getByStatus(status: string): Promise<any> {
    const trips = await this.tripModel.find({ status }).exec();
    const vms = await Promise.all(trips.map((t) => this.toViewModel(t)));
    return createApiResponse(vms, null, true, vms.length);
  }

  async getUpcoming(): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    const trips = await this.tripModel.find({
      tripDate: { $gte: today },
      status: { $in: ['Scheduled', 'InProgress'] },
    }).sort({ tripDate: 1 }).exec();
    const vms = await Promise.all(trips.map((t) => this.toViewModel(t)));
    return createApiResponse(vms, null, true, vms.length);
  }

  async getCompleted(): Promise<any> {
    const trips = await this.tripModel.find({ status: 'Completed' }).sort({ tripDate: -1 }).exec();
    const vms = await Promise.all(trips.map((t) => this.toViewModel(t)));
    return createApiResponse(vms, null, true, vms.length);
  }

  async search(query: string): Promise<any> {
    const trips = await this.tripModel.find().exec();
    const q = query.toLowerCase();
    const vms = await Promise.all(trips.map((t) => this.toViewModel(t)));
    const filtered = vms.filter((t) =>
      (t.busNumber || '').toLowerCase().includes(q) ||
      (t.driverName || '').toLowerCase().includes(q) ||
      (t.startLocation || '').toLowerCase().includes(q) ||
      (t.endLocation || '').toLowerCase().includes(q) ||
      (t.tripDate || '').includes(q)
    );
    return createApiResponse(filtered, null, true, filtered.length);
  }

  async getMyTrips(userId: number): Promise<any> {
    const driverTrips = await this.tripModel.find({
      $or: [{ driverId: userId }, { conductorId: userId }],
    }).sort({ tripDate: -1 }).exec();
    const vms = await Promise.all(driverTrips.map((t) => this.toViewModel(t)));
    return createApiResponse(vms, null, true, vms.length);
  }

  async create(tripData: any): Promise<any> {
    const trip = await this.tripModel.create(tripData);
    await this.sendTripCreationNotifications(trip);
    const vm = await this.toViewModel(trip);
    return createApiResponse(vm, 'Trip created successfully');
  }

  async update(id: number, tripData: any): Promise<any> {
    const trip = await this.findTripByNumericId(id);
    if (!trip) throw new NotFoundException('Trip not found');
    const updated = await this.tripModel
      .findByIdAndUpdate(trip._id, { $set: tripData }, { new: true })
      .exec();
    const vm = await this.toViewModel(updated!);
    return createApiResponse(vm, 'Trip updated successfully');
  }

  async updateStatus(id: number, status: string): Promise<any> {
    const trip = await this.findTripByNumericId(id);
    if (!trip) throw new NotFoundException('Trip not found');
    const updated = await this.tripModel
      .findByIdAndUpdate(trip._id, { status }, { new: true })
      .exec();
    const vm = await this.toViewModel(updated!);
    return createApiResponse(vm, 'Trip status updated');
  }

  async assignDriver(id: number, driverId: number): Promise<any> {
    const trip = await this.findTripByNumericId(id);
    if (!trip) throw new NotFoundException('Trip not found');
    const updated = await this.tripModel
      .findByIdAndUpdate(trip._id, { driverId }, { new: true })
      .exec();
    await this.notifyTripAssignment(driverId, 'Driver', updated!.tripDate, updated!.departureTimeOnly, updated!.startLocation, updated!.endLocation);
    const vm = await this.toViewModel(updated!);
    return createApiResponse(vm, 'Driver assigned');
  }

  async assignBus(id: number, busId: number): Promise<any> {
    const trip = await this.findTripByNumericId(id);
    if (!trip) throw new NotFoundException('Trip not found');
    const updated = await this.tripModel
      .findByIdAndUpdate(trip._id, { busId }, { new: true })
      .exec();
    const vm = await this.toViewModel(updated!);
    return createApiResponse(vm, 'Bus assigned');
  }

  async assignConductor(id: number, conductorId: number): Promise<any> {
    const trip = await this.findTripByNumericId(id);
    if (!trip) throw new NotFoundException('Trip not found');
    const updated = await this.tripModel
      .findByIdAndUpdate(trip._id, { conductorId }, { new: true })
      .exec();
    await this.notifyTripAssignment(conductorId, 'Conductor', updated!.tripDate, updated!.departureTimeOnly, updated!.startLocation, updated!.endLocation);
    const vm = await this.toViewModel(updated!);
    return createApiResponse(vm, 'Conductor assigned');
  }

  async renew(id: number): Promise<any> {
    const trip = await this.findTripByNumericId(id);
    if (!trip) throw new NotFoundException('Trip not found');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const newTrip = await this.tripModel.create({
      busId: trip.busId,
      driverId: trip.driverId,
      conductorId: trip.conductorId,
      tripDate: tomorrow.toISOString().split('T')[0],
      departureTimeOnly: trip.departureTimeOnly,
      arrivalTimeOnly: trip.arrivalTimeOnly,
      status: 'Scheduled',
      startLocation: trip.startLocation,
      endLocation: trip.endLocation,
      stopLocations: trip.stopLocations,
      bookedSeats: 0,
    });
    await this.sendTripCreationNotifications(newTrip);
    const vm = await this.toViewModel(newTrip);
    return createApiResponse(vm, 'Trip renewed successfully');
  }

  async delete(id: number): Promise<ApiResponse<boolean>> {
    const trip = await this.findTripByNumericId(id);
    if (!trip) throw new NotFoundException('Trip not found');
    await this.tripModel.findByIdAndDelete(trip._id);
    return createApiResponse(true, 'Trip deleted successfully');
  }

  async incrementBookedSeats(tripId: number): Promise<void> {
    const trip = await this.findTripByNumericId(tripId);
    if (trip) {
      await this.tripModel.findByIdAndUpdate(trip._id, { $inc: { bookedSeats: 1 } });
    }
  }

  async decrementBookedSeats(tripId: number): Promise<void> {
    const trip = await this.findTripByNumericId(tripId);
    if (trip) {
      await this.tripModel.findByIdAndUpdate(trip._id, { $inc: { bookedSeats: -1 } });
    }
  }

  private async notifyTripAssignment(
    userId: number,
    role: 'Driver' | 'Conductor',
    tripDate: string,
    departureTime: string,
    startLocation: string,
    endLocation: string,
  ): Promise<void> {
    if (!userId) return;
    try {
      await this.notifModel.create({
        userId,
        title: `Trip Assignment - ${role}`,
        message: `You have been assigned as ${role} for the trip on ${tripDate} (${departureTime}) from ${startLocation} to ${endLocation}.`,
        type: 'Alert',
        sentAt: new Date(),
        isRead: false,
        isDeleted: false,
      });
    } catch (err) {
      this.logger.warn(`Failed to send notification to ${role} ${userId}: ${err.message}`);
    }
  }

  private async sendTripCreationNotifications(trip: TripDocument): Promise<void> {
    const { driverId, conductorId, tripDate, departureTimeOnly, startLocation, endLocation } = trip;
    await Promise.all([
      this.notifyTripAssignment(driverId, 'Driver', tripDate, departureTimeOnly, startLocation, endLocation),
      this.notifyTripAssignment(conductorId, 'Conductor', tripDate, departureTimeOnly, startLocation, endLocation),
    ]);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleTripStatusCron(): Promise<void> {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5); // "HH:mm"

    const tripsToStart = await this.tripModel.find({
      status: 'Scheduled',
      tripDate: todayStr,
      departureTimeOnly: { $lte: currentTime },
    }).exec();

    if (tripsToStart.length > 0) {
      const ids = tripsToStart.map((t) => t._id);
      await this.tripModel.updateMany(
        { _id: { $in: ids } },
        { $set: { status: 'InProgress' } },
      );
      this.logger.log(`Auto-started ${tripsToStart.length} trip(s) to InProgress`);

      for (const trip of tripsToStart) {
        await Promise.all([
          this.notifyTripAssignment(trip.driverId, 'Driver', trip.tripDate, trip.departureTimeOnly, trip.startLocation, trip.endLocation)
            .catch(() => {}),
          this.notifModel.create({
            userId: trip.driverId,
            title: 'Trip Started',
            message: `Your trip from ${trip.startLocation} to ${trip.endLocation} is now In Progress.`,
            type: 'Alert',
            sentAt: new Date(),
            isRead: false,
            isDeleted: false,
          }).catch(() => {}),
          this.notifModel.create({
            userId: trip.conductorId,
            title: 'Trip Started',
            message: `Your trip from ${trip.startLocation} to ${trip.endLocation} is now In Progress.`,
            type: 'Alert',
            sentAt: new Date(),
            isRead: false,
            isDeleted: false,
          }).catch(() => {}),
        ]);
      }
    }
  }
}
