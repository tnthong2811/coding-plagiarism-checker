import { useEffect, useMemo, useState } from "react";
import { compareWithJPlag } from "../api/analyzerApi";
import { getSubmissionHistory } from "../api/submissionApi";
import { useAuth } from "../auth/AuthContext";
import type { ComparisonResponse, SubmissionResponse } from "../types/submission";

export function TeacherSubmissionHistoryPage() {
  const { token, user } = useAuth();
  const [rows, setRows] = useState<SubmissionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResponse | null>(null);

  const selectedRows = useMemo(() => {
    const selected = new Set(selectedIds);
    return rows.filter((row) => selected.has(row.id));
  }, [rows, selectedIds]);

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
      setSelectedIds((prev) => prev.filter((id) => data.some((item) => item.id === id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load submission history");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelection(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  async function runComparison() {
    if (!token) {
      setError("Missing token. Please login again.");
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
        language: "JAVA" as const,
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
      <button
        type="button"
        onClick={runComparison}
        disabled={loading || comparing || selectedRows.length < 2}
        style={{ marginLeft: "0.5rem" }}
      >
        {comparing ? "Comparing..." : "Compare selected with JPlag"}
      </button>
      <p style={{ marginTop: "0.5rem" }}>Selected submissions: {selectedRows.length}</p>

      {error && <p className="error">{error}</p>}

      {!loading && rows.length === 0 ? (
        <p>No submissions yet.</p>
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

      {comparisonResult && (
        <div style={{ marginTop: "1.5rem", overflowX: "auto" }}>
          <h3>JPlag Result</h3>
          <p>
            Compared <strong>{comparisonResult.submissionCount}</strong> submissions in {" "}
            <strong>{comparisonResult.durationMs} ms</strong>
          </p>
          {comparisonResult.message && <p>{comparisonResult.message}</p>}
          {comparisonResult.comparisons.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Left Submission</th>
                  <th>Right Submission</th>
                  <th>Similarity %</th>
                  <th>Max %</th>
                  <th>Min %</th>
                  <th>Matched Tokens</th>
                </tr>
              </thead>
              <tbody>
                {comparisonResult.comparisons.map((item) => (
                  <tr key={`${item.leftSubmissionId}-${item.rightSubmissionId}`}>
                    <td>
                      #{item.leftSubmissionId} - {item.leftStudent}
                    </td>
                    <td>
                      #{item.rightSubmissionId} - {item.rightStudent}
                    </td>
                    <td>{item.similarityPercent}</td>
                    <td>{item.maximalSimilarityPercent}</td>
                    <td>{item.minimalSimilarityPercent}</td>
                    <td>{item.matchedTokens}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}

