import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

const APP_NAME = 'El Renad';

/**
 * Sends transactional auth emails (verification code, password reset code)
 * over the configured Gmail SMTP account (MAIL_USER/MAIL_PASS). Deliverability
 * notes: application-level fixes (sender identity, subject, plain-text
 * alternative, minimal markup) are handled here, but inbox-vs-spam placement
 * also depends on domain-level SPF/DKIM/DMARC and sender reputation — see
 * docs/email-deliverability.md for what's covered here vs. what requires
 * external DNS/provider configuration.
 */
@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly fromName: string;
  private readonly fromAddress: string;
  private readonly replyTo: string;

  constructor(private configService: ConfigService) {
    this.fromAddress = this.configService.get<string>('MAIL_USER') || '';
    this.fromName = this.configService.get<string>('MAIL_FROM_NAME') || APP_NAME;
    this.replyTo = this.configService.get<string>('MAIL_REPLY_TO') || this.fromAddress;

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.fromAddress,
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
  }

  async sendVerificationCode(to: string, code: string, name: string): Promise<void> {
    await this.send({
      to,
      subject: `Your ${APP_NAME} verification code`,
      html: this.buildCodeEmailHtml({
        heading: 'Verify your email address',
        name,
        code,
        expiryText: '24 hours',
        purposeText: `Use this code to verify your email address and finish setting up your ${APP_NAME} account.`,
      }),
      text: this.buildCodeEmailText({
        heading: 'Verify your email address',
        name,
        code,
        expiryText: '24 hours',
        purposeText: `Use this code to verify your email address and finish setting up your ${APP_NAME} account.`,
      }),
      logLabel: 'Verification email',
    });
  }

  async sendPasswordResetCode(to: string, code: string, name: string): Promise<void> {
    await this.send({
      to,
      subject: `Your ${APP_NAME} password reset code`,
      html: this.buildCodeEmailHtml({
        heading: 'Reset your password',
        name,
        code,
        expiryText: '1 hour',
        purposeText: `Use this code to reset the password on your ${APP_NAME} account.`,
      }),
      text: this.buildCodeEmailText({
        heading: 'Reset your password',
        name,
        code,
        expiryText: '1 hour',
        purposeText: `Use this code to reset the password on your ${APP_NAME} account.`,
      }),
      logLabel: 'Password reset email',
    });
  }

  private async send(options: { to: string; subject: string; html: string; text: string; logLabel: string }): Promise<void> {
    const { to, subject, html, text, logLabel } = options;
    try {
      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromAddress}>`,
        to,
        replyTo: this.replyTo,
        subject,
        text,
        html,
      });
      // Safe to log: message id and recipient only — never the code itself.
      this.logger.log(`${logLabel} sent to ${to} (messageId=${info.messageId})`);
    } catch (error) {
      this.logger.error(`${logLabel} failed to send to ${to}: ${(error as Error)?.message}`, (error as Error)?.stack);
      throw error;
    }
  }

  private buildCodeEmailHtml(params: { heading: string; name: string; code: string; expiryText: string; purposeText: string }): string {
    const { heading, name, code, expiryText, purposeText } = params;
    return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px 0 28px;">
                <p style="margin:0;font-size:14px;color:#6b7280;">${APP_NAME}</p>
                <h1 style="margin:8px 0 16px 0;font-size:20px;color:#111827;">${heading}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px;">
                <p style="margin:0 0 12px 0;font-size:14px;color:#374151;">Hello ${this.escapeHtml(name)},</p>
                <p style="margin:0 0 16px 0;font-size:14px;color:#374151;">${purposeText}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px;">
                <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px;text-align:center;margin-bottom:16px;">
                  <span style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#111827;">${this.escapeHtml(code)}</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px;">
                <p style="margin:0 0 4px 0;font-size:13px;color:#6b7280;">This code expires in <strong>${expiryText}</strong>.</p>
                <p style="margin:0 0 20px 0;font-size:13px;color:#6b7280;">If you didn't request this, you can safely ignore this email.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;border-top:1px solid #e5e7eb;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">${APP_NAME} — this is an automated message, please don't reply directly to this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }

  private buildCodeEmailText(params: { heading: string; name: string; code: string; expiryText: string; purposeText: string }): string {
    const { heading, name, code, expiryText, purposeText } = params;
    return [
      `${APP_NAME} — ${heading}`,
      '',
      `Hello ${name},`,
      '',
      purposeText,
      '',
      `Your code: ${code}`,
      '',
      `This code expires in ${expiryText}.`,
      "If you didn't request this, you can safely ignore this email.",
    ].join('\n');
  }

  private escapeHtml(value: string): string {
    return String(value ?? '').replace(/[&<>"']/g, (char) => {
      switch (char) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        default: return '&#39;';
      }
    });
  }
}
