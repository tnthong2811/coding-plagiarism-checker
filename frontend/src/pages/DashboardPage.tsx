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
  BUSINESS_ADMIN: {
    title: "Business admin workspace",
    summary: "Manage classroom users and oversee assignment review workflows.",
    focus: "Next step: review account roles or create a new user."
  },
  SYSTEM_ADMIN: {
    title: "System admin workspace",
    summary: "Manage elevated account access without entering classroom review flows.",
    focus: "Next step: review administrator roles or create a technical admin user."
  }
};

const roleActions: Record<UserRole, Array<{ label: string; to: string; summary: string }>> = {
  STUDENT: [
    {
      label: "Upload submission",
      to: "/submissions/upload",
      summary: "Choose an active assignment and attach a source package."
    }
  ],
  TEACHER: [
    {
      label: "Open assignments",
      to: "/teacher/submissions/history",
      summary: "Create review sets, inspect queues, and compare submissions."
    },
    {
      label: "View reports",
      to: "/teacher/reports",
      summary: "Open saved similarity runs and source-code comparisons."
    }
  ],
  BUSINESS_ADMIN: [
    {
      label: "Manage users",
      to: "/admin",
      summary: "Create accounts and keep role assignments current."
    },
    {
      label: "Manage classes",
      to: "/admin/classes",
      summary: "Maintain class rosters, codes, and assignment containers."
    },
    {
      label: "Open assignments",
      to: "/teacher/submissions/history",
      summary: "Review classroom submission queues and run comparisons."
    },
    {
      label: "Open reports",
      to: "/teacher/reports",
      summary: "Audit saved analysis outputs across assignments."
    }
  ],
  SYSTEM_ADMIN: [
    {
      label: "Manage users",
      to: "/admin",
      summary: "Manage elevated accounts and technical access."
    }
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

      <div className="dashboard-overview">
        <section className="panel action-panel">
          <div>
            <p className="eyebrow">Workspace actions</p>
            <h2>{copy.focus}</h2>
          </div>
          <div className="action-grid">
            {roleActions[role].map((action) => (
              <Link className="action-tile" key={action.to} to={action.to}>
                <span>{action.label}</span>
                <p>{action.summary}</p>
                <strong>Open</strong>
              </Link>
            ))}
            <Link className="action-tile" to="/me">
              <span>Review profile</span>
              <p>Check the identity and role attached to your current session.</p>
              <strong>Open</strong>
            </Link>
          </div>
        </section>

        <aside className="panel dashboard-brief" aria-label="Workspace guidance">
          <p className="eyebrow">Operating model</p>
          <h2>Keep each review traceable</h2>
          <dl className="detail-list">
            <div>
              <dt>Collect</dt>
              <dd>Every submission starts from an assignment record.</dd>
            </div>
            <div>
              <dt>Compare</dt>
              <dd>Run analysis only on selected submissions in the same review context.</dd>
            </div>
            <div>
              <dt>Report</dt>
              <dd>Use saved reports as the audit trail for similarity decisions.</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}

