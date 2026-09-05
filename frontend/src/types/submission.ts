export interface AssignmentResponse {
  id: number;
  title: string;
  description?: string | null;
  language: AnalysisLanguage;
  dueAt?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreateAssignmentRequest {
  title: string;
  description?: string | null;
  language?: AnalysisLanguage;
  dueAt?: string | null;
}

export interface SubmissionResponse {
  id: number;
  assignmentId?: number | null;
  assignmentTitle?: string | null;
  submittedBy: string;
  originalFileName: string;
  objectKey: string;
  fileSize?: number;
  contentType?: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

export type AnalysisLanguage = "AUTO" | "JAVA" | "CPP";

export interface ComparisonSubmissionInput {
  submissionId: number;
  submittedBy: string;
  originalFileName: string;
  objectKey: string;
}

export interface ComparisonRequest {
  assignmentId?: number;
  language?: AnalysisLanguage;
  submissions: ComparisonSubmissionInput[];
}

export interface ReportSummaryResponse {
  id: string;
  assignmentId?: number | null;
  language: string;
  submissionCount: number;
  comparisonCount: number;
  maxSimilarityPercent: number;
  durationMs: number;
  generatedAt: string;
  requestedBy?: string | null;
  message?: string | null;
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
  reportId?: string;
  success: boolean;
  assignmentId?: number;
  language: string;
  submissionCount: number;
  durationMs: number;
  generatedAt: string;
  message?: string;
  sources: ComparedSubmissionSource[];
  comparisons: ComparisonPair[];
}

