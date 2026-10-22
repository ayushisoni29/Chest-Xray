import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Stethoscope,
  AlertCircle,
  Server,
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

  // Password validation: min 8 chars with at least one letter and one number
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
      setError(err.message || "Registration failed. Please check server connection.");
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
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "20px 20px",
        boxSizing: "border-box",
        background: "radial-gradient(circle at top right, #0f172a 0%, #020617 100%)",
        color: "#fff",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 15px rgba(56, 189, 248, 0.4)",
              }}
            >
              <Stethoscope size={18} color="#fff" />
            </div>
            <span style={{ fontSize: "16px", fontWeight: "900" }}>MedScan AI</span>
          </div>

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
              gap: "4px",
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

        <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#fff", margin: "0 0 2px 0" }}>
          Create Account
        </h2>
        <span style={{ fontSize: "12px", color: "#94a3b8" }}>Register new clinical staff</span>
      </div>

      {/* Main Single-Viewport Form */}
      <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {error && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: "10px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              color: "#f87171",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Full Name */}
        <div>
          <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#94a3b8", marginBottom: "4px" }}>
            FULL NAME
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "10px",
              padding: "0 12px",
            }}
          >
            <User size={15} color="#64748b" />
            <input
              type="text"
              placeholder="Dr. Ayushi Soni"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              style={{ width: "100%", padding: "11px 8px", background: "transparent", border: "none", color: "#fff", fontSize: "13px", outline: "none" }}
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#94a3b8", marginBottom: "4px" }}>
            EMAIL ADDRESS
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "10px",
              padding: "0 12px",
            }}
          >
            <Mail size={15} color="#64748b" />
            <input
              type="email"
              placeholder="ayushi@hospital.org"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              style={{ width: "100%", padding: "11px 8px", background: "transparent", border: "none", color: "#fff", fontSize: "13px", outline: "none" }}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#94a3b8", marginBottom: "4px" }}>
            PASSWORD (MIN 8 CHARACTERS WITH LETTERS & NUMBERS)
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "10px",
              padding: "0 12px",
            }}
          >
            <Lock size={15} color="#64748b" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              style={{ width: "100%", padding: "11px 8px", background: "transparent", border: "none", color: "#fff", fontSize: "13px", outline: "none" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: 0 }}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label style={{ display: "block", fontSize: "10px", fontWeight: "700", color: "#94a3b8", marginBottom: "4px" }}>
            CONFIRM PASSWORD
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "10px",
              padding: "0 12px",
            }}
          >
            <Lock size={15} color="#64748b" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError("");
              }}
              style={{ width: "100%", padding: "11px 8px", background: "transparent", border: "none", color: "#fff", fontSize: "13px", outline: "none" }}
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            background: "linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: "700",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            marginTop: "4px",
            boxShadow: "0 4px 15px rgba(56, 189, 248, 0.4)",
          }}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="spin" /> Creating Account...
            </>
          ) : (
            <>
              Register & Sign In <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* Bottom Switcher */}
      <div style={{ textAlign: "center", fontSize: "12px", color: "#94a3b8" }}>
        Already have an account?{" "}
        <Link to="/login" style={{ color: "#38bdf8", fontWeight: "700", textDecoration: "none" }}>
          Sign In
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
              Enter your live Codespace or tunnel URL.
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
