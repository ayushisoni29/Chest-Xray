import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Calendar,
  LogOut,
  Info,
  Server,
  Code2,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  Shield,
  Layers,
  Cpu,
  Sparkles,
  Loader2,
} from "lucide-react";
import Tabs from "../components/Tabs";
import {
  getStoredUser,
  logoutUser,
  getBaseUrl,
  setCustomBaseUrl,
  checkHealth,
  getModelMetrics,
} from "../api";

export default function Profile() {
  const navigate = useNavigate();
  const user = getStoredUser() || {};

  const [serverStatus, setServerStatus] = useState("Checking...");
  const [showAboutSheet, setShowAboutSheet] = useState(false);
  const [aboutTab, setAboutTab] = useState("overview");

  // Developer settings modal for custom backend URL
  const [showDevModal, setShowDevModal] = useState(false);
  const [devUrl, setDevUrl] = useState(getBaseUrl());
  const [testingDev, setTestingDev] = useState(false);
  const [devStatus, setDevStatus] = useState(null);

  useEffect(() => {
    checkHealth()
      .then((res) => {
        if (res && res.status === "ok") {
          setServerStatus("Online (Port 8000)");
        } else {
          setServerStatus("Degraded");
        }
      })
      .catch(() => setServerStatus("Offline / Unreachable"));
  }, []);

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  const handleSaveDevUrl = async () => {
    setTestingDev(true);
    setDevStatus(null);
    try {
      const clean = devUrl.trim().replace(/\/+$/, "");
      const res = await fetch(`${clean}/health`);
      if (res.ok) {
        setCustomBaseUrl(clean);
        setDevStatus({ success: true, message: "Connected & saved!" });
      } else {
        setDevStatus({ success: false, message: `Server replied HTTP ${res.status}` });
      }
    } catch (err) {
      setDevStatus({ success: false, message: "Failed to connect to URL." });
    } finally {
      setTestingDev(false);
    }
  };

  const aboutTabs = [
    { id: "overview", label: "Overview", icon: Info },
    { id: "workflow", label: "Workflow", icon: Layers },
    { id: "tech", label: "Tech Stack", icon: Cpu },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "16px",
        boxSizing: "border-box",
        justifyContent: "space-between",
        gap: "14px",
      }}
    >
      {/* 1. Header & User Info Card */}
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#fff", marginBottom: "14px" }}>
          Clinician Profile
        </h2>

        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "20px",
            padding: "18px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: "800",
              fontSize: "20px",
              boxShadow: "0 4px 15px rgba(56, 189, 248, 0.35)",
            }}
          >
            {user.name ? user.name[0].toUpperCase() : "U"}
          </div>

          <div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "#fff" }}>
              {user.name || "Medical Practitioner"}
            </div>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
              {user.email || "practitioner@hospital.org"}
            </div>
            <div
              style={{
                display: "inline-block",
                marginTop: "6px",
                padding: "2px 8px",
                borderRadius: "4px",
                background: "rgba(56, 189, 248, 0.1)",
                color: "#38bdf8",
                fontSize: "10px",
                fontWeight: "700",
              }}
            >
              AUTHORIZED CLINICIAN
            </div>
          </div>
        </div>
      </div>

      {/* 2. Menu Options List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, justifyContent: "center" }}>
        {/* About App (Opens Bottom Sheet) */}
        <div
          onClick={() => setShowAboutSheet(true)}
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(56, 189, 248, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#38bdf8" }}>
              <Info size={16} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#fff" }}>About MedScan AI</div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>Clinical model, pipeline & explainability</div>
            </div>
          </div>
          <ChevronRight size={18} color="#64748b" />
        </div>

        {/* Server & API Status */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(34, 197, 94, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#4ade80" }}>
              <Server size={16} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#fff" }}>Backend Service</div>
              <div style={{ fontSize: "11px", color: "#4ade80" }}>{serverStatus}</div>
            </div>
          </div>
          <span style={{ fontSize: "11px", color: "#64748b" }}>FastAPI</span>
        </div>

        {/* Developer Server Configuration Modal */}
        <div
          onClick={() => setShowDevModal(true)}
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(245, 158, 11, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fbbf24" }}>
              <Code2 size={16} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#fff" }}>Developer Server URL</div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>Override API host for local/cloud tunnel</div>
            </div>
          </div>
          <ChevronRight size={18} color="#64748b" />
        </div>
      </div>

      {/* 3. App Version & Logout Button */}
      <div>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            width: "100%",
            padding: "14px",
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "14px",
            color: "#f87171",
            fontWeight: "700",
            fontSize: "14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <LogOut size={16} /> Sign Out
        </button>

        <div style={{ textAlign: "center", marginTop: "10px", fontSize: "11px", color: "#475569" }}>
          MedScan AI Mobile • Version 1.0.0 (Build 36)
        </div>
      </div>

      {/* ABOUT BOTTOM SHEET (Overview | Workflow | Tech Stack) */}
      {showAboutSheet && (
        <div className="bottom-sheet-backdrop" onClick={() => setShowAboutSheet(false)}>
          <div className="bottom-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-handle" />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#fff", margin: 0 }}>
                About MedScan AI
              </h3>
              <button
                type="button"
                onClick={() => setShowAboutSheet(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs switcher inside bottom sheet */}
            <Tabs tabs={aboutTabs} activeTab={aboutTab} onChange={setAboutTab} />

            <div style={{ marginTop: "16px", minHeight: "180px", fontSize: "12px", color: "#cbd5e1", lineHeight: "1.6" }}>
              {aboutTab === "overview" && (
                <div>
                  <h4 style={{ color: "#fff", fontSize: "13px", marginBottom: "6px" }}>Clinical Objective</h4>
                  <p style={{ marginBottom: "10px" }}>
                    MedScan AI provides rapid, automated preliminary screening of chest radiographs
                    across 5 distinct pathological classes: <strong>COVID-19</strong>, <strong>Normal</strong>,
                    <strong>Pneumonia</strong>, <strong>Tuberculosis</strong>, and <strong>Lung Opacity</strong>.
                  </p>
                  <p>
                    Verified held-out test accuracy is <strong>98.15%</strong> with clinical sensitivity
                    calibration for emergency triage.
                  </p>
                </div>
              )}

              {aboutTab === "workflow" && (
                <div>
                  <h4 style={{ color: "#fff", fontSize: "13px", marginBottom: "6px" }}>Dual-Model Ensemble</h4>
                  <p style={{ marginBottom: "8px" }}>
                    1. <strong>Image Quality & Contrast Check:</strong> Laplacian blur and domain validation.
                  </p>
                  <p style={{ marginBottom: "8px" }}>
                    2. <strong>Ensemble Inference:</strong> Predictions from fine-tuned v3 (~120MB) and
                    v1 (~240MB) are blended using Test-Time Augmentation (TTA).
                  </p>
                  <p>
                    3. <strong>Grad-CAM Visual Explanations:</strong> High-resolution attention heatmaps
                    are generated from final convolutional layers to provide transparent AI decision auditing.
                  </p>
                </div>
              )}

              {aboutTab === "tech" && (
                <div>
                  <h4 style={{ color: "#fff", fontSize: "13px", marginBottom: "6px" }}>Architecture</h4>
                  <ul style={{ paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <li><strong>AI Engine:</strong> TensorFlow / Keras 2.16 with Grad-CAM</li>
                    <li><strong>Backend API:</strong> FastAPI + Uvicorn + MongoDB Atlas</li>
                    <li><strong>Mobile Client:</strong> React 19 + Capacitor 8 Android Shell</li>
                    <li><strong>Security:</strong> JWT tokens with bcrypt hash verification</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DEVELOPER URL MODAL */}
      {showDevModal && (
        <div className="bottom-sheet-backdrop" onClick={() => setShowDevModal(false)}>
          <div className="bottom-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-handle" />
            <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#fff", marginBottom: "8px" }}>
              Developer Server Configuration
            </h3>
            <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "14px" }}>
              Enter your live Codespace or tunnel URL. Leave empty to use default.
            </p>

            <input
              type="text"
              placeholder="https://xxxx-8000.app.github.dev"
              value={devUrl}
              onChange={(e) => setDevUrl(e.target.value)}
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

            {devStatus && (
              <div
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  marginBottom: "14px",
                  background: devStatus.success ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                  color: devStatus.success ? "#4ade80" : "#f87171",
                  border: `1px solid ${devStatus.success ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                }}
              >
                {devStatus.message}
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  setDevUrl("");
                  setCustomBaseUrl("");
                  setShowDevModal(false);
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
                onClick={handleSaveDevUrl}
                disabled={testingDev}
                style={{
                  padding: "10px 16px",
                  background: "linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)",
                  border: "none",
                  color: "#fff",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: testingDev ? "not-allowed" : "pointer",
                }}
              >
                {testingDev ? "Testing..." : "Test & Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
