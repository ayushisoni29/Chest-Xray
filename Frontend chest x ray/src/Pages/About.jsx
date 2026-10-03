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
      name: "Pneumonia",
      description:
        "Detection of radiographic patterns associated with pneumonia.",
    },
    {
      number: "02",
      name: "Tuberculosis",
      description:
        "Detection of chest X-ray patterns associated with tuberculosis.",
    },
    {
      number: "03",
      name: "COVID-19",
      description:
        "Detection of visible lung abnormalities associated with COVID-19.",
    },
    {
      number: "04",
      name: "Lung Opacity",
      description:
        "Detection of increased opacity patterns within the lungs.",
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
                  04 Conditions
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
                Four target
                <br />
                conditions
              </h2>
            </div>

            <p className="about-system-section-description">
              The current project focuses on four selected
              chest conditions represented within the analysis
              interface.
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

              <span>01 · MODEL</span>

              <h3>
                Deep Learning
              </h3>

              <p>
                Deep-learning based image classification is the
                intended technical direction for identifying
                patterns in chest X-ray images.
              </p>

            </div>


            <div className="about-technology-card">

              <div className="about-technology-icon">
                <Database size={21} />
              </div>

              <span>02 · DATA</span>

              <h3>
                Medical Dataset
              </h3>

              <p>
                A suitable chest X-ray dataset is required for
                model training, validation and performance
                evaluation.
              </p>

            </div>


            <div className="about-technology-card">

              <div className="about-technology-icon">
                <ShieldCheck size={21} />
              </div>

              <span>03 · VALIDATION</span>

              <h3>
                Clinical Evaluation
              </h3>

              <p>
                A real-world medical application requires
                appropriate validation, security and clinical
                evaluation before practical use.
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
              IMPORTANT INFORMATION
            </span>

            <h3>
              Research & educational project
            </h3>

            <p>
              The current frontend contains demonstration
              analysis values and is intended for academic and
              project demonstration purposes. It is not a medical
              diagnostic system and does not replace professional
              medical evaluation.
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