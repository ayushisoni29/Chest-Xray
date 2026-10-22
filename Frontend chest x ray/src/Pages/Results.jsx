
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ScanLine,
  CheckCircle2,
  AlertCircle,
  Activity,
  FileImage,
  Clock3,
  Download,
  CalendarDays,
  ShieldCheck,
  Thermometer,
  Brain,
  Eye,
  MessageSquareWarning,
  Stethoscope,
  XCircle,
} from "lucide-react";
import Navbar from "../components/Navbar";
import {
  getPredictionById,
  getStaticUrl,
  downloadPredictionReport,
} from "../api.js";

const CLASS_COLORS = {
  COVID: "#ef4444",
  Lung_Opacity: "#f97316",
  Normal: "#22c55e",
  Pneumonia: "#3b82f6",
  Tuberculosis: "#a855f7",
};

function Results() {
  const location = useLocation();

  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isHistoryView, setIsHistoryView] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [reviewStatus, setReviewStatus] = useState(null);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadAnalysis = async () => {
      setLoading(true);
      setDownloadError("");

      const params = new URLSearchParams(location.search);
      const predictionId = params.get("id");

      if (predictionId) {
        try {
          const data = await getPredictionById(predictionId);

          if (cancelled) return;

          setAnalysisData({
            id: data.id || predictionId,
            fileName: data.image_filename,
            fileType: "Image",
            date: data.timestamp
              ? new Date(data.timestamp).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "—",
            time: data.timestamp
              ? new Date(data.timestamp).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—",
            predicted_class: data.predicted_class,
            confidence: data.confidence,
            all_class_probabilities:
              data.probabilities || data.all_class_probabilities || {},
            heatmap_url: data.heatmap_url,
            image_url: data.image_url,
            status: "Completed",
          });

          setIsHistoryView(true);
          setLoading(false);
          return;
        } catch (error) {
          if (cancelled) return;

          // Do not silently replace a failed history lookup with another scan.
          setAnalysisData(null);
          setLoading(false);
          return;
        }
      }

      try {
        const raw = sessionStorage.getItem("currentXRayAnalysis");

        if (raw) {
          const data = JSON.parse(raw);

          if (cancelled) return;

          setAnalysisData(data);
          setIsHistoryView(false);
          setLoading(false);
          return;
        }
      } catch {
        // Invalid session data
      }

      if (!cancelled) {
        setAnalysisData(null);
        setLoading(false);
      }
    };

    loadAnalysis();

    return () => {
      cancelled = true;
    };
  }, [location.search]);

  
