// ============================================================
// API SERVICE — connects React frontend to FastAPI backend
// All requests are relative (e.g. /auth/login) so Vite dev
// server proxies them to http://127.0.0.1:8000 — no CORS issues.
// In production, deploy frontend behind the same origin or set
// BASE_URL to the deployed backend URL.
// ============================================================

const BASE_URL = ""; // Empty = relative URLs, handled by Vite proxy


// -------------------------------------------------------
// TOKEN HELPERS
// -------------------------------------------------------

export function getToken() {
  return localStorage.getItem("medscan_token");
}

export function setToken(token) {
  localStorage.setItem("medscan_token", token);
}

export function removeToken() {
  localStorage.removeItem("medscan_token");
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem("medscanCurrentUser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  localStorage.setItem("medscanCurrentUser", JSON.stringify(user));
}

export function removeStoredUser() {
  localStorage.removeItem("medscanCurrentUser");
}

// -------------------------------------------------------
// BASE FETCH WITH AUTH
// -------------------------------------------------------

async function apiFetch(path, options = {}) {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}`;
    try {
      const errData = await response.json();
      errorDetail = errData.detail || errorDetail;
    } catch {
      // ignore JSON parse error
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

// -------------------------------------------------------
// HEALTH CHECK
// -------------------------------------------------------

export async function checkHealth() {
  return apiFetch("/health");
}

// -------------------------------------------------------
// AUTH
// -------------------------------------------------------

export async function registerUser({ name, email, password }) {
  const data = await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });

  setToken(data.access_token);
  setStoredUser({
    id: data.user.id,
    name: data.user.name,
    email: data.user.email,
    created_at: data.user.created_at,
  });

  return data;
}

export async function loginUser({ email, password }) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  setToken(data.access_token);
  setStoredUser({
    id: data.user.id,
    name: data.user.name,
    email: data.user.email,
    created_at: data.user.created_at,
  });

  return data;
}

export async function getMe() {
  return apiFetch("/auth/me");
}

export function logoutUser() {
  removeToken();
  removeStoredUser();
}

// -------------------------------------------------------
// PREDICT
// -------------------------------------------------------

/**
 * Uploads a chest X-ray image file to the backend and returns:
 * {
 *   predicted_class: string,
 *   confidence: number,            (0.0 - 1.0)
 *   all_class_probabilities: { [className]: number },
 *   heatmap_url: string,           (relative path like /static/heatmaps/...)
 * }
 */
export async function predictXRay(file) {
  const token = getToken();

  const formData = new FormData();
  formData.append("file", file);

  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}/predict`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}`;
    try {
      const errData = await response.json();
      errorDetail = errData.detail || errorDetail;
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

// -------------------------------------------------------
// PREDICTION HISTORY
// -------------------------------------------------------

export async function getPredictionHistory({ limit = 20, skip = 0 } = {}) {
  return apiFetch(`/predictions/history?limit=${limit}&skip=${skip}`);
}

export async function getPredictionById(predictionId) {
  return apiFetch(`/predictions/${predictionId}`);
}

// -------------------------------------------------------
// MODEL METRICS
// -------------------------------------------------------

export async function getModelMetrics() {
  return apiFetch("/model/metrics");
}

// -------------------------------------------------------
// STATIC FILE URL HELPER
// -------------------------------------------------------

/**
 * Converts a backend relative URL like /static/heatmaps/...
 * into a full absolute URL for use in <img> tags.
 */
export function getStaticUrl(relativePath) {
  if (!relativePath) return null;
  if (relativePath.startsWith("http")) return relativePath;
  return `${BASE_URL}${relativePath}`;
}
