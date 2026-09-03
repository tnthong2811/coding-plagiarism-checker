import { health } from "../api/authApi";
import { useAuth } from "../auth/AuthContext";
import { useEffect, useState } from "react";

export function DashboardPage() {
  const { user } = useAuth();
  const [healthStatus, setHealthStatus] = useState<string>("Checking...");

  useEffect(() => {
    health()
      .then((h) => setHealthStatus(h.status))
      .catch(() => setHealthStatus("DOWN"));
  }, []);

  return (
    <section className="card">
      <h2>Dashboard</h2>
      <p>
        Hello <strong>{user?.username}</strong>.
      </p>
      <p>
        Current role: <strong>{user?.role}</strong>
      </p>
      <p>
        Auth service health: <strong>{healthStatus}</strong>
      </p>
      <p>This frontend currently covers auth use cases of phase 1.</p>
    </section>
  );
}

