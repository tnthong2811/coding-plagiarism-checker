import { useEffect, useMemo, useState } from "react";
import type {
  ComparedSourceFile,
  ComparedSubmissionSource,
  ComparisonPair,
  ComparisonResponse,
  MatchSegment
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
      <div className="source-pane source-pane--empty">
        <div className="source-pane__header">
          <div>
            <h4>{title}</h4>
            <p>{subtitle}</p>
          </div>
        </div>
        <p className="empty-state">No matching source file is available for this submission.</p>
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

interface ComparisonResultViewerProps {
  result: ComparisonResponse;
}

export function ComparisonResultViewer({ result }: ComparisonResultViewerProps) {
  const [activeComparisonIndex, setActiveComparisonIndex] = useState(0);
  const [selectedFilePaths, setSelectedFilePaths] = useState<Record<string, string>>({});

  useEffect(() => {
    setActiveComparisonIndex(0);
    setSelectedFilePaths({});
  }, [result.reportId, result.generatedAt]);

  const sourceLookup = useMemo(
    () => buildSourceLookup(result.sources),
    [result.sources]
  );

  const comparisons = result.comparisons ?? [];
  const activeComparison = comparisons[activeComparisonIndex] ?? null;
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
  const leftSourceFiles = leftSource?.sourceFiles ?? [];
  const rightSourceFiles = rightSource?.sourceFiles ?? [];
  const leftSelectedFile = leftSourceFiles.find((file) => file.path === leftSelectedPath) ?? leftSourceFiles[0];
  const rightSelectedFile = rightSourceFiles.find((file) => file.path === rightSelectedPath) ?? rightSourceFiles[0];

  return (
    <section className="panel jplag-result">
      <div className="panel-header">
        <div>
          <p className="eyebrow">JPlag analysis</p>
          <h2>Comparison result</h2>
        </div>
      </div>

      <div className="result-stats">
        <article>
          <span>Submissions</span>
          <strong>{result.submissionCount}</strong>
        </article>
        <article>
          <span>Language</span>
          <strong>{result.language}</strong>
        </article>
        <article>
          <span>Duration</span>
          <strong>{result.durationMs} ms</strong>
        </article>
        {result.reportId && (
          <article>
            <span>Report</span>
            <strong>{result.reportId}</strong>
          </article>
        )}
      </div>

      {result.message && <p className="alert alert-info">{result.message}</p>}
      {comparisons.length > 0 && (
        <>
          <div className="table-shell">
            <table className="data-table">
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
                      <button
                        className="button button-subtle button-small"
                        type="button"
                        onClick={() => setActiveComparisonIndex(index)}
                      >
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
    </section>
  );
}