const handleDownloadReport = async () => {
  if (!analysisData || downloadingReport) return;

  if (!analysisData.id) {
    setDownloadError(
      "This analysis has no saved report ID. Open a saved prediction from History."
    );
    return;
  }

  try {
    setDownloadingReport(true);
    setDownloadError("");

    // Patient details were saved when the X-ray was uploaded.
    const patient = analysisData.patient || {};

    await downloadPredictionReport(analysisData.id, {
      name: patient.patientName || patient.name || "",
      email: patient.patientEmail || patient.email || "",
      age: patient.patientAge ?? patient.age ?? "",
      gender: patient.patientGender || patient.gender || "",
    });
  } catch (error) {
    setDownloadError(
      error.message || "Unable to download the PDF report."
    );
  } finally {
    setDownloadingReport(false);
  }
};


  const handleDoctorReview = (decision) => {
    console.log("Review feedback (not saved to backend):", {
      scan_id: analysisData?.id,
      original_prediction: analysisData?.predicted_class,
      decision,
      timestamp: new Date().toISOString(),
    });

    setReviewStatus(decision);
  };

  if (loading) {
    return (
      <div className="app-shell">
        <Navbar />
        <main className="results-page">
          <div className="results-empty">
            <div className="results-empty-icon">
              <ScanLine size={28} className="spin" />
            </div>
            <span className="section-label">LOADING</span>
            <h1>Loading Analysis...</h1>
          </div>
        </main>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="app-shell">
        <Navbar />
        <main className="results-page">
          <div className="results-empty">
            <div className="results-empty-icon">
              <FileImage size={28} />
            </div>
            <span className="section-label">ANALYSIS RESULT</span>
            <h1>No Analysis Available</h1>
            <p>
              This analysis could not be loaded. Open a saved result from
              History or upload a new chest X-ray.
            </p>
            <Link to="/detection" className="primary-result-btn">
              <ScanLine size={17} />
              Start New Analysis
            </Link>
            <p>
              <Link to="/history">Open Analysis History</Link>
            </p>
          </div>
        </main>
      </div>
    );
  }

  const confidence = Number(analysisData.confidence) || 0;
  const confidencePct = (confidence * 100).toFixed(1);
  const predictedClass = analysisData.predicted_class || "Unknown";
  const probs = analysisData.all_class_probabilities || {};
  const accentColor = CLASS_COLORS[predictedClass] || "#1769aa";

  const heatmapSrc = getStaticUrl(analysisData.heatmap_url);
  const imageSrc =
    analysisData.preview || getStaticUrl(analysisData.image_url);

  const isNormal = predictedClass === "Normal";
  const isLowConfidence = confidence < 0.7;

  return (
    <div className="app-shell">
      <Navbar />

      <main className="final-results-page">
        <section className="final-results-header">
          <div className="final-results-heading">
            <div
              className="final-result-check"
              style={{ color: accentColor }}
            >
              <CheckCircle2 size={22} />
            </div>
            <div>
              <span className="section-label">
                {isHistoryView ? "PREVIOUS ANALYSIS" : "ANALYSIS RESULT"}
              </span>
              <h1>Analysis Complete</h1>
            </div>
          </div>

          <Link to="/detection" className="final-new-analysis">
            <ScanLine size={16} />
            New Analysis
          </Link>
        </section>

        <section className="final-analysis-strip">
          <div>
            <span>ANALYSIS ID</span>
            <strong>{analysisData.id || "CURRENT"}</strong>
          </div>
          <div>
            <span>DATE</span>
            <strong>{analysisData.date || "—"}</strong>
          </div>
          <div>
            <span>TIME</span>
            <strong>{analysisData.time || "—"}</strong>
          </div>
          <div>
            <span>STATUS</span>
            <strong className="final-complete">
              <i></i>Complete
            </strong>
          </div>
        </section>

        <section className="final-analysis-grid">
          <article className="final-image-section">
            <div className="final-section-heading">
              <div className="final-section-number">01</div>
              <div>
                <span className="section-label">SOURCE IMAGE</span>
                <h2>Uploaded Chest X-ray</h2>
              </div>
              <div className="final-image-toggle-btns">
                <button
                  type="button"
                  className={`heatmap-toggle-btn ${
                    !showHeatmap ? "active" : ""
                  }`}
                  onClick={() => setShowHeatmap(false)}
                >
                  <Eye size={14} />
                  Original
                </button>
                {heatmapSrc && (
                  <button
                    type="button"
                    className={`heatmap-toggle-btn ${
                      showHeatmap ? "active" : ""
                    }`}
                    onClick={() => setShowHeatmap(true)}
                  >
                    <Brain size={14} />
                    Grad-CAM
                  </button>
                )}
              </div>
            </div>

            <div className="final-xray-container">
              {showHeatmap && heatmapSrc ? (
                <img src={heatmapSrc} alt="Grad-CAM heatmap" />
              ) : imageSrc ? (
                <img src={imageSrc} alt="Uploaded chest X-ray" />
              ) : (
                <div className="final-no-image">
                  <FileImage size={32} />
                  <span>Image preview unavailable</span>
                </div>
              )}

              <div className="final-image-overlay">
                <span>
                  <ScanLine size={13} />
                  {showHeatmap ? "GRAD-CAM" : "SOURCE IMAGE"}
                </span>
                <span>
                  {showHeatmap ? "EXPLAINABILITY" : "ORIGINAL INPUT"}
                </span>
              </div>
            </div>

            <div className="final-file-info">
              <div>
                <FileImage size={17} />
                <div>
                  <span>FILE NAME</span>
                  <strong>
                    {analysisData.fileName || "Uploaded X-ray"}
                  </strong>
                </div>
              </div>
              <div>
                <Activity size={17} />
                <div>
                  <span>FILE TYPE</span>
                  <strong>{analysisData.fileType || "Image"}</strong>
                </div>
              </div>
            </div>
          </article>

          <article className="final-summary-section">
            <div className="final-section-heading">
              <div className="final-section-number">02</div>
              <div>
                <span className="section-label">AI PREDICTION</span>
                <h2>Overall Result</h2>
              </div>
            </div>

            {isLowConfidence && (
              <div className="final-low-confidence-warning">
                <MessageSquareWarning size={20} />
                <div>
                  <strong>Low Confidence ({confidencePct}%)</strong>
                  <p>
                    Uncertain prediction. Radiologist review is recommended.
                  </p>
                </div>
              </div>
            )}

            <div
              className={`final-simple-indicator ${
                isNormal ? "normal" : "abnormal"
              }`}
            >
              <strong>{isNormal ? "NORMAL" : "ABNORMAL"}</strong>
              <span>INITIAL SCREENING RESULT</span>
            </div>

            <div
              className="final-overall-box"
              style={{ borderColor: `${accentColor}44` }}
            >
              <div
                className="final-overall-icon"
                style={{ color: accentColor }}
              >
                {isNormal ? (
                  <CheckCircle2 size={22} />
                ) : (
                  <Thermometer size={22} />
                )}
              </div>
              <div>
                <span>PREDICTED CONDITION</span>
                <h3 style={{ color: accentColor }}>{predictedClass}</h3>
                <p>
                  AI model output only. This is not a confirmed clinical
                  diagnosis.
                </p>
              </div>
            </div>

            <div className="final-confidence">
              <div className="final-confidence-top">
                <span>MODEL CONFIDENCE</span>
                <strong>{confidencePct}%</strong>
              </div>
              <div className="final-confidence-bar">
                <span
                  style={{
                    width: `${Math.min(100, Math.max(0, confidence * 100))}%`,
                    background: accentColor,
                  }}
                ></span>
              </div>
            </div>

            <div className="final-summary-stats">
              <div>
                <Activity size={18} />
                <span>
                  <strong>5</strong>
                  Conditions screened
                </span>
              </div>
              <div>
                <FileImage size={18} />
                <span>
                  <strong>01</strong>
                  Image processed
                </span>
              </div>
              <div>
                <Clock3 size={18} />
                <span>
                  <strong>Complete</strong>
                  Analysis status
                </span>
              </div>
              <div>
                <ShieldCheck size={18} />
                <span>
                  <strong>ResNet50 + TTA</strong>
                  AI model used
                </span>
              </div>
            </div>
          </article>
        </section>

        <section className="final-condition-section">
          <div className="final-condition-heading">
            <div className="final-heading-left">
              <div className="final-section-number">03</div>
              <div>
                <span className="section-label">CONDITION PROBABILITIES</span>
                <h2>Class-wise Results & Calibrated Thresholds</h2>
              </div>
            </div>
          </div>

          <div className="final-condition-grid">
            {Object.entries(probs)
              .sort(([, a], [, b]) => Number(b) - Number(a))
              .map(([cls, prob]) => {
                const probability = Math.min(
                  100,
                  Math.max(0, Number(prob) * 100 || 0)
                );
                const pct = probability.toFixed(1);
                const color = CLASS_COLORS[cls] || "#1769aa";
                const isTopClass = cls === predictedClass;
                const thresholdVal = analysisData?.calibrated_thresholds?.[cls];
                const isFlagged = analysisData?.clinical_flags?.includes(cls);

                return (
                  <article
                    className={`final-condition-card ${
                      isTopClass ? "top-class" : ""
                    }`}
                    key={cls}
                    style={
                      isTopClass ? { borderColor: `${color}66` } : {}
                    }
                  >
                    <div className="final-condition-top">
                      <div
                        className="final-condition-icon"
                        style={{ color }}
                      >
                        <Activity size={17} />
                      </div>
                      <span style={{ color: isTopClass ? color : undefined }}>
                        <i
                          style={{
                            background: color,
                            borderRadius: "50%",
                            display: "inline-block",
                            width: 8,
                            height: 8,
                            marginRight: 6,
                          }}
                        ></i>
                        {isTopClass ? "Top prediction" : "Model output"}
                      </span>
                    </div>
                    <h3>{cls.replace("_", " ")}</h3>
                    <div className="final-condition-value">
                      <strong
                        style={{ color: isTopClass ? color : undefined }}
                      >
                        {pct}%
                      </strong>
                      <span>model probability</span>
                    </div>
                    <div className="final-condition-bar">
                      <span
                        style={{ width: `${probability}%`, background: color }}
                      ></span>
                    </div>
                    <div
                      style={{
                        marginTop: "10px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "11px",
                        color: "#64748b",
                      }}
                    >
                      <span>
                        Calibrated Cutoff:{" "}
                        {thresholdVal ? `${(thresholdVal * 100).toFixed(0)}%` : "50%"}
                      </span>
                      {isFlagged && (
                        <span
                          style={{
                            background: "#fee2e2",
                            color: "#b91c1c",
                            padding: "2px 7px",
                            borderRadius: "4px",
                            fontWeight: "600",
                            fontSize: "10px",
                            letterSpacing: "0.3px",
                          }}
                        >
                          CLINICAL FLAG
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
          </div>
        </section>

        {heatmapSrc && (
          <section className="final-gradcam-section">
            <div className="final-condition-heading">
              <div className="final-heading-left">
                <div className="final-section-number">04</div>
                <div>
                  <span className="section-label">EXPLAINABILITY</span>
                  <h2>Grad-CAM Heatmap</h2>
                </div>
              </div>
            </div>
            <div className="final-gradcam-grid">
              <div className="final-gradcam-img-wrap">
                {imageSrc && <img src={imageSrc} alt="Original X-ray" />}
                <span className="final-gradcam-label">ORIGINAL</span>
              </div>
              <div className="final-gradcam-img-wrap">
                <img src={heatmapSrc} alt="Grad-CAM heatmap" />
                <span className="final-gradcam-label">GRAD-CAM</span>
              </div>
            </div>
            <p className="final-gradcam-note">
              <Brain
               size={15}
               style={{
                 display: "inline",
                 verticalAlign: "middle",
                 marginRight: 6,
                }}
              />
              Grad-CAM visualizes regions that influence the model output. It supports
              interpretability but does not guarantee diagnostic correctness or
              represent a standalone clinical finding.
          
            </p>
          </section>
        )}

        <section className="final-review-section">
          <div className="final-review-content">
            <div className="final-review-icon">
              <Stethoscope size={24} />
            </div>
            <div>
              <h3>Radiologist Verification</h3>
              <p>
                Review the original X-ray and AI output with qualified
                clinical judgment.
              </p>
            </div>
          </div>

          <div className="final-review-actions">
            <button
              type="button"
              className={`review-btn confirm ${
                reviewStatus === "confirmed" ? "active" : ""
              }`}
              onClick={() => handleDoctorReview("confirmed")}
            >
              <CheckCircle2 size={16} />
              Confirm AI Result
            </button>
            <button
              type="button"
              className={`review-btn override ${
                reviewStatus === "overridden" ? "active" : ""
              }`}
              onClick={() => handleDoctorReview("overridden")}
            >
              <XCircle size={16} />
              Override Result
            </button>
          </div>

          {reviewStatus && (
            <div className="review-thankyou">
              Feedback recorded in this page only; it has not been saved to
              the backend.
            </div>
          )}
        </section>

        <section className="final-details-section">
          <div className="final-details-heading">
            <div className="final-section-number">{heatmapSrc ? "05" : "04"}</div>
            <div>
              <span className="section-label">ANALYSIS DETAILS</span>
              <h2>Record Information</h2>
            </div>
          </div>

          <div className="final-details-grid">
            <div>
              <CalendarDays size={18} />
              <span>
                ANALYSIS DATE
                <strong>{analysisData.date || "—"}</strong>
              </span>
            </div>
            <div>
              <Clock3 size={18} />
              <span>
                ANALYSIS TIME
                <strong>{analysisData.time || "—"}</strong>
              </span>
            </div>
            <div>
              <FileImage size={18} />
              <span>
                CONDITIONS
                <strong>05 Conditions</strong>
              </span>
            </div>
            <div>
              <ShieldCheck size={18} />
              <span>
                AI MODEL
                <strong>ResNet50 Ensemble (V1 + V3)</strong>
              </span>
            </div>
          </div>
        </section>

        <section className="final-notice-section prominent-disclaimer">
          <div className="final-notice-icon">
            <AlertCircle size={24} />
          </div>

          <div className="disclaimer-text-content">
            <h3>Medical Disclaimer</h3>
            <p>
              This AI system is an academic research prototype and is not clinically
              validated. Its output is for educational and research purposes only and
              must not substitute for professional medical diagnosis. A qualified
              medical professional must review the original image and interpret the
              findings.
            </p>
          </div>

          <button
            type="button"
            className="final-download-btn"
            onClick={handleDownloadReport}
            disabled={downloadingReport}
          >
            <Download size={16} />
            {downloadingReport ? "Preparing PDF..." : "Download PDF Report"}
          </button>

          {downloadError && (
            <p
              role="alert"
              style={{
                color: "#dc2626",
                marginTop: 8,
                flexBasis: "100%",
              }}
            >
              {downloadError}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

export default Results;
