import { FormEvent, useEffect, useMemo, useState } from "react";
import { compareWithJPlag } from "../api/analyzerApi";
import { createAssignment, deleteAssignment, getAssignments, getAssignmentSubmissions } from "../api/submissionApi";
import { useAuth } from "../auth/AuthContext";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ComparisonResultViewer } from "../components/ComparisonResultViewer";
import type {
  AnalysisLanguage,
  AssignmentResponse,
  ComparisonResponse,
  SubmissionResponse
} from "../types/submission";

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "No due date";
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

export function TeacherSubmissionHistoryPage() {
  const { token, user } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | "">("");
  const [rows, setRows] = useState<SubmissionResponse[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResponse | null>(null);
  const [newAssignmentTitle, setNewAssignmentTitle] = useState("");
  const [newAssignmentDescription, setNewAssignmentDescription] = useState("");
  const [newAssignmentLanguage, setNewAssignmentLanguage] = useState<AnalysisLanguage>("AUTO");
  const [newAssignmentDueAt, setNewAssignmentDueAt] = useState("");
  const [selectedAssignmentDeleteIds, setSelectedAssignmentDeleteIds] = useState<number[]>([]);
  const [confirmDeleteAssignmentsOpen, setConfirmDeleteAssignmentsOpen] = useState(false);
  const [deletingAssignments, setDeletingAssignments] = useState(false);

  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => assignment.id === selectedAssignmentId),
    [assignments, selectedAssignmentId]
  );
  const allAssignmentsSelected = assignments.length > 0
    && assignments.every((assignment) => selectedAssignmentDeleteIds.includes(assignment.id));

  const selectedRows = useMemo(() => {
    const selected = new Set(selectedIds);
    return rows.filter((row) => selected.has(row.id));
  }, [rows, selectedIds]);

  async function loadAssignments() {
    if (!token) {
      setLoadingAssignments(false);
      return;
    }

    setLoadingAssignments(true);
    setError(null);
    try {
      const data = await getAssignments(token);
      setAssignments(data);
      setSelectedAssignmentDeleteIds((current) =>
        current.filter((id) => data.some((assignment) => assignment.id === id))
      );
      setSelectedAssignmentId((current) => {
        if (current && data.some((assignment) => assignment.id === current)) {
          return current;
        }
        return data[0]?.id ?? "";
      });
      if (data.length === 0) {
        setRows([]);
        setSelectedIds([]);
        clearComparisonResult();
      }
    } catch (err) {
      setAssignments([]);
      setRows([]);
      setError(err instanceof Error ? err.message : "Failed to load assignments");
    } finally {
      setLoadingAssignments(false);
    }
  }

  async function loadAssignmentSubmissions(assignmentId: number | "" = selectedAssignmentId) {
    if (!token || !assignmentId) {
      setRows([]);
      setSelectedIds([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getAssignmentSubmissions(token, assignmentId);
      setRows(data);
      setSelectedIds((prev) => prev.filter((id) => data.some((item) => item.id === id)));
    } catch (err) {
      setRows([]);
      setSelectedIds([]);
      setError(err instanceof Error ? err.message : "Failed to load assignment submissions");
    } finally {
      setLoading(false);
    }
  }

  function clearComparisonResult() {
    setComparisonResult(null);
  }

  function toggleSelection(id: number) {
    clearComparisonResult();
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function selectAssignment(value: string) {
    clearComparisonResult();
    setRows([]);
    setSelectedIds([]);
    setSelectedAssignmentId(value ? Number(value) : "");
  }

  function toggleAssignmentDeleteSelection(id: number) {
    setSelectedAssignmentDeleteIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function toggleAllAssignments() {
    setSelectedAssignmentDeleteIds(allAssignmentsSelected ? [] : assignments.map((assignment) => assignment.id));
  }

  async function handleCreateAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError("Missing token. Please login again.");
      return;
    }
    if (!newAssignmentTitle.trim()) {
      setError("Assignment title is required.");
      return;
    }

    setSavingAssignment(true);
    try {
      const created = await createAssignment(token, {
        title: newAssignmentTitle.trim(),
        description: newAssignmentDescription.trim() || null,
        language: newAssignmentLanguage,
        dueAt: newAssignmentDueAt || null
      });
      clearComparisonResult();
      setRows([]);
      setSelectedIds([]);
      setAssignments((prev) => [created, ...prev.filter((assignment) => assignment.id !== created.id)]);
      setSelectedAssignmentId(created.id);
      setNewAssignmentTitle("");
      setNewAssignmentDescription("");
      setNewAssignmentLanguage("AUTO");
      setNewAssignmentDueAt("");
      setMessage(`Created assignment #${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create assignment");
    } finally {
      setSavingAssignment(false);
    }
  }

  async function deleteSelectedAssignments() {
    if (!token || selectedAssignmentDeleteIds.length === 0) {
      return;
    }

    const idsToDelete = [...selectedAssignmentDeleteIds];
    setDeletingAssignments(true);
    setMessage(null);
    setError(null);
    try {
      await Promise.all(idsToDelete.map((id) => deleteAssignment(token, id)));
      setMessage(`Deleted ${idsToDelete.length} assignment${idsToDelete.length === 1 ? "" : "s"}.`);
      setSelectedAssignmentDeleteIds([]);
      setSelectedIds([]);
      clearComparisonResult();
      if (selectedAssignmentId && idsToDelete.includes(selectedAssignmentId)) {
        setSelectedAssignmentId("");
        setRows([]);
      }
      await loadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete selected assignments");
      await loadAssignments();
    } finally {
      setDeletingAssignments(false);
      setConfirmDeleteAssignmentsOpen(false);
    }
  }

  async function runComparison() {
    if (!token) {
      setError("Missing token. Please login again.");
      return;
    }
    if (!selectedAssignment) {
      setError("Choose an assignment before comparing.");
      return;
    }
    if (selectedRows.length < 2) {
      setError("Select at least two submissions to compare.");
      return;
    }

    setComparing(true);
    setError(null);
    try {
      const payload = {
        assignmentId: selectedAssignment.id,
        language: selectedAssignment.language,
        submissions: selectedRows.map((row) => ({
          submissionId: row.id,
          submittedBy: row.submittedBy,
          originalFileName: row.originalFileName,
          objectKey: row.objectKey
        }))
      };
      const result = await compareWithJPlag(token, payload);
      setComparisonResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run JPlag analysis");
    } finally {
      setComparing(false);
    }
  }

  useEffect(() => {
    void loadAssignments();
  }, [token]);

  useEffect(() => {
    void loadAssignmentSubmissions();
  }, [token, selectedAssignmentId]);

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">{user?.role === "ADMIN" ? "Admin review workspace" : "Teacher workspace"}</p>
          <h1>Assignments</h1>
          <p>
            Signed in as <strong>{user?.username}</strong>. Create assignments, inspect submissions, and launch comparisons.
          </p>
        </div>
        <span className={`role-badge ${user?.role === "ADMIN" ? "role-badge--admin" : "role-badge--teacher"}`}>
          {user?.role}
        </span>
      </section>

      <section className="stat-grid stat-grid--four">
        <article className="stat-card">
          <span>Assignments</span>
          <strong>{assignments.length}</strong>
          <small>{loadingAssignments ? "Loading..." : "Available to review"}</small>
        </article>
        <article className="stat-card">
          <span>Submissions</span>
          <strong>{rows.length}</strong>
          <small>{selectedAssignment ? selectedAssignment.title : "No assignment selected"}</small>
        </article>
        <article className="stat-card stat-card--accent">
          <span>Selected</span>
          <strong>{selectedRows.length}</strong>
          <small>Need at least 2 for JPlag</small>
        </article>
        <article className="stat-card">
          <span>Language</span>
          <strong>{selectedAssignment?.language ?? "-"}</strong>
          <small>{selectedAssignment ? formatDate(selectedAssignment.dueAt) : "Choose an assignment"}</small>
        </article>
      </section>

      {message && <p className="alert alert-success">{message}</p>}
      {error && <p className="alert alert-error">{error}</p>}

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">New assignment</p>
            <h2>Create review set</h2>
          </div>
        </div>
        <form className="assignment-form" onSubmit={handleCreateAssignment}>
          <label>
            Title
            <input
              value={newAssignmentTitle}
              onChange={(event) => setNewAssignmentTitle(event.target.value)}
              maxLength={180}
              required
            />
          </label>
          <label>
            Language
            <select
              value={newAssignmentLanguage}
              onChange={(event) => setNewAssignmentLanguage(event.target.value as AnalysisLanguage)}
            >
              <option value="AUTO">AUTO</option>
              <option value="JAVA">JAVA</option>
              <option value="CPP">CPP</option>
            </select>
          </label>
          <label>
            Due
            <input
              type="datetime-local"
              value={newAssignmentDueAt}
              onChange={(event) => setNewAssignmentDueAt(event.target.value)}
            />
          </label>
          <label className="assignment-form__description">
            Description
            <input
              value={newAssignmentDescription}
              onChange={(event) => setNewAssignmentDescription(event.target.value)}
              maxLength={4000}
            />
          </label>
          <button className="button button-primary" type="submit" disabled={savingAssignment}>
            {savingAssignment ? "Creating..." : "Create assignment"}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header panel-header--split">
          <div>
            <p className="eyebrow">Assignment library</p>
            <h2>Manage assignments</h2>
          </div>
          <div className="panel-actions">
            <button
              className="button button-danger"
              type="button"
              onClick={() => setConfirmDeleteAssignmentsOpen(true)}
              disabled={selectedAssignmentDeleteIds.length === 0 || deletingAssignments}
            >
              Delete selected
            </button>
            <button className="button button-subtle" type="button" onClick={loadAssignments} disabled={loadingAssignments}>
              {loadingAssignments ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        <p className="selection-note">Selected assignments: {selectedAssignmentDeleteIds.length}</p>

        {loadingAssignments ? (
          <p className="empty-state">Loading assignments...</p>
        ) : assignments.length === 0 ? (
          <p className="empty-state">No assignments have been created yet.</p>
        ) : (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="select-column">
                    <input
                      type="checkbox"
                      checked={allAssignmentsSelected}
                      onChange={toggleAllAssignments}
                      aria-label="Select all assignments"
                    />
                  </th>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Language</th>
                  <th>Due</th>
                  <th>Created By</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr
                    key={assignment.id}
                    className={selectedAssignmentDeleteIds.includes(assignment.id) ? "comparison-row--active" : ""}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedAssignmentDeleteIds.includes(assignment.id)}
                        onChange={() => toggleAssignmentDeleteSelection(assignment.id)}
                        aria-label={`Select assignment ${assignment.title}`}
                      />
                    </td>
                    <td>#{assignment.id}</td>
                    <td>{assignment.title}</td>
                    <td>{assignment.language}</td>
                    <td>{formatDate(assignment.dueAt)}</td>
                    <td>{assignment.createdBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header panel-header--split">
          <div>
            <p className="eyebrow">Review queue</p>
            <h2>Submission history</h2>
          </div>
          <button
            className="button button-primary"
            type="button"
            onClick={runComparison}
            disabled={loading || comparing || selectedRows.length < 2 || !selectedAssignment}
          >
            {comparing ? "Comparing..." : "Compare selected"}
          </button>
        </div>

        <div className="assignment-toolbar">
          <label>
            Assignment
            <select
              value={selectedAssignmentId}
              onChange={(event) => selectAssignment(event.target.value)}
              disabled={loadingAssignments || assignments.length === 0}
            >
              {assignments.length === 0 ? (
                <option value="">No assignments</option>
              ) : (
                assignments.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
                    #{assignment.id} - {assignment.title} ({assignment.language})
                  </option>
                ))
              )}
            </select>
          </label>
          <button className="button button-subtle" type="button" onClick={loadAssignments} disabled={loadingAssignments}>
            {loadingAssignments ? "Loading..." : "Refresh assignments"}
          </button>
          <button
            className="button button-subtle"
            type="button"
            onClick={() => loadAssignmentSubmissions()}
            disabled={loading || !selectedAssignmentId}
          >
            {loading ? "Loading..." : "Refresh submissions"}
          </button>
        </div>

        {selectedAssignment && (
          <div className="assignment-summary">
            <div>
              <span>Selected assignment</span>
              <strong>#{selectedAssignment.id} - {selectedAssignment.title}</strong>
            </div>
            <div>
              <span>Due</span>
              <strong>{formatDate(selectedAssignment.dueAt)}</strong>
            </div>
          </div>
        )}

        <p className="selection-note">Selected submissions: {selectedRows.length}</p>

        {loading ? (
          <p className="empty-state">Loading submissions...</p>
        ) : rows.length === 0 ? (
          <p className="empty-state">
            {selectedAssignment ? "No submissions for this assignment yet." : "No assignment selected."}
          </p>
        ) : (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>ID</th>
                  <th>Student</th>
                  <th>File</th>
                  <th>Status</th>
                  <th>Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className={selectedIds.includes(item.id) ? "comparison-row--active" : ""}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelection(item.id)}
                      />
                    </td>
                    <td>#{item.id}</td>
                    <td>{item.submittedBy}</td>
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

      {comparisonResult && <ComparisonResultViewer result={comparisonResult} />}

      <ConfirmDialog
        open={confirmDeleteAssignmentsOpen}
        title="Delete selected assignments?"
        message={`This will delete ${selectedAssignmentDeleteIds.length} selected assignment${selectedAssignmentDeleteIds.length === 1 ? "" : "s"} and their submission records.`}
        confirmLabel="Delete assignments"
        loading={deletingAssignments}
        onConfirm={deleteSelectedAssignments}
        onCancel={() => setConfirmDeleteAssignmentsOpen(false)}
      />
    </div>
  );
}
