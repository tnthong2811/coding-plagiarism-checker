export type UserRole = "STUDENT" | "TEACHER" | "BUSINESS_ADMIN" | "SYSTEM_ADMIN";

export interface UserProfile {
  id: number;
  username: string;
  email?: string | null;
  role: UserRole;
  passwordResetRequired?: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ResetPasswordResponse extends UserProfile {
  message: string;
}

export interface LoginResponse {
  token: string;
  username: string;
  role: UserRole;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: UserRole;
}

export interface AdminUser {
  id: number;
  username: string;
  email?: string | null;
  role: UserRole;
  passwordResetRequired?: boolean;
}

export interface UpdateUserRoleRequest {
  role: UserRole;
}

