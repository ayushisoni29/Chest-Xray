import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Dashboard from "./Pages/Dashboard";
import UploadXRay from "./Pages/UploadXRay";
import Results from "./Pages/Results";
import History from "./Pages/History";
import About from "./Pages/About";
import Login from "./Pages/Login";
import Register from "./Pages/Register";
import Profile from "./Pages/Profile";
import NotFound from "./Pages/NotFound";

import "./App.css";

/* ================================
   PROTECTED ROUTE
   Checks both JWT token AND cached user
================================ */

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("medscan_token");
  const user  = localStorage.getItem("medscanCurrentUser");

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/* ================================
   GUEST ROUTE
   Redirect logged-in users away from auth pages
================================ */

function GuestRoute({ children }) {
  const token = localStorage.getItem("medscan_token");
  const user  = localStorage.getItem("medscanCurrentUser");

  if (token && user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/* ================================
   APP
================================ */

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* AUTH ROUTES — redirect away if already logged in */}
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

        {/* PROTECTED ROUTES */}
        <Route
          path="/"
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
          path="/about"
          element={
            <ProtectedRoute>
              <About />
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

        {/* 404 */}
        <Route path="/404" element={<NotFound />} />
        <Route path="*"    element={<NotFound />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
