import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import type { UserRole } from "../types/auth";

const roleDetails: Record<UserRole, { eyebrow: string; title: string; body: string; action: string; to: string }> = {
  STUDENT: {
    eyebrow: "Submission access",
    title: "Student account",
    body: "You can upload source files for available assignments and review your recent submission history.",
    action: "Open upload page",
    to: "/submissions/upload"
  },
  TEACHER: {
    eyebrow: "Review access",
    title: "Teacher account",
    body: "You can create assignments, inspect submitted files, run comparisons, and open saved reports.",
    action: "Open assignments",
    to: "/teacher/submissions/history"
  },
  ADMIN: {
    eyebrow: "Administration access",
    title: "Admin account",
    body: "You can manage user accounts and keep access aligned with classroom responsibilities.",
    action: "Manage users",
    to: "/admin"
  }
};

export function MePage() {
  const { user, refreshMe } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRefresh() {
    try {
      setMessage(null);
      setError(null);
      await refreshMe();
      setMessage("Profile refreshed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh");
    }
  }

  const role = user?.role ?? "STUDENT";
  const details = roleDetails[role];

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Account</p>
          <h1>My Profile</h1>
          <p>Review the identity and role currently attached to your session.</p>
        </div>
        <button className="button button-primary" type="button" onClick={handleRefresh}>
          Refresh profile
        </button>
      </section>

      {message && <p className="alert alert-success">{message}</p>}
      {error && <p className="alert alert-error">{error}</p>}

      <section className="profile-grid">
        <article className="profile-card">
          <span className="profile-avatar">{user?.username?.slice(0, 2).toUpperCase() ?? "US"}</span>
          <div>
            <h2>{user?.username ?? "Unknown user"}</h2>
            <p>{user?.role ?? "No role loaded"}</p>
          </div>
        </article>
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">{details.eyebrow}</p>
              <h2>{details.title}</h2>
            </div>
          </div>
          <p className="muted">{details.body}</p>
          <Link className="button button-subtle profile-action" to={details.to}>
            {details.action}
          </Link>
        </article>
      </section>
    </div>
  );
}

