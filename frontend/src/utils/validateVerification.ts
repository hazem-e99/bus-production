// Email Verification Validation Utility

export interface VerificationData {
  email: string;
  verificationCode: string;
}

export interface VerificationResult {
  isValid: boolean;
  errors: string[];
}

export const validateVerification = (data: VerificationData): VerificationResult => {
  const errors: string[] = [];

  // Required fields validation
  if (!data.email?.trim()) {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Please enter a valid email address');
  }
  
  if (!data.verificationCode?.trim()) {
    errors.push('Verification code is required');
  } else if (data.verificationCode.length < 1) {
    errors.push('Verification code must be at least 1 character long');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Helper function to validate email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate specific fields
export const validateEmail = (email: string): boolean => {
  return isValidEmail(email);
};

export const validateVerificationCode = (code: string): boolean => {
  return code.length >= 1;
};
