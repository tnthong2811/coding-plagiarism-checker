import { FormEvent, useEffect, useState } from "react";
import { getAssignments, getMySubmissions, uploadSubmission } from "../api/submissionApi";
import { useAuth } from "../auth/AuthContext";
import type { AssignmentResponse, SubmissionResponse } from "../types/submission";

export function SubmissionUploadPage() {
  const { token, user } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | "">("");
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
      const [assignmentRows, submissionRows] = await Promise.all([
        getAssignments(token),
        getMySubmissions(token)
      ]);
      setAssignments(assignmentRows);
      setSelectedAssignmentId((current) => {
        if (current && assignmentRows.some((assignment) => assignment.id === current)) {
          return current;
        }
        return assignmentRows[0]?.id ?? "";
      });
      setMySubmissions(submissionRows);
    } catch {
      // Keep UI usable if the list API fails while upload still works.
      setAssignments([]);
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
    if (!selectedAssignmentId) {
      setError("Please choose an assignment.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await uploadSubmission(token, selectedAssignmentId, file);
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
          Assignment
          <select
            value={selectedAssignmentId}
            onChange={(event) => setSelectedAssignmentId(event.target.value ? Number(event.target.value) : "")}
            required
          >
            {assignments.length === 0 ? (
              <option value="">No assignments available</option>
            ) : (
              assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  #{assignment.id} - {assignment.title} ({assignment.language})
                </option>
              ))
            )}
          </select>
        </label>

        <label>
          Source code file (.zip, .java, .cpp, .c, .h)
          <input
            type="file"
            accept=".zip,.java,.cpp,.cxx,.cc,.c,.h,.hpp,.hh,.hxx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </label>

        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={submitting || assignments.length === 0}>
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
                <th>Assignment</th>
                <th>File</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {mySubmissions.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.assignmentTitle ?? (item.assignmentId ? `#${item.assignmentId}` : "Legacy")}</td>
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

