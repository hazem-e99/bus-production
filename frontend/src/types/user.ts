export type UserRole = 'admin' | 'student' | 'supervisor' | 'movement-manager' | 'driver' | 'conductor';

export interface User {
  id: string | number;
  profileId?: string | number;
  firstName?: string;
  lastName?: string;
  name?: string; // Keep for backward compatibility
  fullName?: string;
  email?: string;
  password?: string;
  role: UserRole;
  phoneNumber?: string;
  phone?: string; // Keep for backward compatibility
  nationalId?: string;
  status?: 'active' | 'inactive' | 'suspended';
  avatar?: string;
  profilePictureUrl?: string; // API field
  createdAt?: string;
  updatedAt?: string;
  // New fields from LoginViewModel
  token?: string;
  expiration?: string;
  // Additional fields for compatibility
  department?: string;
  academicYear?: string;
  subscriptionStatus?: 'active' | 'expired' | 'none';
}

// StudentViewModel from Swagger API
export interface StudentViewModel {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  nationalId?: string;
  profilePictureUrl?: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  role: 'Student' | 'Driver' | 'Conductor' | 'MovementManager' | 'Admin';
  studentProfileId: number;
  studentAcademicNumber?: string;
  department?: string;
  yearOfStudy?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

export interface Student extends User {
  role: 'student';
  studentId?: string;
  studentAcademicNumber?: string;
  department: string;
  academicYear: string;
  subscriptionStatus: 'active' | 'expired' | 'none';
  subscriptionExpiry?: string;
  paymentMethod?: 'cash' | 'bank';
  pickupPoint?: string;
  // Additional fields for compatibility
  yearOfStudy?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

export interface Driver extends User {
  role: 'driver';
  licenseNumber: string;
  experience?: number;
  assignedBusId?: string;
  currentRouteId?: string;
}

export interface Supervisor extends User {
  role: 'supervisor';
  assignedBusId?: string;
  assignedRouteId?: string;
}

export interface MovementManager extends User {
  role: 'movement-manager';
  permissions?: string[];
}

export interface Admin extends User {
  role: 'admin';
  permissions?: string[];
}
