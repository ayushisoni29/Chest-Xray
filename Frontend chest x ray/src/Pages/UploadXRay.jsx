import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Upload,
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  FileCheck,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { predictXRay, getStoredUser } from "../api";

export default function UploadXRay() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const user = getStoredUser() || {};

  // Step state (1: Choose Image, 2: Patient Info, 3: AI Analyzing)
  const [step, setStep] = useState(1);

  // Form states
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");

  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("Male");
  const [patientEmail, setPatientEmail] = useState("");

  // Analysis progress animation
  const [analysisProgress, setAnalysisProgress] = useState(10);
  const [analysisStatus, setAnalysisStatus] = useState("Initializing neural pipeline...");

  // Validate and load selected file
  const handleFileSelection = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");

    // Validation: Image format
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setError("Please select a standard X-ray image (PNG, JPG, or WEBP).");
      return;
    }

    // Validation: Max 15MB
    if (file.size > 15 * 1024 * 1024) {
      setError("Image file is too large. Maximum size is 15 MB.");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleStartAnalysis = async () => {
    // Validate Patient Info
    if (!patientName.trim()) {
      setError("Please enter the patient's name.");
      return;
    }
    const age = parseInt(patientAge, 10);
    if (!patientAge || isNaN(age) || age < 1 || age > 120) {
      setError("Please enter a valid patient age (1 - 120).");
      return;
    }
    if (!patientGender) {
      setError("Please select patient gender.");
      return;
    }

    setError("");
    setStep(3); // Go to Analyzing Screen

    // Simulated medical analysis stage steps
    const progressTimer1 = setTimeout(() => {
      setAnalysisProgress(35);
      setAnalysisStatus("Validating chest anatomy & contrast clarity...");
    }, 400);

    const progressTimer2 = setTimeout(() => {
      setAnalysisProgress(65);
      setAnalysisStatus("Running dual-model ensemble (Super-Model v1 + v3)...");
    }, 1100);

    const progressTimer3 = setTimeout(() => {
      setAnalysisProgress(88);
      setAnalysisStatus("Generating Grad-CAM visual attention heatmap...");
    }, 2000);

    try {
      const result = await predictXRay(selectedFile);

      setAnalysisProgress(100);
      setAnalysisStatus("Diagnostic report finalized!");

      const analysisPayload = {
        id: result.id || result.prediction_id || result.predictionId || null,
        fileName: selectedFile.name,
        fileType: selectedFile.type || "Image",
        fileSize: selectedFile.size,
        preview,
        date: new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        time: new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        predicted_class: result.predicted_class,
        confidence: result.confidence,
        all_class_probabilities:
          result.all_class_probabilities || result.probabilities || {},
        heatmap_url: result.heatmap_url,
        image_url: result.image_url,
        calibrated_thresholds: result.calibrated_thresholds || {},
        clinical_flags: result.clinical_flags || [],
        status: "Completed",
        patient: {
          patientName: patientName.trim(),
          patientEmail: patientEmail.trim() || user.email || "",
          patientAge: age,
          patientGender,
        },
      };

      // Store contract for Results page
      sessionStorage.setItem(
        "currentXRayAnalysis",
        JSON.stringify(analysisPayload)
      );

      setTimeout(() => {
        navigate("/results");
      }, 500);
    } catch (err) {
      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);
      clearTimeout(progressTimer3);
      setStep(2);
      setError(err.message || "Prediction failed. Please check server connection.");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "16px",
        boxSizing: "border-box",
        justifyContent: "space-between",
      }}
    >
      {/* Top Stepper Indicator */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
          }}
        >
          <span style={{ fontSize: "16px", fontWeight: "800", color: "#fff" }}>
            {step === 1 && "Step 1: Choose Scan"}
            {step === 2 && "Step 2: Patient Info"}
            {step === 3 && "Step 3: AI Inference"}
          </span>
          <span style={{ fontSize: "12px", color: "#38bdf8", fontWeight: "700" }}>
            {step} of 3
          </span>
        </div>

        {/* Stepper progress bars */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: "4px",
                borderRadius: "2px",
                background: s <= step ? "#38bdf8" : "rgba(255, 255, 255, 0.1)",
                transition: "background 0.3s ease",
              }}
            />
          ))}
        </div>

        {error && (
          <div
            style={{
              padding: "10px 12px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "10px",
              color: "#f87171",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "14px",
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Main Step Content Area (Strict Viewport Bound) */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <AnimatePresence mode="wait">
          {/* STEP 1: IMAGE SELECTION & PREVIEW */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelection}
                style={{ display: "none" }}
              />

              {!preview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: "2px dashed rgba(56, 189, 248, 0.35)",
                    background: "rgba(56, 189, 248, 0.03)",
                    borderRadius: "20px",
                    padding: "36px 20px",
                    textAlign: "center",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      background: "rgba(56, 189, 248, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#38bdf8",
                    }}
                  >
                    <Camera size={32} />
                  </div>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#fff", marginBottom: "4px" }}>
                      Take Photo or Select X-Ray
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                      Supports JPEG, PNG, WEBP (Max 15MB)
                    </div>
                  </div>
                  <button
                    type="button"
                    style={{
                      marginTop: "6px",
                      padding: "10px 20px",
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#fff",
                      borderRadius: "10px",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    Browse Files
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "20px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: "220px",
                      borderRadius: "14px",
                      overflow: "hidden",
                      background: "#000",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    <img
                      src={preview}
                      alt="Selected X-ray"
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      width: "100%",
                      alignItems: "center",
                      fontSize: "12px",
                      color: "#94a3b8",
                    }}
                  >
                    <span style={{ fontWeight: "600", color: "#e2e8f0" }}>
                      {selectedFile?.name?.slice(0, 24)}...
                    </span>
                    <span>{(selectedFile?.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreview("");
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#f87171",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <RotateCcw size={14} /> Choose Different Image
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 2: PATIENT DETAILS */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#94a3b8", marginBottom: "6px" }}>
                  PATIENT FULL NAME *
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#94a3b8", marginBottom: "6px" }}>
                    AGE *
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 45"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    min="1"
                    max="120"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ flex: 1.5 }}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#94a3b8", marginBottom: "6px" }}>
                    GENDER *
                  </label>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {["Male", "Female", "Other"].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setPatientGender(g)}
                        style={{
                          flex: 1,
                          padding: "12px 4px",
                          borderRadius: "10px",
                          border: patientGender === g ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.1)",
                          background: patientGender === g ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.04)",
                          color: patientGender === g ? "#38bdf8" : "#94a3b8",
                          fontSize: "12px",
                          fontWeight: "700",
                          cursor: "pointer",
                        }}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#94a3b8", marginBottom: "6px" }}>
                  PATIENT / CONTACT EMAIL (OPTIONAL)
                </label>
                <input
                  type="email"
                  placeholder="patient@example.com"
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </motion.div>
          )}

          {/* STEP 3: ANALYZING (ANIMATED RADAR SCANNER) */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                padding: "20px 0",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "140px",
                  height: "140px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "radial-gradient(circle, rgba(56,189,248,0.2) 0%, rgba(2,6,23,0) 70%)",
                  marginBottom: "24px",
                }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    border: "2px solid transparent",
                    borderTopColor: "#38bdf8",
                    borderRightColor: "#6366f1",
                  }}
                />
                <Sparkles size={48} color="#38bdf8" />
              </div>

              <div style={{ fontSize: "18px", fontWeight: "800", color: "#fff", marginBottom: "8px" }}>
                Analyzing Chest X-Ray
              </div>
              <div style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "20px", minHeight: "20px" }}>
                {analysisStatus}
              </div>

              <div
                style={{
                  width: "100%",
                  maxWidth: "280px",
                  height: "6px",
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "3px",
                  overflow: "hidden",
                }}
              >
                <motion.div
                  animate={{ width: `${analysisProgress}%` }}
                  transition={{ ease: "easeOut", duration: 0.4 }}
                  style={{
                    height: "100%",
                    background: "linear-gradient(90deg, #38bdf8, #6366f1)",
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Action Buttons */}
      <div style={{ paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {step === 1 && (
          <button
            type="button"
            disabled={!selectedFile}
            onClick={() => setStep(2)}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "14px",
              border: "none",
              background: selectedFile
                ? "linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)"
                : "rgba(255, 255, 255, 0.08)",
              color: selectedFile ? "#fff" : "#64748b",
              fontWeight: "700",
              fontSize: "15px",
              cursor: selectedFile ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: selectedFile ? "0 4px 15px rgba(56, 189, 248, 0.4)" : "none",
            }}
          >
            Continue to Patient Info <ArrowRight size={18} />
          </button>
        )}

        {step === 2 && (
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                flex: 1,
                padding: "16px",
                borderRadius: "14px",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                background: "transparent",
                color: "#cbd5e1",
                fontWeight: "700",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleStartAnalysis}
              style={{
                flex: 2,
                padding: "16px",
                borderRadius: "14px",
                border: "none",
                background: "linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)",
                color: "#fff",
                fontWeight: "700",
                fontSize: "15px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 4px 15px rgba(56, 189, 248, 0.4)",
              }}
            >
              Start AI Analysis <Sparkles size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
