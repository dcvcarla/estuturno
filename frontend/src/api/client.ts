const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getToken(): string | null {
  try { return localStorage.getItem("accessToken"); } catch { return null; }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error || "Error de red");
  }

  return res.json();
}

export function setTokens(accessToken: string, refreshToken: string) {
  try { localStorage.setItem("accessToken", accessToken); } catch {}
  try { localStorage.setItem("refreshToken", refreshToken); } catch {}
}

export function clearTokens() {
  try { localStorage.removeItem("accessToken"); } catch {}
  try { localStorage.removeItem("refreshToken"); } catch {}
}
