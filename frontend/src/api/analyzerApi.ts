import type { ComparisonRequest, ComparisonResponse, ReportSummaryResponse } from "../types/submission";

const ANALYZER_BASE = import.meta.env.VITE_ANALYZER_API_BASE || "/analyzer-api";

async function readResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const message = data?.error || data?.message || text || `${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return data as T;
}

export async function compareWithJPlag(token: string, payload: ComparisonRequest): Promise<ComparisonResponse> {
  const response = await fetch(`${ANALYZER_BASE}/api/reports/compare`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  return readResponse<ComparisonResponse>(response);
}

export async function getReports(token: string, assignmentId?: number): Promise<ReportSummaryResponse[]> {
  const params = assignmentId ? `?assignmentId=${assignmentId}` : "";
  const response = await fetch(`${ANALYZER_BASE}/api/reports${params}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return readResponse<ReportSummaryResponse[]>(response);
}

export async function getReport(token: string, reportId: string): Promise<ComparisonResponse> {
  const response = await fetch(`${ANALYZER_BASE}/api/reports/${reportId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return readResponse<ComparisonResponse>(response);
}

