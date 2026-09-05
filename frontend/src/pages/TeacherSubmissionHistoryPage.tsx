import { FormEvent, useEffect, useMemo, useState } from "react";
import { compareWithJPlag } from "../api/analyzerApi";
import { createAssignment, getAssignments, getAssignmentSubmissions } from "../api/submissionApi";
import { useAuth } from "../auth/AuthContext";
import { ComparisonResultViewer } from "../components/ComparisonResultViewer";
import type {
  AnalysisLanguage,
  AssignmentResponse,
  ComparisonResponse,
  SubmissionResponse
} from "../types/submission";

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

  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => assignment.id === selectedAssignmentId),
    [assignments, selectedAssignmentId]
  );

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
    <section className="card">
      <h2>Teacher - Assignments</h2>
      <p>
        Logged in as <strong>{user?.username}</strong> ({user?.role})
      </p>

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
        <button type="submit" disabled={savingAssignment}>
          {savingAssignment ? "Creating..." : "Create assignment"}
        </button>
      </form>

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
        <button type="button" onClick={loadAssignments} disabled={loadingAssignments}>
          {loadingAssignments ? "Loading..." : "Refresh assignments"}
        </button>
        <button type="button" onClick={() => loadAssignmentSubmissions()} disabled={loading || !selectedAssignmentId}>
          {loading ? "Loading..." : "Refresh submissions"}
        </button>
      </div>

      {selectedAssignment && (
        <p className="assignment-meta">
          Selected #{selectedAssignment.id}: <strong>{selectedAssignment.title}</strong>
          {selectedAssignment.dueAt ? ` - Due ${new Date(selectedAssignment.dueAt).toLocaleString()}` : ""}
        </p>
      )}

      <button
        type="button"
        onClick={runComparison}
        disabled={loading || comparing || selectedRows.length < 2 || !selectedAssignment}
      >
        {comparing ? "Comparing..." : "Compare selected with JPlag"}
      </button>
      <p style={{ marginTop: "0.5rem" }}>Selected submissions: {selectedRows.length}</p>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      {!loading && rows.length === 0 ? (
        <p>{selectedAssignment ? "No submissions for this assignment yet." : "No assignment selected."}</p>
      ) : (
        <div style={{ overflowX: "auto", marginTop: "1rem" }}>
          <table>
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
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelection(item.id)}
                    />
                  </td>
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

      {comparisonResult && <ComparisonResultViewer result={comparisonResult} />}
    </section>
  );
}
