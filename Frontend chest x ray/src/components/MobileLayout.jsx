import React from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { Home, Scan, History, User, Stethoscope } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MobileLayout({ children }) {
  const location = useLocation();
  const currentPath = location.pathname;

  // Bottom navigation items
  const navItems = [
    { label: "Home", path: "/", icon: Home },
    { label: "Scan", path: "/detection", icon: Scan, isFab: true },
    { label: "History", path: "/history", icon: History },
    { label: "Profile", path: "/profile", icon: User },
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
                background: "linear-gradient(135deg, #10b981 0%, #065f46 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 10px rgba(16, 185, 129, 0.4)",
              }}
            >
              <Stethoscope size={16} color="#fff" />
            </div>
            <span
              style={{
                fontWeight: "800",
                fontSize: "15px",
                letterSpacing: "-0.3px",
                background: "linear-gradient(90deg, #ffffff 0%, #94a3b8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              MedScan AI
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#22c55e",
                boxShadow: "0 0 8px #22c55e",
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600" }}>
              AI Online
            </span>
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
