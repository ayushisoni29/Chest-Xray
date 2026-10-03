import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ScanLine,
  Activity,
  FileSearch,
  ShieldCheck,
  Upload,
  Clock3,
  Loader2,
  Brain,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { getStoredUser, getPredictionHistory, checkHealth } from "../api.js";

function Dashboard() {
  const currentUser = getStoredUser();
  const userName = currentUser?.name || "User";

  const [stats, setStats] = useState({
    total: 0,
    avgConfidence: 0,
    topClass: "—",
    modelLoaded: null,
  });
  const [latestAnalysis, setLatestAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load health + history in parallel
        const [health, histData] = await Promise.allSettled([
          checkHealth(),
          getPredictionHistory({ limit: 20, skip: 0 }),
        ]);

        const modelLoaded =
          health.status === "fulfilled" ? health.value.model_loaded : false;

        const items =
          histData.status === "fulfilled" ? histData.value.items || [] : [];
        const total =
          histData.status === "fulfilled" ? histData.value.total || 0 : 0;

        const avgConfidence =
          items.length > 0
            ? Math.round(
                (items.reduce((s, i) => s + (i.confidence || 0), 0) /
                  items.length) *
                  100
              )
            : 0;

        const counts = {};
        items.forEach((h) => {
          counts[h.predicted_class] = (counts[h.predicted_class] || 0) + 1;
        });
        const topClass =
          Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] || "—";

        setStats({ total, avgConfidence, topClass, modelLoaded });
        setLatestAnalysis(items[0] || null);
      } catch {
        // Graceful degradation
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="app-shell">
      <Navbar />

      <main className="new-dashboard">

        {/* ================= HERO ================= */}
        <section className="dashboard-hero-new">
          <div className="dashboard-hero-content">
            <span className="section-label">AI-BASED MEDICAL IMAGING</span>

            <h1>
              AI-Based Multi-Disease
              <br />
              <span>Detection from Chest X-ray Images</span>
            </h1>

            <p>
              A deep-learning based medical imaging interface designed for
              multi-disease screening from chest X-ray images using ResNet50.
            </p>

            <div className="dashboard-hero-actions">
              <Link to="/detection" className="dashboard-primary-btn">
                <ScanLine size={18} />
                Start New Analysis
                <ArrowRight size={16} />
              </Link>

              <Link to="/history" className="dashboard-secondary-btn">
                View Analysis History
              </Link>
            </div>

            <div className="dashboard-user-line">
              <div className="dashboard-user-dot"></div>
              <span>
                Signed in as <strong>{userName}</strong>
              </span>
              {stats.modelLoaded !== null && (
                <span
                  className="dashboard-model-status"
                  style={{ color: stats.modelLoaded ? "#22c55e" : "#ef4444" }}
                >
                  &nbsp;·&nbsp;
                  {stats.modelLoaded ? "Model Ready" : "Model Offline"}
                </span>
              )}
            </div>
          </div>

          <div className="dashboard-xray-panel">
            <div className="xray-panel-top">
              <span>CHEST / PA</span>
              <span className="xray-status">
                <i></i>
                {loading ? "LOADING..." : stats.modelLoaded ? "READY" : "OFFLINE"}
              </span>
            </div>

            <div className="xray-panel-image">
              <div className="xray-lung left-lung"></div>
              <div className="xray-lung right-lung"></div>
              <div className="xray-spine"></div>
              <div className="xray-scan-line"></div>
              <div className="xray-corner top-left"></div>
              <div className="xray-corner top-right"></div>
              <div className="xray-corner bottom-left"></div>
              <div className="xray-corner bottom-right"></div>
              <span className="xray-label xray-label-top">CHEST X-RAY</span>
              <span className="xray-label xray-label-bottom">AI SCREENING</span>
            </div>

            <div className="xray-panel-bottom">
              <div>
                <span>MODEL</span>
                <strong>ResNet50</strong>
              </div>
              <div>
                <span>CONDITIONS</span>
                <strong>05</strong>
              </div>
            </div>
          </div>
        </section>

        {/* ================= PROJECT SCOPE ================= */}
        <section className="dashboard-section-new">
          <div className="dashboard-section-heading">
            <div>
              <span className="section-label">PROJECT SCOPE</span>
              <h2>Five-condition screening</h2>
            </div>
            <p>
              The interface is designed around five target conditions for chest
              X-ray analysis.
            </p>
          </div>

          <div className="dashboard-disease-grid">
            {[
              { n: "01", name: "COVID-19", desc: "Screening of lung abnormalities related to COVID-19." },
              { n: "02", name: "Lung Opacity", desc: "Screening for opacity patterns visible in chest X-ray images." },
              { n: "03", name: "Normal", desc: "Classification of chest X-rays with no significant pathology." },
              { n: "04", name: "Pneumonia", desc: "Screening of radiographic patterns associated with pneumonia." },
              { n: "05", name: "Tuberculosis", desc: "Screening of chest patterns associated with tuberculosis." },
            ].map((d) => (
              <div className="dashboard-disease-card" key={d.n}>
                <span>{d.n}</span>
                <div>
                  <h3>{d.name}</h3>
                  <p>{d.desc}</p>
                </div>
                <ArrowRight size={17} />
              </div>
            ))}
          </div>
        </section>

        {/* ================= ANALYSIS OVERVIEW ================= */}
        <section className="dashboard-section-new">
          <div className="dashboard-section-heading">
            <div>
              <span className="section-label">ANALYSIS OVERVIEW</span>
              <h2>Your workspace</h2>
            </div>
          </div>

          <div className="dashboard-overview-grid">
            <div className="dashboard-overview-card">
              <div className="dashboard-overview-icon">
                <FileSearch size={20} />
              </div>
              <div>
                <span>TOTAL ANALYSES</span>
                <strong>
                  {loading ? <Loader2 size={16} className="spin" /> : stats.total}
                </strong>
                <p>Saved screening records</p>
              </div>
            </div>

            <div className="dashboard-overview-card">
              <div className="dashboard-overview-icon">
                <Activity size={20} />
              </div>
              <div>
                <span>AVG. CONFIDENCE</span>
                <strong>
                  {loading ? (
                    <Loader2 size={16} className="spin" />
                  ) : stats.total > 0 ? (
                    `${stats.avgConfidence}%`
                  ) : (
                    "—"
                  )}
                </strong>
                <p>
                  {stats.total > 0 ? "Across all predictions" : "No analysis yet"}
                </p>
              </div>
            </div>

            <div className="dashboard-overview-card">
              <div className="dashboard-overview-icon">
                <Brain size={20} />
              </div>
              <div>
                <span>MOST DETECTED</span>
                <strong>
                  {loading ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    stats.topClass.replace("_", " ")
                  )}
                </strong>
                <p>Top predicted condition</p>
              </div>
            </div>

            <div className="dashboard-overview-card">
              <div className="dashboard-overview-icon">
                <ShieldCheck size={20} />
              </div>
              <div>
                <span>AI MODEL</span>
                <strong>ResNet50</strong>
                <p>
                  {stats.modelLoaded === null
                    ? "Checking..."
                    : stats.modelLoaded
                    ? "Model loaded & ready"
                    : "Model unavailable"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= RECENT ANALYSIS ================= */}
        <section className="dashboard-section-new">
          <div className="dashboard-section-heading">
            <div>
              <span className="section-label">RECENT ACTIVITY</span>
              <h2>Latest analysis</h2>
            </div>
            <Link to="/history" className="dashboard-view-all">
              View history
              <ArrowRight size={15} />
            </Link>
          </div>

          {loading ? (
            <div className="dashboard-no-analysis">
              <div className="dashboard-no-analysis-icon">
                <Loader2 size={22} className="spin" />
              </div>
              <div>
                <span className="section-label">LOADING</span>
                <h3>Fetching latest record...</h3>
              </div>
            </div>
          ) : latestAnalysis ? (
            <div className="dashboard-recent-card">
              <div className="recent-analysis-main">
                <div className="recent-analysis-icon">
                  <ScanLine size={21} />
                </div>
                <div>
                  <span className="section-label">COMPLETED SCREENING</span>
                  <h3>
                    {latestAnalysis.image_filename || "Chest X-ray Analysis"}
                  </h3>
                  <div className="recent-analysis-meta">
                    <span>
                      <Clock3 size={14} />
                      {new Date(latestAnalysis.timestamp).toLocaleDateString(
                        "en-IN",
                        { day: "2-digit", month: "short", year: "numeric" }
                      )}
                    </span>
                    <span>
                      Prediction:{" "}
                      <strong>
                        {latestAnalysis.predicted_class?.replace("_", " ")}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="recent-analysis-stats">
                <div>
                  <span>CONDITION</span>
                  <strong>
                    {latestAnalysis.predicted_class?.replace("_", " ") || "—"}
                  </strong>
                </div>
                <div>
                  <span>CONFIDENCE</span>
                  <strong>
                    {((latestAnalysis.confidence || 0) * 100).toFixed(1)}%
                  </strong>
                </div>
                <Link
                  to={`/results?id=${latestAnalysis.id}`}
                  className="recent-result-btn"
                >
                  View Result
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          ) : (
            <div className="dashboard-no-analysis">
              <div className="dashboard-no-analysis-icon">
                <Upload size={22} />
              </div>
              <div>
                <span className="section-label">NO ANALYSIS YET</span>
                <h3>Your first screening starts here</h3>
                <p>Upload a chest X-ray image to begin the analysis workflow.</p>
              </div>
              <Link to="/detection" className="dashboard-primary-btn">
                Start Analysis
                <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

export default Dashboard;
