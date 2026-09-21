import { FormEvent, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { resetPassword } from "../api/authApi";
import heroImage from "../assets/hero-analysis-workspace.png";

export function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialToken = useMemo(() => {
    return new URLSearchParams(location.search).get("token") ?? "";
  }, [location.search]);
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const response = await resetPassword({ token, password });
      setMessage(response.message);
      setTimeout(() => navigate("/login"), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual" style={{ backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.18), rgba(15, 23, 42, 0.72)), url(${heroImage})` }}>
        <Link className="brand brand--public" to="/">
          <span className="brand-mark">CP</span>
          <span>
            <strong>CodeProof</strong>
            <small>Password reset</small>
          </span>
        </Link>
        <div>
          <p className="eyebrow">Account security</p>
          <h1>Set your account password.</h1>
          <p>Use the reset link from your email to replace the temporary password before signing in.</p>
        </div>
      </section>

      <section className="auth-card">
        <div className="auth-card__header">
          <p className="eyebrow">Reset password</p>
          <h2>Choose a new password</h2>
          <p>The link is single-use and expires after the configured reset window.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <label>
            Reset token
            <input value={token} onChange={(e) => setToken(e.target.value)} required />
          </label>
          <label>
            New password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          <label>
            Confirm password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          {message && <p className="alert alert-success">{message}</p>}
          {error && <p className="alert alert-error">{error}</p>}
          <button className="button button-primary" type="submit" disabled={submitting}>
            {submitting ? "Resetting..." : "Reset password"}
          </button>
        </form>
        <p className="auth-switch">
          Already reset? <Link to="/login">Login</Link>
        </p>
      </section>
    </main>
  );
}
