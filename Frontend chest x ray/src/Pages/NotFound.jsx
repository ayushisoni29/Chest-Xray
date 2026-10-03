import React from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Home,
  ScanLine,
} from "lucide-react";

import Navbar from "../components/Navbar";

function NotFound() {
  return (
    <div className="app-shell">
      <Navbar />

      <main className="not-found-page">
        <div className="not-found-card">
          <div className="not-found-icon">
            <AlertCircle size={32} />
          </div>

          <span className="section-label">
            PAGE NOT FOUND
          </span>

          <div className="not-found-code">404</div>

          <h1>We couldn't find that page</h1>

          <p>
            The page you are looking for may have been moved,
            removed, or the address may be incorrect.
          </p>

          <div className="not-found-actions">
            <Link
              to="/"
              className="primary-btn"
            >
              <Home size={17} />
              Back to Overview
            </Link>

            <Link
              to="/detection"
              className="secondary-btn"
            >
              <ScanLine size={17} />
              New Analysis
            </Link>
          </div>

          <Link
            to="/"
            className="not-found-back"
          >
            <ArrowLeft size={15} />
            Return to Chest X-ray AI
          </Link>
        </div>
      </main>
    </div>
  );
}

export default NotFound;