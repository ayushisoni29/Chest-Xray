import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  Activity,
  Scan,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Clock,
  Layers,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  FileText,
  Bot,
} from "lucide-react";
import { getStoredUser, checkHealth, getPredictionHistory, getStaticUrl } from "../api";
import { useLanguage } from "../context/LanguageContext";
import AiChatAssistantModal from "../components/AiChatAssistantModal";


const CLASS_COLORS = {
  COVID: "#ef4444",
  Lung_Opacity: "#f97316",
  Normal: "#22c55e",
  Pneumonia: "#3b82f6",
  Tuberculosis: "#a855f7",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const user = getStoredUser() || {};
  const { t } = useLanguage();

  const [healthStatus, setHealthStatus] = useState("Checking...");
  const [modelLoaded, setModelLoaded] = useState(false);
  const [totalScans, setTotalScans] = useState(0);
  const [lastScan, setLastScan] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadDashboardData = async () => {
      try {
        const [health, history] = await Promise.allSettled([
          checkHealth(),
          getPredictionHistory({ limit: 10, skip: 0 }),
        ]);

        if (cancelled) return;

        if (health.status === "fulfilled" && health.value?.status === "ok") {
          setHealthStatus("Ensemble Active");
          setModelLoaded(true);
        } else {
          setHealthStatus("Connecting...");
          setModelLoaded(false);
        }

        if (history.status === "fulfilled" && history.value?.items) {
          const items = history.value.items;
          setTotalScans(history.value.total || items.length);
          if (items.length > 0) {
            setLastScan(items[0]);
            setRecentScans(items);
          }
        }
      } catch (err) {
        // graceful fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDashboardData();
    return () => {
      cancelled = true;
    };
  }, []);

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
        background: "#f4f8f6",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 1. Header Greeting */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontSize: "12px", color: "#526e62", fontWeight: "500" }}>
            {t("welcome_back")}
          </span>
          <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#081d15", margin: "2px 0 0 0" }}>
            {user.name || "User"}
          </h2>
        </div>

        <div
          style={{
            padding: "5px 11px",
            background: modelLoaded ? "#dcfce7" : "#fee2e2",
            border: modelLoaded ? "1px solid #bbf7d0" : "1px solid #fecaca",
            borderRadius: "20px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "11px",
            fontWeight: "700",
            color: modelLoaded ? "#166534" : "#991b1b",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: modelLoaded ? "#22c55e" : "#ef4444",
              display: "inline-block",
            }}
          />
          {healthStatus}
        </div>
      </div>

      {/* 2. Big HERO 'NEW SCAN' CTA Button — Emerald Clinical Gradient */}
      <div
        onClick={() => navigate("/detection")}
        style={{
          background: "linear-gradient(135deg, #065f46 0%, #047857 50%, #064e3b 100%)",
          borderRadius: "18px",
          padding: "18px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 8px 22px rgba(6, 95, 70, 0.28)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#a7f3d0", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase" }}>
            <Sparkles size={14} color="#a7f3d0" /> {t("immediate_screening")}
          </div>
          <div style={{ fontSize: "21px", fontWeight: "900", color: "#ffffff", marginTop: "4px", letterSpacing: "-0.3px" }}>
            {t("new_scan_cta")}
          </div>
          <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.85)", marginTop: "4px" }}>
            {t("ensemble_subtitle")}
          </div>
        </div>

        <div
          style={{
            width: "50px",
            height: "50px",
            borderRadius: "14px",
            background: "rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            zIndex: 2,
          }}
        >
          <Scan size={24} />
        </div>
      </div>

      {/* 3. Three Quick Stat Cards — Crisp White Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
        {/* Total Scans */}
        <div
          style={{
            background: "#ffffff",
            border: "1.5px solid #e2ede6",
            borderRadius: "14px",
            padding: "12px 10px",
            textAlign: "center",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
          }}
        >
          <div style={{ fontSize: "10px", color: "#526e62", fontWeight: "700", textTransform: "uppercase" }}>
            {t("total_scans")}
          </div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#065f46", marginTop: "4px" }}>
            {totalScans}
          </div>
        </div>

        {/* Last Diagnosis */}
        <div
          style={{
            background: "#ffffff",
            border: "1.5px solid #e2ede6",
            borderRadius: "14px",
            padding: "12px 10px",
            textAlign: "center",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
          }}
        >
          <div style={{ fontSize: "10px", color: "#526e62", fontWeight: "700", textTransform: "uppercase" }}>
            {t("last_result")}
          </div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: "800",
              color: lastScan ? CLASS_COLORS[lastScan.predicted_class] || "#081d15" : "#64748b",
              marginTop: "8px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {lastScan ? (t(lastScan.predicted_class) || lastScan.predicted_class?.replace("_", " ")) : "None"}
          </div>
        </div>

        {/* AI Engine Status (Replaces front accuracy to keep professional clinical UI) */}
        <div
          style={{
            background: "#ffffff",
            border: "1.5px solid #e2ede6",
            borderRadius: "14px",
            padding: "12px 10px",
            textAlign: "center",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
          }}
        >
          <div style={{ fontSize: "10px", color: "#526e62", fontWeight: "700", textTransform: "uppercase" }}>
            {t("engine_status")}
          </div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: "800",
              color: "#059669",
              marginTop: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "5px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#10b981",
                display: "inline-block",
                boxShadow: "0 0 8px #10b981",
              }}
            />
            <span>{t("engine_active")}</span>
          </div>
        </div>
      </div>

      {/* 4. Recent Analyses Horizontal Carousel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <span style={{ fontSize: "13px", fontWeight: "700", color: "#081d15" }}>
            {t("recent_analyses")}
          </span>
          <Link
            to="/history"
            style={{
              fontSize: "11px",
              color: "#065f46",
              fontWeight: "700",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "2px",
            }}
          >
            {t("see_all")} <ChevronRight size={14} color="#065f46" />
          </Link>
        </div>

        {recentScans.length === 0 ? (
          <div
            style={{
              background: "#ffffff",
              border: "1px dashed #cbd5e1",
              borderRadius: "14px",
              padding: "18px",
              textAlign: "center",
              color: "#64748b",
              fontSize: "12px",
            }}
          >
            {t("no_recent_scans")}
          </div>
        ) : (
          <div className="horizontal-carousel">
            {recentScans.slice(0, 5).map((scan) => {
              const classColor = CLASS_COLORS[scan.predicted_class] || "#065f46";
              return (
                <div
                  key={scan.id}
                  onClick={() => navigate(`/results?id=${scan.id}`)}
                  className="carousel-card"
                  style={{
                    width: "160px",
                    background: "#ffffff",
                    border: "1.5px solid #e2ede6",
                    borderRadius: "14px",
                    padding: "10px",
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
                  }}
                >
                  <div
                    style={{
                      height: "70px",
                      borderRadius: "8px",
                      background: "#081d15",
                      overflow: "hidden",
                      marginBottom: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {scan.heatmap_url ? (
                      <img
                        src={getStaticUrl(scan.heatmap_url)}
                        alt="Heatmap"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <FileText size={20} color="#64748b" />
                    )}
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: classColor }}>
                    {scan.predicted_class?.replace("_", " ")}
                  </div>
                  <div style={{ fontSize: "10px", color: "#526e62", marginTop: "2px", fontWeight: "500" }}>
                    {Math.round((scan.confidence || 0) * 100)}% Confidence
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Bottom-Right Chatbot Launcher Button (Kept strictly inside app) */}
      <button
        type="button"
        onClick={() => setIsChatOpen(true)}
        style={{
          position: "absolute",
          bottom: "16px",
          right: "16px",
          padding: "9px 15px",
          borderRadius: "30px",
          background: "linear-gradient(135deg, #059669 0%, #064e3b 100%)",
          color: "#ffffff",
          border: "2px solid #ffffff",
          boxShadow: "0 6px 18px rgba(5, 150, 105, 0.35)",
          display: "flex",
          alignItems: "center",
          gap: "7px",
          cursor: "pointer",
          zIndex: 30,
          fontWeight: "700",
          fontSize: "12px",
          transition: "transform 0.15s ease",
        }}
      >
        <Bot size={17} className="animate-pulse" />
        <span>{t("chatbot_btn")}</span>
      </button>

      {/* AI Clinical Chatbot Pop-up */}
      <AiChatAssistantModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        predictionContext={
          lastScan
            ? {
                predicted_class: lastScan.predicted_class,
                confidence: Math.round((lastScan.confidence || 0) * 100),
                patient_name: user?.name,
              }
            : {
                predicted_class: "Normal",
                confidence: 98.15,
                patient_name: user?.name,
              }
        }
      />
    </div>
  );
}
