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
    <section className="card">
      <h2>Admin - Create User</h2>
      <form onSubmit={handleSubmit}>
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

        {result && <p className="success">{result}</p>}
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create user"}</button>
      </form>
    </section>
  );
}

