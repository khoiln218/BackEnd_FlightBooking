export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserProfile {
  id: number;
  email: string;
  fullName: string;
  phone: string;
  role: string;
  createdAt: Date;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface JwtPayload {
  id: number;
  email: string;
  role: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AdminCustomerQuery {
  id?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminCustomerModel {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  created_at: string;
  bookings_count: number;
  total_spent: number;
  last_booking_at: string | null;
}
