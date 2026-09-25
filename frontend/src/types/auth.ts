export type UserRole = "STUDENT" | "TEACHER" | "BUSINESS_ADMIN" | "SYSTEM_ADMIN";

export interface UserProfile {
  id: number;
  username: string;
  email?: string | null;
  avatarUrl?: string | null;
  role: UserRole;
  passwordResetRequired?: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
}

export interface RegisterResponse extends UserProfile {
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ResetPasswordResponse extends UserProfile {
  message: string;
}

export interface TemporaryPasswordRequest {
  username: string;
  temporaryPassword: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  username: string;
  role: UserRole;
}

export interface TemporaryPasswordResponse extends LoginResponse {
  message: string;
}

export interface UpdateUsernameRequest {
  username: string;
}

export interface UpdateUsernameResponse {
  token: string;
  user: UserProfile;
}

export interface UpdateAvatarRequest {
  avatarUrl?: string | null;
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
  avatarUrl?: string | null;
  role: UserRole;
  passwordResetRequired?: boolean;
}

export interface UpdateUserRoleRequest {
  role: UserRole;
}

