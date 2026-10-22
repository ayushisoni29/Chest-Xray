// ============================================================
// SESSION MANAGEMENT — Token Expiry & Security Watcher
// Auto-logs out on JWT expiry or 15 minutes of idle inactivity
// ============================================================

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Decodes payload from JWT without external library
 */
export function parseJwt(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    return null;
  }
}

/**
 * Returns true if the token is absent or past its expiration time
 */
export function isTokenExpired(token) {
  if (!token) return true;
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return false;
  // exp is in seconds, Date.now() in ms
  return Date.now() >= payload.exp * 1000;
}

/**
 * Immediately clears credentials and forces redirect to login screen
 */
export function forceLogout(reason = "Session expired. Please sign in again.") {
  localStorage.removeItem("medscan_token");
  localStorage.removeItem("medscanCurrentUser");
  sessionStorage.removeItem("currentXRayAnalysis");
  
  // Set alert message for login screen to display
  if (reason) {
    sessionStorage.setItem("medscan_logout_notice", reason);
  }

  // Force clean navigation if not already on login/register
  if (
    !window.location.pathname.includes("/login") &&
    !window.location.pathname.includes("/register")
  ) {
    window.location.replace("/login");
  }
}

/**
 * Attaches user activity listeners (touch, keydown, click) to automatically
 * log out after 15 minutes of inactivity.
 */
let inactivityTimer = null;

export function initInactivityWatcher() {
  function resetTimer() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    
    // Only track when user is logged in
    const token = localStorage.getItem("medscan_token");
    if (!token) return;

    inactivityTimer = setTimeout(() => {
      forceLogout("Logged out automatically due to 15 minutes of inactivity.");
    }, INACTIVITY_TIMEOUT_MS);
  }

  const events = ["touchstart", "touchmove", "mousemove", "keydown", "click"];
  events.forEach((evt) => {
    window.addEventListener(evt, resetTimer, { passive: true });
  });

  resetTimer();

  return () => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    events.forEach((evt) => {
      window.removeEventListener(evt, resetTimer);
    });
  };
}
