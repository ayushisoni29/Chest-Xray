import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Stethoscope,
  AlertCircle,
  Server,
  X,
  CheckCircle2,
} from "lucide-react";
import { loginUser, getBaseUrl, setCustomBaseUrl } from "../api";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      setError("Please enter a valid hospital email address.");
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
      navigate("/");
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
        padding: "24px 20px",
        boxSizing: "border-box",
        background: "radial-gradient(circle at top right, #0f172a 0%, #020617 100%)",
        color: "#fff",
        overflow: "hidden",
      }}
    >
      {/* Top Header & Branding */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 15px rgba(56, 189, 248, 0.4)",
              }}
            >
              <Stethoscope size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: "18px", fontWeight: "900", margin: 0, letterSpacing: "-0.5px" }}>
                MedScan AI
              </h1>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>Clinical Imaging Workspace</span>
            </div>
          </div>

          {/* Quick Server Setting Pill */}
          <button
            type="button"
            onClick={() => {
              setServerUrl(getBaseUrl());
              setServerStatus(null);
              setShowServerModal(true);
            }}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "20px",
              padding: "4px 10px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              color: "#38bdf8",
              fontSize: "11px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            <Server size={12} />
            <span>Server</span>
          </button>
        </div>

        <div>
          <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#fff", marginBottom: "4px" }}>
            Sign In
          </h2>
          <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>
            Enter your clinical credentials to access radiograph screening.
          </p>
        </div>
      </div>

      {/* Main Single-Viewport Form */}
      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {notice && (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "10px",
              background: "rgba(56, 189, 248, 0.12)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              color: "#7dd3fc",
              fontSize: "12px",
            }}
          >
            {notice}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "10px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              color: "#f87171",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Email */}
        <div>
          <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#94a3b8", marginBottom: "6px" }}>
            HOSPITAL EMAIL
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              padding: "0 14px",
            }}
          >
            <Mail size={16} color="#64748b" />
            <input
              type="email"
              placeholder="clinician@hospital.org"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              style={{
                width: "100%",
                padding: "14px 10px",
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: "14px",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#94a3b8", marginBottom: "6px" }}>
            PASSWORD
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              padding: "0 14px",
            }}
          >
            <Lock size={16} color="#64748b" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              style={{
                width: "100%",
                padding: "14px 10px",
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: "14px",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: 0 }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "16px",
            background: "linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)",
            color: "#fff",
            border: "none",
            borderRadius: "14px",
            fontSize: "15px",
            fontWeight: "700",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            marginTop: "6px",
            boxShadow: "0 4px 15px rgba(56, 189, 248, 0.4)",
          }}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="spin" /> Signing In...
            </>
          ) : (
            <>
              Sign In <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      {/* Bottom Switcher */}
      <div style={{ textAlign: "center", fontSize: "13px", color: "#94a3b8" }}>
        New clinician?{" "}
        <Link to="/register" style={{ color: "#38bdf8", fontWeight: "700", textDecoration: "none" }}>
          Create Account
        </Link>
      </div>

      {/* Server Configuration Bottom Sheet */}
      {showServerModal && (
        <div className="bottom-sheet-backdrop" onClick={() => setShowServerModal(false)}>
          <div className="bottom-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-handle" />
            <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#fff", marginBottom: "8px" }}>
              Backend AI Server Configuration
            </h3>
            <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "14px" }}>
              Enter your live Codespace or tunnel URL to connect your phone app.
            </p>

            <input
              type="text"
              placeholder="https://your-codespace-8000.app.github.dev"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "10px",
                color: "#fff",
                fontSize: "13px",
                marginBottom: "12px",
                boxSizing: "border-box",
              }}
            />

            {serverStatus && (
              <div
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  marginBottom: "14px",
                  background: serverStatus.success ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                  color: serverStatus.success ? "#4ade80" : "#f87171",
                  border: `1px solid ${serverStatus.success ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                }}
              >
                {serverStatus.message}
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  setServerUrl("");
                  setCustomBaseUrl("");
                  setShowServerModal(false);
                }}
                style={{
                  padding: "10px 14px",
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#94a3b8",
                  borderRadius: "8px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Reset Default
              </button>
              <button
                type="button"
                onClick={handleSaveServer}
                disabled={testingServer}
                style={{
                  padding: "10px 16px",
                  background: "linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)",
                  border: "none",
                  color: "#fff",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: testingServer ? "not-allowed" : "pointer",
                }}
              >
                {testingServer ? "Testing..." : "Test & Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}