import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import { EmailService } from './email.service';
import { JwtStrategy } from './jwt.strategy';
import { User, UserSchema } from '../users/user.schema';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRATION', '7d') },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [AuthenticationController],
  providers: [AuthenticationService, EmailService, JwtStrategy],
  exports: [AuthenticationService, JwtModule, PassportModule],
})
export class AuthenticationModule {}
