
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
import { predictXRay, getStoredUser } from "../api.js";

function UploadXRay() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const fileCheckIdRef = useRef(0);
  const user = getStoredUser() || {};

  const [patientName, setPatientName] = useState(user.name || "");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [isCheckingImage, setIsCheckingImage] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const validateFile = (file) => {
    if (!file) {
      setError("Please select an image first.");
      return false;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Please select a PNG, JPG, JPEG or WEBP image.");
      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10 MB.");
      return false;
    }

    return true;
  };

  // Estimate image sharpness using Laplacian variance.
  const checkImageBlur = (file) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);
      let revoked = false;

      const revokeUrl = () => {
        if (!revoked) {
          URL.revokeObjectURL(objectUrl);
          revoked = true;
        }
      };

      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error("Unable to check image clarity.");
          }

          const maxSize = 512;
          const scale = Math.min(
            1,
            maxSize / Math.max(image.width, image.height)
          );

          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));

          context.drawImage(image, 0, 0, canvas.width, canvas.height);

          const { data } = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
          );

          const width = canvas.width;
          const height = canvas.height;
          const gray = new Float32Array(width * height);

          for (let i = 0; i < width * height; i++) {
            const pixel = i * 4;
            gray[i] =
              0.299 * data[pixel] +
              0.587 * data[pixel + 1] +
              0.114 * data[pixel + 2];
          }

          let sum = 0;
          let sumSquared = 0;
          let count = 0;

          for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
              const index = y * width + x;
              const laplacian =
                gray[index - width] +
                gray[index + width] +
                gray[index - 1] +
                gray[index + 1] -
                4 * gray[index];

              sum += laplacian;
              sumSquared += laplacian * laplacian;
              count++;
            }
          }

          const mean = count ? sum / count : 0;
          const variance = count
            ? Math.max(0, sumSquared / count - mean * mean)
            : 0;

          resolve(variance);
        } catch (err) {
          reject(err);
        } finally {
          revokeUrl();
        }
      };

      image.onerror = () => {
        revokeUrl();
        reject(new Error("Unable to read this image."));
      };

      image.src = objectUrl;
    });

  const handleFile = async (file) => {
    if (!file || isAnalyzing) return;

    const checkId = ++fileCheckIdRef.current;

    setSelectedFile(null);
    setPreview("");
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (!validateFile(file)) return;

    setIsCheckingImage(true);
    setError("Checking image clarity...");

    try {
      const blurScore = await checkImageBlur(file);

      if (checkId !== fileCheckIdRef.current) return;
      // Initial threshold: calibrate using real X-ray images.
      console.log("X-ray blur score:", blurScore);
      const BLUR_THRESHOLD = 20;

      if (blurScore < BLUR_THRESHOLD) {
        setError(
          "This image appears blurred or out of focus. Please select a clearer chest X-ray."
        );
        return;
      }

      const reader = new FileReader();

      reader.onload = (event) => {
        if (checkId !== fileCheckIdRef.current) return;

        setSelectedFile(file);
        setPreview(event.target.result);
        setError("");
      };

      reader.onerror = () => {
        if (checkId !== fileCheckIdRef.current) return;

        setSelectedFile(null);
        setPreview("");
        setError("Unable to read this image. Please try another file.");
      };

      reader.readAsDataURL(file);
    } catch (err) {
      if (checkId !== fileCheckIdRef.current) return;

      setSelectedFile(null);
      setPreview("");
      setError(
        err.message || "Unable to check image clarity. Please try another image."
      );
    } finally {
      if (checkId === fileCheckIdRef.current) {
        setIsCheckingImage(false);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleInputChange = (event) => {
    const file = event.target.files?.[0];
    if (file) void handleFile(file);
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const removeFile = () => {
    if (isAnalyzing) return;

    fileCheckIdRef.current += 1;
    setIsCheckingImage(false);
    setSelectedFile(null);
    setPreview("");
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAnalyze = async () => {
    if (isCheckingImage || isAnalyzing) return;

    if (!patientName.trim()) {
      setError("Please enter the patient's name.");
      return;
    }

    const age = Number(patientAge);

    if (
      !patientAge.trim() ||
      !Number.isInteger(age) ||
      age < 1 ||
      age > 120
    ) {
      setError("Please enter a valid age between 1 and 120.");
      return;
    }

    if (!patientGender) {
      setError("Please select the patient's gender.");
      return;
    }

    if (!selectedFile) {
      setError("Please upload a clear chest X-ray image first.");
      return;
    }

    setError("");
    setIsAnalyzing(true);

    try {
      const result = await predictXRay(selectedFile);

      const analysis = {
        id: result.id || result.prediction_id || result.predictionId || null,
        fileName: selectedFile.name,
        fileType: selectedFile.type || "Image",
        fileSize: selectedFile.size,
        preview,
        date: new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        time: new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        predicted_class: result.predicted_class,
        confidence: result.confidence,
        all_class_probabilities:
          result.all_class_probabilities || result.probabilities || {},
        heatmap_url: result.heatmap_url,
        image_url: result.image_url,
        calibrated_thresholds: result.calibrated_thresholds || {},
        clinical_flags: result.clinical_flags || [],
        status: "Completed",
        patient: {
          patientName: patientName.trim(),
          patientEmail: user.email || "",
          patientAge: age,
          patientGender,
        },
      };

      sessionStorage.setItem("currentXRayAnalysis", JSON.stringify(analysis));
      navigate("/results");
    } catch (err) {
      setError(
        err.message ||
          "Analysis failed. Please check that the backend is running."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fieldStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #d5e0ec",
    borderRadius: "8px",
    background: "#fff",
    color: "#24364b",
    fontSize: "14px",
    outline: "none",
  };

  return (
    <div className="app-shell">
      <Navbar />

      <main className="upload-page">
        <section className="upload-page-header">
          <div>
            <span className="section-label">CHEST X-RAY ANALYSIS</span>
            <h1>Upload Chest X-ray</h1>
            <p>
              Enter patient details and upload a chest X-ray to begin the
              screening workflow.
            </p>
          </div>

          <Link to="/" className="upload-back-link">
            <ArrowLeft size={15} />
            Back to Overview
          </Link>
        </section>

        {/* Patient information */}
        <section
          className="upload-card"
          style={{ padding: "24px", marginBottom: "24px" }}
        >
          <div className="upload-card-header" style={{ marginBottom: "20px" }}>
            <div className="upload-step-number">00</div>
            <div>
              <span className="section-label">PATIENT INFORMATION</span>
              <h2>Patient Details</h2>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "18px",
            }}
          >
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600 }}>
              Patient Name *
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Enter patient name"
                maxLength={100}
                autoComplete="name"
                style={{ ...fieldStyle, marginTop: "8px" }}
                disabled={isAnalyzing}
              />
            </label>

            <label style={{ display: "block", fontSize: "13px", fontWeight: 600 }}>
              Patient Age *
              <input
                type="number"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
                placeholder="Age in years"
                min="1"
                max="120"
                step="1"
                style={{ ...fieldStyle, marginTop: "8px" }}
                disabled={isAnalyzing}
              />
            </label>

            <label style={{ display: "block", fontSize: "13px", fontWeight: 600 }}>
              Gender *
              <select
                value={patientGender}
                onChange={(e) => setPatientGender(e.target.value)}
                style={{ ...fieldStyle, marginTop: "8px" }}
                disabled={isAnalyzing}
              >
                <option value="">Select gender</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </label>
          </div>

          <p style={{ margin: "16px 0 0", fontSize: "12px", color: "#64748b" }}>
            Signed-in account email: {user.email || "Not available"}
          </p>
        </section>

        {/* Image upload */}
        <section className="upload-main-grid">
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
                onClick={() => {
                  if (!isCheckingImage && !isAnalyzing) {
                    fileInputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (
                    (event.key === "Enter" || event.key === " ") &&
                    !isCheckingImage &&
                    !isAnalyzing
                  ) {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                aria-disabled={isCheckingImage || isAnalyzing}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleInputChange}
                  hidden
                  disabled={isCheckingImage || isAnalyzing}
                />

                <div className="upload-drop-icon">
                  {isCheckingImage ? (
                    <Loader2 size={28} className="spin" />
                  ) : (
                    <Upload size={28} />
                  )}
                </div>

                <h3>
                  {isCheckingImage
                    ? "Checking image clarity..."
                    : "Drop your X-ray image here"}
                </h3>
                <p>
                  {isCheckingImage
                    ? "Please wait while we check the image."
                    : "or click to browse files from your computer"}
                </p>

                {!isCheckingImage && (
                  <span className="upload-browse-label">Browse X-ray</span>
                )}

                <div className="upload-format-info">
                  <span>PNG / JPG / WEBP</span>
                  <span>Max 10 MB</span>
                  <span style={{ color: "#0284c7", background: "#f0f9ff", borderColor: "#bae6fd" }}>OOD Gated</span>
                  <span style={{ color: "#7c3aed", background: "#f5f3ff", borderColor: "#ddd6fe" }}>TTA Invariance</span>
                  <span style={{ color: "#059669", background: "#ecfdf5", borderColor: "#a7f3d0" }}>Calibrated Triaging</span>
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
              <div
                className="upload-error"
                role="status"
                aria-live="polite"
              >
                {error === "Checking image clarity..." ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <AlertCircle size={16} />
                )}
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Workflow information */}
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

              <div className="upload-workflow-line" />

              <div className="upload-workflow-item">
                <span>02</span>
                <div>
                  <strong>AI inference</strong>
                  <p>
                    The model classifies the image and may generate a Grad-CAM
                    heatmap if supported by the backend.
                  </p>
                </div>
              </div>

              <div className="upload-workflow-line" />

              <div className="upload-workflow-item">
                <span>03</span>
                <div>
                  <strong>Review results</strong>
                  <p>
                    View condition-wise probabilities and the available
                    explainability map.
                  </p>
                </div>
              </div>
            </div>

            <div className="upload-condition-box">
              <span className="section-label">DETECTABLE CONDITIONS</span>

              <div className="upload-condition-list">
                <span><i />COVID-19</span>
                <span><i />Lung Opacity</span>
                <span><i />Normal</span>
                <span><i />Pneumonia</span>
                <span><i />Tuberculosis</span>
              </div>
            </div>
          </aside>
        </section>

        {/* Bottom action bar */}
        <section className="upload-action-bar">
          <div className="upload-action-status">
            <div className="upload-status-dot" />

            <div>
              <strong>
                {isAnalyzing
                  ? "Running AI inference..."
                  : isCheckingImage
                  ? "Checking image clarity..."
                  : selectedFile
                  ? "Image ready for analysis"
                  : "Waiting for image"}
              </strong>

              <span>
                {isAnalyzing
                  ? "The model is processing your X-ray..."
                  : isCheckingImage
                  ? "Please wait for the clarity check to finish."
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
              disabled={(!selectedFile && !isCheckingImage) || isAnalyzing}
            >
              <RotateCcw size={15} />
              Reset
            </button>

            <button
              type="button"
              className={`upload-analyze-btn ${
                !selectedFile || isCheckingImage || isAnalyzing ? "disabled" : ""
              }`}
              onClick={handleAnalyze}
              disabled={!selectedFile || isCheckingImage || isAnalyzing}
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
