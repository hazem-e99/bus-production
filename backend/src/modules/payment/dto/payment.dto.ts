import { IsIn, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const PAYMENT_METHODS = ['Offline', 'Online'];
const PAYMENT_CHANNELS = ['instapay', 'vodafone', 'cash', 'visa'];

export class CreatePaymentDto {
  @IsInt({ message: 'A subscription plan must be selected.' })
  subscriptionPlanId: number;

  @IsIn(PAYMENT_METHODS, { message: `Payment method must be one of ${PAYMENT_METHODS.join(', ')}.` })
  paymentMethod: string;

  @IsOptional()
  @IsString({ message: 'Payment reference code must be text.' })
  @MinLength(3, { message: 'Payment reference code must be at least 3 characters long.' })
  @MaxLength(100, { message: 'Payment reference code must not exceed 100 characters.' })
  paymentReferenceCode?: string | null;

  @IsOptional()
  @IsIn(PAYMENT_CHANNELS, { message: `Payment channel must be one of ${PAYMENT_CHANNELS.join(', ')}.` })
  paymentChannel?: string;
}
