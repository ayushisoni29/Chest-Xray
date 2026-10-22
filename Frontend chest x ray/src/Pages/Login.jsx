import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LogIn,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ScanLine,
  UserPlus,
  Loader2,
  ChevronRight,
  Activity,
  ArrowLeft,
  Settings,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { loginUser, getBaseUrl, setCustomBaseUrl } from "../api.js";

function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showServerModal, setShowServerModal] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(getBaseUrl());
  const [serverStatus, setServerStatus] = useState(null);
  const [testingServer, setTestingServer] = useState(false);

  const handleTestAndSaveServer = async () => {
    const cleanUrl = serverUrlInput.trim().replace(/\/+$/, "");
    setTestingServer(true);
    setServerStatus(null);
    try {
      const endpoint = cleanUrl ? `${cleanUrl}/health` : "/health";
      const res = await fetch(endpoint, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCustomBaseUrl(cleanUrl);
      setServerStatus({
        success: true,
        message: `Connected! Model status: ${data.model_loaded ? "Loaded" : "Ready"}`
      });
    } catch (err) {
      setServerStatus({
        success: false,
        message: `Connection failed: ${err.message}`
      });
    } finally {
      setTestingServer(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();
    if (!email || !form.password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await loginUser({ email, password: form.password });
      navigate("/");
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)',
      color: '#fff',
      fontFamily: '"Inter", sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Orbs */}
      <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(56,189,248,0.15) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(40px)' }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(129,140,248,0.15) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(50px)' }}></div>

      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '480px',
        padding: '40px',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        
        {step === 1 ? (
          <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(56,189,248,0.4)' }}>
                <Activity size={32} color="#fff" />
              </div>
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '12px', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Chest X-ray AI
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: '1.6', marginBottom: '36px' }}>
              Advanced multi-disease screening and personalized medical imaging workspace powered by state-of-the-art AI.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '36px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <ScanLine size={20} color="#38bdf8" />
                <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }}>Multi-disease X-ray screening</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <UserPlus size={20} color="#818cf8" />
                <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }}>Personalized analysis workspace</span>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              style={{
                width: '100%',
                padding: '16px',
                background: '#fff',
                color: '#0f172a',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'transform 0.2s',
                boxShadow: '0 4px 14px rgba(255,255,255,0.2)'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Continue to Sign In <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <button 
              onClick={() => setStep(1)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginBottom: '24px', fontSize: '13px', padding: 0 }}
            >
              <ArrowLeft size={14} /> Back
            </button>
            
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: '#fff' }}>Welcome Back</h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '32px' }}>Enter your credentials to access your workspace.</p>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', letterSpacing: '0.5px' }}>EMAIL ADDRESS</label>
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0 14px' }}>
                  <Mail size={16} color="#64748b" />
                  <input
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={form.email}
                    onChange={handleChange}
                    disabled={loading}
                    style={{ background: 'transparent', border: 'none', color: '#fff', padding: '14px 12px', width: '100%', outline: 'none', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', letterSpacing: '0.5px' }}>PASSWORD</label>
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0 14px' }}>
                  <Lock size={16} color="#64748b" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={handleChange}
                    disabled={loading}
                    style={{ background: 'transparent', border: 'none', color: '#fff', padding: '14px 12px', width: '100%', outline: 'none', fontSize: '14px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, display: 'flex' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && <div style={{ color: '#f87171', fontSize: '13px', background: 'rgba(248,113,113,0.1)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.2)' }}>{error}</div>}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '10px',
                  boxShadow: '0 4px 15px rgba(56,189,248,0.3)'
                }}
              >
                {loading ? (
                  <><Loader2 size={18} className="spin" /> Signing in...</>
                ) : (
                  <>Sign In <ArrowRight size={18} /></>
                )}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: '#94a3b8' }}>
              Don't have an account? <Link to="/register" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: '600' }}>Create account</Link>
            </div>

            {/* Server Settings for Mobile APK / Remote Cloud Demo */}
            <div style={{ textAlign: 'center', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={() => {
                  setServerUrlInput(getBaseUrl());
                  setServerStatus(null);
                  setShowServerModal(true);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 8px',
                  borderRadius: '6px'
                }}
              >
                <Settings size={14} /> Server: {getBaseUrl() ? getBaseUrl().replace(/^https?:\/\//, '') : "Local / Default"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Server Settings Modal */}
      {showServerModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '440px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <Settings size={20} color="#38bdf8" />
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700' }}>Backend Server Configuration</h3>
            </div>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px 0', lineHeight: '1.5' }}>
              Connect this app to your remote Codespace or live API. Leave blank for default local server.
            </p>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px', fontWeight: '600' }}>
                Server HTTPS URL
              </label>
              <input
                type="text"
                placeholder="https://your-codespace-8000.app.github.dev"
                value={serverUrlInput}
                onChange={(e) => setServerUrlInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            {serverStatus && (
              <div style={{
                marginBottom: '14px',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: serverStatus.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${serverStatus.success ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                color: serverStatus.success ? '#4ade80' : '#f87171'
              }}>
                {serverStatus.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{serverStatus.message}</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setServerUrlInput("");
                  setCustomBaseUrl("");
                  setShowServerModal(false);
                }}
                style={{
                  padding: '10px 14px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#cbd5e1',
                  borderRadius: '8px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Reset Default
              </button>
              <button
                type="button"
                onClick={handleTestAndSaveServer}
                disabled={testingServer}
                style={{
                  padding: '10px 18px',
                  background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: testingServer ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {testingServer ? <Loader2 size={14} className="spin" /> : null}
                {testingServer ? "Testing..." : "Test & Save"}
              </button>
              <button
                type="button"
                onClick={() => setShowServerModal(false)}
                style={{
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '8px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Basic keyframes for smooth fade in */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default Login;