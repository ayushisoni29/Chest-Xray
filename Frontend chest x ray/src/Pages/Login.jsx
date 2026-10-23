import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Plus,
  X,
  CheckCircle2,
  Server,
} from "lucide-react";
import { loginUser, getBaseUrl, setCustomBaseUrl } from "../api";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Server settings modal
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverUrl, setServerUrl] = useState(getBaseUrl());
  const [testingServer, setTestingServer] = useState(false);
  const [serverStatus, setServerStatus] = useState(null);

  useEffect(() => {
    const logoutNotice = sessionStorage.getItem("medscan_logout_notice");
    if (logoutNotice) {
      setNotice(logoutNotice);
      sessionStorage.removeItem("medscan_logout_notice");
    }
  }, []);

  // Validation
  const validate = () => {
    if (!email.trim() || !email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address.");
      return false;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }
    return true;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setError("");
    setLoading(true);

    try {
      await loginUser({ email: email.trim().toLowerCase(), password });
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid credentials. Please verify server connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveServer = async () => {
    setTestingServer(true);
    setServerStatus(null);
    try {
      const clean = serverUrl.trim().replace(/\/+$/, "");
      const res = await fetch(`${clean}/health`);
      if (res.ok) {
        setCustomBaseUrl(clean);
        setServerStatus({ success: true, message: "Connected to AI server!" });
        setTimeout(() => setShowServerModal(false), 1000);
      } else {
        setServerStatus({ success: false, message: `Server replied HTTP ${res.status}` });
      }
    } catch (err) {
      setServerStatus({ success: false, message: "Could not reach server URL." });
    } finally {
      setTestingServer(false);
    }
  };

  return (
    <div
      className="mobile-auth-screen"
      style={{
        height: "100dvh",
        maxWidth: "440px",
        width: "100%",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "20px 22px 14px 22px",
        boxSizing: "border-box",
        background: "#f4f8f6",
        color: "#0d281e",
        overflowY: "auto",
        boxShadow: "0 0 60px rgba(0, 0, 0, 0.4)",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div>
        {/* Top Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#081d15",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              <Plus size={20} color="#ffffff" strokeWidth={3} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: "16px",
                  fontWeight: "800",
                  margin: 0,
                  color: "#081d15",
                  letterSpacing: "-0.3px",
                  lineHeight: "1.1",
                }}
              >
                MedScan AI
              </h1>
              <span style={{ fontSize: "11px", color: "#526e62", fontWeight: "500" }}>
                Clinical Imaging Workspace
              </span>
            </div>
          </div>

          {/* Server Status Pill */}
          <button
            type="button"
            onClick={() => {
              setServerUrl(getBaseUrl());
              setServerStatus(null);
              setShowServerModal(true);
            }}
            style={{
              background: "#dcfce7",
              border: "1px solid #bbf7d0",
              borderRadius: "20px",
              padding: "4px 10px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#166534",
              fontSize: "11px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#22c55e",
                display: "inline-block",
                boxShadow: "0 0 6px #22c55e",
              }}
            />
            <span>Server online</span>
          </button>
        </div>

        {/* Lungs Illustration Banner Card */}
        <div
          style={{
            width: "100%",
            height: "105px",
            background: "#e4f1ea",
            borderTop: "2.5px solid #065f46",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.03)",
            marginBottom: "16px",
          }}
        >
          {/* Stylized Lungs SVG Line Art */}
          <svg width="170" height="84" viewBox="0 0 170 84" fill="none">
            {/* Center dividing trachea line */}
            <line
              x1="85"
              y1="4"
              x2="85"
              y2="80"
              stroke="#0f4435"
              strokeWidth="1.6"
              strokeLinecap="round"
            />

            {/* Left Lung Lobe */}
            <path
              d="M81 10 C 68 6, 46 16, 42 40 C 38 62, 50 77, 76 79 C 79 79, 81 77, 81 73 C 81 58, 81 28, 81 10 Z"
              stroke="#0f4435"
              strokeWidth="1.6"
              fill="none"
              strokeLinejoin="round"
            />
            {/* Left inner branch curves */}
            <path
              d="M54 34 C 60 46, 67 54, 74 60"
              stroke="#0f4435"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <path
              d="M48 46 C 53 54, 60 62, 68 68"
              stroke="#0f4435"
              strokeWidth="1.3"
              strokeLinecap="round"
            />

            {/* Right Lung Lobe */}
            <path
              d="M89 10 C 102 6, 124 16, 128 40 C 132 62, 120 77, 94 79 C 91 79, 89 77, 89 73 C 89 58, 89 28, 89 10 Z"
              stroke="#0f4435"
              strokeWidth="1.6"
              fill="none"
              strokeLinejoin="round"
            />
            {/* Right inner branch curves */}
            <path
              d="M116 34 C 110 46, 103 54, 96 60"
              stroke="#0f4435"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <path
              d="M122 46 C 117 54, 110 62, 102 68"
              stroke="#0f4435"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Heading */}
        <div style={{ marginBottom: "16px" }}>
          <h2
            style={{
              fontSize: "25px",
              fontWeight: "800",
              color: "#081d15",
              margin: "0 0 5px 0",
              letterSpacing: "-0.5px",
            }}
          >
            Sign in
          </h2>
          <p style={{ fontSize: "12.5px", color: "#476356", margin: 0, fontWeight: "400" }}>
            Sign in to your account to open chest X-ray screening.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {notice && (
            <div
              style={{
                padding: "9px 12px",
                borderRadius: "8px",
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                color: "#065f46",
                fontSize: "12px",
              }}
            >
              {notice}
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "9px 12px",
                borderRadius: "8px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Email */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "700",
                color: "#081d15",
                marginBottom: "5px",
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              autoComplete="off"
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder=""
              style={{
                width: "100%",
                padding: "12px 14px",
                background: "#ffffff",
                border: "1.5px solid #cbd5e1",
                borderRadius: "9px",
                fontSize: "14px",
                color: "#081d15",
                outline: "none",
                boxSizing: "border-box",
                transition: "border 0.2s",
              }}
            />
          </div>

          {/* Password */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "700",
                color: "#081d15",
                marginBottom: "5px",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                autoComplete="new-password"
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder=""
                style={{
                  width: "100%",
                  padding: "12px 40px 12px 14px",
                  background: "#ffffff",
                  border: "1.5px solid #cbd5e1",
                  borderRadius: "9px",
                  fontSize: "14px",
                  color: "#081d15",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember me & Forgot Password */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "12px",
              marginTop: "2px",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "#334155",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: "#065f46" }}
              />
              <span>Remember me</span>
            </label>
            <span
              onClick={() => alert("Please contact support to reset your password.")}
              style={{ color: "#065f46", fontWeight: "700", cursor: "pointer" }}
            >
              Forgot password?
            </span>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px",
              background: "#065f46",
              color: "#ffffff",
              border: "none",
              borderRadius: "9px",
              fontSize: "14.5px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 3px 10px rgba(6, 95, 70, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginTop: "4px",
            }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : "Sign in"}
          </button>

          {/* Create Account Link */}
          <div style={{ textAlign: "center", fontSize: "12.5px", color: "#475569", marginTop: "4px" }}>
            New user?{" "}
            <Link to="/register" style={{ color: "#065f46", fontWeight: "700", textDecoration: "none" }}>
              Create account
            </Link>
          </div>
        </form>
      </div>

      {/* Footer Notice */}
      <div
        style={{
          textAlign: "center",
          fontSize: "10.5px",
          color: "#64748b",
          marginTop: "16px",
          paddingBottom: "4px",
        }}
      >
        Secure & Private · AI-Powered Health Screening
      </div>

      {/* Server Config Modal */}
      {showServerModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(6px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "20px",
              width: "100%",
              maxWidth: "380px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              color: "#081d15",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Server size={18} color="#065f46" />
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#081d15" }}>
                  Backend Server Address
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowServerModal(false)}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "12px", color: "#526e62", margin: "0 0 12px 0" }}>
              Point the mobile client to your local or deployed FastAPI server.
            </p>

            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://127.0.0.1:8000"
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#f8fafc",
                border: "1.5px solid #cbd5e1",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#081d15",
                outline: "none",
                boxSizing: "border-box",
                marginBottom: "12px",
              }}
            />

            {serverStatus && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: serverStatus.success ? "#dcfce7" : "#fee2e2",
                  color: serverStatus.success ? "#166534" : "#991b1b",
                  fontSize: "12px",
                  marginBottom: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {serverStatus.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span>{serverStatus.message}</span>
              </div>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={handleSaveServer}
                disabled={testingServer}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "#065f46",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                {testingServer ? "Connecting..." : "Test & Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomBaseUrl("");
                  setServerUrl(getBaseUrl());
                  setShowServerModal(false);
                }}
                style={{
                  padding: "10px 14px",
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Reset Default
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}