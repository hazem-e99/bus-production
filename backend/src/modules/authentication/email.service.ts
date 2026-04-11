import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
  }

  async sendVerificationCode(to: string, code: string, name: string): Promise<void> {
    const mailOptions = {
      from: `"Bus System" <${this.configService.get<string>('MAIL_USER')}>`,
      to,
      subject: 'Email Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e3a5f; text-align: center;">Verify Your Email</h2>
          <p>Hello ${name},</p>
          <p>Your verification code is:</p>
          <div style="background: #f0f4ff; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e3a5f;">${code}</span>
          </div>
          <p>This code expires in <strong>24 hours</strong>.</p>
          <p style="color: #888; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${to}`, error.stack);
      throw error;
    }
  }

  async sendPasswordResetCode(to: string, code: string, name: string): Promise<void> {
    const mailOptions = {
      from: `"Bus System" <${this.configService.get<string>('MAIL_USER')}>`,
      to,
      subject: 'Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e3a5f; text-align: center;">Password Reset</h2>
          <p>Hello ${name},</p>
          <p>Your password reset code is:</p>
          <div style="background: #fff3e0; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #e65100;">${code}</span>
          </div>
          <p>This code expires in <strong>1 hour</strong>.</p>
          <p style="color: #888; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}`, error.stack);
      throw error;
    }
  }
}
