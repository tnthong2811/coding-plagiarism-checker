export interface SubmissionResponse {
  id: number;
  submittedBy: string;
  originalFileName: string;
  objectKey: string;
  status: string;
  createdAt: string;
}

export type AnalysisLanguage = "JAVA";

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

export interface ComparisonPair {
  leftSubmissionId: number;
  leftStudent: string;
  leftFileName: string;
  rightSubmissionId: number;
  rightStudent: string;
  rightFileName: string;
  similarityPercent: number;
  maximalSimilarityPercent: number;
  minimalSimilarityPercent: number;
  matchedTokens: number;
}

export interface ComparisonResponse {
  success: boolean;
  language: string;
  submissionCount: number;
  durationMs: number;
  generatedAt: string;
  message?: string;
  comparisons: ComparisonPair[];
}

