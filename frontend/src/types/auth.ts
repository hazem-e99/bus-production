// Authentication Types

// LoginDTO - Request schema
export interface LoginDTO {
  email: string;           // minLength: 5, maxLength: 100
  password: string;        // minLength: 1
  rememberMe?: boolean;    // optional
}

// LoginViewModel - Response schema
export interface LoginViewModel {
  id: number;
  profileId: number;
  token: string | null;
  email: string | null;
  fullName: string | null;
  role: string | null;
  expiration: string;      // ISO date string
}

// LoginResponse - Full API response
export interface LoginResponse {
  data: LoginViewModel;
  count: number;
  message: string;
  success: boolean;
  timestamp: string;       // ISO date string
  errorCode: string;
  requestId: string;
}

// VerificationDTO - Request schema
export interface VerificationDTO {
  email: string;           // minLength: 1
  code: string;            // minLength: 1 (backend expects 'code')
}

// VerificationResponse - Full API response
export interface VerificationResponse {
  data: boolean;
  count: number;
  message: string;
  success: boolean;
  timestamp: string;       // ISO date string
  errorCode: string;
  requestId: string;
}

// StudentRegistrationDTO - Request schema
export interface StudentRegistrationDTO {
  firstName: string;       // minLength: 2, maxLength: 20
  lastName: string;        // minLength: 2, maxLength: 20
  nationalId: string;      // pattern: ^\d{14}$
  email: string;           // minLength: 1
  phoneNumber: string;     // pattern: ^01[0-2,5]{1}[0-9]{8}$
  studentAcademicNumber: string; // minLength: 1
  department: string;      // enum values
  yearOfStudy: string;     // enum values
  password: string;        // minLength: 1
  confirmPassword: string; // minLength: 1
}

// StaffRegistrationDTO - Request schema for Admin, Driver, Staff
export interface StaffRegistrationDTO {
  firstName: string;       // minLength: 2, maxLength: 20
  lastName: string;        // minLength: 2, maxLength: 20
  nationalId: string;      // pattern: ^\d{14}$
  email: string;           // minLength: 1
  phoneNumber: string;     // pattern: ^01[0-2,5]{1}[0-9]{8}$
  role: 'Admin' | 'Conductor' | 'Driver' | 'MovementManager';
}

// StaffRegistrationResponse - Full API response
export interface StaffRegistrationResponse {
  data: boolean;
  count: number;
  message: string;
  success: boolean;
  timestamp: string;       // ISO date string
  errorCode: string;
  requestId: string;
}

// StudentRegistrationResponse - Full API response
export interface StudentRegistrationResponse {
  data: boolean;
  count: number;
  message: string;
  success: boolean;
  timestamp: string;       // ISO date string
  errorCode: string;
  requestId: string;
}

// ResetPasswordDTO - Request schema
export interface ResetPasswordDTO {
  email: string;           // minLength: 1
  resetToken: string;      // minLength: 1
  newPassword: string;     // minLength: 1
  confirmPassword: string; // minLength: 1
}

// ResetPasswordResponse - Full API response
export interface ResetPasswordResponse {
  data: boolean;
  count: number;
  message: string;
  success: boolean;
  timestamp: string;       // ISO date string
  errorCode: string;
  requestId: string;
}

// ForgotPasswordDTO - Request schema
export interface ForgotPasswordDTO {
  email: string;           // minLength: 1
}

// ForgotPasswordResponse - Full API response
export interface ForgotPasswordResponse {
  data: boolean;
  count: number;
  message: string;
  success: boolean;
  timestamp: string;       // ISO date string
  errorCode: string;
  requestId: string;
}
