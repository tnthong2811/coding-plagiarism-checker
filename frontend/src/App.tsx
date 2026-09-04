import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute, RoleRoute } from "./auth/Guards";
import { Layout } from "./components/Layout";
import { AdminCreateUserPage } from "./pages/AdminCreateUserPage";
import { AdminUserManagementPage } from "./pages/AdminUserManagementPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { MePage } from "./pages/MePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SubmissionUploadPage } from "./pages/SubmissionUploadPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/me" element={<MePage />} />

            <Route element={<RoleRoute allowed={["STUDENT"]} />}>
              <Route path="/submissions/upload" element={<SubmissionUploadPage />} />
            </Route>

            <Route element={<RoleRoute allowed={["ADMIN"]} />}>
              <Route path="/admin" element={<AdminUserManagementPage />} />
              <Route path="/admin/users/manage" element={<AdminUserManagementPage />} />
              <Route path="/admin/users" element={<AdminCreateUserPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}

