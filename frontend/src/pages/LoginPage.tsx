import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { googleOAuthLoginUrl } from "../api/authApi";
import { useAuth } from "../auth/AuthContext";
import { defaultRouteForRole } from "../auth/roles";
import heroImage from "../assets/hero-analysis-workspace.png";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const profile = await login({ username, password });
      navigate(defaultRouteForRole(profile.role), { replace: true });
    } catch (err) {
      if (isTemporaryPasswordRequired(err)) {
        navigate(`/reset-password?mode=temporary&username=${encodeURIComponent(username)}`, {
          state: { username, temporaryPassword: password }
        });
        return;
      }
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual" style={{ backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.18), rgba(15, 23, 42, 0.72)), url(${heroImage})` }}>
        <Link className="brand brand--public" to="/">
          <span className="brand-mark" aria-hidden="true">CP</span>
          <span>
            <strong>CodeProof</strong>
            <small>Plagiarism analysis</small>
          </span>
        </Link>
        <div>
          <p className="eyebrow">Secure workspace</p>
          <h1>Continue reviewing submissions.</h1>
          <p>Role-based access keeps student uploads, teacher reports, and admin controls separated.</p>
        </div>
      </section>

      <section className="auth-card">
        <div className="auth-card__header">
          <p className="eyebrow">Welcome back</p>
          <h2>Login</h2>
          <p>Use your course account to open the dashboard.</p>
        </div>
        <a className="button button-subtle" href={googleOAuthLoginUrl()}>
          Sign in with Google
        </a>
        <div className="auth-divider">
          <span>or</span>
        </div>
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
              required
            />
          </label>
          {error && <p className="alert alert-error">{error}</p>}
          <button className="button button-primary" type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Login"}
          </button>
        </form>
        <p className="auth-switch">
          No account? <Link to="/register">Register as student</Link>
        </p>
        <p className="auth-switch">
          Forgot password? <Link to="/reset-password">Send a temporary password</Link>
        </p>
      </section>
    </main>
  );
}

function isTemporaryPasswordRequired(error: unknown) {
  if (!(error instanceof ApiError) || error.status !== 403) {
    return false;
  }
  if (typeof error.responseBody === "object" && error.responseBody !== null) {
    const body = error.responseBody as { error?: unknown };
    return body.error === "password reset required";
  }
  return error.message.includes("password reset required");
}

