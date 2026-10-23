// ============================================================
// API SERVICE — connects React frontend to FastAPI backend
// All requests are relative (e.g. /auth/login) so Vite dev
// server proxies them to http://127.0.0.1:8000 — no CORS issues.
// In production, deploy frontend behind the same origin or set
// BASE_URL to the deployed backend URL.
// ============================================================
export function getBaseUrl() {
  const custom = localStorage.getItem("medscan_api_url");
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/+$/, "");
  }
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, "");
  }
  return "";
}

export function setCustomBaseUrl(url) {
  if (!url || !url.trim()) {
    localStorage.removeItem("medscan_api_url");
  } else {
    localStorage.setItem("medscan_api_url", url.trim().replace(/\/+$/, ""));
  }
}


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

import { forceLogout } from "./session.js";

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

  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    forceLogout("Session expired or unauthorized. Please sign in again.");
    throw new Error("Session expired. Please sign in again.");
  }

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}`;
    try {
      const errData = await response.json();
      errorDetail = errData.detail || errorDetail;
    } catch {
      // response might be HTML or empty
      const text = await response.text().catch(() => "");
      if (text.includes("<!doctype") || text.includes("<html")) {
        errorDetail = "Backend server unreachable. Please verify server status in Profile.";
      }
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

  const response = await fetch(`${getBaseUrl()}/predict`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (response.status === 401) {
    forceLogout("Session expired. Please sign in again.");
    throw new Error("Session expired. Please sign in again.");
  }

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
  return `${getBaseUrl()}${relativePath}`;
}


// -------------------------------------------------------
// DOWNLOAD PDF REPORT
// -------------------------------------------------------


export async function downloadPredictionReport(predictionId, patient = {}) {
  const token = getToken();

  if (!token) {
    throw new Error("Please login again to download the report.");
  }

  const params = new URLSearchParams();
  // Include token in query params so native mobile downloads and system browsers authenticate
  params.set("token", token);

  if (patient.name) params.set("patient_name", patient.name);
  if (patient.email) params.set("patient_email", patient.email);
  if (patient.age) params.set("patient_age", String(patient.age));
  if (patient.gender) params.set("patient_gender", patient.gender);

  const query = params.toString();
  const reportUrl = `${getBaseUrl()}/predictions/${encodeURIComponent(predictionId)}/report?${query}`;

  const isMobile =
    typeof navigator !== "undefined" &&
    (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
     (typeof window !== "undefined" && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()));

  if (isMobile) {
    // Mobile environment: Trigger direct browser navigation or DownloadManager
    const link = document.createElement("a");
    link.href = reportUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.download = `Chest_Xray_Report_${predictionId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Fallback for native Capacitor WebView to ensure download starts
    setTimeout(() => {
      try {
        if (typeof window !== "undefined" && window.Capacitor?.isNativePlatform?.()) {
          window.open(reportUrl, "_system");
        }
      } catch (e) {
        // ignore
      }
    }, 250);

    return;
  }

  // Desktop browser: programmatic fetch and blob trigger
  const response = await fetch(reportUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let message = `Report download failed (${response.status})`;

    try {
      const errorData = await response.json();
      message = errorData.detail || message;
    } catch {
      // Keep the default error message
    }

    throw new Error(message);
  }

  const blob = await response.blob();

  if (blob.size === 0) {
    throw new Error("The server returned an empty report.");
  }

  const pdfBlob = new Blob([blob], { type: "application/pdf" });
  const pdfUrl = window.URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");

  link.href = pdfUrl;
  link.download = `Chest_Xray_Report_${predictionId}.pdf`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(pdfUrl);
  }, 2000);
}
