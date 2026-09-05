import { useEffect, useMemo, useState } from "react";
import { deleteReport, getReport, getReports } from "../api/analyzerApi";
import { getAssignments } from "../api/submissionApi";
import { useAuth } from "../auth/AuthContext";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ComparisonResultViewer } from "../components/ComparisonResultViewer";
import type { AssignmentResponse, ComparisonResponse, ReportSummaryResponse } from "../types/submission";

function shortReportId(id: string) {
  return id.length <= 10 ? id : `${id.slice(0, 10)}...`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function ReportsPage() {
  const { token, user } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentResponse[]>([]);
  const [reports, setReports] = useState<ReportSummaryResponse[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | "">("");
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [reportDetail, setReportDetail] = useState<ComparisonResponse | null>(null);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingReports, setDeletingReports] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assignmentTitleById = useMemo(() => {
    const lookup = new Map<number, string>();
    assignments.forEach((assignment) => lookup.set(assignment.id, assignment.title));
    return lookup;
  }, [assignments]);

  async function loadAssignments() {
    if (!token) {
      setLoadingAssignments(false);
      return;
    }

    setLoadingAssignments(true);
    try {
      setAssignments(await getAssignments(token));
    } catch {
      setAssignments([]);
    } finally {
      setLoadingAssignments(false);
    }
  }

  async function loadReports(assignmentId: number | "" = selectedAssignmentId) {
    if (!token) {
      setLoadingReports(false);
      return;
    }

    setLoadingReports(true);
    setError(null);
    try {
      const data = await getReports(token, assignmentId || undefined);
      setReports(data);
      setSelectedReportIds((current) =>
        current.filter((id) => data.some((report) => report.id === id))
      );
      if (selectedReportId && !data.some((report) => report.id === selectedReportId)) {
        setSelectedReportId("");
        setReportDetail(null);
      }
    } catch (err) {
      setReports([]);
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoadingReports(false);
    }
  }

  async function openReport(reportId: string) {
    if (!token) {
      setError("Missing token. Please login again.");
      return;
    }

    setSelectedReportId(reportId);
    setLoadingDetail(true);
    setError(null);
    try {
      setReportDetail(await getReport(token, reportId));
    } catch (err) {
      setReportDetail(null);
      setError(err instanceof Error ? err.message : "Failed to load report detail");
    } finally {
      setLoadingDetail(false);
    }
  }

  function selectAssignment(value: string) {
    setSelectedAssignmentId(value ? Number(value) : "");
    setSelectedReportId("");
    setSelectedReportIds([]);
    setReportDetail(null);
  }

  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => assignment.id === selectedAssignmentId),
    [assignments, selectedAssignmentId]
  );

  const maxSimilarity = reports.length
    ? Math.max(...reports.map((report) => report.maxSimilarityPercent))
    : null;
  const allReportsSelected = reports.length > 0
    && reports.every((report) => selectedReportIds.includes(report.id));

  function toggleReportSelection(id: string) {
    setSelectedReportIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function toggleAllReports() {
    setSelectedReportIds(allReportsSelected ? [] : reports.map((report) => report.id));
  }

  async function deleteSelectedReports() {
    if (!token || selectedReportIds.length === 0) {
      return;
    }

    const idsToDelete = [...selectedReportIds];
    setDeletingReports(true);
    setMessage(null);
    setError(null);
    try {
      await Promise.all(idsToDelete.map((id) => deleteReport(token, id)));
      setMessage(`Deleted ${idsToDelete.length} report${idsToDelete.length === 1 ? "" : "s"}.`);
      setSelectedReportIds([]);
      if (idsToDelete.includes(selectedReportId)) {
        setSelectedReportId("");
        setReportDetail(null);
      }
      await loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete selected reports");
      await loadReports();
    } finally {
      setDeletingReports(false);
      setConfirmDeleteOpen(false);
    }
  }

  useEffect(() => {
    void loadAssignments();
  }, [token]);

  useEffect(() => {
    void loadReports();
  }, [token, selectedAssignmentId]);

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">{user?.role === "ADMIN" ? "Admin analytics" : "Teacher analytics"}</p>
          <h1>Reports</h1>
          <p>
            Signed in as <strong>{user?.username}</strong>. Review saved similarity runs and inspect matching code.
          </p>
        </div>
        <span className={`role-badge ${user?.role === "ADMIN" ? "role-badge--admin" : "role-badge--teacher"}`}>
          {user?.role}
        </span>
      </section>

      <section className="stat-grid">
        <article className="stat-card">
          <span>Reports</span>
          <strong>{reports.length}</strong>
          <small>{selectedAssignment ? selectedAssignment.title : "All assignments"}</small>
        </article>
        <article className="stat-card stat-card--accent">
          <span>Highest similarity</span>
          <strong>{maxSimilarity === null ? "-" : `${maxSimilarity}%`}</strong>
          <small>Across the current filter</small>
        </article>
        <article className="stat-card">
          <span>Assignments</span>
          <strong>{assignments.length}</strong>
          <small>{loadingAssignments ? "Loading..." : "Filter options"}</small>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header panel-header--split">
          <div>
            <p className="eyebrow">Saved analysis</p>
            <h2>Report library</h2>
          </div>
          <div className="panel-actions">
            <button
              className="button button-danger"
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={selectedReportIds.length === 0 || deletingReports}
            >
              Delete selected
            </button>
            <button className="button button-subtle" type="button" onClick={() => loadReports()} disabled={loadingReports}>
              {loadingReports ? "Loading..." : "Refresh reports"}
            </button>
          </div>
        </div>

        <div className="assignment-toolbar">
          <label>
            Assignment
            <select
              value={selectedAssignmentId}
              onChange={(event) => selectAssignment(event.target.value)}
              disabled={loadingAssignments}
            >
              <option value="">All assignments</option>
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  #{assignment.id} - {assignment.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="selection-note">Selected reports: {selectedReportIds.length}</p>
        {message && <p className="alert alert-success">{message}</p>}
        {error && <p className="alert alert-error">{error}</p>}

        {loadingReports ? (
          <p className="empty-state">Loading reports...</p>
        ) : reports.length === 0 ? (
          <p className="empty-state">No saved reports yet.</p>
        ) : (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="select-column">
                    <input
                      type="checkbox"
                      checked={allReportsSelected}
                      onChange={toggleAllReports}
                      aria-label="Select all reports"
                    />
                  </th>
                  <th>Report</th>
                  <th>Assignment</th>
                  <th>Language</th>
                  <th>Submissions</th>
                  <th>Pairs</th>
                  <th>Max Similarity %</th>
                  <th>Generated</th>
                  <th>Requested By</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    className={
                      report.id === selectedReportId || selectedReportIds.includes(report.id)
                        ? "comparison-row--active"
                        : ""
                    }
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedReportIds.includes(report.id)}
                        onChange={() => toggleReportSelection(report.id)}
                        aria-label={`Select report ${report.id}`}
                      />
                    </td>
                    <td title={report.id}>{shortReportId(report.id)}</td>
                    <td>
                      {report.assignmentId
                        ? assignmentTitleById.get(report.assignmentId) ?? `#${report.assignmentId}`
                        : "Legacy"}
                    </td>
                    <td>{report.language}</td>
                    <td>{report.submissionCount}</td>
                    <td>{report.comparisonCount}</td>
                    <td>{report.maxSimilarityPercent}</td>
                    <td>{formatDate(report.generatedAt)}</td>
                    <td>{report.requestedBy ?? "unknown"}</td>
                    <td>
                      <button
                        className="button button-subtle button-small"
                        type="button"
                        onClick={() => openReport(report.id)}
                        disabled={loadingDetail && report.id === selectedReportId}
                      >
                        {loadingDetail && report.id === selectedReportId ? "Opening..." : "Open"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {reportDetail && <ComparisonResultViewer result={reportDetail} />}

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete selected reports?"
        message={`This will permanently delete ${selectedReportIds.length} selected report${selectedReportIds.length === 1 ? "" : "s"}.`}
        confirmLabel="Delete reports"
        loading={deletingReports}
        onConfirm={deleteSelectedReports}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
