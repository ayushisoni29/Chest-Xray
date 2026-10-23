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
        background: "#e4f1ea",
        padding: "4px",
        borderRadius: "12px",
        border: "1px solid #cce2d6",
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
              padding: "9px 8px",
              border: "none",
              background: "transparent",
              color: isActive ? "#065f46" : "#526e62",
              fontSize: "12px",
              fontWeight: isActive ? "700" : "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              borderRadius: "9px",
              zIndex: 1,
              transition: "color 0.2s ease",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {Icon && <Icon size={15} color={isActive ? "#065f46" : "#64748b"} />}
            <span>{tab.label}</span>

            {isActive && (
              <motion.div
                layoutId="activeTabBadge"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "#ffffff",
                  border: "1px solid #a7f3d0",
                  borderRadius: "9px",
                  zIndex: -1,
                  boxShadow: "0 2px 6px rgba(6, 95, 70, 0.12)",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
