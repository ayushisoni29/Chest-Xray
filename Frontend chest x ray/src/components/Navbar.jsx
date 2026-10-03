import React, { useEffect, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ScanLine,
  History,
  Info,
  Plus,
  User,
  LogOut,
  LogIn,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { getStoredUser, logoutUser } from "../api.js";

function Navbar() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Load user from localStorage
    const loadUser = () => {
      setCurrentUser(getStoredUser());
    };

    loadUser();

    // Listen for storage changes (cross-tab logout)
    window.addEventListener("storage", loadUser);
    return () => window.removeEventListener("storage", loadUser);
  }, []);

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    navigate("/login");
  };

  const navItems = [
    { name: "Overview",  path: "/",          icon: LayoutDashboard },
    { name: "Detection", path: "/detection",  icon: ScanLine },
    { name: "History",   path: "/history",    icon: History },
    { name: "About",     path: "/about",      icon: Info },
  ];

  return (
    <header className="navbar">
      {/* NAVIGATION CONTROLS */}
      <div className="navbar-nav-controls" style={{ display: 'flex', gap: '8px', marginRight: '15px' }}>
        <button onClick={() => navigate(-1)} title="Go Back" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: '#fff', border: '1px solid #e0ebf5', color: '#1769e0', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <ArrowLeft size={18} />
        </button>
        <button onClick={() => navigate(1)} title="Go Forward" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: '#fff', border: '1px solid #e0ebf5', color: '#1769e0', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <ArrowRight size={18} />
        </button>
      </div>

      {/* BRAND */}
      <Link to="/" className="navbar-brand">
        <div className="brand-mark">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div className="brand-text">
          <div className="brand-name">Chest X-ray AI</div>
          <div className="brand-label">MEDICAL IMAGING</div>
        </div>
      </Link>

      {/* NAVIGATION */}
      <nav className="navbar-links">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `navbar-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={17} strokeWidth={2} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* RIGHT SIDE */}
      <div className="navbar-right">
        <NavLink to="/detection" className="navbar-analysis-btn">
          <Plus size={17} strokeWidth={2.2} />
          <span>New Analysis</span>
        </NavLink>

        {currentUser ? (
          <div className="navbar-user">
            <Link to="/profile" className="navbar-user-profile">
              <div className="navbar-user-avatar">
                <User size={16} />
              </div>
              <div className="navbar-user-info">
                <strong>{currentUser.name}</strong>
                <span>Account</span>
              </div>
            </Link>

            <button
              type="button"
              className="navbar-logout-btn"
              onClick={handleLogout}
              title="Logout"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', width: 'auto', height: 'auto' }}
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <Link to="/login" className="navbar-login-btn">
            <LogIn size={16} />
            <span>Login</span>
          </Link>
        )}
      </div>
    </header>
  );
}

export default Navbar;
