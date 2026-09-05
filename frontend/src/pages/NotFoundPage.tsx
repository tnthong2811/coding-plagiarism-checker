import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="not-found-page">
      <section className="panel not-found-panel">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p>The route does not match an available workspace page.</p>
        <Link className="button button-primary" to="/dashboard">Go to dashboard</Link>
      </section>
    </main>
  );
}

