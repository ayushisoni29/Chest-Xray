import React from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { Home, Scan, History, User, Stethoscope, Languages } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../context/LanguageContext";

export default function MobileLayout({ children }) {
  const location = useLocation();
  const currentPath = location.pathname;
  const { lang, toggleLanguage, t } = useLanguage();

  // Bottom navigation items
  const navItems = [
    { label: t("nav_home"), path: "/", icon: Home },
    { label: t("nav_scan"), path: "/detection", icon: Scan, isFab: true },
    { label: t("nav_history"), path: "/history", icon: History },
    { label: t("nav_profile"), path: "/profile", icon: User },
  ];

  return (
    <div className="mobile-shell">
      {/* Top Mobile Status Header */}
      <header className="mobile-header-bar">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            height: "44px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "#081d15",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
              }}
            >
              <Stethoscope size={15} color="#fff" />
            </div>
            <span
              style={{
                fontWeight: "800",
                fontSize: "15px",
                letterSpacing: "-0.3px",
                color: "#081d15",
              }}
            >
              {t("app_title")}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Language Switcher Toggle Pill */}
            <button
              type="button"
              onClick={toggleLanguage}
              title="Switch Language / भाषा बदलें"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: "#ffffff",
                border: "1.5px solid #065f46",
                borderRadius: "16px",
                padding: "3px 8px",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "800",
                color: "#065f46",
                boxShadow: "0 1px 4px rgba(6, 95, 70, 0.15)",
                transition: "all 0.2s ease",
              }}
            >
              <Languages size={13} color="#065f46" />
              <span>{lang === "en" ? "हिंदी" : "EN"}</span>
            </button>

            {/* AI Online Status */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "#dcfce7",
                border: "1px solid #bbf7d0",
                borderRadius: "16px",
                padding: "3px 9px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#22c55e",
                  boxShadow: "0 0 6px #22c55e",
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: "11px", color: "#166534", fontWeight: "600" }}>
                {t("ai_online")}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Screen Content with Smooth 200ms Transition */}
      <main className="mobile-content-area">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPath}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}
          >
            {children || <Outlet />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Fixed Bottom Tab Bar */}
      <nav className="mobile-tab-bar" aria-label="Mobile Navigation">
        {navItems.map((item) => {
          const isActive =
            item.path === "/"
              ? currentPath === "/"
              : currentPath.startsWith(item.path);
          const Icon = item.icon;

          if (item.isFab) {
            return (
              <Link
                key={item.path}
                to={item.path}
                className="scan-tab-fab"
                aria-label="New Scan"
              >
                <Icon size={22} />
              </Link>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`mobile-tab-item ${isActive ? "active" : ""}`}
            >
              {isActive && <div className="tab-active-indicator" />}
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
