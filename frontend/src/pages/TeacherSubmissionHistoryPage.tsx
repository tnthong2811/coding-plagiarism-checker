import { useEffect, useMemo, useState } from "react";
import { compareWithJPlag } from "../api/analyzerApi";
import { getSubmissionHistory } from "../api/submissionApi";
import { useAuth } from "../auth/AuthContext";
import type {
  ComparedSourceFile,
  ComparedSubmissionSource,
  ComparisonPair,
  ComparisonResponse,
  MatchSegment,
  SubmissionResponse
} from "../types/submission";

type ComparisonSide = "left" | "right";

function comparisonKey(item: ComparisonPair) {
  return `${item.leftSubmissionName ?? item.leftSubmissionId}:${item.rightSubmissionName ?? item.rightSubmissionId}`;
}

function splitSourceLines(content: string) {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (normalized.length === 0) {
    return [""];
  }
  return normalized.endsWith("\n") ? normalized.slice(0, -1).split("\n") : normalized.split("\n");
}

function buildSourceLookup(sources: ComparedSubmissionSource[] | undefined) {
  const lookup = new Map<string, ComparedSubmissionSource>();
  for (const source of sources ?? []) {
    lookup.set(source.submissionName, source);
  }
  return lookup;
}

function defaultSourcePath(
  comparison: ComparisonPair,
  side: ComparisonSide,
  source: ComparedSubmissionSource | undefined
) {
  const sourceFiles = source?.sourceFiles ?? [];
  if (sourceFiles.length === 0) {
    return "";
  }

  const ranges = (comparison.matches ?? []).flatMap((match) =>
    (side === "left" ? match.leftRanges : match.rightRanges) ?? []
  );
  const firstMatchedPath = ranges.find((range) =>
    sourceFiles.some((file) => file.path === range.path)
  )?.path;

  return firstMatchedPath ?? sourceFiles[0].path;
}

function buildLineMatchMap(segments: MatchSegment[] | undefined, side: ComparisonSide, filePath: string) {
  const map = new Map<number, number[]>();
  for (const segment of segments ?? []) {
    const ranges = side === "left" ? segment.leftRanges ?? [] : segment.rightRanges ?? [];
    for (const range of ranges) {
      if (range.path !== filePath) {
        continue;
      }
      for (let line = range.startLine; line <= range.endLine; line++) {
        const existing = map.get(line) ?? [];
        existing.push(segment.matchIndex);
        map.set(line, existing);
      }
    }
  }
  return map;
}

interface SourcePaneProps {
  title: string;
  subtitle: string;
  side: ComparisonSide;
  source: ComparedSubmissionSource | undefined;
  selectedPath: string;
  selectedFile: ComparedSourceFile | undefined;
  segments: MatchSegment[];
  onPathChange: (path: string) => void;
}

