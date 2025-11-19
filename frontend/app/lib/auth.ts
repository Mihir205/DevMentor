// lib/auth.ts
export function saveAuth(token: string | null, user: any) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
  localStorage.setItem("user", JSON.stringify(user ?? null));

  // Notify app in the same tab that auth changed
  try {
    window.dispatchEvent(new Event("authChanged"));
  } catch (e) {
    // ignore (very unlikely)
  }
}

export function getAuth() {
  if (typeof window === "undefined") return { token: null, user: null };
  const token = localStorage.getItem("token");
  const userRaw = localStorage.getItem("user");
  const user = userRaw ? JSON.parse(userRaw) : null;
  return { token, user };
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  try {
    window.dispatchEvent(new Event("authChanged"));
  } catch (e) {}
}
