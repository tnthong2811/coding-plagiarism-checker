import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Layout() {
  const { user, logout } = useAuth();
  const navItems = [
    { to: "/dashboard", label: "Dashboard", short: "DB", end: true },
    { to: "/me", label: "My Profile", short: "ME", end: false },
    ...(user?.role === "STUDENT"
      ? [{ to: "/submissions/upload", label: "Submit Assignment", short: "UP", end: false }]
      : []),
    ...(user?.role === "TEACHER" || user?.role === "ADMIN"
      ? [
          { to: "/teacher/submissions/history", label: "Assignments", short: "AS", end: false },
          { to: "/teacher/reports", label: "Reports", short: "RP", end: false }
        ]
      : []),
    ...(user?.role === "ADMIN"
      ? [
          { to: "/admin", label: "User Management", short: "UM", end: true },
          { to: "/admin/users", label: "Create User", short: "CU", end: false }
        ]
      : [])
  ];

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link className="brand" to="/dashboard">
          <span className="brand-mark">CP</span>
          <span>
            <strong>CodeProof</strong>
            <small>Course integrity suite</small>
          </span>
        </Link>

        <div className="sidebar-user">
          <span className="avatar">{user?.username?.slice(0, 2).toUpperCase() ?? "US"}</span>
          <span>
            <strong>{user?.username ?? "User"}</strong>
            <small>{user?.role ?? "Authenticated"}</small>
          </span>
        </div>

        <nav className="side-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? " nav-link--active" : ""}`}
            >
              <span>{item.short}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button className="button button-danger sidebar-logout" type="button" onClick={logout}>
          Logout
        </button>
      </aside>

      <div className="app-content">
        <header className="topbar">
          <div>
            <span className="topbar-kicker">Coding Plagiarism Checker</span>
            <strong>{user?.role ? `${user.role} workspace` : "Workspace"}</strong>
          </div>
          <Link className="button button-subtle" to="/">Homepage</Link>
        </header>
        <main className="content-surface">
        <Outlet />
        </main>
      </div>
    </div>
  );
}

