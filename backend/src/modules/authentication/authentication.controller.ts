import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { LoginDTO } from './dto/login.dto';
import { StudentRegistrationDTO } from './dto/student-registration.dto';
import { StaffRegistrationDTO } from './dto/staff-registration.dto';
import { VerificationDTO } from './dto/verification.dto';
import { ForgotPasswordDTO } from './dto/forgot-password.dto';
import { ResetPasswordDTO } from './dto/reset-password.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('api/Authentication')
export class AuthenticationController {
  constructor(private readonly authService: AuthenticationService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: LoginDTO) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('registration-student')
  async registerStudent(@Body() dto: StudentRegistrationDTO) {
    return this.authService.registerStudent(dto);
  }

  @Public()
  @Post('registration-staff')
  async registerStaff(@Body() dto: StaffRegistrationDTO) {
    return this.authService.registerStaff(dto);
  }

  @Public()
  @Post('verification')
  @HttpCode(200)
  async verifyEmail(@Body() dto: VerificationDTO) {
    return this.authService.verifyEmail(dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() dto: ForgotPasswordDTO) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDTO) {
    return this.authService.resetPassword(dto);
  }
}
