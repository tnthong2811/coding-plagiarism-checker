import { getJson, postJson } from "./client";
import type {
  AdminUser,
  CreateUserRequest,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UpdateUserRoleRequest,
  UserProfile
} from "../types/auth";

export function health() {
  return getJson<{ status: string }>("/actuator/health");
}

export function register(payload: RegisterRequest) {
  return postJson<UserProfile, RegisterRequest>("/api/auth/register", payload);
}

export function login(payload: LoginRequest) {
  return postJson<LoginResponse, LoginRequest>("/api/auth/login", payload);
}

export function me(token: string) {
  return getJson<UserProfile>("/api/auth/me", token);
}

export function createUserByAdmin(token: string, payload: CreateUserRequest) {
  return postJson<UserProfile, CreateUserRequest>("/api/auth/admin/users", payload, token);
}

export function listUsersByAdmin(token: string) {
  return getJson<AdminUser[]>("/api/auth/admin/users", token);
}

export function updateUserRoleByAdmin(token: string, userId: number, payload: UpdateUserRoleRequest) {
  return postJson<AdminUser, UpdateUserRoleRequest>(`/api/auth/admin/users/${userId}/role`, payload, token);
}

