import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ScanLine,
  BrainCircuit,
  ShieldCheck,
  Activity,
  Database,
  FileImage,
  BarChart3,
  Check,
} from "lucide-react";

import Navbar from "../components/Navbar";

function About() {
  const conditions = [
    {
      number: "01",
      name: "COVID-19",
      description:
        "Detection of radiographic patterns and ground-glass opacities associated with COVID-19.",
    },
    {
      number: "02",
      name: "Lung Opacity",
      description:
        "Detection of non-specific parenchymal lung opacities, consolidations, and infiltrates.",
    },
    {
      number: "03",
      name: "Normal",
      description:
        "Classification of frontal chest radiographs showing clear lung fields with no active focal pathology.",
    },
    {
      number: "04",
      name: "Pneumonia",
      description:
        "Detection of radiographic infiltrates and consolidations associated with viral or bacterial pneumonia.",
    },
    {
      number: "05",
      name: "Tuberculosis",
      description:
        "Detection of radiographic patterns, apical cavitary lesions, and fibrocalcific changes associated with tuberculosis.",
    },
  ];

  const workflow = [
    {
      number: "01",
      title: "Upload Image",
      description:
        "Provide a compatible chest X-ray image for analysis.",
      icon: FileImage,
    },
    {
      number: "02",
      title: "Image Processing",
      description:
        "Prepare the input image for the intended detection workflow.",
      icon: Activity,
    },
    {
      number: "03",
      title: "AI Analysis",
      description:
        "Evaluate the image against the selected disease classes.",
      icon: BrainCircuit,
    },
    {
      number: "04",
      title: "View Results",
      description:
        "Review the generated screening information in a structured format.",
      icon: BarChart3,
    },
  ];

  return (
    <div className="app-shell">
      <Navbar />

      <main className="about-system-page">

        {/* =====================================================
            01 — HERO
        ===================================================== */}

        <section className="about-system-hero">

          <div className="about-system-hero-inner">

            <div className="about-system-overline">
              <span></span>
              ABOUT Chest X-ray AI 
            </div>

            <h1>
              AI-Based Multi-Disease
              <br />
              <strong>Chest X-ray Detection</strong>
            </h1>

            <p>
              MedScan AI is a frontend interface developed for a
              deep-learning based chest X-ray analysis project.
              The system is designed to organize image input,
              multi-disease screening and result presentation
              into one structured workflow.
            </p>

            <div className="about-system-hero-actions">

              <Link
                to="/detection"
                className="about-system-primary"
              >
                <ScanLine size={17} />
                Start New Analysis
                <ArrowRight size={16} />
              </Link>

              <Link
                to="/history"
                className="about-system-secondary"
              >
                View Analysis History
              </Link>

            </div>

          </div>

        </section>


        {/* =====================================================
            02 — PROJECT OVERVIEW
        ===================================================== */}

        <section className="about-system-section">

          <div className="about-system-section-heading">

            <div className="about-system-section-number">
              01
            </div>

            <div>
              <span>PROJECT OVERVIEW</span>

              <h2>
                Understanding the
                <br />
                system
              </h2>
            </div>

          </div>


          <div className="about-system-overview">

            <div className="about-system-overview-main">

              <h3>
                A structured interface for medical image screening
              </h3>

              <p>
                The project explores the use of deep learning and
                medical image analysis for identifying multiple
                conditions from chest X-ray images.
              </p>

              <p>
                Chest X-ray AI  provides the user-facing layer of this
                workflow. It allows users to upload an X-ray,
                initiate an analysis, review screening information
                and access previous analysis records.
              </p>

            </div>


            <div className="about-system-overview-data">

              <div className="about-data-item">
                <span>INPUT</span>

                <strong>
                  Chest X-ray Image
                </strong>
              </div>

              <div className="about-data-item">
                <span>METHOD</span>

                <strong>
                  Deep Learning
                </strong>
              </div>

              <div className="about-data-item">
                <span>TARGETS</span>

                <strong>
                  05 Conditions
                </strong>
              </div>

              <div className="about-data-item">
                <span>OUTPUT</span>

                <strong>
                  Screening Results
                </strong>
              </div>

            </div>

          </div>

        </section>


        {/* =====================================================
            03 — DETECTION SCOPE
        ===================================================== */}

        <section className="about-system-section">

          <div className="about-system-section-heading">

            <div className="about-system-section-number">
              02
            </div>

            <div>
              <span>DETECTION SCOPE</span>

              <h2>
                Five target
                <br />
                classes
              </h2>
            </div>

            <p className="about-system-section-description">
              The project classifies frontal chest radiographs across five canonical classes: Normal, COVID-19, Lung Opacity, Pneumonia, and Tuberculosis.
            </p>

          </div>


          <div className="about-condition-list">

            {conditions.map((condition) => (
              <div
                className="about-condition-row"
                key={condition.number}
              >

                <div className="about-condition-number">
                  {condition.number}
                </div>

                <div className="about-condition-name">
                  <h3>{condition.name}</h3>
                </div>

                <div className="about-condition-description">
                  <p>{condition.description}</p>
                </div>

                <div className="about-condition-check">
                  <Check size={17} />
                </div>

              </div>
            ))}

          </div>

        </section>


        {/* =====================================================
            04 — WORKFLOW
        ===================================================== */}

        <section className="about-system-section">

          <div className="about-system-section-heading">

            <div className="about-system-section-number">
              03
            </div>

            <div>
              <span>ANALYSIS WORKFLOW</span>

              <h2>
                From image
                <br />
                to result
              </h2>
            </div>

            <p className="about-system-section-description">
              The interface follows a clear four-step workflow
              for handling a chest X-ray analysis.
            </p>

          </div>


          <div className="about-workflow-list">

            {workflow.map((step) => {
              const Icon = step.icon;

              return (
                <div
                  className="about-workflow-row"
                  key={step.number}
                >

                  <div className="about-workflow-number">
                    {step.number}
                  </div>

                  <div className="about-workflow-icon">
                    <Icon size={21} />
                  </div>

                  <div className="about-workflow-content">

                    <h3>
                      {step.title}
                    </h3>

                    <p>
                      {step.description}
                    </p>

                  </div>

                  <div className="about-workflow-arrow">
                    <ArrowRight size={18} />
                  </div>

                </div>
              );
            })}

          </div>

        </section>


        {/* =====================================================
            05 — TECHNOLOGY
        ===================================================== */}

        <section className="about-system-section">

          <div className="about-system-section-heading">

            <div className="about-system-section-number">
              04
            </div>

            <div>
              <span>TECHNOLOGY</span>

              <h2>
                Technology
                <br />
                direction
              </h2>
            </div>

          </div>


          <div className="about-technology-grid">

            <div className="about-technology-card">

              <div className="about-technology-icon">
                <BrainCircuit size={21} />
              </div>

              <span>01 · ENSEMBLE MODEL</span>

              <h3>
                Dual ResNet50 Architecture
              </h3>

              <p>
                Inference averages softmax probabilities from two independently trained ResNet50 backbones (Model V1 and Model V3), achieving 97.40% accuracy across 2,730 held-out test images.
              </p>

            </div>


            <div className="about-technology-card">

              <div className="about-technology-icon">
                <Database size={21} />
              </div>

              <span>02 · EXPLAINABILITY</span>

              <h3>
                Grad-CAM Activation Map
              </h3>

              <p>
                Visual attention heatmaps are computed from Model V3 (conv5_block3_3_conv) to highlight salient regions influencing its activations. It visualizes Model V3 rather than the combined ensemble.
              </p>

            </div>


            <div className="about-technology-card">

              <div className="about-technology-icon">
                <ShieldCheck size={21} />
              </div>

              <span>03 · DATASET BENCHMARK</span>

              <h3>
                18,200 Evaluated Scans
              </h3>

              <p>
                Split into 12,740 train (70%), 2,730 validation (15%), and 2,730 test (15%) images. Nine byte-identical train–test duplicates (0.33%) were documented to ensure scientific transparency.
              </p>

            </div>

          </div>

        </section>


        {/* =====================================================
            06 — IMPORTANT NOTICE
        ===================================================== */}

        <section className="about-system-notice">

          <div className="about-notice-icon">
            <ShieldCheck size={22} />
          </div>

          <div className="about-notice-content">

            <span>
              ACADEMIC PROTOTYPE NOTICE
            </span>

            <h3>
              Research & Educational Project Only
            </h3>

            <p>
              This system is an academic engineering prototype and has not undergone clinical validation or regulatory clearance. Because patient identifiers are unavailable in public source datasets, patient-level independence cannot be formally proven. This system must not be used as a substitute for professional medical diagnosis.
            </p>

          </div>

        </section>


        {/* =====================================================
            07 — FINAL CTA
        ===================================================== */}

        <section className="about-system-final">

          <div>

            <span>
              ChEST X-RAY AI 
            </span>

            <h2>
              Begin a new
              <br />
              chest X-ray analysis.
            </h2>

          </div>

          <Link
            to="/detection"
            className="about-system-final-button"
          >
            <ScanLine size={18} />
            New Analysis
            <ArrowRight size={16} />
          </Link>

        </section>

      </main>
    </div>
  );
}

export default About;