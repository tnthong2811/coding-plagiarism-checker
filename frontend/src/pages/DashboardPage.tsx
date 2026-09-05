import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import type { UserRole } from "../types/auth";

const roleCopy: Record<UserRole, { title: string; summary: string; focus: string }> = {
  STUDENT: {
    title: "Student workspace",
    summary: "Submit assignments and monitor upload status from a focused queue.",
    focus: "Next step: choose an assignment and upload your source file."
  },
  TEACHER: {
    title: "Teacher workspace",
    summary: "Create assignments, review submissions, and run JPlag comparisons.",
    focus: "Next step: select an assignment and compare at least two submissions."
  },
  ADMIN: {
    title: "Admin workspace",
    summary: "Manage users while keeping teacher review workflows close at hand.",
    focus: "Next step: review account roles or create a new user."
  }
};

const roleActions: Record<UserRole, Array<{ label: string; to: string }>> = {
  STUDENT: [{ label: "Upload submission", to: "/submissions/upload" }],
  TEACHER: [
    { label: "Open assignments", to: "/teacher/submissions/history" },
    { label: "View reports", to: "/teacher/reports" }
  ],
  ADMIN: [
    { label: "Manage users", to: "/admin" },
    { label: "Open reports", to: "/teacher/reports" }
  ]
};

export function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role ?? "STUDENT";
  const copy = roleCopy[role];

  return (
    <div className="page-stack">
      <section className="page-header dashboard-hero">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h1>{copy.title}</h1>
          <p>{copy.summary}</p>
        </div>
      </section>

      <section className="panel action-panel">
        <div>
          <p className="eyebrow">Workspace actions</p>
          <h2>{copy.focus}</h2>
        </div>
        <div className="action-grid">
          {roleActions[role].map((action) => (
            <Link className="action-tile" key={action.to} to={action.to}>
              <span>{action.label}</span>
              <strong>Open</strong>
            </Link>
          ))}
          <Link className="action-tile" to="/me">
            <span>Review profile</span>
            <strong>Open</strong>
          </Link>
        </div>
      </section>
    </div>
  );
}

