import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import heroImage from "../assets/hero-analysis-workspace.png";

const rolePaths = [
  {
    title: "Students",
    eyebrow: "Submit",
    body: "Upload source code, track status, and keep every assignment submission in one place."
  },
  {
    title: "Teachers",
    eyebrow: "Review",
    body: "Create assignments, inspect submissions, and launch similarity comparisons from the same workspace."
  }
];

export function HomePage() {
  const { token } = useAuth();

  return (
    <div className="public-page">
      <nav className="public-nav" aria-label="Public navigation">
        <Link className="brand brand--public" to="/">
          <span className="brand-mark">CP</span>
          <span>
            <strong>CodeProof</strong>
            <small>Plagiarism analysis</small>
          </span>
        </Link>
        <div className="public-actions">
          {token ? (
            <Link className="button button-primary" to="/dashboard">Open dashboard</Link>
          ) : (
            <>
              <Link className="button button-subtle" to="/login">Login</Link>
              <Link className="button button-primary" to="/register">Create account</Link>
            </>
          )}
        </div>
      </nav>

      <section
        className="home-hero"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.45), rgba(15, 23, 42, 0.12)), url(${heroImage})` }}
      >
        <div className="home-hero__content">
          <p className="eyebrow">For programming courses</p>
          <h1>Coding Plagiarism Checker</h1>
          <p className="hero-copy">
            A focused workspace for collecting submissions, comparing source code, and reviewing reports by role.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary button-large" to={token ? "/dashboard" : "/login"}>
              {token ? "Open dashboard" : "Start checking"}
            </Link>
            {!token && <Link className="button button-ghost button-large" to="/register">Student register</Link>}
          </div>
        </div>
      </section>

      <main className="home-main">
        <section className="home-section">
          <div className="section-heading">
            <p className="eyebrow">Workflows</p>
            <h2>Built around the people who use it</h2>
          </div>
          <div className="role-path-grid">
            {rolePaths.map((item) => (
              <article className="role-path-card" key={item.title}>
                <span>{item.eyebrow}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="workflow-band">
          <div>
            <p className="eyebrow">Review loop</p>
            <h2>From upload to report without leaving the app</h2>
          </div>
          <div className="workflow-steps">
            <span>Assignment</span>
            <span>Submission</span>
            <span>Comparison</span>
            <span>Report</span>
          </div>
        </section>
      </main>
    </div>
  );
}