function SourcePane({
  title,
  subtitle,
  side,
  source,
  selectedPath,
  selectedFile,
  segments,
  onPathChange
}: SourcePaneProps) {
  if (!source || !selectedFile) {
    return (
      <div className="source-pane">
        <h4>{title}</h4>
        <p>{subtitle}</p>
        <p>No matching source file is available for this submission.</p>
      </div>
    );
  }

  const sourceFiles = source.sourceFiles ?? [];
  const lines = splitSourceLines(selectedFile.content ?? "");
  const lineMatchMap = buildLineMatchMap(segments, side, selectedFile.path);
  const matchedLineCount = lineMatchMap.size;
  const differentLineCount = lines.filter((line, index) => line.trim() && !lineMatchMap.has(index + 1)).length;

  return (
    <div className="source-pane">
      <div className="source-pane__header">
        <div>
          <h4>{title}</h4>
          <p>{subtitle}</p>
        </div>
        <div className="source-pane__stats">
          <span>{matchedLineCount} matched</span>
          <span>{differentLineCount} unmatched</span>
        </div>
      </div>

      <label className="source-file-picker">
        Source file
        <select value={selectedPath} onChange={(event) => onPathChange(event.target.value)}>
          {sourceFiles.map((file) => (
            <option key={file.path} value={file.path}>
              {file.path}
            </option>
          ))}
        </select>
      </label>

      <div className="source-code" role="region" aria-label={`${title} source code`}>
        {lines.map((line, index) => {
          const lineNumber = index + 1;
          const matchIds = lineMatchMap.get(lineNumber) ?? [];
          const isMatched = matchIds.length > 0;
          const isDifferent = !isMatched && line.trim().length > 0;
          const visibleMatchIds = matchIds.slice(0, 3);

          return (
            <div
              key={`${selectedFile.path}-${lineNumber}`}
              className={[
                "source-line",
                isMatched ? "source-line--match" : "",
                isDifferent ? "source-line--different" : ""
              ].filter(Boolean).join(" ")}
            >
              <span className="source-line__number">{lineNumber}</span>
              <span className="source-line__markers">
                {visibleMatchIds.map((matchId) => (
                  <span key={matchId}>M{matchId}</span>
                ))}
                {matchIds.length > visibleMatchIds.length && <span>+{matchIds.length - visibleMatchIds.length}</span>}
              </span>
              <code>{line || " "}</code>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TeacherSubmissionHistoryPage() {
  const { token, user } = useAuth();
  const [rows, setRows] = useState<SubmissionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResponse | null>(null);
  const [activeComparisonIndex, setActiveComparisonIndex] = useState(0);
  const [selectedFilePaths, setSelectedFilePaths] = useState<Record<string, string>>({});

  const selectedRows = useMemo(() => {
    const selected = new Set(selectedIds);
    return rows.filter((row) => selected.has(row.id));
  }, [rows, selectedIds]);

  const sourceLookup = useMemo(
    () => buildSourceLookup(comparisonResult?.sources),
    [comparisonResult]
  );

  const activeComparison = comparisonResult?.comparisons[activeComparisonIndex] ?? null;
  const activeKey = activeComparison ? comparisonKey(activeComparison) : "";
  const leftSource = activeComparison ? sourceLookup.get(activeComparison.leftSubmissionName) : undefined;
  const rightSource = activeComparison ? sourceLookup.get(activeComparison.rightSubmissionName) : undefined;
  const leftDefaultPath = activeComparison ? defaultSourcePath(activeComparison, "left", leftSource) : "";
  const rightDefaultPath = activeComparison ? defaultSourcePath(activeComparison, "right", rightSource) : "";
  const leftPathKey = `${activeKey}:left`;
  const rightPathKey = `${activeKey}:right`;
  const leftSelectedPath = selectedFilePaths[leftPathKey] ?? leftDefaultPath;
  const rightSelectedPath = selectedFilePaths[rightPathKey] ?? rightDefaultPath;
  const activeMatches = activeComparison?.matches ?? [];
  const comparisons = comparisonResult?.comparisons ?? [];
  const leftSourceFiles = leftSource?.sourceFiles ?? [];
  const rightSourceFiles = rightSource?.sourceFiles ?? [];
  const leftSelectedFile = leftSourceFiles.find((file) => file.path === leftSelectedPath) ?? leftSourceFiles[0];
  const rightSelectedFile = rightSourceFiles.find((file) => file.path === rightSelectedPath) ?? rightSourceFiles[0];

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

  function clearComparisonResult() {
    setComparisonResult(null);
    setActiveComparisonIndex(0);
    setSelectedFilePaths({});
  }

  function toggleSelection(id: number) {
    clearComparisonResult();
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
        language: "AUTO" as const,
        submissions: selectedRows.map((row) => ({
          submissionId: row.id,
          submittedBy: row.submittedBy,
          originalFileName: row.originalFileName,
          objectKey: row.objectKey
        }))
      };
      const result = await compareWithJPlag(token, payload);
      setComparisonResult(result);
      setActiveComparisonIndex(0);
      setSelectedFilePaths({});
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
        <div className="jplag-result">
          <h3>JPlag Result</h3>
          <p>
            Compared <strong>{comparisonResult.submissionCount}</strong> {comparisonResult.language} submissions in{" "}
            <strong>{comparisonResult.durationMs} ms</strong>
          </p>
          {comparisonResult.message && <p>{comparisonResult.message}</p>}
          {comparisons.length > 0 && (
            <>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Pair</th>
                      <th>Left Submission</th>
                      <th>Right Submission</th>
                      <th>Similarity %</th>
                      <th>Max %</th>
                      <th>Min %</th>
                      <th>Matched Tokens</th>
                      <th>Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisons.map((item, index) => (
                      <tr
                        key={`${item.leftSubmissionName}-${item.rightSubmissionName}`}
                        className={index === activeComparisonIndex ? "comparison-row--active" : ""}
                      >
                        <td>{index + 1}</td>
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
                        <td>
                          <button type="button" onClick={() => setActiveComparisonIndex(index)}>
                            View code
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {activeComparison && (
                <div className="code-comparison">
                  <div className="code-comparison__summary">
                    <div>
                      <h3>Code Comparison</h3>
                      <p>
                        Pair #{activeComparisonIndex + 1}: #{activeComparison.leftSubmissionId} and #
                        {activeComparison.rightSubmissionId}
                      </p>
                    </div>
                    <div className="code-legend">
                      <span className="code-legend__item code-legend__item--match">Similar lines</span>
                      <span className="code-legend__item code-legend__item--different">Different or unmatched lines</span>
                    </div>
                  </div>

                  <div className="match-list">
                    {activeMatches.length === 0 ? (
                      <span>No token matches were reported for this pair.</span>
                    ) : (
                      activeMatches.slice(0, 24).map((match) => (
                        <span key={match.matchIndex}>
                          M{match.matchIndex}: {match.matchedTokens} tokens
                        </span>
                      ))
                    )}
                    {activeMatches.length > 24 && <span>+{activeMatches.length - 24} more</span>}
                  </div>

                  <div className="source-grid">
                    <SourcePane
                      title={`#${activeComparison.leftSubmissionId} - ${activeComparison.leftStudent}`}
                      subtitle={activeComparison.leftFileName}
                      side="left"
                      source={leftSource}
                      selectedPath={leftSelectedFile?.path ?? leftSelectedPath}
                      selectedFile={leftSelectedFile}
                      segments={activeMatches}
                      onPathChange={(path) => setSelectedFilePaths((prev) => ({ ...prev, [leftPathKey]: path }))}
                    />
                    <SourcePane
                      title={`#${activeComparison.rightSubmissionId} - ${activeComparison.rightStudent}`}
                      subtitle={activeComparison.rightFileName}
                      side="right"
                      source={rightSource}
                      selectedPath={rightSelectedFile?.path ?? rightSelectedPath}
                      selectedFile={rightSelectedFile}
                      segments={activeMatches}
                      onPathChange={(path) => setSelectedFilePaths((prev) => ({ ...prev, [rightPathKey]: path }))}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
