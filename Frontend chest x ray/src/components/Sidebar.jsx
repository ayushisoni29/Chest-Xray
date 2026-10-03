import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ScanLine,
  History,
  Info,
  Plus,
  Activity,
} from "lucide-react";

function Sidebar() {
  const menuItems = [
    {
      name: "Overview",
      path: "/",
      icon: LayoutDashboard,
    },
    {
      name: "Detection",
      path: "/detection",
      icon: ScanLine,
    },
    {
      name: "History",
      path: "/history",
      icon: History,
    },
    {
      name: "About",
      path: "/about",
      icon: Info,
    },
  ];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Activity size={20} strokeWidth={2.2} />
        </div>

        <div>
          <div className="sidebar-brand">Chest X-ray AI</div>
          <div className="sidebar-subtitle">AI DIAGNOSTICS</div>
        </div>
      </div>

      {/* New Analysis */}
      <NavLink to="/detection" className="sidebar-new-analysis">
        <Plus size={17} />
        <span>New Analysis</span>
      </NavLink>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-title">WORKSPACE</div>

        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={18} strokeWidth={2} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Information */}
      <div className="sidebar-bottom">
        <div className="sidebar-status">
          <span className="status-dot"></span>

          <div>
            <div className="status-title">System Ready</div>
            <div className="status-text">Analysis interface active</div>
          </div>
        </div>

        <div className="sidebar-version">
          Chest X-ray AI Interface
          <span>v1.0</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;