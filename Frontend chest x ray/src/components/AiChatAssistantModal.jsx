import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Send,
  X,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  User,
  Copy,
  Check,
  ChevronDown,
  Stethoscope,
  HeartPulse,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

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
  const messagesEndRef = useRef(null);

  const isHindi = lang === "hi";

  // Initial welcome message when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const disease = predictionContext?.predicted_class || "Normal";
      const confidence = predictionContext?.confidence
        ? Number(predictionContext.confidence).toFixed(1)
        : "98.15";
      const patientName = predictionContext?.patient_name || (isHindi ? "मरीज" : "Patient");

      let welcomeText = "";
      if (isHindi) {
        welcomeText = `नमस्ते ${patientName}! 👋\nमैं आपका **एआई मेडिकल हेल्थ असिस्टेंट** हूँ। 🩺\n\nआपकी हालिया चेस्ट एक्स-रे स्कैन रिपोर्ट के अनुसार **${t(disease)}** (विश्वसनीयता: **${confidence}%**) की पहचान हुई है।\n\nआप मुझसे रिपोर्ट का सरल अर्थ, सावधानियां, ग्रैड-कैम हीटमैप या आहार से जुड़े कोई भी सवाल पूछ सकते हैं!`;
      } else {
        welcomeText = `Hello ${patientName}! 👋\nI am your **AI Clinical Health Assistant** 🩺.\n\nYour chest X-ray screening detected **${t(disease)}** with **${confidence}%** confidence.\n\nFeel free to ask me about your diagnosis, recommended precautions, what the Grad-CAM heatmap means, or next clinical steps!`;
      }

      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: welcomeText,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  }, [isOpen, predictionContext, isHindi]);

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  if (!isOpen) return null;

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
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("http://127.0.0.1:8000/api/chat/assistant", {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: text,
          prediction_context: predictionContext,
          language: lang,
          chat_history: messages.slice(-6).map((m) => ({
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
      const disease = predictionContext?.predicted_class || "Normal";
      const confidence = predictionContext?.confidence
        ? Number(predictionContext.confidence).toFixed(1)
        : "98.15";
      const patientName = predictionContext?.patient_name || (isHindi ? "मरीज" : "Patient");

      const welcomeText = isHindi
        ? `बातचीत रीसेट कर दी गई है। नमस्ते ${patientName}! आप **${t(disease)}** स्कैन (सटीकता: **${confidence}%**) के विषय में कोई भी प्रश्न पूछ सकते हैं।`
        : `Chat history cleared. Hello ${patientName}! You can ask any question regarding your **${t(disease)}** scan (confidence: **${confidence}%**).`;

      setMessages([
        {
          id: "welcome-reset",
          role: "assistant",
          content: welcomeText,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 100);
  };

  // Helper to render basic markdown text with badges & bullets
  const renderFormattedContent = (content) => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }

      // Format bold text **bold**
      const formatBold = (str) => {
        const parts = str.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, pIdx) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={pIdx} className="font-semibold text-emerald-950">
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
          <div key={idx} className="flex items-start gap-2 text-xs md:text-sm text-slate-700 my-1 pl-1">
            <span className="text-emerald-600 mt-1 flex-shrink-0">•</span>
            <div>{formatBold(clean)}</div>
          </div>
        );
      }

      // Numbered lists
      const numMatch = line.trim().match(/^(\d+)\.\s*(.*)$/);
      if (numMatch) {
        return (
          <div key={idx} className="flex items-start gap-2 text-xs md:text-sm text-slate-700 my-1 pl-1">
            <span className="font-semibold text-emerald-700 min-w-[1.2rem] text-right">{numMatch[1]}.</span>
            <div>{formatBold(numMatch[2])}</div>
          </div>
        );
      }

      // Emergency alert lines
      if (line.includes("🚨") || line.includes("Alert:") || line.includes("चेतावनी:")) {
        return (
          <div
            key={idx}
            className="my-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs md:text-sm text-red-800 flex items-start gap-2 shadow-sm font-medium"
          >
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>{formatBold(line)}</div>
          </div>
        );
      }

      // Tip / Info
      if (line.includes("💡") || line.includes("🔬") || line.includes("📊")) {
        return (
          <div
            key={idx}
            className="my-2 p-2 rounded-xl bg-emerald-50/80 border border-emerald-100 text-xs md:text-sm text-emerald-900 flex items-start gap-2 font-medium"
          >
            <div>{formatBold(line)}</div>
          </div>
        );
      }

      // Normal paragraph
      return (
        <p key={idx} className="text-xs md:text-sm text-slate-700 leading-relaxed my-1">
          {formatBold(line)}
        </p>
      );
    });
  };

  const quickQuestions = [
    { label: t("chatbot_quick_explain"), query: isHindi ? "मेरी रिपोर्ट का मतलब विस्तार से समझाइए" : "Explain my scan findings in simple terms" },
    { label: t("chatbot_quick_precautions"), query: isHindi ? "मुझे क्या-क्या सावधानियां और उपाय करने चाहिए?" : "What medical precautions and next steps should I follow?" },
    { label: t("chatbot_quick_heatmap"), query: isHindi ? "ग्रैड-कैम हीटमैप में लाल और पीले रंग का क्या मतलब है?" : "What do the red and warm zones mean on the Grad-CAM heatmap?" },
    { label: t("chatbot_quick_emergency"), query: isHindi ? "क्या मुझे तुरंत अस्पताल या इमरजेंसी में जाना चाहिए?" : "When does this condition require immediate emergency care?" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col h-[85vh] sm:h-[650px] overflow-hidden animate-in slide-in-from-bottom duration-200">
        
        {/* Header */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between shadow-md flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-inner">
              <Bot className="w-5 h-5 text-white animate-pulse" />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-emerald-800 rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm tracking-wide text-white flex items-center gap-1">
                  {t("chatbot_title")}
                </h3>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-full bg-white/20 text-emerald-100 border border-white/20">
                  AI Dr.
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-200" />
                {t("chatbot_subtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleResetChat}
              title={t("chatbot_clear")}
              className="p-2 rounded-xl text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Prediction Context Banner */}
        {predictionContext && (
          <div className="px-4 py-2 bg-emerald-50/90 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-900 flex-shrink-0">
            <div className="flex items-center gap-1.5 font-medium truncate">
              <HeartPulse className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span className="truncate">
                {t("primary_classification")}: <strong>{t(predictionContext.predicted_class || "Normal")}</strong>
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-200/80 font-bold text-[10px] text-emerald-900 flex-shrink-0 ml-2">
              {predictionContext.confidence ? Number(predictionContext.confidence).toFixed(1) : "98.15"}%
            </span>
          </div>
        )}

        {/* Chat Message List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50">
          {messages.map((msg, index) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id || index}
                className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                    <Stethoscope className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`group relative max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm transition-all ${
                    isUser
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-none"
                      : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-none"
                  }`}
                >
                  <div className="relative">
                    {isUser ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    ) : (
                      renderFormattedContent(msg.content)
                    )}
                  </div>

                  <div
                    className={`mt-1.5 flex items-center justify-between gap-3 text-[10px] ${
                      isUser ? "text-emerald-100" : "text-slate-400"
                    }`}
                  >
                    <span>{msg.timestamp}</span>

                    {!isUser && (
                      <button
                        onClick={() => handleCopy(index, msg.content)}
                        className="opacity-70 hover:opacity-100 transition-opacity p-0.5 flex items-center gap-1 text-[10px]"
                        title="Copy response"
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex gap-2.5 items-center">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <Bot className="w-3.5 h-3.5 animate-spin" />
              </div>
              <div className="bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="text-xs text-slate-500 ml-1.5 font-medium">{t("chatbot_typing")}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-2 bg-white/90 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider pl-1 flex-shrink-0">
            {isHindi ? "सुझाव:" : "Quick:"}
          </span>
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q.query)}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-[11px] text-emerald-800 font-medium whitespace-nowrap transition-all active:scale-95 disabled:opacity-50"
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t("chatbot_placeholder")}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-300 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md shadow-emerald-600/20 disabled:opacity-40 disabled:hover:bg-emerald-600 transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Disclaimer footer */}
          <p className="mt-1.5 text-[10px] text-center text-slate-400 leading-tight">
            {t("chatbot_disclaimer")}
          </p>
        </div>

      </div>
    </div>
  );
}
