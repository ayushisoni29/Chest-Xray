import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  FileImage,
  CheckCircle2,
  Clock3,
  Eye,
  ScanLine,
  History as HistoryIcon,
  AlertCircle,
  ArrowRight,
  X,
  Loader2,
  Activity,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { getPredictionHistory } from "../api.js";

// Map class names to badge colors
const CLASS_COLORS = {
  COVID: "#ef4444",
  Lung_Opacity: "#f97316",
  Normal: "#22c55e",
  Pneumonia: "#3b82f6",
  Tuberculosis: "#a855f7",
};

function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("All");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const loadHistory = async (skip = 0) => {
    setLoading(true);
    setError("");
    try {
      const data = await getPredictionHistory({ limit: PAGE_SIZE, skip });
      setHistory(data.items || []);
    } catch (err) {
      setError(err.message || "Failed to load history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(page * PAGE_SIZE);
  }, [page]);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const searchValue = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !searchValue ||
        item.image_filename?.toLowerCase().includes(searchValue) ||
        item.id?.toLowerCase().includes(searchValue) ||
        item.predicted_class?.toLowerCase().includes(searchValue);
      const matchesClass =
        classFilter === "All" || item.predicted_class === classFilter;
      return matchesSearch && matchesClass;
    });
  }, [history, searchTerm, classFilter]);

  const classes = useMemo(
    () => [...new Set(history.map((h) => h.predicted_class).filter(Boolean))],
    [history]
  );

  const completedCount = history.length;
  const avgConfidence =
    history.length > 0
      ? Math.round(
          (history.reduce((sum, item) => sum + (item.confidence || 0), 0) /
            history.length) *
            100
        )
      : 0;

  const topClass = useMemo(() => {
    if (!history.length) return "—";
    const counts = {};
    history.forEach((h) => {
      counts[h.predicted_class] = (counts[h.predicted_class] || 0) + 1;
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] || "—";
  }, [history]);

  return (
    <div className="app-shell">
      <Navbar />

      <main className="history-page">
        {/* PAGE HEADER */}
        <section className="history-page-header">
          <div className="history-heading">
            <div className="history-heading-icon">
              <HistoryIcon size={22} />
            </div>
            <div>
              <span className="section-label">ANALYSIS RECORDS</span>
              <h1>Analysis History</h1>
              <p>Review previously analyzed chest X-ray records.</p>
            </div>
          </div>

          <div className="history-header-actions">
            <button
              type="button"
              className="history-new-btn"
              onClick={() => loadHistory(page * PAGE_SIZE)}
              disabled={loading}
            >
              <ScanLine size={15} />
              Refresh
            </button>
            <Link to="/detection" className="history-new-btn">
              <ScanLine size={16} />
              New Analysis
            </Link>
          </div>
        </section>

        {/* STATISTICS */}
        <section className="history-stat-grid">
          <div className="history-stat-card">
            <div className="history-stat-icon">
              <FileImage size={19} />
            </div>
            <div>
              <span>Total Analyses</span>
              <strong>{history.length}</strong>
            </div>
          </div>

          <div className="history-stat-card">
            <div className="history-stat-icon">
              <CheckCircle2 size={19} />
            </div>
            <div>
              <span>Completed</span>
              <strong>{completedCount}</strong>
            </div>
          </div>

          <div className="history-stat-card">
            <div className="history-stat-icon">
              <Activity size={19} />
            </div>
            <div>
              <span>Avg. Confidence</span>
              <strong>{history.length > 0 ? `${avgConfidence}%` : "—"}</strong>
            </div>
          </div>

          <div className="history-stat-card">
            <div className="history-stat-icon">
              <Clock3 size={19} />
            </div>
            <div>
              <span>Most Common</span>
              <strong>{topClass}</strong>
            </div>
          </div>
        </section>

        {/* TOOLBAR */}
        <section className="history-toolbar">
          <div className="history-search">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search by filename, ID or condition..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="history-search-clear"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="history-filter">
            <Filter size={16} />
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="All">All Conditions</option>
              {classes.map((cls) => (
                <option key={cls} value={cls}>
                  {cls.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* RESULTS COUNT */}
        <div className="history-result-meta">
          <span>
            Showing <strong>{filteredHistory.length}</strong> of{" "}
            <strong>{history.length}</strong> records
          </span>
          {(searchTerm || classFilter !== "All") && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setClassFilter("All");
              }}
            >
              Reset filters
              <ArrowRight size={13} />
            </button>
          )}
        </div>

        {/* LOADING */}
        {loading && (
          <div className="history-empty">
            <div className="history-empty-icon">
              <Loader2 size={28} className="spin" />
            </div>
            <h2>Loading history...</h2>
          </div>
        )}

        {/* ERROR */}
        {error && !loading && (
          <div className="history-empty">
            <div className="history-empty-icon">
              <AlertCircle size={28} />
            </div>
            <span className="section-label">ERROR</span>
            <h2>Failed to Load History</h2>
            <p>{error}</p>
            <button
              type="button"
              className="history-empty-btn"
              onClick={() => loadHistory(0)}
            >
              Retry
            </button>
          </div>
        )}

        {/* TABLE */}
        {!loading && !error && filteredHistory.length > 0 && (
          <section className="history-table-card">
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>PREDICTION</th>
                    <th>FILE</th>
                    <th>DATE &amp; TIME</th>
                    <th>CONDITION</th>
                    <th>CONFIDENCE</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((item) => {
                    const color =
                      CLASS_COLORS[item.predicted_class] || "#06b6d4";
                    const pct = ((item.confidence || 0) * 100).toFixed(1);
                    const dateStr = new Date(item.timestamp).toLocaleDateString(
                      "en-IN",
                      { day: "2-digit", month: "short", year: "numeric" }
                    );
                    const timeStr = new Date(item.timestamp).toLocaleTimeString(
                      "en-IN",
                      { hour: "2-digit", minute: "2-digit" }
                    );
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="history-id-cell">
                            <div className="history-record-icon">
                              <FileImage size={16} />
                            </div>
                            <div>
                              <strong title={item.id}>
                                {item.id?.slice(0, 12)}...
                              </strong>
                              <span>05 Conditions</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="history-file-cell">
                            <strong title={item.image_filename}>
                              {item.image_filename?.length > 20
                                ? item.image_filename.slice(0, 20) + "..."
                                : item.image_filename || "Unknown"}
                            </strong>
                            <span>Image</span>
                          </div>
                        </td>
                        <td>
                          <div className="history-date-cell">
                            <strong>{dateStr}</strong>
                            <span>{timeStr}</span>
                          </div>
                        </td>
                        <td>
                          <span
                            className="history-status completed"
                            style={{ color, borderColor: color + "44" }}
                          >
                            <i style={{ background: color }}></i>
                            {item.predicted_class?.replace("_", " ") || "—"}
                          </span>
                        </td>
                        <td>
                          <strong className="history-confidence">
                            {pct}%
                          </strong>
                        </td>
                        <td>
                          <div className="history-actions">
                            <Link
                              to={`/results?id=${item.id}`}
                              className="history-view-btn"
                              title="View result"
                            >
                              <Eye size={15} />
                              View
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* EMPTY STATE */}
        {!loading && !error && filteredHistory.length === 0 && (
          <section className="history-empty">
            <div className="history-empty-icon">
              {history.length === 0 ? (
                <HistoryIcon size={28} />
              ) : (
                <Search size={28} />
              )}
            </div>
            <span className="section-label">
              {history.length === 0
                ? "NO ANALYSIS RECORDS"
                : "NO MATCHING RECORDS"}
            </span>
            <h2>
              {history.length === 0
                ? "Your analysis history is empty"
                : "No records found"}
            </h2>
            <p>
              {history.length === 0
                ? "Upload a chest X-ray to create your first analysis record."
                : "Try changing your search term or condition filter."}
            </p>
            {history.length === 0 ? (
              <Link to="/detection" className="history-empty-btn">
                <ScanLine size={16} />
                Start New Analysis
              </Link>
            ) : (
              <button
                type="button"
                className="history-empty-btn"
                onClick={() => {
                  setSearchTerm("");
                  setClassFilter("All");
                }}
              >
                <X size={16} />
                Reset Filters
              </button>
            )}
          </section>
        )}

        {/* FOOTER NOTE */}
        <section className="history-footer-note">
          <div className="history-footer-note-icon">
            <AlertCircle size={18} />
          </div>
          <div>
            <span className="section-label">RECORD STORAGE</span>
            <p>
              Analysis records are securely stored in MongoDB and linked to your
              authenticated account. Only your own records are visible.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default History;
