import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Send,
  X,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  Stethoscope,
  ChevronLeft,
  Activity,
  HeartPulse,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { getBaseUrl, getToken } from "../api";

export default function AiChatAssistantModal({
  isOpen,
  onClose,
  predictionContext = null,
}) {
  const { lang, t } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const chatBodyRef = useRef(null);
  const inputRef = useRef(null);

  const isHindi = lang === "hi";

  const disease = predictionContext?.predicted_class || "Normal";
  const confidence = predictionContext?.confidence
    ? Number(predictionContext.confidence).toFixed(1)
    : null;
  const patientName = predictionContext?.patient_name || (isHindi ? "मरीज़" : "Patient");

  // Initial Swiggy/Zomato style conversational welcome when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const initialGreeting = {
        id: "greeting",
        role: "assistant",
        type: "welcome_card",
        patientName,
        disease: t(disease) || disease.replace("_", " "),
        confidence,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages([initialGreeting]);
    }
  }, [isOpen, predictionContext, isHindi, disease, confidence, patientName, t]);

  // Smooth internal scroll that stays 100% strictly inside the chat container
  useEffect(() => {
    if (isOpen && chatBodyRef.current) {
      setTimeout(() => {
        if (chatBodyRef.current) {
          chatBodyRef.current.scrollTo({
            top: chatBodyRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 50);
    }
  }, [messages.length, isLoading, isOpen]);

  if (!isOpen) return null;

  const quickOptions = [
    {
      id: "explain",
      icon: "📋",
      label: isHindi ? "मेरी रिपोर्ट का मतलब समझाएं" : "Explain my scan findings",
      query: isHindi ? "मेरी चेस्ट एक्स-रे रिपोर्ट का सरल भाषा में मतलब विस्तार से समझाइए।" : "Please explain my chest X-ray findings in simple, easy-to-understand terms.",
    },
    {
      id: "precautions",
      icon: "🩺",
      label: isHindi ? "क्या सावधानियां और उपाय बरतें?" : "What precautions should I take?",
      query: isHindi ? "मुझे इस स्थिति में क्या-क्या सावधानियां, दवा और अगले कदम उठाने चाहिए?" : "What medical precautions, dietary habits, and next steps should I follow?",
    },
    {
      id: "heatmap",
      icon: "🔬",
      label: isHindi ? "हीटमैप का क्या अर्थ है?" : "Explain the Grad-CAM heatmap",
      query: isHindi ? "ग्रैड-कैम हीटमैप (Grad-CAM) में लाल और पीले रंग के निशानों का क्या मतलब है?" : "What do the red, yellow, and warm zones mean on my Grad-CAM heatmap overlay?",
    },
    {
      id: "emergency",
      icon: "🚨",
      label: isHindi ? "क्या यह कोई आपात स्थिति है?" : "Is this an emergency?",
      query: isHindi ? "क्या मुझे तुरंत अस्पताल या इमरजेंसी में जाना चाहिए? इसके खतरे के संकेत क्या हैं?" : "When does this condition require immediate emergency hospital care?",
    },
  ];

  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue("");
    setIsLoading(true);

    try {
      const token = getToken() || localStorage.getItem("token") || localStorage.getItem("medscan_token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const baseUrl = getBaseUrl();
      const endpoint = baseUrl ? `${baseUrl}/api/chat/assistant` : "http://127.0.0.1:8000/api/chat/assistant";
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: text,
          prediction_context: predictionContext,
          language: lang,
          chat_history: messages
            .filter((m) => m.content)
            .slice(-6)
            .map((m) => ({
              role: m.role,
              content: m.content,
            })),
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const botMsg = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply,
        source: data.source,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("Chatbot inquiry error:", err);
      const fallbackText = isHindi
        ? "माफ़ कीजिए, सर्वर से संपर्क नहीं हो सका। कृपया पुनः प्रयास करें अथवा अपनी इंटरनेट कनेक्टिविटी जांचें।"
        : "Sorry, I am temporarily having trouble communicating with the clinical service. Please retry in a moment.";

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: fallbackText,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (index, content) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleResetChat = () => {
    setMessages([]);
    setTimeout(() => {
      const initialGreeting = {
        id: "greeting-reset",
        role: "assistant",
        type: "welcome_card",
        patientName,
        disease: t(disease) || disease.replace("_", " "),
        confidence,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages([initialGreeting]);
    }, 50);
  };

  // Helper to render markdown text with bolding and clean structure
  const renderFormattedContent = (content) => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      if (!line.trim()) {
        return <div key={idx} style={{ height: "6px" }} />;
      }

      const formatBold = (str) => {
        const parts = str.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, pIdx) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={pIdx} style={{ fontWeight: "700", color: "#064e3b" }}>
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });
      };

      // Bullet points
      if (line.trim().startsWith("•") || line.trim().startsWith("-")) {
        const clean = line.trim().replace(/^[•\-]\s*/, "");
        return (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "6px",
              margin: "4px 0",
              fontSize: "12.5px",
              lineHeight: "1.5",
              color: "#1e293b",
            }}
          >
            <span style={{ color: "#059669", fontWeight: "800", flexShrink: 0 }}>•</span>
            <div>{formatBold(clean)}</div>
          </div>
        );
      }

      // Numbered lists
      const numMatch = line.trim().match(/^(\d+)\.\s*(.*)$/);
      if (numMatch) {
        return (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "6px",
              margin: "4px 0",
              fontSize: "12.5px",
              lineHeight: "1.5",
              color: "#1e293b",
            }}
          >
            <span style={{ fontWeight: "700", color: "#047857", minWidth: "16px" }}>{numMatch[1]}.</span>
            <div>{formatBold(numMatch[2])}</div>
          </div>
        );
      }

      // Emergency alert
      if (line.includes("🚨") || line.includes("Alert:") || line.includes("चेतावनी:")) {
        return (
          <div
            key={idx}
            style={{
              margin: "8px 0",
              padding: "8px 10px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "10px",
              fontSize: "12px",
              color: "#991b1b",
              fontWeight: "600",
              lineHeight: "1.4",
              display: "flex",
              alignItems: "flex-start",
              gap: "6px",
            }}
          >
            <AlertCircle size={15} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>{formatBold(line)}</div>
          </div>
        );
      }

      // Regular paragraph
      return (
        <p
          key={idx}
          style={{
            margin: "4px 0",
            fontSize: "12.5px",
            lineHeight: "1.5",
            color: "#1e293b",
          }}
        >
          {formatBold(line)}
        </p>
      );
    });
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 100,
        background: "#f8faf9",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        animation: "chatSlideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <style>{`
        @keyframes chatSlideUp {
          from { transform: translateY(100%); opacity: 0.7; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* 1. TOP HEADER (Zomato/Swiggy Style with Back button & Doctor Avatar) */}
      <div
        style={{
          height: "56px",
          background: "linear-gradient(135deg, #065f46 0%, #047857 100%)",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          boxShadow: "0 2px 8px rgba(6, 95, 70, 0.2)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Back/Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            <ChevronLeft size={20} />
          </button>

          {/* Dr. AI Avatar & Status */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
              }}
            >
              <Stethoscope size={18} color="#065f46" />
            </div>
            <span
              style={{
                position: "absolute",
                bottom: "-1px",
                right: "-1px",
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#10b981",
                border: "2px solid #ffffff",
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>Dr. AI</span>
              <span
                style={{
                  fontSize: "9px",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  background: "rgba(255, 255, 255, 0.2)",
                  fontWeight: "600",
                }}
              >
                Qwen 2.5
              </span>
            </div>
            <div style={{ fontSize: "10.5px", color: "#a7f3d0", fontWeight: "500" }}>
              {isHindi ? "त्वरित नैदानिक परामर्श" : "Instant Clinical Guidance"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button
            type="button"
            onClick={handleResetChat}
            title={t("chatbot_clear")}
            style={{
              background: "transparent",
              border: "none",
              color: "#d1fae5",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <RefreshCw size={16} />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "#d1fae5",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 2. CHAT MESSAGES BODY (Isolated clean scroll) */}
      <div
        ref={chatBodyRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {messages.map((msg, index) => {
          // A. SPECIAL WELCOME / ORDER-STYLE DETAILS CARD (Swiggy/Zomato style)
          if (msg.type === "welcome_card") {
            return (
              <div key={msg.id} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {/* Greeting Speech Bubble */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "#065f46",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Bot size={16} />
                  </div>

                  <div
                    style={{
                      background: "#ffffff",
                      borderRadius: "14px 14px 14px 2px",
                      padding: "12px 14px",
                      border: "1.5px solid #e2ede6",
                      boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
                      maxWidth: "88%",
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#065f46", marginBottom: "4px" }}>
                      {isHindi ? `नमस्ते ${msg.patientName}! 👋` : `Hello ${msg.patientName}! 👋`}
                    </div>
                    <div style={{ fontSize: "12.5px", color: "#334155", lineHeight: "1.4" }}>
                      {isHindi
                        ? "मैंने आपकी हालिया चेस्ट एक्स-रे स्कैन रिपोर्ट की समीक्षा कर ली है। आपके स्कैन का विवरण नीचे दिया गया है:"
                        : "I have reviewed your latest chest X-ray screening. Here are your record details:"}
                    </div>

                    {/* Report Summary Card (Like Swiggy Order Summary) */}
                    <div
                      style={{
                        marginTop: "10px",
                        background: "#f0fdf4",
                        border: "1.5px solid #bbf7d0",
                        borderRadius: "10px",
                        padding: "10px 12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: "#526e62", fontWeight: "600" }}>
                          {isHindi ? "पहचाना गया रोग" : "Predicted Finding"}
                        </span>
                        <span
                          style={{
                            fontSize: "11.5px",
                            fontWeight: "800",
                            color: "#065f46",
                            background: "#dcfce7",
                            padding: "2px 8px",
                            borderRadius: "12px",
                          }}
                        >
                          {msg.disease}
                        </span>
                      </div>

                      {msg.confidence && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "11px", color: "#526e62", fontWeight: "600" }}>
                            {isHindi ? "विश्वास स्तर (Confidence)" : "Confidence"}
                          </span>
                          <strong style={{ fontSize: "11.5px", color: "#047857" }}>
                            {msg.confidence}%
                          </strong>
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: "#526e62", fontWeight: "600" }}>
                          {isHindi ? "मरीज़ का नाम" : "Patient Name"}
                        </span>
                        <span style={{ fontSize: "11px", color: "#081d15", fontWeight: "700" }}>
                          {msg.patientName}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: "12px", color: "#475569", marginTop: "10px", fontWeight: "500" }}>
                      {isHindi
                        ? "आप मुझसे इस रिपोर्ट के बारे में क्या जानना चाहते हैं? नीचे दिए गए विकल्पों में से चुनें:"
                        : "How can I assist you with this report? Choose an option below or type your question:"}
                    </div>
                  </div>
                </div>

                {/* Quick Option Pills (Directly Clickable like Swiggy Support) */}
                <div style={{ paddingLeft: "36px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {quickOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSendMessage(opt.query)}
                      disabled={isLoading}
                      style={{
                        textAlign: "left",
                        padding: "8px 12px",
                        background: "#ffffff",
                        border: "1.5px solid #a7f3d0",
                        borderRadius: "12px",
                        color: "#065f46",
                        fontSize: "12px",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: isLoading ? "not-allowed" : "pointer",
                        boxShadow: "0 1px 3px rgba(6, 95, 70, 0.05)",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span style={{ fontSize: "14px" }}>{opt.icon}</span>
                      <span style={{ flex: 1 }}>{opt.label}</span>
                      <span style={{ color: "#10b981", fontSize: "14px" }}>→</span>
                    </button>
                  ))}

                  {/* Ask another question button */}
                  <button
                    type="button"
                    onClick={() => inputRef.current?.focus()}
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      background: "#f1f5f9",
                      border: "1.5px dashed #cbd5e1",
                      borderRadius: "12px",
                      color: "#475569",
                      fontSize: "12px",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                    }}
                  >
                    <span>✍️</span>
                    <span>{isHindi ? "कोई अन्य प्रश्न पूछें..." : "Ask another custom question..."}</span>
                  </button>
                </div>
              </div>
            );
          }

          // B. REGULAR USER / ASSISTANT MESSAGES
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id || index}
              style={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
                gap: "8px",
              }}
            >
              {!isUser && (
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "#065f46",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "2px",
                  }}
                >
                  <Bot size={15} />
                </div>
              )}

              <div
                style={{
                  maxWidth: "84%",
                  borderRadius: isUser ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                  padding: "10px 12px",
                  background: isUser ? "linear-gradient(135deg, #059669 0%, #064e3b 100%)" : "#ffffff",
                  color: isUser ? "#ffffff" : "#081d15",
                  border: isUser ? "none" : "1.5px solid #e2ede6",
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
                  fontSize: "12.5px",
                }}
              >
                <div>
                  {isUser ? (
                    <p style={{ margin: 0, lineHeight: "1.45", wordBreak: "break-word" }}>
                      {msg.content}
                    </p>
                  ) : (
                    renderFormattedContent(msg.content)
                  )}
                </div>

                <div
                  style={{
                    marginTop: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "9.5px",
                    color: isUser ? "rgba(255, 255, 255, 0.75)" : "#94a3b8",
                  }}
                >
                  <span>{msg.timestamp}</span>

                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => handleCopy(index, msg.content)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: copiedIndex === index ? "#059669" : "#64748b",
                        fontSize: "9.5px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "3px",
                        padding: "2px 4px",
                      }}
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check size={11} color="#059669" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Follow-up Quick Pills after bot response */}
                {!isUser && index === messages.length - 1 && (
                  <div
                    style={{
                      marginTop: "10px",
                      paddingTop: "8px",
                      borderTop: "1px dashed #e2ede6",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "5px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSendMessage(quickOptions[1].query)}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "12px",
                        background: "#ecfdf5",
                        border: "1px solid #a7f3d0",
                        color: "#065f46",
                        fontSize: "10.5px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      🩺 {isHindi ? "सावधानियां" : "Precautions"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendMessage(quickOptions[2].query)}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "12px",
                        background: "#ecfdf5",
                        border: "1px solid #a7f3d0",
                        color: "#065f46",
                        fontSize: "10.5px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      🔬 {isHindi ? "हीटमैप" : "Heatmap"}
                    </button>
                    <button
                      type="button"
                      onClick={() => inputRef.current?.focus()}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "12px",
                        background: "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        color: "#475569",
                        fontSize: "10.5px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      ✍️ {isHindi ? "अन्य प्रश्न..." : "Ask another..."}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "#065f46",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Bot size={15} />
            </div>
            <div
              style={{
                background: "#ffffff",
                border: "1.5px solid #e2ede6",
                borderRadius: "14px",
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#059669",
                  animation: "bounce 1s infinite",
                }}
              />
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#059669",
                  animation: "bounce 1s infinite 0.2s",
                }}
              />
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#059669",
                  animation: "bounce 1s infinite 0.4s",
                }}
              />
              <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "4px", fontWeight: "500" }}>
                {t("chatbot_typing")}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. BOTTOM INPUT BAR (Zomato/Swiggy Crisp Bar) */}
      <div
        style={{
          background: "#ffffff",
          borderTop: "1.5px solid #e2ede6",
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          flexShrink: 0,
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isHindi ? "अपना कोई भी स्वास्थ्य संबंधी प्रश्न पूछें..." : "Ask Dr. AI anything about your scan..."}
            disabled={isLoading}
            style={{
              flex: 1,
              height: "40px",
              padding: "0 14px",
              fontSize: "12.5px",
              borderRadius: "20px",
              border: "1.5px solid #cbd5e1",
              background: "#f8fafc",
              color: "#0f172a",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: inputValue.trim() && !isLoading ? "#059669" : "#cbd5e1",
              border: "none",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: inputValue.trim() && !isLoading ? "pointer" : "default",
              boxShadow: inputValue.trim() ? "0 2px 8px rgba(5, 150, 105, 0.35)" : "none",
              flexShrink: 0,
              transition: "all 0.15s ease",
            }}
          >
            <Send size={16} />
          </button>
        </form>

        <div style={{ fontSize: "9.5px", color: "#94a3b8", textAlign: "center", lineHeight: "1.2" }}>
          {t("chatbot_disclaimer")}
        </div>
      </div>
    </div>
  );
}
