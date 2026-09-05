import { FormEvent, useEffect, useMemo, useState } from "react";
import { getAssignments, getMySubmissions, uploadSubmission } from "../api/submissionApi";
import { useAuth } from "../auth/AuthContext";
import type { AssignmentResponse, SubmissionResponse } from "../types/submission";

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "No due date";
}

function formatBytes(value?: number) {
  if (!value) {
    return "Unknown size";
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("complete") || normalized.includes("success") || normalized.includes("done")) {
    return "status-badge--success";
  }
  if (normalized.includes("fail") || normalized.includes("error")) {
    return "status-badge--danger";
  }
  return "status-badge--neutral";
}

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

  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => assignment.id === selectedAssignmentId),
    [assignments, selectedAssignmentId]
  );

  const submittedAssignmentCount = useMemo(() => {
    const assignmentIds = new Set(mySubmissions.map((item) => item.assignmentId).filter(Boolean));
    return assignmentIds.size;
  }, [mySubmissions]);

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
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Student workspace</p>
          <h1>Submit Assignment</h1>
          <p>
            Logged in as <strong>{user?.username}</strong> with upload access for active assignments.
          </p>
        </div>
        <span className="role-badge role-badge--student">STUDENT</span>
      </section>

      <section className="stat-grid">
        <article className="stat-card">
          <span>Available assignments</span>
          <strong>{assignments.length}</strong>
          <small>Loaded from submission service</small>
        </article>
        <article className="stat-card">
          <span>Total submissions</span>
          <strong>{mySubmissions.length}</strong>
          <small>{submittedAssignmentCount} assignments submitted</small>
        </article>
        <article className="stat-card stat-card--accent">
          <span>Selected language</span>
          <strong>{selectedAssignment?.language ?? "-"}</strong>
          <small>{selectedAssignment ? formatDate(selectedAssignment.dueAt) : "Choose an assignment"}</small>
        </article>
      </section>

      <div className="two-column-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Upload</p>
              <h2>Source package</h2>
            </div>
          </div>

          <form className="stacked-form" onSubmit={handleSubmit}>
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
              Source code file
              <input
                type="file"
                accept=".zip,.java,.cpp,.cxx,.cc,.c,.h,.hpp,.hh,.hxx"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
              <small className="field-hint">Supported: .zip, .java, .cpp, .c, .h</small>
            </label>

            {file && (
              <div className="file-summary">
                <strong>{file.name}</strong>
                <span>{formatBytes(file.size)}</span>
              </div>
            )}

            {message && <p className="alert alert-success">{message}</p>}
            {error && <p className="alert alert-error">{error}</p>}

            <button className="button button-primary" type="submit" disabled={submitting || assignments.length === 0}>
              {submitting ? "Uploading..." : "Upload submission"}
            </button>
          </form>
        </section>

        <section className="panel detail-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Assignment</p>
              <h2>{selectedAssignment?.title ?? "No assignment selected"}</h2>
            </div>
          </div>
          {selectedAssignment ? (
            <dl className="detail-list">
              <div>
                <dt>ID</dt>
                <dd>#{selectedAssignment.id}</dd>
              </div>
              <div>
                <dt>Language</dt>
                <dd>{selectedAssignment.language}</dd>
              </div>
              <div>
                <dt>Due</dt>
                <dd>{formatDate(selectedAssignment.dueAt)}</dd>
              </div>
              <div>
                <dt>Description</dt>
                <dd>{selectedAssignment.description || "No description provided."}</dd>
              </div>
            </dl>
          ) : (
            <p className="empty-state">Assignments will appear here when they are available.</p>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">History</p>
            <h2>My recent submissions</h2>
          </div>
        </div>
        {mySubmissions.length === 0 ? (
          <p className="empty-state">No submissions yet.</p>
        ) : (
          <div className="table-shell">
            <table className="data-table">
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
                    <td>#{item.id}</td>
                    <td>{item.assignmentTitle ?? (item.assignmentId ? `#${item.assignmentId}` : "Legacy")}</td>
                    <td>{item.originalFileName}</td>
                    <td>
                      <span className={`status-badge ${statusClass(item.status)}`}>{item.status}</span>
                    </td>
                    <td>{new Date(item.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

