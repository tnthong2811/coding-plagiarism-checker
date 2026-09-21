import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerGoogleEmail } from "../api/authApi";
import { useAuth } from "../auth/AuthContext";
import heroImage from "../assets/hero-analysis-workspace.png";

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [googleEmail, setGoogleEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [googleMessage, setGoogleMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setGoogleMessage(null);
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

  async function handleGoogleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setGoogleMessage(null);
    setError(null);
    setGoogleSubmitting(true);

    try {
      const response = await registerGoogleEmail({ email: googleEmail });
      setGoogleMessage(response.message);
      setGoogleEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google email registration failed");
    } finally {
      setGoogleSubmitting(false);
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
          <p>Register with a course account or request onboarding through your Google email.</p>
        </div>
      </section>

      <section className="auth-card">
        <div className="auth-card__header">
          <p className="eyebrow">New account</p>
          <h2>Register</h2>
          <p>Your teacher or admin can adjust access later if needed.</p>
        </div>
        <form onSubmit={handleGoogleRegister}>
          <label>
            Google email
            <input
              type="email"
              value={googleEmail}
              onChange={(e) => setGoogleEmail(e.target.value)}
              required
              placeholder="name@gmail.com"
            />
          </label>
          {googleMessage && <p className="alert alert-success">{googleMessage}</p>}
          <button className="button button-subtle" type="submit" disabled={googleSubmitting}>
            {googleSubmitting ? "Sending..." : "Register with Google email"}
          </button>
        </form>
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

