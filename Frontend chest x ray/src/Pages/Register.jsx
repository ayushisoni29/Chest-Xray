import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Plus,
  Server,
  X,
  CheckCircle2,
} from "lucide-react";
import { registerUser, getBaseUrl, setCustomBaseUrl } from "../api";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Server settings modal
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverUrl, setServerUrl] = useState(getBaseUrl());
  const [testingServer, setTestingServer] = useState(false);
  const [serverStatus, setServerStatus] = useState(null);

  // Password validation: min 8 chars with letters & numbers
  const validate = () => {
    if (!name.trim()) {
      setError("Please enter your full clinical name.");
      return false;
    }
    if (!email.trim() || !email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid hospital email address.");
      return false;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return false;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must contain both letters and numbers.");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }
    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setError("");
    setLoading(true);

    try {
      await registerUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      navigate("/");
    } catch (err) {
      setError(err.message || "Registration failed. Please verify server connection.");
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
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "14px",
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
              }}
            >
              <Plus size={20} color="#ffffff" strokeWidth={3} />
            </div>
            <div>
              <span style={{ fontSize: "16px", fontWeight: "800", color: "#081d15" }}>MedScan AI</span>
              <div style={{ fontSize: "11px", color: "#526e62" }}>Clinical Imaging Workspace</div>
            </div>
          </div>

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
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#22c55e",
                display: "inline-block",
              }}
            />
            <span>Server online</span>
          </button>
        </div>

        {/* Title */}
        <div style={{ marginBottom: "12px" }}>
          <h2 style={{ fontSize: "23px", fontWeight: "800", color: "#081d15", margin: "0 0 4px 0" }}>
            Create Account
          </h2>
          <span style={{ fontSize: "12px", color: "#476356" }}>Register authorized clinical staff</span>
        </div>

        {/* Form */}
        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {error && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#081d15", marginBottom: "4px" }}>
              FULL NAME
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder=""
                autoComplete="off"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "#ffffff",
                  border: "1.5px solid #cbd5e1",
                  borderRadius: "9px",
                  fontSize: "13.5px",
                  color: "#081d15",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#081d15", marginBottom: "4px" }}>
              HOSPITAL EMAIL
            </label>
            <input
              type="email"
              placeholder=""
              autoComplete="off"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "#ffffff",
                border: "1.5px solid #cbd5e1",
                borderRadius: "9px",
                fontSize: "13.5px",
                color: "#081d15",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#081d15", marginBottom: "4px" }}>
              PASSWORD (min 8 chars, letters + numbers)
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder=""
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                style={{
                  width: "100%",
                  padding: "10px 38px 10px 14px",
                  background: "#ffffff",
                  border: "1.5px solid #cbd5e1",
                  borderRadius: "9px",
                  fontSize: "13.5px",
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
                  display: "flex",
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#081d15", marginBottom: "4px" }}>
              CONFIRM PASSWORD
            </label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder=""
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError("");
              }}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "#ffffff",
                border: "1.5px solid #cbd5e1",
                borderRadius: "9px",
                fontSize: "13.5px",
                color: "#081d15",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              background: "#065f46",
              color: "#ffffff",
              border: "none",
              borderRadius: "9px",
              fontSize: "14px",
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
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Complete Registration"}
          </button>

          {/* Back to Login */}
          <div style={{ textAlign: "center", fontSize: "12px", color: "#475569" }}>
            Already registered?{" "}
            <Link to="/login" style={{ color: "#065f46", fontWeight: "700", textDecoration: "none" }}>
              Sign In
            </Link>
          </div>
        </form>
      </div>

      <div style={{ textAlign: "center", fontSize: "10.5px", color: "#64748b", marginTop: "10px" }}>
        Encrypted clinical registration · SSIPMT Major Project
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
