export interface SubmissionResponse {
  id: number;
  submittedBy: string;
  originalFileName: string;
  objectKey: string;
  status: string;
  createdAt: string;
}

export type AnalysisLanguage = "AUTO" | "JAVA" | "CPP";

export interface ComparisonSubmissionInput {
  submissionId: number;
  submittedBy: string;
  originalFileName: string;
  objectKey: string;
}

export interface ComparisonRequest {
  language?: AnalysisLanguage;
  submissions: ComparisonSubmissionInput[];
}

export interface ComparedSourceFile {
  path: string;
  fileName: string;
  content: string;
  lineCount: number;
}

export interface ComparedSubmissionSource {
  submissionName: string;
  submissionId: number;
  submittedBy: string;
  originalFileName: string;
  sourceFiles: ComparedSourceFile[];
}

export interface SourceRange {
  path: string;
  startLine: number;
  endLine: number;
}

export interface MatchSegment {
  matchIndex: number;
  matchedTokens: number;
  leftRanges: SourceRange[];
  rightRanges: SourceRange[];
}

export interface ComparisonPair {
  leftSubmissionName: string;
  leftSubmissionId: number;
  leftStudent: string;
  leftFileName: string;
  rightSubmissionName: string;
  rightSubmissionId: number;
  rightStudent: string;
  rightFileName: string;
  similarityPercent: number;
  maximalSimilarityPercent: number;
  minimalSimilarityPercent: number;
  matchedTokens: number;
  matches: MatchSegment[];
}

export interface ComparisonResponse {
  success: boolean;
  language: string;
  submissionCount: number;
  durationMs: number;
  generatedAt: string;
  message?: string;
  sources: ComparedSubmissionSource[];
  comparisons: ComparisonPair[];
}

