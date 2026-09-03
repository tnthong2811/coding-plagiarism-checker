import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="card">
      <h2>404</h2>
      <p>Page not found.</p>
      <Link to="/dashboard">Go to dashboard</Link>
    </section>
  );
}

