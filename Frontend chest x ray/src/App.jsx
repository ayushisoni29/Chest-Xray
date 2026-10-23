import React, { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Splash from "./Pages/Splash";
import Dashboard from "./Pages/Dashboard";
import UploadXRay from "./Pages/UploadXRay";
import Results from "./Pages/Results";
import History from "./Pages/History";
import Profile from "./Pages/Profile";
import Login from "./Pages/Login";
import Register from "./Pages/Register";
import NotFound from "./Pages/NotFound";

import MobileLayout from "./components/MobileLayout";
import { isTokenExpired, forceLogout, initInactivityWatcher } from "./session";

import "./App.css";
import "./mobile.css";

/* ================================
   PROTECTED ROUTE (Mobile Guard)
   Checks token presence + expiry
================================ */
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("medscan_token");
  const user = localStorage.getItem("medscanCurrentUser");

  if (!token || !user || isTokenExpired(token)) {
    forceLogout("Please sign in to access MedScan AI.");
    return <Navigate to="/welcome" replace />;
  }

  return <MobileLayout>{children}</MobileLayout>;
}

/* ================================
   GUEST ROUTE
   Redirect logged-in users to Home
================================ */
function GuestRoute({ children }) {
  const token = localStorage.getItem("medscan_token");
  const user = localStorage.getItem("medscanCurrentUser");

  if (token && user && !isTokenExpired(token)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

/* ================================
   ROOT ROUTE (Splash Screen First)
================================ */
function RootRoute() {
  const token = localStorage.getItem("medscan_token");
  const user = localStorage.getItem("medscanCurrentUser");

  if (token && user && !isTokenExpired(token)) {
    return (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    );
  }

  return <Splash />;
}

/* ================================
   MAIN APP ROUTER
================================ */
function App() {
  useEffect(() => {
    // Start 15-minute idle inactivity auto-logout watcher
    const cleanup = initInactivityWatcher();
    return cleanup;
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* FRONT / SPLASH ROUTE (Seen before Sign in) */}
        <Route path="/" element={<RootRoute />} />
        <Route path="/welcome" element={<Splash />} />

        {/* AUTH ROUTES */}
        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <Register />
            </GuestRoute>
          }
        />

        {/* PROTECTED MOBILE ROUTES */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/detection"
          element={
            <ProtectedRoute>
              <UploadXRay />
            </ProtectedRoute>
          }
        />
        <Route
          path="/results"
          element={
            <ProtectedRoute>
              <Results />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* 404 CATCH-ALL */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
