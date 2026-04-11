// Login Validation Utility

export interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateLogin = (data: LoginData): LoginValidationResult => {
  const errors: string[] = [];

  // Email validation
  if (!data.email?.trim()) {
    errors.push('Email is required');
  } else if (data.email.length < 5) {
    errors.push('Email must be at least 5 characters long');
  } else if (data.email.length > 100) {
    errors.push('Email must not exceed 100 characters');
  } else if (!isValidEmail(data.email)) {
    errors.push('Please enter a valid email address');
  }
  
  // Password validation
  if (!data.password?.trim()) {
    errors.push('Password is required');
  } else if (data.password.length < 1) {
    errors.push('Password must be at least 1 character long');
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
  return email.length >= 5 && email.length <= 100 && isValidEmail(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 1;
};
