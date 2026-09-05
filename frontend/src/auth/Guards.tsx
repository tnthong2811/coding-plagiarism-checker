import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { UserRole } from "../types/auth";

export function ProtectedRoute() {
  const { token, loading } = useAuth();

  if (loading) {
    return <main className="not-found-page"><p className="panel route-loading">Checking session...</p></main>;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function RoleRoute({ allowed }: { allowed: UserRole[] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <main className="not-found-page"><p className="panel route-loading">Checking permissions...</p></main>;
  }

  if (!user || !allowed.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

