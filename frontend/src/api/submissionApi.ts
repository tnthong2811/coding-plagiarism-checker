import type { SubmissionResponse } from "../types/submission";

const SUBMISSION_BASE = import.meta.env.VITE_SUBMISSION_API_BASE || "/submission-api";

export async function uploadSubmission(token: string, file: File): Promise<SubmissionResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${SUBMISSION_BASE}/api/submissions/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.error || data?.message || `${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return data as SubmissionResponse;
}

export async function getMySubmissions(token: string): Promise<SubmissionResponse[]> {
  const response = await fetch(`${SUBMISSION_BASE}/api/submissions/mine`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : [];

  if (!response.ok) {
    const message = data?.error || data?.message || `${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return data as SubmissionResponse[];
}

export async function getSubmissionHistory(token: string): Promise<SubmissionResponse[]> {
  const response = await fetch(`${SUBMISSION_BASE}/api/submissions/history`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : [];

  if (!response.ok) {
    const message = data?.error || data?.message || `${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return data as SubmissionResponse[];
}


