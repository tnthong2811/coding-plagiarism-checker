const API_BASE = import.meta.env.VITE_AUTH_API_BASE || "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers = new Headers(init?.headers);
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(url, {
    ...init,
    headers
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
    const serverMessage = data?.message || data?.error || text;
    const message = `${response.status} ${response.statusText} @ ${url}${serverMessage ? ` - ${serverMessage}` : ""}`;
    console.error("API request failed", {
      url,
      method: init?.method || "GET",
      status: response.status,
      statusText: response.statusText,
      responseBody: text
    });
    throw new Error(message);
  }

  return data as T;
}

export async function getJson<T>(path: string, token?: string): Promise<T> {
  return request<T>(path, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
}

export async function postJson<TResponse, TBody>(
  path: string,
  body: TBody,
  token?: string
): Promise<TResponse> {
  return request<TResponse>(path, {
    method: "POST",
    body: JSON.stringify(body),
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
}

