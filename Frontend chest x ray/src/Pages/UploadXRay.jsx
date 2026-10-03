import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Upload,
  FileImage,
  X,
  ScanLine,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  Loader2,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { predictXRay } from "../api.js";

function UploadXRay() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // =========================================================
  // VALIDATE FILE
  // =========================================================
  const validateFile = (file) => {
    if (!file) return false;
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10 MB.");
      return false;
    }
    setError("");
    return true;
  };

  const handleFile = (file) => {
    if (!validateFile(file)) return;
    setSelectedFile(file);
    setError("");
    const reader = new FileReader();
    reader.onload = (event) => setPreview(event.target.result);
    reader.onerror = () => {
      setError("Unable to read this image. Please try another file.");
      setSelectedFile(null);
      setPreview("");
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (event) => {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const removeFile = () => {
    if (isAnalyzing) return;
    setSelectedFile(null);
    setPreview("");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // =========================================================
  // ANALYZE X-RAY — calls real backend API
  // =========================================================
  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError("Please upload a chest X-ray image first.");
      return;
    }
    if (isAnalyzing) return;

    setError("");
    setIsAnalyzing(true);

    try {
      const result = await predictXRay(selectedFile);

      // Store the prediction result in sessionStorage for Results page
      sessionStorage.setItem(
        "currentXRayAnalysis",
        JSON.stringify({
          // meta
          fileName: selectedFile.name,
          fileType: selectedFile.type || "Image",
          fileSize: selectedFile.size,
          preview: preview,
          date: new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          time: new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          // real backend results
          predicted_class: result.predicted_class,
          confidence: result.confidence,
          all_class_probabilities: result.all_class_probabilities,
          heatmap_url: result.heatmap_url,
          status: "Completed",
        })
      );

      navigate("/results");
    } catch (err) {
      setError(
        err.message || "Analysis failed. Please check the backend is running."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // =========================================================
  // UI
  // =========================================================
  return (
    <div className="app-shell">
      <Navbar />

      <main className="upload-page">
        {/* HEADER */}
        <section className="upload-page-header">
          <div>
            <span className="section-label">CHEST X-RAY ANALYSIS</span>
            <h1>Upload Chest X-ray</h1>
            <p>
              Upload a chest X-ray image to begin the multi-condition screening
              workflow.
            </p>
          </div>
          <Link to="/" className="upload-back-link">
            <ArrowLeft size={15} />
            Back to Overview
          </Link>
        </section>

        {/* MAIN GRID */}
        <section className="upload-main-grid">
          {/* LEFT SIDE */}
          <div className="upload-card">
            <div className="upload-card-header">
              <div className="upload-step-number">01</div>
              <div>
                <span className="section-label">SOURCE IMAGE</span>
                <h2>Select X-ray Image</h2>
              </div>
            </div>

            {!selectedFile ? (
              <div
                className={`upload-dropzone ${isDragging ? "dragging" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleInputChange}
                  hidden
                />
                <div className="upload-drop-icon">
                  <Upload size={28} />
                </div>
                <h3>Drop your X-ray image here</h3>
                <p>or click to browse files from your computer</p>
                <span className="upload-browse-label">Browse X-ray</span>
                <div className="upload-format-info">
                  <span>PNG</span>
                  <span>JPG</span>
                  <span>JPEG</span>
                  <span>WEBP</span>
                  <span>Max 10 MB</span>
                </div>
              </div>
            ) : (
              <div className="upload-preview-area">
                <div className="upload-preview-header">
                  <div>
                    <span className="section-label">IMAGE PREVIEW</span>
                    <h3>
                      {isAnalyzing
                        ? "Analyzing with AI model..."
                        : "Ready for analysis"}
                    </h3>
                  </div>
                  <button
                    type="button"
                    className="upload-remove-btn"
                    onClick={removeFile}
                    disabled={isAnalyzing}
                  >
                    <X size={16} />
                    Remove
                  </button>
                </div>

                <div className="upload-preview-box">
                  <img src={preview} alt="Selected chest X-ray" />
                  <div className="upload-preview-overlay">
                    <span>
                      <ScanLine size={13} />
                      CHEST X-RAY
                    </span>
                    <span>ORIGINAL INPUT</span>
                  </div>
                </div>

                <div className="upload-file-details">
                  <div className="upload-file-icon">
                    <FileImage size={19} />
                  </div>
                  <div className="upload-file-text">
                    <strong>{selectedFile.name}</strong>
                    <span>
                      {selectedFile.type || "Image"} &middot;{" "}
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                  <CheckCircle2 className="upload-file-check" size={20} />
                </div>
              </div>
            )}

            {error && (
              <div className="upload-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* RIGHT SIDE */}
          <aside className="upload-info-panel">
            <div className="upload-info-heading">
              <div className="upload-info-icon">
                <ShieldCheck size={20} />
              </div>
              <div>
                <span className="section-label">ANALYSIS WORKFLOW</span>
              </div>
            </div>

            <div className="upload-workflow">
              <div className="upload-workflow-item">
                <span>01</span>
                <div>
                  <strong>Upload image</strong>
                  <p>Select a clear chest X-ray image in a supported format.</p>
                </div>
              </div>
              <div className="upload-workflow-line"></div>
              <div className="upload-workflow-item">
                <span>02</span>
                <div>
                  <strong>AI inference</strong>
                  <p>
                    ResNet50 model classifies the image and generates Grad-CAM
                    heatmap.
                  </p>
                </div>
              </div>
              <div className="upload-workflow-line"></div>
              <div className="upload-workflow-item">
                <span>03</span>
                <div>
                  <strong>Review results</strong>
                  <p>View condition-wise probabilities and explainability map.</p>
                </div>
              </div>
            </div>

            <div className="upload-condition-box">
              <span className="section-label">DETECTABLE CONDITIONS</span>
              <div className="upload-condition-list">
                <span>
                  <i></i>COVID-19
                </span>
                <span>
                  <i></i>Lung Opacity
                </span>
                <span>
                  <i></i>Normal
                </span>
                <span>
                  <i></i>Pneumonia
                </span>
                <span>
                  <i></i>Tuberculosis
                </span>
              </div>
            </div>
          </aside>
        </section>

        {/* ACTION BAR */}
        <section className="upload-action-bar">
          <div className="upload-action-status">
            <div className="upload-status-dot"></div>
            <div>
              <strong>
                {isAnalyzing
                  ? "Running AI inference..."
                  : selectedFile
                  ? "Image ready for analysis"
                  : "Waiting for image"}
              </strong>
              <span>
                {isAnalyzing
                  ? "ResNet50 model is processing your X-ray..."
                  : selectedFile
                  ? "Review the preview then click Analyze X-ray."
                  : "Upload a chest X-ray to continue."}
              </span>
            </div>
          </div>

          <div className="upload-action-buttons">
            <button
              type="button"
              className="upload-reset-btn"
              onClick={removeFile}
              disabled={!selectedFile || isAnalyzing}
            >
              <RotateCcw size={15} />
              Reset
            </button>

            <button
              type="button"
              className={`upload-analyze-btn ${
                !selectedFile || isAnalyzing ? "disabled" : ""
              }`}
              onClick={handleAnalyze}
              disabled={!selectedFile || isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={16} className="spin" />
                  Analyzing X-ray...
                </>
              ) : (
                <>
                  <ScanLine size={16} />
                  Analyze X-ray
                </>
              )}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default UploadXRay;
