import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';

@Injectable()
export class AuthenticationService {
  private idCounter = 1000;
  private readonly logger = new Logger(AuthenticationService.name);

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
      throw new AppException(401, ErrorCodes.AUTH_INVALID_CREDENTIALS, 'Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new AppException(401, ErrorCodes.AUTH_INVALID_CREDENTIALS, 'Invalid email or password.');
    }

    if (!user.isEmailVerified) {
      throw new AppException(
        403,
        ErrorCodes.AUTH_EMAIL_NOT_VERIFIED,
        'Please verify your email before signing in.',
      );
    }

    if (user.status === 'Suspended') {
      throw new AppException(
        403,
        ErrorCodes.AUTH_ACCOUNT_SUSPENDED,
        'Your account has been suspended. Please contact support.',
      );
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
      throw new AppException(400, ErrorCodes.PASSWORD_MISMATCH, 'Passwords do not match.');
    }

    const existingUser = await this.userModel.findOne({ email: dto.email }).exec();
    if (existingUser) {
      throw new AppException(
        409,
        ErrorCodes.EMAIL_ALREADY_REGISTERED,
        'An account with this email address already exists.',
      );
    }

    const existingNationalId = await this.userModel.findOne({ nationalId: dto.nationalId }).exec();
    if (existingNationalId) {
      throw new AppException(
        409,
        ErrorCodes.NATIONAL_ID_ALREADY_REGISTERED,
        'An account with this national ID already exists.',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Email verification is disabled: Gmail SMTP deliverability for OTP codes
    // is unreliable (spam placement), so accounts are activated immediately
    // instead of gating on a code the student may never receive. See
    // docs/email-deliverability.md. forgotPassword/resetPassword still email
    // a reset code and are unaffected by this.
    await this.userModel.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      nationalId: dto.nationalId,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      studentAcademicNumber: dto.studentAcademicNumber,
      department: dto.department,
      preferredArea: dto.preferredArea,
      yearOfStudy: dto.yearOfStudy,
      password: hashedPassword,
      role: 'Student',
      status: 'Active',
      isEmailVerified: true,
    });

    return createApiResponse(true, 'Student registered successfully. You can now sign in.', true);
  }

  async registerStaff(dto: StaffRegistrationDTO): Promise<ApiResponse<boolean>> {
    const existingUser = await this.userModel.findOne({ email: dto.email }).exec();
    if (existingUser) {
      throw new AppException(
        409,
        ErrorCodes.EMAIL_ALREADY_REGISTERED,
        'An account with this email address already exists.',
      );
    }

    const defaultPassword = await bcrypt.hash('DefaultPass123!', 10);

    // Email verification disabled here too — see registerStudent for why.
    await this.userModel.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      nationalId: dto.nationalId,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      role: dto.role,
      password: defaultPassword,
      status: 'Active',
      isEmailVerified: true,
    });

    return createApiResponse(true, `${dto.role} registered successfully`, true);
  }

  async verifyEmail(dto: VerificationDTO): Promise<ApiResponse<boolean>> {
    const user = await this.userModel.findOne({ email: dto.email }).exec();
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.isEmailVerified) {
      return createApiResponse(true, 'Email already verified', true);
    }

    if (user.verificationCode !== dto.verificationCode) {
      throw new AppException(
        400,
        ErrorCodes.INVALID_VERIFICATION_CODE,
        'The verification code you entered is incorrect.',
      );
    }

    if (user.verificationCodeExpires && new Date() > user.verificationCodeExpires) {
      throw new AppException(
        400,
        ErrorCodes.VERIFICATION_CODE_EXPIRED,
        'This verification code has expired. Please request a new one.',
      );
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
      // Deliberately not an error: avoid confirming/denying whether an email is registered.
      return createApiResponse(true, 'If the email exists, a reset token has been sent', true);
    }

    if (dto.action === 'verify' && dto.resetToken) {
      if (user.resetToken !== dto.resetToken) {
        throw new AppException(400, ErrorCodes.INVALID_RESET_TOKEN, 'The reset code you entered is incorrect.');
      }
      if (user.resetTokenExpires && new Date() > user.resetTokenExpires) {
        throw new AppException(
          400,
          ErrorCodes.RESET_TOKEN_EXPIRED,
          'This reset code has expired. Please request a new one.',
        );
      }
      return createApiResponse(true, 'Reset token is valid', true);
    }

    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    await this.userModel.findByIdAndUpdate(user._id, {
      resetToken,
      resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000),
    });

    try {
      await this.emailService.sendPasswordResetCode(dto.email, resetToken, user.firstName);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${dto.email}`, (error as Error)?.stack);
      throw new AppException(
        502,
        ErrorCodes.EMAIL_DELIVERY_FAILED,
        'We could not send the password reset email. Please try again later.',
      );
    }

    return createApiResponse(true, 'Reset token sent to email', true);
  }

  async resetPassword(dto: ResetPasswordDTO): Promise<ApiResponse<boolean>> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new AppException(400, ErrorCodes.PASSWORD_MISMATCH, 'Passwords do not match.');
    }

    const user = await this.userModel.findOne({ email: dto.email }).exec();
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.resetToken !== dto.resetToken) {
      throw new AppException(400, ErrorCodes.INVALID_RESET_TOKEN, 'The reset code you entered is incorrect.');
    }

    if (user.resetTokenExpires && new Date() > user.resetTokenExpires) {
      throw new AppException(
        400,
        ErrorCodes.RESET_TOKEN_EXPIRED,
        'This reset code has expired. Please request a new one.',
      );
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
