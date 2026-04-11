import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, Query, UseGuards, UseInterceptors,
  UploadedFile, Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/Users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getAll(@Query('email') email?: string) {
    if (email) {
      return this.usersService.getByEmail(email);
    }
    return this.usersService.getAll();
  }

  @Get('profile')
  async getProfile(@CurrentUser('userId') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Get('by-role/:role')
  async getByRole(@Param('role') role: string) {
    return this.usersService.getByRole(role);
  }

  @Get('students-data')
  async getStudentsData() {
    return this.usersService.getStudentsData();
  }

  @Get('students-data/:id')
  async getStudentDataById(@Param('id') id: string) {
    return this.usersService.getStudentDataById(id);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.usersService.getById(id);
  }

  @Post('change-password')
  async changePassword(
    @CurrentUser('userId') userId: string,
    @Body() payload: { currentPassword: string; password: string; confirmPassword: string },
  ) {
    return this.usersService.changePassword(userId, payload);
  }

  @Put('profile')
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() payload: any,
  ) {
    return this.usersService.updateProfile(userId, payload);
  }

  @Put('driver-profile')
  async updateDriverProfile(
    @CurrentUser('userId') userId: string,
    @Body() payload: any,
  ) {
    return this.usersService.updateProfile(userId, payload);
  }

  @Put('movement-manager-profile')
  async updateMovementManagerProfile(
    @CurrentUser('userId') userId: string,
    @Body() payload: any,
  ) {
    return this.usersService.updateProfile(userId, payload);
  }

  @Put('admin-profile')
  async updateAdminProfile(
    @CurrentUser('userId') userId: string,
    @Body() payload: any,
  ) {
    return this.usersService.updateProfile(userId, payload);
  }

  @Put('student-profile')
  async updateStudentProfile(
    @CurrentUser('userId') userId: string,
    @Body() payload: any,
  ) {
    return this.usersService.updateProfile(userId, payload);
  }

  @Put('update-profile-picture')
  @UseInterceptors(FileInterceptor('profilePicture'))
  async updateProfilePicture(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const fileUrl = `/uploads/${file.filename || file.originalname}`;
    return this.usersService.updateProfilePicture(userId, fileUrl);
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  @Patch(':id')
  async updateUser(@Param('id') id: string, @Body() payload: any) {
    return this.usersService.updateUser(id, payload);
  }
}
