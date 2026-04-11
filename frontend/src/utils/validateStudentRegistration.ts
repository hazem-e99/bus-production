// Student Registration Validation Utility

export interface StudentRegistrationData {
  firstName: string;
  lastName: string;
  nationalId: string;
  email: string;
  phoneNumber: string;
  studentAcademicNumber: string;
  department: string;
  yearOfStudy: string;
  password: string;
  confirmPassword: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateStudentRegistration = (data: StudentRegistrationData): ValidationResult => {
  const errors: string[] = [];

  // Required fields validation
  if (!data.firstName?.trim()) {
    errors.push('First name is required');
  } else if (data.firstName.length < 2) {
    errors.push('First name must be at least 2 characters long');
  } else if (data.firstName.length > 20) {
    errors.push('First name must not exceed 20 characters');
  }
  
  if (!data.lastName?.trim()) {
    errors.push('Last name is required');
  } else if (data.lastName.length < 2) {
    errors.push('Last name must be at least 2 characters long');
  } else if (data.lastName.length > 20) {
    errors.push('Last name must not exceed 20 characters');
  }
  
  if (!data.nationalId?.trim()) {
    errors.push('National ID is required');
  } else if (!/^\d{14}$/.test(data.nationalId)) {
    errors.push('National ID must be exactly 14 digits');
  }
  
  if (!data.email?.trim()) {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Please enter a valid email address');
  }
  
  if (!data.phoneNumber?.trim()) {
    errors.push('Phone number is required');
  } else if (!isValidPhoneNumber(data.phoneNumber)) {
    errors.push('Please enter a valid phone number (format: 01XXXXXXXXX)');
  }
  
  if (!data.studentAcademicNumber?.trim()) {
    errors.push('Student academic number is required');
  } else if (data.studentAcademicNumber.length > 20) {
    errors.push('Student academic number must not exceed 20 characters');
  }
  
  if (!data.department?.trim()) {
    errors.push('Department is required');
  }
  
  if (!data.yearOfStudy?.trim()) {
    errors.push('Year of study is required');
  }
  
  if (!data.password?.trim()) {
    errors.push('Password is required');
  } else if (data.password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (!data.confirmPassword?.trim()) {
    errors.push('Password confirmation is required');
  }
  
  // Password confirmation validation
  if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
    errors.push('Passwords do not match');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Helper functions
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhoneNumber = (phone: string): boolean => {
  // Egyptian phone number format: 01[0-2,5]XXXXXXXX (11 digits starting with 01, second digit can be 0,1,2,5)
  const phoneRegex = /^01[0-2,5]{1}[0-9]{8}$/;
  return phoneRegex.test(phone);
};

// Validate specific fields
export const validateNationalId = (nationalId: string): boolean => {
  return /^\d{14}$/.test(nationalId);
};

export const validatePhoneNumber = (phone: string): boolean => {
  return isValidPhoneNumber(phone);
};

export const validateEmail = (email: string): boolean => {
  return isValidEmail(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6; // Minimum 6 characters for security
};

export const validateFirstName = (firstName: string): boolean => {
  return firstName.length >= 2 && firstName.length <= 20;
};

export const validateLastName = (lastName: string): boolean => {
  return lastName.length >= 2 && lastName.length <= 20;
};

export const validateStudentAcademicNumber = (studentAcademicNumber: string): boolean => {
  return studentAcademicNumber.trim().length >= 1 && studentAcademicNumber.trim().length <= 20;
};

export const validateStudentEdit = (data: Omit<StudentRegistrationData, 'password' | 'confirmPassword'>): ValidationResult => {
  const errors: string[] = [];

  // Required fields validation (excluding password)
  if (!data.firstName?.trim()) {
    errors.push('First name is required');
  } else if (data.firstName.length < 2) {
    errors.push('First name must be at least 2 characters long');
  } else if (data.firstName.length > 20) {
    errors.push('First name must not exceed 20 characters');
  }
  
  if (!data.lastName?.trim()) {
    errors.push('Last name is required');
  } else if (data.lastName.length < 2) {
    errors.push('Last name must be at least 2 characters long');
  } else if (data.lastName.length > 20) {
    errors.push('Last name must not exceed 20 characters');
  }
  
  if (!data.nationalId?.trim()) {
    errors.push('National ID is required');
  } else if (!/^\d{14}$/.test(data.nationalId)) {
    errors.push('National ID must be exactly 14 digits');
  }
  
  if (!data.email?.trim()) {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Please enter a valid email address');
  }
  
  if (!data.phoneNumber?.trim()) {
    errors.push('Phone number is required');
  } else if (!isValidPhoneNumber(data.phoneNumber)) {
    errors.push('Please enter a valid phone number (format: 01XXXXXXXXX)');
  }
  
  if (!data.studentAcademicNumber?.trim()) {
    errors.push('Student academic number is required');
  } else if (data.studentAcademicNumber.length > 20) {
    errors.push('Student academic number must not exceed 20 characters');
  }
  
  if (!data.department?.trim()) {
    errors.push('Department is required');
  }
  
  if (!data.yearOfStudy?.trim()) {
    errors.push('Year of study is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
