import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { googleOAuthLoginUrl } from "../api/authApi";
import { useAuth } from "../auth/AuthContext";
import heroImage from "../assets/hero-analysis-workspace.png";

function googleStatusMessage(search: string) {
  const params = new URLSearchParams(search);
  const status = params.get("googleStatus");
  const email = params.get("email");

  if (status === "login-complete") {
    return `Google verified ${email ?? "your email"}. You can continue in the app.`;
  }
  if (status === "oauth-error") {
    return "Google sign-in was cancelled or failed.";
  }
  if (status === "oauth-not-configured") {
    return "Google sign-in is not configured yet. Add the Google OAuth client ID and secret, then restart the auth service.";
  }
  if (status === "email-missing") {
    return "Google did not return an email address.";
  }
  if (status === "email-unverified") {
    return "Google email must be verified before registration.";
  }

  return null;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const googleMessage = googleStatusMessage(location.search);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setSubmitting(true);

    try {
      await register({ username, password });
      setMessage("Account created. You can log in now.");
      setTimeout(() => navigate("/login"), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Register failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual" style={{ backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.16), rgba(15, 23, 42, 0.72)), url(${heroImage})` }}>
        <Link className="brand brand--public" to="/">
          <span className="brand-mark">CP</span>
          <span>
            <strong>CodeProof</strong>
            <small>Student onboarding</small>
          </span>
        </Link>
        <div>
          <p className="eyebrow">Student access</p>
          <h1>Create a submission account.</h1>
          <p>Use Google sign-in to create or access your student account.</p>
        </div>
      </section>

      <section className="auth-card">
        <div className="auth-card__header">
          <p className="eyebrow">New account</p>
          <h2>Register</h2>
          <p>Your teacher or admin can adjust access later if needed.</p>
        </div>
        <div className="stacked-form">
          {googleMessage && <p className="alert alert-success">{googleMessage}</p>}
          <a className="button button-subtle" href={googleOAuthLoginUrl()}>
            Sign in with Google
          </a>
        </div>
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
              minLength={6}
            />
          </label>
          {message && <p className="alert alert-success">{message}</p>}
          {error && <p className="alert alert-error">{error}</p>}
          <button className="button button-primary" type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Register"}
          </button>
        </form>
        <p className="auth-switch">
          Have an account? <Link to="/login">Login</Link>
        </p>
      </section>
    </main>
  );
}

