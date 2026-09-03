import { FormEvent, useEffect, useState } from "react";
import { getMySubmissions, uploadSubmission } from "../api/submissionApi";
import { useAuth } from "../auth/AuthContext";
import type { SubmissionResponse } from "../types/submission";

export function SubmissionUploadPage() {
  const { token, user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mySubmissions, setMySubmissions] = useState<SubmissionResponse[]>([]);

  async function loadMySubmissions() {
    if (!token) {
      return;
    }
    try {
      const rows = await getMySubmissions(token);
      setMySubmissions(rows);
    } catch {
      // Keep UI usable if the list API fails while upload still works.
      setMySubmissions([]);
    }
  }

  useEffect(() => {
    void loadMySubmissions();
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!token) {
      setError("Missing token. Please login again.");
      return;
    }
    if (!file) {
      setError("Please choose a file before uploading.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await uploadSubmission(token, file);
      setMessage(`Uploaded successfully as submission #${result.id}`);
      setFile(null);
      await loadMySubmissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card">
      <h2>Submit Assignment</h2>
      <p>
        Logged in as <strong>{user?.username}</strong> ({user?.role})
      </p>

      <form onSubmit={handleSubmit}>
        <label>
          Source code file (.zip, .java, .py, ...)
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </label>

        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? "Uploading..." : "Upload submission"}
        </button>
      </form>

      <h3 style={{ marginTop: "1.25rem" }}>My recent submissions</h3>
      {mySubmissions.length === 0 ? (
        <p>No submissions yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>File</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {mySubmissions.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
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

