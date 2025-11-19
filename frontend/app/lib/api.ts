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
  fullUrl?: boolean;
}

/**
 * SAFE API helper:
 * - DOES NOT throw for HTTP errors (400/401/403/404/500)
 * - ONLY throws for network errors (backend unreachable)
 * - ALWAYS returns a normalized response:
 *   - { ok: true, ...body }  → success
 *   - { ok: false, status, body } → failed request but no exception
 */
export default async function api(path: any, opts: ApiOptions = {}) {
  const { method = "GET", body = null, token = null, headers = {}, fullUrl = false } = opts;

  // Convert path to string
  const pathStr =
    typeof path === "string"
      ? path
      : path instanceof URL
      ? path.toString()
      : String(path);

  const isAbsolute = Boolean(fullUrl) || /^https?:\/\//i.test(pathStr);

  const url = isAbsolute
    ? pathStr
    : `${API_BASE}${String(pathStr).startsWith("/") ? pathStr : "/" + pathStr}`;

  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (token) (init.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  if (body !== null && body !== undefined) init.body = JSON.stringify(body);

  let res: Response;

  /* -------------------------------
     NETWORK ERROR HANDLING
  --------------------------------*/
  try {
    res = await fetch(url, init);
  } catch (err: any) {
    console.error("API network error:", err);
    throw new Error(`Network error: failed to reach ${url}. Is backend running?`);
  }

  /* -------------------------------
     PARSE RESPONSE
  --------------------------------*/
  const data = await parseRes(res);

  /* -------------------------------
     DO NOT THROW FOR HTTP ERRORS
     (only return normalized object)
  --------------------------------*/
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      body: data,
    };
  }

  /* -------------------------------
     Success — return server response
  --------------------------------*/
  return {
    ok: true,
    ...data,
  };
}
