const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export function token() { return localStorage.getItem("hms_token"); }
export async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token()) headers.Authorization = `Bearer ${token()}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || "Request failed");
    error.status = response.status;
    if (response.status === 401 && !["/auth/login", "/auth/register"].includes(path)) clearSession();
    throw error;
  }
  return body;
}
export function saveSession(data) {
  localStorage.setItem("hms_token", data.token);
  localStorage.setItem("hms_user", JSON.stringify(data.user));
}
export function clearSession() {
  localStorage.removeItem("hms_token");
  localStorage.removeItem("hms_user");
}
