import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute, RoleRoute } from "./auth/Guards";
import { REVIEW_ROLES, USER_ADMIN_ROLES } from "./auth/roles";
import { Layout } from "./components/Layout";
import { AdminClassroomManagementPage } from "./pages/AdminClassroomManagementPage";
import { AdminCreateUserPage } from "./pages/AdminCreateUserPage";
import { AdminUserManagementPage } from "./pages/AdminUserManagementPage";
import { DashboardPage } from "./pages/DashboardPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { MePage } from "./pages/MePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SubmissionUploadPage } from "./pages/SubmissionUploadPage";
import { TeacherSubmissionHistoryPage } from "./pages/TeacherSubmissionHistoryPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/me" element={<MePage />} />

            <Route element={<RoleRoute allowed={["STUDENT"]} />}>
              <Route path="/submissions/upload" element={<SubmissionUploadPage />} />
            </Route>

            <Route element={<RoleRoute allowed={REVIEW_ROLES} />}>
              <Route path="/teacher/submissions/history" element={<TeacherSubmissionHistoryPage />} />
              <Route path="/teacher/reports" element={<ReportsPage />} />
            </Route>

            <Route element={<RoleRoute allowed={USER_ADMIN_ROLES} />}>
              <Route path="/admin" element={<AdminUserManagementPage />} />
              <Route path="/admin/users/manage" element={<AdminUserManagementPage />} />
              <Route path="/admin/users" element={<AdminCreateUserPage />} />
            </Route>

            <Route element={<RoleRoute allowed={["BUSINESS_ADMIN"]} />}>
              <Route path="/admin/classes" element={<AdminClassroomManagementPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}

