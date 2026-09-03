import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";

export function MePage() {
  const { user, refreshMe } = useAuth();
  const [status, setStatus] = useState<string>("Ready");

  async function handleRefresh() {
    try {
      setStatus("Refreshing...");
      await refreshMe();
      setStatus("Updated");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to refresh");
    }
  }

  useEffect(() => {
    void handleRefresh();
  }, []);

  return (
    <section className="card">
      <h2>My Profile</h2>
      <p>Status: {status}</p>
      <pre>{JSON.stringify(user, null, 2)}</pre>
      <button type="button" onClick={handleRefresh}>Refresh</button>
    </section>
  );
}

