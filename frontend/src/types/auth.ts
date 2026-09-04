export type UserRole = "STUDENT" | "TEACHER" | "ADMIN";

export interface UserProfile {
  id: number;
  username: string;
  role: UserRole;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
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
  role: UserRole;
}

export interface UpdateUserRoleRequest {
  role: UserRole;
}

