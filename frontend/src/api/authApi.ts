import { deleteJson, getJson, postJson } from "./client";
import type {
  AdminUser,
  CreateUserRequest,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  TemporaryPasswordRequest,
  TemporaryPasswordResponse,
  UpdateAvatarRequest,
  UpdateUsernameRequest,
  UpdateUsernameResponse,
  UpdateUserRoleRequest,
  UserProfile
} from "../types/auth";

const AUTH_BASE = import.meta.env.VITE_AUTH_API_BASE || "";

export function health() {
  return getJson<{ status: string }>("/actuator/health");
}

export function register(payload: RegisterRequest) {
  return postJson<RegisterResponse, RegisterRequest>("/api/auth/register", payload);
}

export function googleOAuthLoginUrl() {
  return `${AUTH_BASE}/oauth2/authorization/google`;
}

export function forgotPassword(payload: ForgotPasswordRequest) {
  return postJson<ForgotPasswordResponse, ForgotPasswordRequest>("/api/auth/password/forgot", payload);
}

export function resetPassword(payload: ResetPasswordRequest) {
  return postJson<ResetPasswordResponse, ResetPasswordRequest>("/api/auth/password/reset", payload);
}

export function completeTemporaryPassword(payload: TemporaryPasswordRequest) {
  return postJson<TemporaryPasswordResponse, TemporaryPasswordRequest>("/api/auth/password/temporary", payload);
}

export function login(payload: LoginRequest) {
  return postJson<LoginResponse, LoginRequest>("/api/auth/login", payload);
}

export function me(token: string) {
  return getJson<UserProfile>("/api/auth/me", token);
}

export function updateMyUsername(token: string, payload: UpdateUsernameRequest) {
  return postJson<UpdateUsernameResponse, UpdateUsernameRequest>("/api/auth/me/username", payload, token);
}

export function updateMyAvatar(token: string, payload: UpdateAvatarRequest) {
  return postJson<UserProfile, UpdateAvatarRequest>("/api/auth/me/avatar", payload, token);
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

export function deleteUserByAdmin(token: string, userId: number) {
  return deleteJson<AdminUser>(`/api/auth/admin/users/${userId}`, token);
}

