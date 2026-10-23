import React, { useEffect, useState, useRef } from "react";
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
  ChevronsLeftRight,
  SlidersHorizontal,
  Bot,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import Tabs from "../components/Tabs";
import { getPredictionById, getStaticUrl, downloadPredictionReport } from "../api";
import { useLanguage } from "../context/LanguageContext";
import AiChatAssistantModal from "../components/AiChatAssistantModal";


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
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState("result");
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Interactive Split Slider (Grad-CAM vs Original)
  const [sliderPos, setSliderPos] = useState(50); // 0 to 100%
  const [isDragging, setIsDragging] = useState(false);
  const sliderContainerRef = useRef(null);

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
        <Loader2 size={36} className="spin" color="#065f46" />
        <span style={{ color: "#526e62", fontSize: "13px", marginTop: "12px" }}>Loading Clinical Findings...</span>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div style={{ padding: "20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <AlertCircle size={48} color="#ef4444" style={{ marginBottom: "12px" }} />
        <h2 style={{ fontSize: "18px", color: "#081d15", marginBottom: "8px" }}>No Analysis Available</h2>
        <p style={{ color: "#526e62", fontSize: "13px", marginBottom: "20px" }}>Please scan an X-ray first to view results.</p>
        <button
          onClick={() => navigate("/detection")}
          style={{
            padding: "12px 24px",
            background: "linear-gradient(135deg, #059669 0%, #065f46 100%)",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            fontWeight: "700",
            fontSize: "14px",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(6, 95, 70, 0.3)",
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
  const classColor = CLASS_COLORS[predicted_class] || "#065f46";
  const isLowConfidence = confidence < 0.6;

  // Chart data for Recharts
  const chartData = Object.entries(all_class_probabilities).map(([key, val]) => ({
    name: key.replace("_", " "),
    code: key,
    prob: Math.round(val * 100),
  }));

  const handlePointerMove = (e) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
    const offsetX = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
    setSliderPos(Math.round(pct));
  };

  const tabsConfig = [
    { id: "result", label: t("tab_result"), icon: Activity },
    { id: "gradcam", label: t("tab_gradcam"), icon: Eye },
    { id: "details", label: t("tab_details"), icon: FileText },
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
        <ShieldAlert size={16} color="#065f46" style={{ flexShrink: 0 }} />
        <span>{t("disclaimer")}</span>
      </div>

      {/* Low Confidence Warning If Triggered */}
      {isLowConfidence && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "10px",
            padding: "8px 12px",
            color: "#991b1b",
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
                background: "#ffffff",
                border: "1.5px solid #e2ede6",
                borderRadius: "18px",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
              }}
            >
              <div style={{ textAlign: "left" }}>
                <span style={{ fontSize: "11px", color: "#526e62", fontWeight: "700", textTransform: "uppercase" }}>
                  {t("primary_classification")}
                </span>
                <div style={{ fontSize: "24px", fontWeight: "800", color: classColor, marginTop: "2px" }}>
                  {t(predicted_class) || predicted_class.replace("_", " ")}
                </div>
                <div style={{ fontSize: "11px", color: "#526e62", marginTop: "2px" }}>
                  {t("patient_label")}: {patient.patientName || "Anonymous"} ({patient.patientAge || "?"}y, {patient.patientGender || "?"})
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
                  background: "#f4f8f6",
                  boxShadow: `0 2px 8px rgba(0,0,0,0.06)`,
                }}
              >
                <span style={{ fontSize: "18px", fontWeight: "900", color: "#081d15" }}>{confPercent}%</span>
                <span style={{ fontSize: "9px", color: "#526e62", fontWeight: "700" }}>{t("confidence").toUpperCase()}</span>
              </div>
            </div>

            {/* Probability Breakdown (Compact Recharts) */}
            <div
              style={{
                background: "#ffffff",
                border: "1.5px solid #e2ede6",
                borderRadius: "18px",
                padding: "12px 14px",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
              }}
            >
              <span style={{ fontSize: "12px", color: "#081d15", fontWeight: "700", marginBottom: "8px" }}>
                {t("multi_class_dist")}
              </span>
              <div style={{ width: "100%", height: "135px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 25, left: 10, bottom: 0 }}>
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis dataKey="name" type="category" stroke="#526e62" fontSize={10} width={75} />
                    <Tooltip
                      formatter={(val) => [`${val}%`, "Probability"]}
                      contentStyle={{ background: "#ffffff", border: "1.5px solid #e2ede6", borderRadius: "8px", fontSize: "11px", color: "#081d15" }}
                    />
                    <Bar dataKey="prob" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CLASS_COLORS[entry.code] || "#065f46"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ask AI Assistant Interactive Action Banner */}
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
                border: "1.5px solid #a7f3d0",
                borderRadius: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 2px 6px rgba(6, 95, 70, 0.06)",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", textAlign: "left" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "10px",
                    background: "#059669",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 6px rgba(5, 150, 105, 0.25)",
                  }}
                >
                  <Bot size={18} />
                </div>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "800", color: "#065f46" }}>
                    {t("chatbot_btn")}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#047857" }}>
                    {t("chatbot_subtitle")}
                  </div>
                </div>
              </div>
              <Sparkles size={16} color="#059669" />
            </button>
          </div>
        )}

        {/* TAB 2: GRAD-CAM ATTENTION HEATMAP WITH INTERACTIVE SPLIT SLIDER */}
        {activeTab === "gradcam" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              justifyContent: "center",
            }}
          >
            {/* Quick Preset Buttons (Original / 50-50 Split / Heatmap) */}
            <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setSliderPos(0)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "20px",
                  border: sliderPos === 0 ? "1.5px solid #065f46" : "1.5px solid #e2ede6",
                  background: sliderPos === 0 ? "#ecfdf5" : "#ffffff",
                  color: sliderPos === 0 ? "#065f46" : "#526e62",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                {t("original_scan")}
              </button>
              <button
                type="button"
                onClick={() => setSliderPos(50)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "20px",
                  border: sliderPos > 0 && sliderPos < 100 ? "1.5px solid #065f46" : "1.5px solid #e2ede6",
                  background: sliderPos > 0 && sliderPos < 100 ? "#ecfdf5" : "#ffffff",
                  color: sliderPos > 0 && sliderPos < 100 ? "#065f46" : "#526e62",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                Split (50%)
              </button>
              <button
                type="button"
                onClick={() => setSliderPos(100)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "20px",
                  border: sliderPos === 100 ? "1.5px solid #065f46" : "1.5px solid #e2ede6",
                  background: sliderPos === 100 ? "#ecfdf5" : "#ffffff",
                  color: sliderPos === 100 ? "#065f46" : "#526e62",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                {t("gradcam_heatmap")}
              </button>
            </div>

            {/* Interactive Before/After Split Viewer Container */}
            <div
              ref={sliderContainerRef}
              onPointerDown={(e) => {
                setIsDragging(true);
                handlePointerMove(e);
              }}
              onPointerMove={(e) => {
                if (isDragging) handlePointerMove(e);
              }}
              onPointerUp={() => setIsDragging(false)}
              onPointerLeave={() => setIsDragging(false)}
              style={{
                width: "100%",
                height: "230px",
                background: "#081d15",
                borderRadius: "16px",
                overflow: "hidden",
                border: "1.5px solid #e2ede6",
                position: "relative",
                cursor: "ew-resize",
                touchAction: "none",
                userSelect: "none",
              }}
            >
              {/* Layer 1: Base Original X-Ray */}
              <img
                src={image_url ? getStaticUrl(image_url) : preview}
                alt="Original Radiograph"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  pointerEvents: "none",
                }}
              />

              {/* Layer 2: Grad-CAM Heatmap (Clipped by slider percentage) */}
              {heatmap_url && (
                <img
                  src={getStaticUrl(heatmap_url)}
                  alt="Grad-CAM Heatmap"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    pointerEvents: "none",
                    clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`,
                  }}
                />
              )}

              {/* Split Line & Draggable Knob */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: `${sliderPos}%`,
                  width: "2px",
                  background: "#10b981",
                  boxShadow: "0 0 8px rgba(16, 185, 129, 0.8)",
                  zIndex: 10,
                  transform: "translateX(-50%)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "#065f46",
                    border: "2.5px solid #ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
                  }}
                >
                  <ChevronsLeftRight size={16} />
                </div>
              </div>

              {/* Corner Badges */}
              <div
                style={{
                  position: "absolute",
                  top: "8px",
                  left: "8px",
                  background: "rgba(6, 95, 70, 0.85)",
                  backdropFilter: "blur(4px)",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  fontSize: "10px",
                  fontWeight: "700",
                  color: "#a7f3d0",
                  zIndex: 5,
                }}
              >
                Heatmap ({sliderPos}%)
              </div>

              <div
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  background: "rgba(0, 0, 0, 0.65)",
                  backdropFilter: "blur(4px)",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  fontSize: "10px",
                  fontWeight: "700",
                  color: "#ffffff",
                  zIndex: 5,
                }}
              >
                Original ({100 - sliderPos}%)
              </div>
            </div>

            {/* Drag Hint */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                fontSize: "11px",
                color: "#526e62",
                fontWeight: "500",
              }}
            >
              <SlidersHorizontal size={13} color="#065f46" />
              <span>{t("slider_instruction")}</span>
            </div>

            {/* Explanation box */}
            <div
              style={{
                background: "#ffffff",
                border: "1.5px solid #e2ede6",
                borderRadius: "12px",
                padding: "8px 12px",
                fontSize: "11px",
                color: "#526e62",
                lineHeight: "1.4",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.02)",
              }}
            >
              <strong style={{ color: "#081d15" }}>{t("gradcam_explanation_title")}</strong>{" "}
              {t("gradcam_explanation_body")}
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
                background: "#ffffff",
                border: "1.5px solid #e2ede6",
                borderRadius: "16px",
                padding: "14px",
                fontSize: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#526e62" }}>Patient Name</span>
                <strong style={{ color: "#081d15" }}>{patient.patientName || "N/A"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#526e62" }}>Age / Gender</span>
                <strong style={{ color: "#081d15" }}>{patient.patientAge} yrs • {patient.patientGender}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#526e62" }}>File Name</span>
                <strong style={{ color: "#081d15" }}>{analysisData.fileName || "xray.png"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#526e62" }}>{t("scan_timestamp")}</span>
                <strong style={{ color: "#081d15" }}>{analysisData.date} {analysisData.time}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#526e62" }}>{t("baseline_cutoff")}</span>
                <strong style={{ color: "#065f46" }}>
                  {(calibrated_thresholds[predicted_class] || 0.5) * 100}% (Standard Ref)
                </strong>
              </div>
            </div>

            {downloadError && (
              <div style={{ color: "#dc2626", fontSize: "11px", textAlign: "center" }}>
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
                background: "linear-gradient(135deg, #059669 0%, #065f46 100%)",
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
                boxShadow: "0 4px 15px rgba(6, 95, 70, 0.35)",
              }}
            >
              {downloadingReport ? (
                <>
                  <Loader2 size={16} className="spin" /> {t("generating_pdf")}
                </>
              ) : (
                <>
                  <Download size={16} /> {t("download_pdf_btn")}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Floating AI Health Assistant Trigger */}
      <button
        type="button"
        onClick={() => setIsChatOpen(true)}
        aria-label="Open AI Clinical Assistant"
        style={{
          position: "fixed",
          bottom: "74px",
          right: "16px",
          padding: "9px 14px",
          borderRadius: "30px",
          background: "linear-gradient(135deg, #059669 0%, #064e3b 100%)",
          color: "#ffffff",
          border: "2px solid #ffffff",
          boxShadow: "0 6px 18px rgba(5, 150, 105, 0.4)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          cursor: "pointer",
          zIndex: 40,
          fontWeight: "700",
          fontSize: "11.5px",
        }}
      >
        <Bot size={16} className="animate-pulse" />
        <span>{t("chatbot_title")}</span>
      </button>

      {/* AI Clinical Chatbot Modal */}
      <AiChatAssistantModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        predictionContext={{
          predicted_class,
          confidence: confPercent,
          patient_name: patient.patientName,
          patient_age: patient.patientAge,
          patient_gender: patient.patientGender,
        }}
      />
    </div>
  );
}
