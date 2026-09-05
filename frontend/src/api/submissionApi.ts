import type {
  AssignmentResponse,
  CreateAssignmentRequest,
  SubmissionResponse
} from "../types/submission";

const SUBMISSION_BASE = import.meta.env.VITE_SUBMISSION_API_BASE || "/submission-api";

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

export async function getAssignments(token: string): Promise<AssignmentResponse[]> {
  const response = await fetch(`${SUBMISSION_BASE}/api/assignments`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return readResponse<AssignmentResponse[]>(response);
}

export async function createAssignment(
  token: string,
  payload: CreateAssignmentRequest
): Promise<AssignmentResponse> {
  const response = await fetch(`${SUBMISSION_BASE}/api/assignments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  return readResponse<AssignmentResponse>(response);
}

export async function getAssignmentSubmissions(
  token: string,
  assignmentId: number
): Promise<SubmissionResponse[]> {
  const response = await fetch(`${SUBMISSION_BASE}/api/assignments/${assignmentId}/submissions`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return readResponse<SubmissionResponse[]>(response);
}

export async function getMyAssignmentSubmissions(
  token: string,
  assignmentId: number
): Promise<SubmissionResponse[]> {
  const response = await fetch(`${SUBMISSION_BASE}/api/assignments/${assignmentId}/submissions/mine`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return readResponse<SubmissionResponse[]>(response);
}

export async function uploadSubmission(
  token: string,
  assignmentId: number,
  file: File
): Promise<SubmissionResponse> {
  const formData = new FormData();
  formData.append("assignmentId", String(assignmentId));
  formData.append("file", file);

  const response = await fetch(`${SUBMISSION_BASE}/api/submissions/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  return readResponse<SubmissionResponse>(response);
}

export async function getMySubmissions(token: string): Promise<SubmissionResponse[]> {
  const response = await fetch(`${SUBMISSION_BASE}/api/submissions/mine`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return readResponse<SubmissionResponse[]>(response);
}

export async function getSubmissionHistory(token: string): Promise<SubmissionResponse[]> {
  const response = await fetch(`${SUBMISSION_BASE}/api/submissions/history`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return readResponse<SubmissionResponse[]>(response);
}


