import { FormEvent, useMemo, useState } from "react";
import { createUserByAdmin } from "../api/authApi";
import { useAuth } from "../auth/AuthContext";
import { BUSINESS_MANAGED_ROLES, USER_ROLES, canManageSystemAdmin, roleBadgeClass } from "../auth/roles";
import type { UserRole } from "../types/auth";
import { getFriendlyErrorMessage } from "../utils/errorMessages";

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  STUDENT: "Can submit assignment source files.",
  TEACHER: "Can create assignments, compare submissions, and open reports.",
  BUSINESS_ADMIN: "Can manage classroom users and access review workflows.",
  SYSTEM_ADMIN: "Can manage elevated administrator accounts and technical access."
};

export function AdminCreateUserPage() {
  const { token, user } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("STUDENT");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const roleOptions = useMemo(
    () => (canManageSystemAdmin(user?.role) ? USER_ROLES : BUSINESS_MANAGED_ROLES),
    [user?.role]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Missing token");
      return;
    }

    setSubmitting(true);
    setResult(null);
    setError(null);

    try {
      const created = await createUserByAdmin(token, { username, password, role });
      setResult(`Created user #${created.id} (${created.username}) role=${created.role}`);
      setUsername("");
      setPassword("");
      setRole("STUDENT");
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "Không thể tạo người dùng."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Create User</h1>
          <p>Create an account with the roles available to your admin scope.</p>
        </div>
        {user?.role && <span className={roleBadgeClass(user.role)}>{user.role}</span>}
      </section>

      <div className="two-column-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Account details</p>
              <h2>New user</h2>
            </div>
          </div>
          <form className="stacked-form" onSubmit={handleSubmit}>
            <label>
              Username
              <input value={username} onChange={(e) => setUsername(e.target.value)} required />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </label>

            <label>
              Role
              <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                {roleOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            {result && <p className="alert alert-success">{result}</p>}
            {error && <p className="alert alert-error">{error}</p>}
            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create user"}
            </button>
          </form>
        </section>

        <section className="panel detail-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Role preview</p>
              <h2>{role}</h2>
            </div>
          </div>
          <dl className="detail-list">
            {roleOptions.map((option) => (
              <div key={option}>
                <dt>{option}</dt>
                <dd>{ROLE_DESCRIPTIONS[option]}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}

