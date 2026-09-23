import type { UserRole } from "../types/auth";

export const USER_ROLES: UserRole[] = ["STUDENT", "TEACHER", "BUSINESS_ADMIN", "SYSTEM_ADMIN"];
export const BUSINESS_MANAGED_ROLES: UserRole[] = ["STUDENT", "TEACHER", "BUSINESS_ADMIN"];
export const REVIEW_ROLES: UserRole[] = ["TEACHER", "BUSINESS_ADMIN"];
export const USER_ADMIN_ROLES: UserRole[] = ["BUSINESS_ADMIN", "SYSTEM_ADMIN"];

export function canAccessReview(role?: UserRole | null) {
  return role === "TEACHER" || role === "BUSINESS_ADMIN";
}

export function canAccessUserAdmin(role?: UserRole | null) {
  return role === "BUSINESS_ADMIN" || role === "SYSTEM_ADMIN";
}

export function canManageSystemAdmin(role?: UserRole | null) {
  return role === "SYSTEM_ADMIN";
}

export function defaultRouteForRole(role: UserRole) {
  if (canAccessUserAdmin(role)) {
    return "/admin";
  }
  if (canAccessReview(role)) {
    return "/teacher/submissions/history";
  }
  if (role === "STUDENT") {
    return "/submissions/upload";
  }
  return "/dashboard";
}

export function roleBadgeClass(role: UserRole) {
  return `role-badge role-badge--${role.toLowerCase()}`;
}
