import { useEffect, useState } from "react";
import { getSubmissionHistory } from "../api/submissionApi";
import { useAuth } from "../auth/AuthContext";
import type { SubmissionResponse } from "../types/submission";

export function TeacherSubmissionHistoryPage() {
  const { token, user } = useAuth();
  const [rows, setRows] = useState<SubmissionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadHistory() {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getSubmissionHistory(token);
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load submission history");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHistory();
  }, [token]);

  return (
    <section className="card">
      <h2>Teacher - Submission History</h2>
      <p>
        Logged in as <strong>{user?.username}</strong> ({user?.role})
      </p>

      <button type="button" onClick={loadHistory} disabled={loading}>
        {loading ? "Loading..." : "Refresh history"}
      </button>

      {error && <p className="error">{error}</p>}

      {!loading && rows.length === 0 ? (
        <p>No submissions yet.</p>
      ) : (
        <div style={{ overflowX: "auto", marginTop: "1rem" }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Student</th>
                <th>File</th>
                <th>Status</th>
                <th>Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.submittedBy}</td>
                  <td>{item.originalFileName}</td>
                  <td>{item.status}</td>
                  <td>{new Date(item.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

