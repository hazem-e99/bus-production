import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './user.schema';
import { createApiResponse, ApiResponse } from '../../common/interfaces/api-response.interface';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  private toViewModel(user: UserDocument) {
    const id = parseInt((user._id as any).toString().slice(-8), 16) % 100000;
    return {
      id,
      profileId: id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      nationalId: user.nationalId,
      profilePictureUrl: user.profilePictureUrl,
      status: user.status,
      role: user.role,
      createdAt: (user as any).createdAt,
      updatedAt: (user as any).updatedAt,
      studentAcademicNumber: user.studentAcademicNumber,
      department: user.department,
      yearOfStudy: user.yearOfStudy,
      emergencyContact: user.emergencyContact,
      emergencyPhone: user.emergencyPhone,
      licenseNumber: user.licenseNumber,
      studentProfileId: user.role === 'Student' ? id : undefined,
    };
  }

  async getAll(): Promise<ApiResponse<any[]>> {
    const users = await this.userModel.find().select('-password').exec();
    const data = users.map((u) => this.toViewModel(u));
    return createApiResponse(data, 'Users retrieved successfully', true, data.length);
  }

  async getByRole(role: string): Promise<ApiResponse<any[]>> {
    const users = await this.userModel.find({ role }).select('-password').exec();
    const data = users.map((u) => this.toViewModel(u));
    return createApiResponse(data, `Users with role ${role} retrieved`, true, data.length);
  }

  async getById(id: string): Promise<ApiResponse<any>> {
    const user = await this.findUserByNumericId(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return createApiResponse(this.toViewModel(user));
  }

  async getByEmail(email: string): Promise<ApiResponse<any[]>> {
    const users = await this.userModel.find({ email: new RegExp(email, 'i') }).select('-password').exec();
    const data = users.map((u) => this.toViewModel(u));
    return createApiResponse(data, null, true, data.length);
  }

  async getProfile(userId: string): Promise<ApiResponse<any>> {
    const user = await this.userModel.findById(userId).select('-password').exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return createApiResponse(this.toViewModel(user));
  }

  async updateProfile(userId: string, payload: any): Promise<ApiResponse<any>> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { $set: payload }, { new: true })
      .select('-password')
      .exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return createApiResponse(this.toViewModel(user), 'Profile updated successfully');
  }

  async deleteUser(id: string): Promise<ApiResponse<boolean>> {
    const user = await this.findUserByNumericId(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.userModel.findByIdAndDelete(user._id);
    return createApiResponse(true, 'User deleted successfully');
  }

  async updateUser(id: string, payload: any): Promise<ApiResponse<any>> {
    const user = await this.findUserByNumericId(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const updated = await this.userModel
      .findByIdAndUpdate(user._id, { $set: payload }, { new: true })
      .select('-password')
      .exec();
    return createApiResponse(this.toViewModel(updated!), 'User updated');
  }

  async changePassword(userId: string, payload: { currentPassword: string; password: string; confirmPassword: string }): Promise<ApiResponse<boolean>> {
    if (payload.password !== payload.confirmPassword) {
      return createApiResponse(false, 'Passwords do not match', false);
    }
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const isValid = await bcrypt.compare(payload.currentPassword, user.password);
    if (!isValid) {
      return createApiResponse(false, 'Current password is incorrect', false);
    }
    const hashed = await bcrypt.hash(payload.password, 10);
    await this.userModel.findByIdAndUpdate(userId, { password: hashed });
    return createApiResponse(true, 'Password changed successfully');
  }

  async updateProfilePicture(userId: string, fileUrl: string): Promise<ApiResponse<any>> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { profilePictureUrl: fileUrl }, { new: true })
      .select('-password')
      .exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return createApiResponse(this.toViewModel(user), 'Profile picture updated');
  }

  async getStudentsData(): Promise<ApiResponse<any[]>> {
    const students = await this.userModel.find({ role: 'Student' }).select('-password').exec();
    const data = students.map((u) => this.toViewModel(u));
    return createApiResponse(data, null, true, data.length);
  }

  async getStudentDataById(id: string): Promise<ApiResponse<any>> {
    const user = await this.findUserByNumericId(id);
    if (!user || user.role !== 'Student') {
      throw new NotFoundException('Student not found');
    }
    return createApiResponse(this.toViewModel(user));
  }

  private async findUserByNumericId(numericId: string): Promise<UserDocument | null> {
    const id = parseInt(numericId);
    return this.userModel.findOne({ numericId: id }).select('-password').exec();
  }

  async findByMongoId(mongoId: string): Promise<UserDocument | null> {
    return this.userModel.findById(mongoId).select('-password').exec();
  }

  async findUserDocByNumericId(numericId: number): Promise<UserDocument | null> {
    return this.userModel.findOne({ numericId }).exec();
  }
}
