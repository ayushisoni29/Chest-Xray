import React, { createContext, useContext, useState, useEffect } from "react";

const LanguageContext = createContext();

export const translations = {
  en: {
    // Header & Shell
    app_title: "MedScan AI",
    ai_online: "AI Online",
    nav_home: "Home",
    nav_scan: "Scan",
    nav_history: "History",
    nav_profile: "Profile",

    // Dashboard
    welcome_back: "Welcome back,",
    immediate_screening: "Immediate AI Screening",
    new_scan_cta: "New Chest X-Ray Scan",
    ensemble_subtitle: "Dual-Model Ensemble & Grad-CAM",
    total_scans: "Total Scans",
    last_result: "Last Result",
    accuracy: "Accuracy",
    engine_status: "AI Engine",
    engine_active: "Active",
    recent_analyses: "Recent Analyses",
    see_all: "See All",
    no_recent_scans: "No previous scans yet. Tap 'New Scan' above to analyze an X-ray.",
    confidence: "Confidence",

    // Upload X-Ray
    step1_title: "Step 1: Choose Scan",
    step2_title: "Step 2: Patient Info",
    step3_title: "Step 3: AI Inference",
    step_of: "of 3",
    upload_heading: "Take Photo or Select X-Ray",
    upload_hint: "Supports JPEG, PNG, WEBP (Max 15MB)",
    browse_files: "Browse Files",
    choose_different: "Choose Different Image",
    patient_name: "Patient Full Name *",
    patient_age: "Age *",
    patient_gender: "Gender *",
    patient_email: "Contact Email (Optional)",
    male: "Male",
    female: "Female",
    other: "Other",
    continue_patient: "Continue to Patient Info",
    start_analysis: "Start AI Analysis",
    analyzing_title: "Analyzing Chest X-Ray",
    back_btn: "Back",

    // Results
    disclaimer: "AI-assisted preliminary screening — not a definitive medical diagnosis.",
    primary_classification: "Primary Classification",
    multi_class_dist: "Multi-Class Confidence Distribution",
    tab_result: "Result",
    tab_gradcam: "Grad-CAM",
    tab_details: "Details",
    original_scan: "Original Scan",
    gradcam_heatmap: "Grad-CAM Heatmap",
    slider_instruction: "Drag slider to compare anatomy & attention heatmap",
    gradcam_explanation_title: "Grad-CAM Explanation:",
    gradcam_explanation_body: "Warmer red/yellow regions highlight visual features that most heavily influenced the neural ensemble's classification.",
    download_pdf_btn: "Download Official PDF Report",
    generating_pdf: "Generating Clinical PDF...",
    patient_label: "Patient",
    scan_timestamp: "Scan Timestamp",
    baseline_cutoff: "Clinical Baseline Cutoff",

    // Diseases
    Normal: "Normal (Clear)",
    COVID: "COVID-19",
    Pneumonia: "Pneumonia",
    Tuberculosis: "Tuberculosis (TB)",
    Lung_Opacity: "Lung Opacity",

    // History
    scan_history_title: "Scan History",
    records_in_db: "records in database",
    search_placeholder: "Search by diagnosis or filename...",
    all_filter: "All",
    no_scans_found: "No Scans Found",

    // Profile
    my_profile: "My Profile",
    active_user: "ACTIVE USER",
    about_medscan: "About MedScan AI",
    about_subtitle: "Model pipeline & explainability",
    backend_service: "Backend Service",
    developer_server: "Developer Server URL",
    sign_out: "Sign Out",

    // Chatbot Assistant
    chatbot_title: "AI Medical Assistant",
    chatbot_subtitle: "Instant clinical insights & report guidance",
    chatbot_btn: "Ask AI Assistant",
    chatbot_placeholder: "Ask anything about your chest X-ray...",
    chatbot_quick_explain: "Explain my result",
    chatbot_quick_precautions: "What precautions to take?",
    chatbot_quick_heatmap: "Explain the heatmap",
    chatbot_quick_emergency: "Is this an emergency?",
    chatbot_clear: "Clear Chat",
    chatbot_typing: "Dr. AI is analyzing...",
    chatbot_disclaimer: "Educational AI guidance. Consult a certified physician for medical decisions.",
  },

  hi: {
    // Header & Shell
    app_title: "मेडस्कैन एआई",
    ai_online: "एआई सक्रिय",
    nav_home: "होम",
    nav_scan: "स्कैन",
    nav_history: "इतिहास",
    nav_profile: "प्रोफाइल",

    // Dashboard
    welcome_back: "स्वागत है,",
    immediate_screening: "त्वरित एआई जांच",
    new_scan_cta: "नया चेस्ट एक्स-रे स्कैन",
    ensemble_subtitle: "ड्यूल-मॉडल व ग्रैड-कैम तकनीक",
    total_scans: "कुल स्कैन",
    last_result: "अंतिम परिणाम",
    accuracy: "सटीकता",
    engine_status: "एआई स्थिति",
    engine_active: "सक्रिय (Active)",
    recent_analyses: "हालिया जांचें",
    see_all: "सभी देखें",
    no_recent_scans: "अभी कोई पुराना स्कैन नहीं है। जांच के लिए ऊपर 'नया स्कैन' दबाएं।",
    confidence: "विश्वास स्तर",

    // Upload X-Ray
    step1_title: "चरण 1: स्कैन चुनें",
    step2_title: "चरण 2: मरीज़ विवरण",
    step3_title: "चरण 3: एआई जांच",
    step_of: "में से 3",
    upload_heading: "फोटो लें या एक्स-रे चुनें",
    upload_hint: "JPEG, PNG, WEBP समर्थित (अधिकतम 15MB)",
    browse_files: "फ़ाइल चुनें",
    choose_different: "दूसरी तस्वीर चुनें",
    patient_name: "मरीज़ का पूरा नाम *",
    patient_age: "उम्र *",
    patient_gender: "लिंग *",
    patient_email: "ईमेल पता (वैकल्पिक)",
    male: "पुरुष",
    female: "महिला",
    other: "अन्य",
    continue_patient: "मरीज़ विवरण पर जाएं",
    start_analysis: "एआई जांच शुरू करें",
    analyzing_title: "चेस्ट एक्स-रे का विश्लेषण जारी है",
    back_btn: "पीछे जाएं",

    // Results
    disclaimer: "एआई-सहायक प्राथमिक स्क्रीनिंग — यह अंतिम चिकित्सीय निदान नहीं है।",
    primary_classification: "प्राथमिक परिणाम",
    multi_class_dist: "बहु-वर्गीय विश्वास वितरण",
    tab_result: "परिणाम",
    tab_gradcam: "ग्रैड-कैम",
    tab_details: "विवरण",
    original_scan: "मूल एक्स-रे",
    gradcam_heatmap: "ग्रैड-कैम हीटमैप",
    slider_instruction: "एक्स-रे और हीटमैप की तुलना करने के लिए स्लाइडर खिसकाएं",
    gradcam_explanation_title: "ग्रैड-कैम विवरण:",
    gradcam_explanation_body: "लाल और पीले हिस्से उन क्षेत्रों को दर्शाते हैं जिन पर एआई मॉडल ने सबसे अधिक ध्यान केंद्रित किया।",
    download_pdf_btn: "आधिकारिक पीडीएफ रिपोर्ट डाउनलोड करें",
    generating_pdf: "पीडीएफ रिपोर्ट तैयार हो रही है...",
    patient_label: "मरीज़",
    scan_timestamp: "जांच का समय",
    baseline_cutoff: "मानक कटऑफ स्तर",

    // Diseases
    Normal: "सामान्य / स्वस्थ (Normal)",
    COVID: "कोविड-19 (COVID-19)",
    Pneumonia: "निमोनिया (Pneumonia)",
    Tuberculosis: "टीबी / ट्यूबरकुलोसिस (TB)",
    Lung_Opacity: "फेफड़ों में ओपेसिटी (Lung Opacity)",

    // History
    scan_history_title: "स्कैन का इतिहास",
    records_in_db: "रिकॉर्ड सुरक्षित हैं",
    search_placeholder: "बीमारी या फ़ाइल नाम से खोजें...",
    all_filter: "सभी",
    no_scans_found: "कोई स्कैन नहीं मिला",

    // Profile
    my_profile: "मेरी प्रोफाइल",
    active_user: "सक्रिय उपयोगकर्ता",
    about_medscan: "मेडस्कैन एआई के बारे में",
    about_subtitle: "मॉडल प्रक्रिया एवं कार्यप्रणाली",
    backend_service: "बैकएंड सेवा",
    developer_server: "डेवलपर सर्वर पता",
    sign_out: "लॉग आउट करें",

    // Chatbot Assistant
    chatbot_title: "एआई मेडिकल सहायक",
    chatbot_subtitle: "त्वरित स्वास्थ्य परामर्श एवं रिपोर्ट विश्लेषण",
    chatbot_btn: "एआई सहायक से पूछें",
    chatbot_placeholder: "अपनी रिपोर्ट या स्वास्थ्य से संबंधित प्रश्न पूछें...",
    chatbot_quick_explain: "रिपोर्ट का मतलब समझाएं",
    chatbot_quick_precautions: "क्या सावधानियां बरतें?",
    chatbot_quick_heatmap: "हीटमैप का क्या अर्थ है?",
    chatbot_quick_emergency: "क्या यह कोई आपात स्थिति है?",
    chatbot_clear: "बातचीत साफ करें",
    chatbot_typing: "डॉ. एआई विश्लेषण कर रहे हैं...",
    chatbot_disclaimer: "यह एआई सलाह केवल जानकारी के लिए है। कृपया प्रमाणित डॉक्टर से परामर्श लें।",
  },
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem("medscan_language") || "en";
  });

  const toggleLanguage = () => {
    const next = lang === "en" ? "hi" : "en";
    setLang(next);
    localStorage.setItem("medscan_language", next);
  };

  const t = (key) => {
    return translations[lang]?.[key] || translations["en"]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      lang: "en",
      setLang: () => {},
      toggleLanguage: () => {},
      t: (key) => key,
    };
  }
  return context;
}
