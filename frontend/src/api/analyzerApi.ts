import type { ComparisonRequest, ComparisonResponse } from "../types/submission";

const ANALYZER_BASE = import.meta.env.VITE_ANALYZER_API_BASE || "/analyzer-api";

export async function compareWithJPlag(token: string, payload: ComparisonRequest): Promise<ComparisonResponse> {
  const response = await fetch(`${ANALYZER_BASE}/api/reports/compare`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

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
    const message = data?.error || data?.message || `${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return data as ComparisonResponse;
}

