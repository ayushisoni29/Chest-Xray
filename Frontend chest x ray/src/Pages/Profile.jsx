import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  CalendarDays,
  ScanLine,
  History,
  LogOut,
  ArrowLeft,
  Loader2,
  Activity,
  ShieldCheck,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { getMe, getPredictionHistory, logoutUser } from "../api.js";

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ total: 0, avgConfidence: 0, topClass: "—" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const me = await getMe();
        setUser(me);

        // Load prediction stats
        try {
          const histData = await getPredictionHistory({ limit: 100, skip: 0 });
          const items = histData.items || [];
          const total = histData.total || items.length;
          const avg =
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
          const top =
            Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] || "—";

          setStats({ total, avgConfidence: avg, topClass: top });
        } catch {
          // non-critical
        }
      } catch (err) {
        setError(err.message || "Failed to load profile.");
        // Token might be expired — redirect to login
        setTimeout(() => {
          logoutUser();
          navigate("/login");
        }, 2000);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigate]);

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="app-shell">
        <Navbar />
        <main className="profile-page">
          <div className="profile-container">
            <div className="profile-header" style={{ justifyContent: "center" }}>
              <Loader2 size={36} className="spin" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="app-shell">
        <Navbar />
        <main className="profile-page">
          <div className="profile-container">
            <p style={{ color: "#ef4444", textAlign: "center" }}>{error}</p>
          </div>
        </main>
      </div>
    );
  }

  const joinedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "N/A";

  return (
    <div className="app-shell">
      <Navbar />
      <main className="profile-page">
        <div className="profile-container">

          {/* BACK */}
          <Link to="/" className="profile-back">
            <ArrowLeft size={16} />
            Back to Overview
          </Link>

          {/* HEADER */}
          <section className="profile-header">
            <div className="profile-avatar">
              <User size={38} />
            </div>
            <div>
              <span className="section-label">CHEST X-RAY AI ACCOUNT</span>
              <h1>{user.name}</h1>
              <p>Manage your account and view your analysis activity.</p>
            </div>
          </section>

          {/* ACCOUNT INFORMATION */}
          <section className="profile-section">
            <div className="profile-section-heading">
              <span className="section-label">ACCOUNT INFORMATION</span>
              <h2>Profile Details</h2>
            </div>
            <div className="profile-details-grid">
              <div className="profile-detail-card">
                <div className="profile-detail-icon">
                  <User size={19} />
                </div>
                <div>
                  <span>FULL NAME</span>
                  <strong>{user.name}</strong>
                </div>
              </div>

              <div className="profile-detail-card">
                <div className="profile-detail-icon">
                  <Mail size={19} />
                </div>
                <div>
                  <span>EMAIL ADDRESS</span>
                  <strong>{user.email}</strong>
                </div>
              </div>

              <div className="profile-detail-card">
                <div className="profile-detail-icon">
                  <CalendarDays size={19} />
                </div>
                <div>
                  <span>MEMBER SINCE</span>
                  <strong>{joinedDate}</strong>
                </div>
              </div>

              <div className="profile-detail-card">
                <div className="profile-detail-icon">
                  <ScanLine size={19} />
                </div>
                <div>
                  <span>TOTAL ANALYSES</span>
                  <strong>{stats.total}</strong>
                </div>
              </div>

              <div className="profile-detail-card">
                <div className="profile-detail-icon">
                  <Activity size={19} />
                </div>
                <div>
                  <span>AVG. CONFIDENCE</span>
                  <strong>
                    {stats.total > 0 ? `${stats.avgConfidence}%` : "—"}
                  </strong>
                </div>
              </div>

              <div className="profile-detail-card">
                <div className="profile-detail-icon">
                  <ShieldCheck size={19} />
                </div>
                <div>
                  <span>MOST DETECTED</span>
                  <strong>{stats.topClass.replace("_", " ")}</strong>
                </div>
              </div>
            </div>
          </section>

          {/* ACTIONS */}
          <section className="profile-actions-section">
            <div>
              <span className="section-label">QUICK ACTIONS</span>
              <h2>Continue with Chest X-ray AI</h2>
              <p>
                Start a new chest X-ray analysis or review your previous records.
              </p>
            </div>
            <div className="profile-actions">
              <Link to="/detection" className="profile-primary-btn">
                <ScanLine size={17} />
                New Analysis
              </Link>
              <Link to="/history" className="profile-secondary-btn">
                <History size={17} />
                View History
              </Link>
              <button
                type="button"
                className="profile-logout-btn"
                onClick={handleLogout}
              >
                <LogOut size={17} />
                Logout
              </button>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

export default Profile;
