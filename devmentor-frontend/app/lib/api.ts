// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5000";

async function parseRes(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

export interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
  /**
   * If true, `path` is treated as a full absolute URL and API_BASE is not prepended.
   * Useful for bypassing the base in special cases.
   */
  fullUrl?: boolean;
}

export default async function api(path: string, opts: ApiOptions = {}) {
  const { method = "GET", body = null, token = null, headers = {}, fullUrl = false } = opts;

  // allow absolute url or local path
  const url = fullUrl || /^https?:\/\//i.test(path) ? path : `${API_BASE}${path.startsWith("/") ? path : "/" + path}`;

  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    } as Record<string, string>,
  };

  if (token) (init.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  if (body !== null && body !== undefined) init.body = JSON.stringify(body);

  try {
    const res = await fetch(url, init);
    const data = await parseRes(res);
    if (!res.ok) {
      const err = new Error((data && (data.error || data.message)) || `HTTP ${res.status}`);
      (err as any).status = res.status;
      (err as any).body = data;
      throw err;
    }
    return data;
  } catch (err: any) {
    // Normalize network errors to a helpful message (so your UI can show it)
    console.error("api fetch error:", { url, opts, err });
    if (err instanceof TypeError && /failed to fetch/i.test(err.message)) {
      throw new Error(`Network error: failed to reach ${url}. Is your backend running at ${API_BASE}?`);
    }
    throw err;
  }
}
