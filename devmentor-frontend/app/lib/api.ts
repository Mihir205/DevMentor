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
 * Defensive API helper with debug info for diagnosing non-string 'path' issues.
 */
export default async function api(path: any, opts: ApiOptions = {}) {
  const { method = "GET", body = null, token = null, headers = {}, fullUrl = false } = opts;

  // Debug: log the incoming path type/value and call stack to trace the caller
  try {
    // Keep this as debug output — remove once issue resolved
    // eslint-disable-next-line no-console
    console.debug("[api] called with path:", { path, type: typeof path, isURL: path instanceof URL });
    // Print stack so we can see the caller file/line
    // eslint-disable-next-line no-console
    console.trace("[api] call trace");
  } catch (e) {
    // ignore logging failures
  }

  // Normalize path to string (very defensive)
  const pathStr = typeof path === "string" ? path : (path instanceof URL ? path.toString() : String(path));

  // Detect absolute URL
  const isAbsolute = Boolean(fullUrl) || /^https?:\/\//i.test(pathStr);

  // Always call startsWith on a string (String(pathStr))
  const url = isAbsolute ? pathStr : `${API_BASE}${String(pathStr).startsWith("/") ? pathStr : "/" + pathStr}`;

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
      if (typeof window !== "undefined") console.debug("api response error:", { url, method, status: res.status, body: data });
      throw err;
    }

    return data;
  } catch (err: any) {
    const isNetwork = err instanceof TypeError && /failed to fetch/i.test(err.message);
    try {
      if (isNetwork) {
        console.error("api network error:", { url, method, message: err.message });
      } else if (!(err && (err as any).status)) {
        console.error("api unexpected error:", { url, method, name: err?.name, message: err?.message, stack: err?.stack });
      }
    } catch (logErr) {
      console.error("api logging failed:", logErr);
    }

    if (isNetwork) {
      throw new Error(`Network error: failed to reach ${url}. Is your backend running at ${API_BASE}?`);
    }
    throw err;
  }
}
