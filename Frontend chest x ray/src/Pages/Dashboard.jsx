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
} from "lucide-react";
import { getStoredUser, checkHealth, getPredictionHistory, getStaticUrl } from "../api";

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

  const [healthStatus, setHealthStatus] = useState("Checking...");
  const [modelLoaded, setModelLoaded] = useState(false);
  const [totalScans, setTotalScans] = useState(0);
  const [lastScan, setLastScan] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(true);

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
      }}
    >
      {/* 1. Header Greeting */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "500" }}>
            Welcome back,
          </span>
          <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#fff", margin: "2px 0 0 0" }}>
            {user.name || "Doctor"}
          </h2>
        </div>

        <div
          style={{
            padding: "6px 12px",
            background: modelLoaded ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)",
            border: modelLoaded ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "20px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "11px",
            fontWeight: "700",
            color: modelLoaded ? "#4ade80" : "#f87171",
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

      {/* 2. Big HERO 'NEW SCAN' CTA Button */}
      <div
        onClick={() => navigate("/detection")}
        style={{
          background: "linear-gradient(135deg, #0284c7 0%, #38bdf8 50%, #6366f1 100%)",
          borderRadius: "20px",
          padding: "20px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 10px 25px -5px rgba(56, 189, 248, 0.4)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#e0f2fe", fontSize: "12px", fontWeight: "700", textTransform: "uppercase" }}>
            <Sparkles size={14} /> Immediate AI Screening
          </div>
          <div style={{ fontSize: "22px", fontWeight: "900", color: "#fff", marginTop: "4px" }}>
            New Chest X-Ray Scan
          </div>
          <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.8)", marginTop: "4px" }}>
            Dual-Model Ensemble & Grad-CAM
          </div>
        </div>

        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "16px",
            background: "rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            zIndex: 2,
          }}
        >
          <Scan size={26} />
        </div>
      </div>

      {/* 3. Three Quick Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
        {/* Total Scans */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "16px",
            padding: "12px 10px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>
            Total Scans
          </div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#38bdf8", marginTop: "4px" }}>
            {totalScans}
          </div>
        </div>

        {/* Last Diagnosis */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "16px",
            padding: "12px 10px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>
            Last Result
          </div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: "800",
              color: lastScan ? CLASS_COLORS[lastScan.predicted_class] || "#fff" : "#94a3b8",
              marginTop: "8px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {lastScan ? lastScan.predicted_class?.replace("_", " ") : "None"}
          </div>
        </div>

        {/* Ensemble Status */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "16px",
            padding: "12px 10px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>
            Accuracy
          </div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#22c55e", marginTop: "4px" }}>
            97.4%
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
          <span style={{ fontSize: "13px", fontWeight: "700", color: "#fff" }}>
            Recent Analyses
          </span>
          <Link
            to="/history"
            style={{
              fontSize: "11px",
              color: "#38bdf8",
              fontWeight: "600",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "2px",
            }}
          >
            See All <ChevronRight size={14} />
          </Link>
        </div>

        {recentScans.length === 0 ? (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px dashed rgba(255, 255, 255, 0.1)",
              borderRadius: "14px",
              padding: "18px",
              textAlign: "center",
              color: "#64748b",
              fontSize: "12px",
            }}
          >
            No previous scans yet. Tap "New Scan" above to analyze an X-ray.
          </div>
        ) : (
          <div className="horizontal-carousel">
            {recentScans.slice(0, 5).map((scan) => {
              const classColor = CLASS_COLORS[scan.predicted_class] || "#38bdf8";
              return (
                <div
                  key={scan.id}
                  onClick={() => navigate(`/results?id=${scan.id}`)}
                  className="carousel-card"
                  style={{
                    width: "160px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "14px",
                    padding: "10px",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      height: "70px",
                      borderRadius: "8px",
                      background: "#000",
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
                  <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>
                    {Math.round((scan.confidence || 0) * 100)}% Confidence
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
