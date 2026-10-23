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
        <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#081d15", marginBottom: "14px" }}>
          Clinician Profile
        </h2>

        <div
          style={{
            background: "#ffffff",
            border: "1.5px solid #e2ede6",
            borderRadius: "20px",
            padding: "18px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #059669 0%, #065f46 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: "800",
              fontSize: "20px",
              boxShadow: "0 4px 15px rgba(6, 95, 70, 0.35)",
            }}
          >
            {user.name ? user.name[0].toUpperCase() : "U"}
          </div>

          <div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "#081d15" }}>
              {user.name || "Medical Practitioner"}
            </div>
            <div style={{ fontSize: "12px", color: "#526e62", marginTop: "2px" }}>
              {user.email || "practitioner@hospital.org"}
            </div>
            <div
              style={{
                display: "inline-block",
                marginTop: "6px",
                padding: "2px 8px",
                borderRadius: "4px",
                background: "#ecfdf5",
                color: "#065f46",
                border: "1px solid #a7f3d0",
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
            background: "#ffffff",
            border: "1.5px solid #e2ede6",
            borderRadius: "14px",
            padding: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", color: "#065f46" }}>
              <Info size={16} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#081d15" }}>About MedScan AI</div>
              <div style={{ fontSize: "11px", color: "#526e62" }}>Clinical model, pipeline & explainability</div>
            </div>
          </div>
          <ChevronRight size={18} color="#94a3b8" />
        </div>

        {/* Server & API Status */}
        <div
          style={{
            background: "#ffffff",
            border: "1.5px solid #e2ede6",
            borderRadius: "14px",
            padding: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", color: "#166534" }}>
              <Server size={16} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#081d15" }}>Backend Service</div>
              <div style={{ fontSize: "11px", color: "#166534", fontWeight: "600" }}>{serverStatus}</div>
            </div>
          </div>
          <span style={{ fontSize: "11px", color: "#526e62", fontWeight: "600" }}>FastAPI</span>
        </div>

        {/* Developer Server Configuration Modal */}
        <div
          onClick={() => setShowDevModal(true)}
          style={{
            background: "#ffffff",
            border: "1.5px solid #e2ede6",
            borderRadius: "14px",
            padding: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", color: "#b45309" }}>
              <Code2 size={16} />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#081d15" }}>Developer Server URL</div>
              <div style={{ fontSize: "11px", color: "#526e62" }}>Override API host for local/cloud tunnel</div>
            </div>
          </div>
          <ChevronRight size={18} color="#94a3b8" />
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
            background: "#fef2f2",
            border: "1.5px solid #fecaca",
            borderRadius: "14px",
            color: "#dc2626",
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

        <div style={{ textAlign: "center", marginTop: "10px", fontSize: "11px", color: "#526e62" }}>
          MedScan AI Mobile • Version 1.0.0 (Build 36)
        </div>
      </div>

      {/* ABOUT BOTTOM SHEET (Overview | Workflow | Tech Stack) */}
      {showAboutSheet && (
        <div className="bottom-sheet-backdrop" onClick={() => setShowAboutSheet(false)}>
          <div className="bottom-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-handle" />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#081d15", margin: 0 }}>
                About MedScan AI
              </h3>
              <button
                type="button"
                onClick={() => setShowAboutSheet(false)}
                style={{ background: "transparent", border: "none", color: "#526e62", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs switcher inside bottom sheet */}
            <Tabs tabs={aboutTabs} activeTab={aboutTab} onChange={setAboutTab} />

            <div style={{ marginTop: "16px", minHeight: "180px", fontSize: "12px", color: "#526e62", lineHeight: "1.6" }}>
              {aboutTab === "overview" && (
                <div>
                  <h4 style={{ color: "#081d15", fontSize: "13px", marginBottom: "6px" }}>Clinical Objective</h4>
                  <p style={{ marginBottom: "10px" }}>
                    MedScan AI provides rapid, automated preliminary screening of chest radiographs
                    across 5 distinct pathological classes: <strong>COVID-19</strong>, <strong>Normal</strong>,
                    <strong>Pneumonia</strong>, <strong>Tuberculosis</strong>, and <strong>Lung Opacity</strong>.
                  </p>
                  <p>
                    Verified held-out test accuracy is <strong style={{ color: "#065f46" }}>98.15%</strong> with clinical sensitivity
                    calibration for emergency triage.
                  </p>
                </div>
              )}

              {aboutTab === "workflow" && (
                <div>
                  <h4 style={{ color: "#081d15", fontSize: "13px", marginBottom: "6px" }}>Dual-Model Ensemble</h4>
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
                  <h4 style={{ color: "#081d15", fontSize: "13px", marginBottom: "6px" }}>Architecture</h4>
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
            <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#081d15", marginBottom: "8px" }}>
              Developer Server Configuration
            </h3>
            <p style={{ fontSize: "12px", color: "#526e62", marginBottom: "14px" }}>
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
                background: "#ffffff",
                border: "1.5px solid #cbd5e1",
                borderRadius: "10px",
                color: "#081d15",
                fontSize: "13px",
                marginBottom: "12px",
                boxSizing: "border-box",
                outline: "none",
              }}
            />

            {devStatus && (
              <div
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  marginBottom: "14px",
                  background: devStatus.success ? "#dcfce7" : "#fee2e2",
                  color: devStatus.success ? "#166534" : "#991b1b",
                  border: `1px solid ${devStatus.success ? "#bbf7d0" : "#fecaca"}`,
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
                  background: "#ffffff",
                  border: "1.5px solid #cbd5e1",
                  color: "#526e62",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "600",
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
                  background: "linear-gradient(135deg, #059669 0%, #065f46 100%)",
                  border: "none",
                  color: "#ffffff",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: testingDev ? "not-allowed" : "pointer",
                  boxShadow: "0 2px 8px rgba(6, 95, 70, 0.25)",
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
