import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { canAccessReview, canAccessUserAdmin } from "../auth/roles";

export function Layout() {
  const { user, logout } = useAuth();
  const initials = user?.username?.slice(0, 2).toUpperCase() ?? "US";
  const navItems = [
    { to: "/dashboard", label: "Dashboard", short: "DB", end: true },
    { to: "/me", label: "My Profile", short: "ME", end: false },
    ...(user?.role === "STUDENT"
      ? [{ to: "/submissions/upload", label: "Submit Assignment", short: "UP", end: false }]
      : []),
    ...(canAccessReview(user?.role)
      ? [
          { to: "/teacher/submissions/history", label: "Assignments", short: "AS", end: false },
          { to: "/teacher/reports", label: "Reports", short: "RP", end: false }
        ]
      : []),
    ...(canAccessUserAdmin(user?.role)
      ? [
          { to: "/admin", label: "User Management", short: "UM", end: true },
          { to: "/admin/users", label: "Create User", short: "CU", end: false }
        ]
      : []),
    ...(user?.role === "BUSINESS_ADMIN"
      ? [{ to: "/admin/classes", label: "Classrooms", short: "CL", end: false }]
      : [])
  ];

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div className="app-frame">
        <aside className="sidebar" aria-label="Workspace sidebar">
          <Link className="brand" to="/dashboard">
            <span className="brand-mark" aria-hidden="true">CP</span>
            <span>
              <strong>CodeProof</strong>
              <small>Course integrity suite</small>
            </span>
          </Link>

          <div className="sidebar-user">
            <span className="avatar">
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials}
            </span>
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
                <span aria-hidden="true">{item.short}</span>
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
          <main id="main-content" className="content-surface" tabIndex={-1}>
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}

