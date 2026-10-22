import React from "react";
import { motion } from "framer-motion";

/**
 * Generic reusable Tab Switcher for mobile viewports
 * Splits dense page content into compact, tap-friendly sections
 */
export default function Tabs({ tabs = [], activeTab, onChange, className = "" }) {
  if (!tabs || tabs.length === 0) return null;

  return (
    <div
      className={`tabs-switcher-wrapper ${className}`}
      style={{
        display: "flex",
        background: "rgba(255, 255, 255, 0.04)",
        padding: "4px",
        borderRadius: "14px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        position: "relative",
        gap: "4px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1,
              position: "relative",
              padding: "10px 8px",
              border: "none",
              background: "transparent",
              color: isActive ? "#ffffff" : "#94a3b8",
              fontSize: "12px",
              fontWeight: isActive ? "700" : "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              borderRadius: "10px",
              zIndex: 1,
              transition: "color 0.2s ease",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {Icon && <Icon size={15} color={isActive ? "#38bdf8" : "#64748b"} />}
            <span>{tab.label}</span>

            {isActive && (
              <motion.div
                layoutId="activeTabBadge"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(56, 189, 248, 0.15)",
                  border: "1px solid rgba(56, 189, 248, 0.35)",
                  borderRadius: "10px",
                  zIndex: -1,
                  boxShadow: "0 2px 8px rgba(56, 189, 248, 0.2)",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
