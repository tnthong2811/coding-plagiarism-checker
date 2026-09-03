import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header>
        <h1>Coding Plagiarism Checker - Auth UI</h1>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/me">My Profile</Link>
          {user?.role === "STUDENT" && <Link to="/submissions/upload">Submit Assignment</Link>}
          {user?.role === "ADMIN" && <Link to="/admin/users">Admin: Create User</Link>}
          <button type="button" onClick={logout}>Logout</button>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

