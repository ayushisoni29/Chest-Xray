import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Splash() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Fill the progress bar smoothly over 2.6 seconds
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 45);

    // Auto-transition to sign-in page after progress bar finishes
    const timer = setTimeout(() => {
      const token = localStorage.getItem("medscan_token");
      const user = localStorage.getItem("medscanCurrentUser");
      if (token && user) {
        navigate("/dashboard");
      } else {
        navigate("/login");
      }
    }, 2800);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [navigate]);

  const handleSkip = () => {
    const token = localStorage.getItem("medscan_token");
    const user = localStorage.getItem("medscanCurrentUser");
    if (token && user) {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  };

  return (
    <div
      onClick={handleSkip}
      style={{
        height: "100dvh",
        maxWidth: "440px",
        width: "100%",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "50px 24px 36px 24px",
        boxSizing: "border-box",
        background: "linear-gradient(180deg, #07251c 0%, #051e16 50%, #03140e 100%)",
        color: "#fff",
        overflow: "hidden",
        position: "relative",
        cursor: "pointer",
        userSelect: "none",
        boxShadow: "0 0 60px rgba(0,0,0,0.9)",
      }}
    >
      {/* Subtle background ambient glow */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "280px",
          height: "280px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, rgba(5, 150, 105, 0) 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Empty top spacer */}
      <div style={{ height: "40px" }} />

      {/* Center 3D Logo & Branding */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          perspective: "1000px",
          zIndex: 2,
        }}
      >
        {/* 3D Animated Floating Medical Plus Badge */}
        <motion.div
          animate={{
            rotateY: [-18, 18],
            rotateX: [10, -10],
            rotateZ: [-2, 2],
            y: [-8, 8],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
          style={{
            width: "128px",
            height: "128px",
            position: "relative",
            transformStyle: "preserve-3d",
            marginBottom: "38px",
          }}
        >
          {/* 3D Shadow Layer */}
          <div
            style={{
              position: "absolute",
              width: "120px",
              height: "120px",
              borderRadius: "32px",
              background: "#02170f",
              transform: "translateZ(-28px) translateY(18px) scale(0.95)",
              filter: "blur(14px)",
              opacity: 0.85,
            }}
          />

          {/* 3D Extrusion Side Layers (Depth illusion) */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "30px",
              background: "linear-gradient(135deg, #04432c 0%, #022316 100%)",
              transform: "translateZ(-14px) translateY(6px)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "30px",
              background: "linear-gradient(135deg, #055a3b 0%, #033220 100%)",
              transform: "translateZ(-7px) translateY(3px)",
            }}
          />

          {/* Front 3D Face */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "28px",
              background: "linear-gradient(145deg, #0d7a52 0%, #086140 60%, #054a31 100%)",
              boxShadow: "inset 0 2px 4px rgba(255, 255, 255, 0.35), inset 0 -3px 6px rgba(0, 0, 0, 0.4), 0 16px 30px rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1.5px solid rgba(110, 231, 183, 0.45)",
            }}
          >
            {/* White Medical Cross / Plus Sign */}
            <svg
              width="58"
              height="58"
              viewBox="0 0 24 24"
              fill="none"
              style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.35))" }}
            >
              <rect x="9.5" y="3" width="5" height="18" rx="2" fill="#ffffff" />
              <rect x="3" y="9.5" width="18" height="5" rx="2" fill="#ffffff" />
            </svg>
          </div>
        </motion.div>

        {/* 3D Extruded Title: MedScan AI */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            fontSize: "36px",
            fontWeight: "900",
            letterSpacing: "-0.5px",
            margin: "0 0 10px 0",
            color: "#ffffff",
            textAlign: "center",
            textShadow: `
              0 1px 0 #34d399,
              0 2px 0 #10b981,
              0 3px 0 #059669,
              0 4px 0 #047857,
              0 6px 1px rgba(0,0,0,0.4),
              0 10px 25px rgba(0,0,0,0.7)
            `,
            fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          MedScan AI
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          style={{
            fontSize: "13.5px",
            color: "#a7f3d0",
            margin: 0,
            fontWeight: "500",
            letterSpacing: "0.2px",
            textAlign: "center",
          }}
        >
          Chest X-ray screening for clinicians
        </motion.p>
      </div>

      {/* Bottom Progress Bar & Version */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          zIndex: 2,
        }}
      >
        {/* Progress Bar Pill */}
        <div
          style={{
            width: "140px",
            height: "5px",
            borderRadius: "99px",
            background: "rgba(255, 255, 255, 0.12)",
            overflow: "hidden",
            marginBottom: "18px",
          }}
        >
          <motion.div
            style={{
              height: "100%",
              width: `${progress}%`,
              borderRadius: "99px",
              background: "linear-gradient(90deg, #34d399 0%, #6ee7b7 100%)",
              boxShadow: "0 0 10px rgba(52, 211, 153, 0.6)",
            }}
          />
        </div>

        <span
          style={{
            fontSize: "11px",
            color: "rgba(167, 243, 208, 0.6)",
            fontWeight: "500",
            letterSpacing: "0.5px",
          }}
        >
          Version 1.0
        </span>
      </div>
    </div>
  );
}
