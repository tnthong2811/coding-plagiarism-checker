import { FormEvent, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { forgotPassword } from "../api/authApi";
import { useAuth } from "../auth/AuthContext";
import { defaultRouteForRole } from "../auth/roles";
import heroImage from "../assets/hero-analysis-workspace.png";
import { getFriendlyErrorMessage } from "../utils/errorMessages";

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
  const initialUsername = locationState?.username ?? params.get("username") ?? "";
  const initialTemporaryPassword = locationState?.temporaryPassword ?? "";
  const [identifier, setIdentifier] = useState(initialUsername);
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

    if (!temporaryMode) {
      setSubmitting(true);
      try {
        const response = await forgotPassword({ identifier });
        setMessage(response.message);
      } catch (err) {
        setError(getFriendlyErrorMessage(err, "Không thể gửi mật khẩu tạm thời. Vui lòng thử lại."));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setSubmitting(true);
    try {
      if (temporaryMode) {
        const profile = await completeTemporaryPassword({ username, temporaryPassword, password });
        navigate(defaultRouteForRole(profile.role), { replace: true });
        return;
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err, "Không thể cập nhật mật khẩu. Vui lòng thử lại."));
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
            <small>Password reset</small>
          </span>
        </Link>
        <div>
          <p className="eyebrow">Account security</p>
          <h1>{temporaryMode ? "Set your account password." : "Recover your account."}</h1>
          <p>{temporaryMode ? "Replace your temporary password before opening the workspace." : "Request a new temporary password by email, then sign in and choose a permanent password."}</p>
        </div>
      </section>

      <section className="auth-card">
        <div className="auth-card__header">
          <p className="eyebrow">{temporaryMode ? "Temporary password" : "Forgot password"}</p>
          <h2>{temporaryMode ? "Choose a new password" : "Send a temporary password"}</h2>
          <p>{temporaryMode ? "Enter the temporary password from your email, then choose and confirm your permanent password." : "Enter your email or username. If the account has an email address, a new temporary password will be sent."}</p>
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
              Email or username
              <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
            </label>
          )}
          {temporaryMode && (
            <>
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
            </>
          )}
          {message && <p className="alert alert-success">{message}</p>}
          {error && <p className="alert alert-error">{error}</p>}
          <button className="button button-primary" type="submit" disabled={submitting}>
            {submitting ? (temporaryMode ? "Updating..." : "Sending...") : (temporaryMode ? "Update password" : "Send temporary password")}
          </button>
        </form>
        <p className="auth-switch">
          {temporaryMode ? "Use a different account?" : "Already have the temporary password?"} <Link to="/login">Login</Link>
        </p>
      </section>
    </main>
  );
}
