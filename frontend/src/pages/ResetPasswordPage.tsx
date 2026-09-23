import { FormEvent, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { resetPassword } from "../api/authApi";
import { useAuth } from "../auth/AuthContext";
import { defaultRouteForRole } from "../auth/roles";
import heroImage from "../assets/hero-analysis-workspace.png";

interface ResetPasswordLocationState {
  username?: string;
  temporaryPassword?: string;
}

export function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { completeTemporaryPassword } = useAuth();
  const params = useMemo(() => {
    return new URLSearchParams(location.search);
  }, [location.search]);
  const temporaryMode = params.get("mode") === "temporary";
  const locationState = location.state as ResetPasswordLocationState | null;
  const initialToken = temporaryMode ? "" : params.get("token") ?? "";
  const initialUsername = locationState?.username ?? params.get("username") ?? "";
  const initialTemporaryPassword = locationState?.temporaryPassword ?? "";
  const [token, setToken] = useState(initialToken);
  const [username, setUsername] = useState(initialUsername);
  const [temporaryPassword, setTemporaryPassword] = useState(initialTemporaryPassword);
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
      if (temporaryMode) {
        const profile = await completeTemporaryPassword({ username, temporaryPassword, password });
        navigate(defaultRouteForRole(profile.role), { replace: true });
        return;
      }

      const response = await resetPassword({ token, password });
      setMessage(response.message);
      setTimeout(() => navigate("/login"), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password update failed");
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
          <p>{temporaryMode ? "Replace your temporary password before opening the workspace." : "Use the reset link from your email to set a new password."}</p>
        </div>
      </section>

      <section className="auth-card">
        <div className="auth-card__header">
          <p className="eyebrow">{temporaryMode ? "First login" : "Reset password"}</p>
          <h2>Choose a new password</h2>
          <p>{temporaryMode ? "Enter the temporary password from your email, then choose your permanent password." : "The link is single-use and expires after the configured reset window."}</p>
        </div>
        <form onSubmit={handleSubmit}>
          {temporaryMode ? (
            <>
              <label>
                Username
                <input value={username} onChange={(e) => setUsername(e.target.value)} required />
              </label>
              <label>
                Temporary password
                <input
                  type="password"
                  value={temporaryPassword}
                  onChange={(e) => setTemporaryPassword(e.target.value)}
                  required
                />
              </label>
            </>
          ) : (
            <label>
              Reset token
              <input value={token} onChange={(e) => setToken(e.target.value)} required />
            </label>
          )}
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
            {submitting ? "Updating..." : "Update password"}
          </button>
        </form>
        <p className="auth-switch">
          {temporaryMode ? "Use a different account?" : "Already reset?"} <Link to="/login">Login</Link>
        </p>
      </section>
    </main>
  );
}
