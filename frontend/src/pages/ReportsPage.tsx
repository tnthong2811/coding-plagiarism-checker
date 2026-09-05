import { useEffect, useMemo, useState } from "react";
import { getReport, getReports } from "../api/analyzerApi";
import { getAssignments } from "../api/submissionApi";
import { useAuth } from "../auth/AuthContext";
import { ComparisonResultViewer } from "../components/ComparisonResultViewer";
import type { AssignmentResponse, ComparisonResponse, ReportSummaryResponse } from "../types/submission";

function shortReportId(id: string) {
  return id.length <= 10 ? id : `${id.slice(0, 10)}...`;
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
    setReportDetail(null);
  }

  useEffect(() => {
    void loadAssignments();
  }, [token]);

  useEffect(() => {
    void loadReports();
  }, [token, selectedAssignmentId]);

  return (
    <section className="card">
      <h2>Reports</h2>
      <p>
        Logged in as <strong>{user?.username}</strong> ({user?.role})
      </p>

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
        <button type="button" onClick={() => loadReports()} disabled={loadingReports}>
          {loadingReports ? "Loading..." : "Refresh reports"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {!loadingReports && reports.length === 0 ? (
        <p>No saved reports yet.</p>
      ) : (
        <div style={{ overflowX: "auto", marginTop: "1rem" }}>
          <table>
            <thead>
              <tr>
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
                  className={report.id === selectedReportId ? "comparison-row--active" : ""}
                >
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
                  <td>{new Date(report.generatedAt).toLocaleString()}</td>
                  <td>{report.requestedBy ?? "unknown"}</td>
                  <td>
                    <button
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

      {reportDetail && <ComparisonResultViewer result={reportDetail} />}
    </section>
  );
}
