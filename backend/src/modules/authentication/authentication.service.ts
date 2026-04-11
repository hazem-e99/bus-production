import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../users/user.schema';
import { LoginDTO } from './dto/login.dto';
import { StudentRegistrationDTO } from './dto/student-registration.dto';
import { StaffRegistrationDTO } from './dto/staff-registration.dto';
import { VerificationDTO } from './dto/verification.dto';
import { ForgotPasswordDTO } from './dto/forgot-password.dto';
import { ResetPasswordDTO } from './dto/reset-password.dto';
import { createApiResponse, ApiResponse } from '../../common/interfaces/api-response.interface';
import { EmailService } from './email.service';

@Injectable()
export class AuthenticationService {
  private idCounter = 1000;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {
    this.initIdCounter();
  }

  private async initIdCounter() {
    const maxUser = await this.userModel.findOne().sort({ _id: -1 }).exec();
    if (maxUser) {
      this.idCounter = Math.max(this.idCounter, parseInt((maxUser._id as any).toString().slice(-4), 16) + 1000);
    }
  }

  private getNextId(): number {
    return ++this.idCounter;
  }

  async login(loginDto: LoginDTO): Promise<ApiResponse<any>> {
    const user = await this.userModel.findOne({ email: loginDto.email }).exec();
    if (!user) {
      return createApiResponse(null, 'Invalid email or password', false);
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      return createApiResponse(null, 'Invalid email or password', false);
    }

    if (!user.isEmailVerified) {
      return createApiResponse(null, 'Email not verified. Please verify your email first.', false);
    }

    if (user.status === 'Suspended') {
      return createApiResponse(null, 'Your account has been suspended', false);
    }

    const numericId = parseInt((user._id as any).toString().slice(-8), 16) % 100000;
    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
      numericId,
    };
    const token = this.jwtService.sign(payload);

    const loginViewModel = {
      id: numericId,
      profileId: numericId,
      token,
      email: user.email,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      role: user.role,
      expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    return createApiResponse(loginViewModel, 'Login successful', true);
  }

  async registerStudent(dto: StudentRegistrationDTO): Promise<ApiResponse<boolean>> {
    if (dto.password !== dto.confirmPassword) {
      return createApiResponse(false, 'Passwords do not match', false);
    }

    const existingUser = await this.userModel.findOne({ email: dto.email }).exec();
    if (existingUser) {
      return createApiResponse(false, 'Email already registered', false);
    }

    const existingNationalId = await this.userModel.findOne({ nationalId: dto.nationalId }).exec();
    if (existingNationalId) {
      return createApiResponse(false, 'National ID already registered', false);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    await this.userModel.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      nationalId: dto.nationalId,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      studentAcademicNumber: dto.studentAcademicNumber,
      department: dto.department,
      yearOfStudy: dto.yearOfStudy,
      password: hashedPassword,
      role: 'Student',
      status: 'Active',
      isEmailVerified: false,
      verificationCode,
      verificationCodeExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await this.emailService.sendVerificationCode(dto.email, verificationCode, dto.firstName);

    return createApiResponse(true, 'Student registered successfully. Please check your email for the verification code.', true);
  }

  async registerStaff(dto: StaffRegistrationDTO): Promise<ApiResponse<boolean>> {
    const existingUser = await this.userModel.findOne({ email: dto.email }).exec();
    if (existingUser) {
      return createApiResponse(false, 'Email already registered', false);
    }

    const defaultPassword = await bcrypt.hash('DefaultPass123!', 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    await this.userModel.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      nationalId: dto.nationalId,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      role: dto.role,
      password: defaultPassword,
      status: 'Active',
      isEmailVerified: false,
      verificationCode,
      verificationCodeExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await this.emailService.sendVerificationCode(dto.email, verificationCode, dto.firstName);

    return createApiResponse(true, `${dto.role} registered successfully`, true);
  }

  async verifyEmail(dto: VerificationDTO): Promise<ApiResponse<boolean>> {
    const user = await this.userModel.findOne({ email: dto.email }).exec();
    if (!user) {
      return createApiResponse(false, 'User not found', false);
    }

    if (user.isEmailVerified) {
      return createApiResponse(true, 'Email already verified', true);
    }

    if (user.verificationCode !== dto.verificationCode) {
      return createApiResponse(false, 'Invalid verification code', false);
    }

    if (user.verificationCodeExpires && new Date() > user.verificationCodeExpires) {
      return createApiResponse(false, 'Verification code expired', false);
    }

    await this.userModel.findByIdAndUpdate(user._id, {
      isEmailVerified: true,
      verificationCode: null,
      verificationCodeExpires: null,
    });

    return createApiResponse(true, 'Email verified successfully', true);
  }

  async forgotPassword(dto: ForgotPasswordDTO): Promise<ApiResponse<boolean>> {
    const user = await this.userModel.findOne({ email: dto.email }).exec();
    if (!user) {
      return createApiResponse(true, 'If the email exists, a reset token has been sent', true);
    }

    if (dto.action === 'verify' && dto.resetToken) {
      if (user.resetToken !== dto.resetToken) {
        return createApiResponse(false, 'Invalid reset token', false);
      }
      if (user.resetTokenExpires && new Date() > user.resetTokenExpires) {
        return createApiResponse(false, 'Reset token expired', false);
      }
      return createApiResponse(true, 'Reset token is valid', true);
    }

    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    await this.userModel.findByIdAndUpdate(user._id, {
      resetToken,
      resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000),
    });

    await this.emailService.sendPasswordResetCode(dto.email, resetToken, user.firstName);

    return createApiResponse(true, 'Reset token sent to email', true);
  }

  async resetPassword(dto: ResetPasswordDTO): Promise<ApiResponse<boolean>> {
    if (dto.newPassword !== dto.confirmPassword) {
      return createApiResponse(false, 'Passwords do not match', false);
    }

    const user = await this.userModel.findOne({ email: dto.email }).exec();
    if (!user) {
      return createApiResponse(false, 'User not found', false);
    }

    if (user.resetToken !== dto.resetToken) {
      return createApiResponse(false, 'Invalid reset token', false);
    }

    if (user.resetTokenExpires && new Date() > user.resetTokenExpires) {
      return createApiResponse(false, 'Reset token expired', false);
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.userModel.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpires: null,
    });

    return createApiResponse(true, 'Password reset successfully', true);
  }
}
