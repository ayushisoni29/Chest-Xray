import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  ChevronRight,
  FileText,
  AlertCircle,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { getPredictionHistory, getStaticUrl, downloadPredictionReport } from "../api";

const CLASS_COLORS = {
  COVID: "#ef4444",
  Lung_Opacity: "#f97316",
  Normal: "#22c55e",
  Pneumonia: "#3b82f6",
  Tuberculosis: "#a855f7",
};

export default function History() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await getPredictionHistory({ limit: 50, skip: 0 });
        if (cancelled) return;
        setItems(res.items || res.predictions || []);
      } catch (err) {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownload = async (e, item) => {
    e.stopPropagation();
    if (downloadingId) return;
    setDownloadingId(item.id);
    try {
      await downloadPredictionReport(item.id, {
        name: "Patient",
      });
    } catch (err) {
      // ignore
    } finally {
      setDownloadingId(null);
    }
  };

  const categories = ["All", "COVID", "Normal", "Tuberculosis", "Pneumonia", "Lung_Opacity"];

  const filteredItems = items.filter((item) => {
    const matchesFilter = filterClass === "All" || item.predicted_class === filterClass;
    const matchesSearch =
      !searchQuery.trim() ||
      (item.predicted_class || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.image_filename || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "16px",
        boxSizing: "border-box",
        gap: "12px",
      }}
    >
      {/* Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#fff", margin: 0 }}>
            Scan History
          </h2>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>
            {items.length} records in database
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "12px",
          padding: "8px 12px",
          gap: "8px",
        }}
      >
        <Search size={16} color="#64748b" />
        <input
          type="text"
          placeholder="Search by diagnosis or filename..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            background: "transparent",
            border: "none",
            color: "#fff",
            fontSize: "13px",
            outline: "none",
            width: "100%",
          }}
        />
      </div>

      {/* Filter Chips Horizontal Carousel */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          overflowX: "auto",
          paddingBottom: "4px",
          scrollbarWidth: "none",
        }}
      >
        {categories.map((cat) => {
          const isActive = filterClass === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterClass(cat)}
              style={{
                padding: "6px 12px",
                borderRadius: "20px",
                border: isActive ? "1px solid #38bdf8" : "1px solid rgba(255,255,255,0.08)",
                background: isActive ? "rgba(56,189,248,0.2)" : "rgba(255,255,255,0.03)",
                color: isActive ? "#38bdf8" : "#94a3b8",
                fontSize: "11px",
                fontWeight: "600",
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              {cat.replace("_", " ")}
            </button>
          );
        })}
      </div>

      {/* Card List Area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          scrollbarWidth: "none",
        }}
      >
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "180px" }}>
            <Loader2 size={28} className="spin" color="#38bdf8" />
            <span style={{ fontSize: "12px", color: "#94a3b8", marginTop: "8px" }}>Loading records...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FolderOpen size={40} color="#475569" style={{ marginBottom: "12px" }} />
            <div style={{ color: "#fff", fontWeight: "700", fontSize: "15px" }}>No Scans Found</div>
            <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px" }}>
              Try another filter or scan an X-ray to start your history.
            </div>
          </div>
        ) : (
          filteredItems.map((item) => {
            const classColor = CLASS_COLORS[item.predicted_class] || "#38bdf8";
            const dateStr = item.timestamp
              ? new Date(item.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
              : "Recent";

            return (
              <div
                key={item.id}
                onClick={() => navigate(`/results?id=${item.id}`)}
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  transition: "transform 0.15s ease",
                }}
              >
                {/* Left: Thumbnail & Details */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "10px",
                      background: "#000",
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {item.heatmap_url ? (
                      <img
                        src={getStaticUrl(item.heatmap_url)}
                        alt="Heatmap"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <FileText size={20} color="#64748b" />
                    )}
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: "700",
                          color: classColor,
                        }}
                      >
                        {item.predicted_class?.replace("_", " ")}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "600",
                          color: "#94a3b8",
                          background: "rgba(255,255,255,0.05)",
                          padding: "1px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        {Math.round((item.confidence || 0) * 100)}%
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                      {dateStr} • {item.image_filename?.slice(0, 16)}...
                    </div>
                  </div>
                </div>

                {/* Right: PDF Download & Arrow */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={(e) => handleDownload(e, item)}
                    title="Download PDF"
                    style={{
                      padding: "8px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.04)",
                      color: "#38bdf8",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {downloadingId === item.id ? (
                      <Loader2 size={14} className="spin" />
                    ) : (
                      <Download size={14} />
                    )}
                  </button>
                  <ChevronRight size={18} color="#64748b" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
