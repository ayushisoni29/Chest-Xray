import React, { useEffect, useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import {
  Download,
  ShieldAlert,
  Eye,
  Activity,
  Layers,
  FileText,
  AlertCircle,
  Share2,
  Calendar,
  User,
  CheckCircle2,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import Tabs from "../components/Tabs";
import { getPredictionById, getStaticUrl, downloadPredictionReport } from "../api";

const CLASS_COLORS = {
  COVID: "#ef4444",
  Lung_Opacity: "#f97316",
  Normal: "#22c55e",
  Pneumonia: "#3b82f6",
  Tuberculosis: "#a855f7",
};

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("result");
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHeatmapToggle, setShowHeatmapToggle] = useState(true);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      const params = new URLSearchParams(location.search);
      const predictionId = params.get("id");

      if (predictionId) {
        try {
          const remote = await getPredictionById(predictionId);
          if (cancelled) return;

          setAnalysisData({
            id: remote.id || predictionId,
            fileName: remote.image_filename,
            date: remote.timestamp ? new Date(remote.timestamp).toLocaleDateString("en-IN") : "Recent",
            time: remote.timestamp ? new Date(remote.timestamp).toLocaleTimeString("en-IN") : "",
            predicted_class: remote.predicted_class,
            confidence: remote.confidence,
            all_class_probabilities: remote.probabilities || remote.all_class_probabilities || {},
            heatmap_url: remote.heatmap_url,
            image_url: remote.image_url,
            calibrated_thresholds: remote.calibrated_thresholds || {},
            clinical_flags: remote.clinical_flags || [],
            patient: {
              patientName: remote.patient_name || "Patient Record",
              patientAge: remote.patient_age || "—",
              patientGender: remote.patient_gender || "—",
            },
          });
          setLoading(false);
          return;
        } catch (err) {
          if (cancelled) return;
        }
      }

      // Read from local session storage
      try {
        const raw = sessionStorage.getItem("currentXRayAnalysis");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (!cancelled) {
            setAnalysisData(parsed);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        // ignore JSON error
      }

      if (!cancelled) {
        setAnalysisData(null);
        setLoading(false);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [location.search]);

  const handleDownloadPDF = async () => {
    if (!analysisData || downloadingReport) return;
    setDownloadingReport(true);
    setDownloadError("");

    try {
      const patientInfo = {
        name: analysisData?.patient?.patientName || "Patient",
        email: analysisData?.patient?.patientEmail || "",
        age: analysisData?.patient?.patientAge || "",
        gender: analysisData?.patient?.patientGender || "",
      };

      await downloadPredictionReport(analysisData.id, patientInfo);
    } catch (err) {
      setDownloadError(err.message || "Failed to download PDF report.");
    } finally {
      setDownloadingReport(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={36} className="spin" color="#38bdf8" />
        <span style={{ color: "#94a3b8", fontSize: "13px", marginTop: "12px" }}>Loading Clinical Findings...</span>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div style={{ padding: "20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <AlertCircle size={48} color="#f87171" style={{ marginBottom: "12px" }} />
        <h2 style={{ fontSize: "18px", color: "#fff", marginBottom: "8px" }}>No Analysis Available</h2>
        <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "20px" }}>Please scan an X-ray first to view results.</p>
        <button
          onClick={() => navigate("/detection")}
          style={{
            padding: "12px 24px",
            background: "linear-gradient(135deg, #38bdf8, #6366f1)",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            fontWeight: "700",
            fontSize: "14px",
          }}
        >
          New Scan
        </button>
      </div>
    );
  }

  const {
    predicted_class = "Normal",
    confidence = 0.95,
    all_class_probabilities = {},
    heatmap_url,
    image_url,
    preview,
    patient = {},
    clinical_flags = [],
    calibrated_thresholds = {},
  } = analysisData;

  const confPercent = Math.round(confidence * 100);
  const classColor = CLASS_COLORS[predicted_class] || "#38bdf8";
  const isLowConfidence = confidence < 0.6;

  // Chart data for Recharts
  const chartData = Object.entries(all_class_probabilities).map(([key, val]) => ({
    name: key.replace("_", " "),
    code: key,
    prob: Math.round(val * 100),
  }));

  const tabsConfig = [
    { id: "result", label: "Result", icon: Activity },
    { id: "gradcam", label: "Grad-CAM", icon: Eye },
    { id: "details", label: "Details", icon: FileText },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "12px 16px",
        boxSizing: "border-box",
        gap: "10px",
      }}
    >
      {/* Disclaimer Banner — Always Visible */}
      <div className="disclaimer-banner">
        <ShieldAlert size={16} color="#38bdf8" style={{ flexShrink: 0 }} />
        <span>AI-assisted preliminary screening — not a definitive medical diagnosis.</span>
      </div>

      {/* Low Confidence Warning If Triggered */}
      {isLowConfidence && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "10px",
            padding: "8px 12px",
            color: "#f87171",
            fontSize: "11px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>Low confidence detection. Clinical radiologist review strongly recommended.</span>
        </div>
      )}

      {/* Top 3-Tab Switcher */}
      <Tabs tabs={tabsConfig} activeTab={activeTab} onChange={setActiveTab} />

      {/* Main Single-Viewport Tab Views */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        {/* TAB 1: RESULT OVERVIEW & PROBABILITIES */}
        {activeTab === "result" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              justifyContent: "space-around",
            }}
          >
            {/* Big Classification Chip Card */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "18px",
                padding: "16px",
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ textAlign: "left" }}>
                <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>
                  Primary Classification
                </span>
                <div style={{ fontSize: "24px", fontWeight: "800", color: classColor, marginTop: "2px" }}>
                  {predicted_class.replace("_", " ")}
                </div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                  Patient: {patient.patientName || "Anonymous"} ({patient.patientAge || "?"}y, {patient.patientGender || "?"})
                </div>
              </div>

              {/* Confidence Meter Badge */}
              <div
                style={{
                  width: "68px",
                  height: "68px",
                  borderRadius: "50%",
                  border: `3px solid ${classColor}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(0,0,0,0.3)",
                  boxShadow: `0 0 16px ${classColor}33`,
                }}
              >
                <span style={{ fontSize: "18px", fontWeight: "900", color: "#fff" }}>{confPercent}%</span>
                <span style={{ fontSize: "9px", color: "#94a3b8", fontWeight: "600" }}>CONFIDENCE</span>
              </div>
            </div>

            {/* Probability Breakdown (Compact Recharts) */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "18px",
                padding: "12px 14px",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "700", marginBottom: "8px" }}>
                Multi-Class Confidence Distribution
              </span>
              <div style={{ width: "100%", height: "135px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 25, left: 10, bottom: 0 }}>
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={75} />
                    <Tooltip
                      formatter={(val) => [`${val}%`, "Probability"]}
                      contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "11px" }}
                    />
                    <Bar dataKey="prob" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CLASS_COLORS[entry.code] || "#38bdf8"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GRAD-CAM ATTENTION HEATMAP */}
        {activeTab === "gradcam" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              justifyContent: "center",
            }}
          >
            {/* View Mode Toggle Pill */}
            <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setShowHeatmapToggle(false)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: !showHeatmapToggle ? "1px solid #38bdf8" : "1px solid rgba(255,255,255,0.1)",
                  background: !showHeatmapToggle ? "rgba(56,189,248,0.2)" : "rgba(255,255,255,0.04)",
                  color: !showHeatmapToggle ? "#38bdf8" : "#94a3b8",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                Original Scan
              </button>
              <button
                type="button"
                onClick={() => setShowHeatmapToggle(true)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: showHeatmapToggle ? "1px solid #a855f7" : "1px solid rgba(255,255,255,0.1)",
                  background: showHeatmapToggle ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.04)",
                  color: showHeatmapToggle ? "#c084fc" : "#94a3b8",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                Grad-CAM Heatmap
              </button>
            </div>

            {/* Heatmap Image Viewer */}
            <div
              style={{
                width: "100%",
                height: "220px",
                background: "#000",
                borderRadius: "16px",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <img
                src={
                  showHeatmapToggle && heatmap_url
                    ? getStaticUrl(heatmap_url)
                    : image_url
                    ? getStaticUrl(image_url)
                    : preview
                }
                alt="Radiograph visual explanation"
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              />
            </div>

            <div
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "10px 12px",
                fontSize: "11px",
                color: "#94a3b8",
                lineHeight: "1.4",
              }}
            >
              <strong style={{ color: "#fff" }}>Grad-CAM Explanation:</strong> Warmer red/yellow regions
              highlight visual features that most heavily influenced the neural ensemble's classification.
            </div>
          </div>
        )}

        {/* TAB 3: DETAILS & DOWNLOAD PDF */}
        {activeTab === "details" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              justifyContent: "space-between",
            }}
          >
            {/* Patient & Scan Info Card */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
                padding: "14px",
                fontSize: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Patient Name</span>
                <strong style={{ color: "#fff" }}>{patient.patientName || "N/A"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Age / Gender</span>
                <strong style={{ color: "#fff" }}>{patient.patientAge} yrs • {patient.patientGender}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>File Name</span>
                <strong style={{ color: "#fff" }}>{analysisData.fileName || "xray.png"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Scan Timestamp</span>
                <strong style={{ color: "#fff" }}>{analysisData.date} {analysisData.time}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Calibrated Threshold</span>
                <strong style={{ color: "#38bdf8" }}>
                  {(calibrated_thresholds[predicted_class] || 0.5) * 100}%
                </strong>
              </div>
            </div>

            {downloadError && (
              <div style={{ color: "#f87171", fontSize: "11px", textAlign: "center" }}>
                {downloadError}
              </div>
            )}

            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={downloadingReport}
              style={{
                width: "100%",
                padding: "16px",
                background: "linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)",
                border: "none",
                borderRadius: "14px",
                color: "#fff",
                fontWeight: "700",
                fontSize: "14px",
                cursor: downloadingReport ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 4px 15px rgba(56, 189, 248, 0.4)",
              }}
            >
              {downloadingReport ? (
                <>
                  <Loader2 size={16} className="spin" /> Generating Clinical PDF...
                </>
              ) : (
                <>
                  <Download size={16} /> Download Official PDF Report
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
