import { FormEvent, useState } from "react";
import { createUserByAdmin } from "../api/authApi";
import { useAuth } from "../auth/AuthContext";
import type { UserRole } from "../types/auth";

export function AdminCreateUserPage() {
  const { token } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("STUDENT");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      setError(err instanceof Error ? err.message : "Create failed");
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
          <p>Create a student, teacher, or admin account with the selected role.</p>
        </div>
        <span className="role-badge role-badge--admin">ADMIN</span>
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
                <option value="STUDENT">STUDENT</option>
                <option value="TEACHER">TEACHER</option>
                <option value="ADMIN">ADMIN</option>
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
            <div>
              <dt>STUDENT</dt>
              <dd>Can submit assignment source files.</dd>
            </div>
            <div>
              <dt>TEACHER</dt>
              <dd>Can create assignments, compare submissions, and open reports.</dd>
            </div>
            <div>
              <dt>ADMIN</dt>
              <dd>Can manage users and access review workflows.</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}

