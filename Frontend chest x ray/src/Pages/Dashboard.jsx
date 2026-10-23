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
        background: "#f4f8f6",
      }}
    >
      {/* 1. Header Greeting */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontSize: "12px", color: "#526e62", fontWeight: "500" }}>
            Welcome back,
          </span>
          <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#081d15", margin: "2px 0 0 0" }}>
            {user.name || "Doctor"}
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
            <Sparkles size={14} color="#a7f3d0" /> Immediate AI Screening
          </div>
          <div style={{ fontSize: "21px", fontWeight: "900", color: "#ffffff", marginTop: "4px", letterSpacing: "-0.3px" }}>
            New Chest X-Ray Scan
          </div>
          <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.85)", marginTop: "4px" }}>
            Dual-Model Ensemble & Grad-CAM
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
            Total Scans
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
            Last Result
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
            {lastScan ? lastScan.predicted_class?.replace("_", " ") : "None"}
          </div>
        </div>

        {/* Ensemble Accuracy */}
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
            Accuracy
          </div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#047857", marginTop: "4px" }}>
            98.15%
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
            Recent Analyses
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
            See All <ChevronRight size={14} color="#065f46" />
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
            No previous scans yet. Tap "New Scan" above to analyze an X-ray.
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
    </div>
  );
}
