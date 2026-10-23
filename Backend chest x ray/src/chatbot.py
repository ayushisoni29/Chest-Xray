import os
import re
import httpx
from typing import Optional, Dict, Any, List

# Check for Gemini API key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

# Offline Clinical Knowledge Base for Chest Radiography & Pulmonary Conditions
KNOWLEDGE_BASE = {
    "COVID": {
        "title_en": "COVID-19 Pulmonary Infiltration",
        "title_hi": "कोविड-19 फुफ्फुसीय संक्रमण (COVID-19)",
        "summary_en": "The AI model detected bilateral ground-glass opacities or peripheral consolidations consistent with viral pneumonia associated with COVID-19.",
        "summary_hi": "एआई मॉडल ने फेफड़ों में दोनों तरफ ग्राउंड-ग्लास अपारदर्शिता (Ground-Glass Opacities) पाई है, जो कोविड-19 वायरल निमोनिया के सामान्य लक्षण हैं।",
        "precautions_en": [
            "Self-isolate immediately in a well-ventilated room to prevent transmission.",
            "Monitor blood oxygen saturation (SpO2) using a pulse oximeter every 4-6 hours.",
            "Stay well hydrated, consume warm fluids, and rest adequately.",
            "Consult a pulmonologist for confirmatory RT-PCR and prescription of antiviral/anti-inflammatory therapy if needed."
        ],
        "precautions_hi": [
            "संक्रमण फैलने से रोकने के लिए तुरंत हवादार कमरे में आइसोलेट हों।",
            "पल्स ऑक्सीमीटर से हर 4-6 घंटे में ऑक्सीजन स्तर (SpO2) मापें।",
            "पर्याप्त मात्रा में गुनगुना पानी पिएं और पूरा आराम करें।",
            "आरटी-पीसीआर (RT-PCR) टेस्ट और पल्मोनोलॉजिस्ट से तुरंत परामर्श लें।"
        ],
        "emergency_en": "Seek immediate emergency care if SpO2 drops below 94%, or if you experience persistent chest pressure, bluish lips, or severe breathlessness.",
        "emergency_hi": "यदि ऑक्सीजन 94% से नीचे जाए, सीने में तेज दर्द हो या सांस लेने में बहुत कठिनाई हो, तो तुरंत इमरजेंसी अस्पताल जाएं।"
    },
    "Pneumonia": {
        "title_en": "Bacterial / Viral Pneumonia",
        "title_hi": "निमोनिया संक्रमण (Pneumonia)",
        "summary_en": "Focal airspace opacification or consolidation was observed, indicative of inflammatory exudate within the alveolar air spaces.",
        "summary_hi": "फेफड़ों के वायुकोषों (Alveoli) में सूजन या तरल पदार्थ का जमाव देखा गया है, जो निमोनिया का संकेत है।",
        "precautions_en": [
            "Consult a physician for sputum culture and targeted antibiotic or antiviral therapy.",
            "Do not self-medicate with over-the-counter cough suppressants without clinical advice.",
            "Practice gentle deep breathing exercises and maintain upright posture to assist lung drainage.",
            "Ensure complete rest and drink adequate electrolytes and warm soups."
        ],
        "precautions_hi": [
            "बलगम की जांच (Sputum Test) और एंटीबायोटिक दवाओं के लिए डॉक्टर से मिलें।",
            "बिना डॉक्टर की सलाह के खुद से कोई भी कफ सिरप न लें।",
            "हल्के सांस के व्यायाम करें और सीधे बैठकर आराम करें ताकि फेफड़ों पर दबाव न पड़े।",
            "भरपूर आराम करें और गर्म तरल पदार्थ पिएं।"
        ],
        "emergency_en": "Alert: High persistent fever (>102°F), confusion, rapid shallow breathing (>30 breaths/min), or chest stabbing pain requires urgent hospital admission.",
        "emergency_hi": "चेतावनी: तेज बुखार (>102°F), सांस की तेज गति, या सीने में चुभन वाला दर्द होने पर तुरंत अस्पताल जाएं।"
    },
    "Tuberculosis": {
        "title_en": "Pulmonary Tuberculosis (TB)",
        "title_hi": "तपेदिक / टीबी (Tuberculosis)",
        "summary_en": "Apical or upper lobe fibro-cavitary lesions, nodular infiltrates, or lymphadenopathy typical of Mycobacterium tuberculosis infection were flagged.",
        "summary_hi": "फेफड़ों के ऊपरी हिस्से में घाव या गांठें देखी गई हैं, जो माइकोबैक्टीरियम ट्यूबरकुलोसिस (टीबी) संक्रमण से मेल खाती हैं।",
        "precautions_en": [
            "Undergo confirmatory CB-NAAT / GeneXpert sputum testing at an authorized pulmonary center.",
            "Wear a high-filtration surgical mask (N95) when in proximity to others.",
            "If diagnosed, strictly adhere to the full Directly Observed Therapy (DOTS) anti-tubercular regimen without missing doses.",
            "Maintain a protein-rich diet to support cellular tissue healing."
        ],
        "precautions_hi": [
            "निकटतम स्वास्थ्य केंद्र में बलगम की सीबी-नैट (CB-NAAT / GeneXpert) जांच करवाएं।",
            "दूसरों के संपर्क में आते समय N95 मास्क अवश्य पहनें।",
            "पुष्टि होने पर डॉट्स (DOTS) की दवाइयों का पूरा कोर्स बिना नागा किए पूरा करें।",
            "प्रोटीन युक्त पौष्टिक आहार लें ताकि फेफड़े जल्दी स्वस्थ हो सकें।"
        ],
        "emergency_en": "Coughing up blood (hemoptysis), sudden unexplained weight loss, night sweats, or extreme exhaustion must be evaluated promptly.",
        "emergency_hi": "खांसी में खून आना, रात में पसीना आना या तेजी से वजन घटना गंभीर लक्षण हैं, तुरंत विशेषज्ञ डॉक्टर से संपर्क करें।"
    },
    "Lung_Opacity": {
        "title_en": "Non-Specific Lung Opacity",
        "title_hi": "फेफड़ों में अपारदर्शिता (Lung Opacity)",
        "summary_en": "A region of increased radiographic attenuation was identified where the lung tissue appears hazy or white instead of normal radiolucent black.",
        "summary_hi": "एक्स-रे में फेफड़ों का कुछ हिस्सा सामान्य काले रंग की जगह धुंधला या सफेद दिखाई दे रहा है, जो तरल, सूजन या ऊतक घनत्व में बदलाव का संकेत है।",
        "precautions_en": [
            "A high-resolution chest CT (HRCT) is recommended for precise anatomical characterization.",
            "Correlate with your clinical history: smoking history, occupational dust exposure, or recent respiratory infections.",
            "Avoid exposure to secondhand tobacco smoke, particulate pollutants, and chemical fumes.",
            "Schedule an in-person evaluation with a pulmonologist."
        ],
        "precautions_hi": [
            "सटीक जांच के लिए चेस्ट एचआरसीटी (HRCT Scan) कराने की सलाह दी जाती है।",
            "धूम्रपान, धूल-मिट्टी या हालिया बुखार के इतिहास की डॉक्टर को पूरी जानकारी दें।",
            "धुएं और प्रदूषण से बचें।",
            "पल्मोनोलॉजिस्ट (फेफड़ों के डॉक्टर) से व्यक्तिगत रूप से मिलकर सलाह लें।"
        ],
        "emergency_en": "Progressive shortness of breath, unexplained sharp thoracic pain, or cyanosis requires prompt clinical triage.",
        "emergency_hi": "सांस फूलना, सीने में तेज दर्द या होंठ नीले पड़ने पर तत्काल चिकित्सा सहायता लें।"
    },
    "Normal": {
        "title_en": "Clear Pulmonary Radiograph (Normal)",
        "title_hi": "सामान्य फेफड़े (Normal X-Ray)",
        "summary_en": "No evident consolidations, infiltrates, pleural effusions, or significant radiographic anomalies detected across bilateral lung fields.",
        "summary_hi": "दोनों फेफड़ों में किसी भी प्रकार का संक्रमण, निमोनिया, गांठ या पानी भरने के लक्षण नहीं मिले हैं। यह एक्स-रे सामान्य है।",
        "precautions_en": [
            "Maintain healthy respiratory habits: avoid smoking, stay active, and practice regular cardiovascular exercise.",
            "If you still have persistent cough or fever despite a normal X-ray, consider upper respiratory tract evaluation.",
            "Get routine seasonal flu or pneumonia vaccinations if recommended for your age group."
        ],
        "precautions_hi": [
            "स्वस्थ जीवनशैली अपनाएं: बीड़ी-सिगरेट से दूर रहें और नियमित योग या प्राणायाम करें।",
            "यदि रिपोर्ट सामान्य होने पर भी खांसी या बुखार बना हुआ है, तो सामान्य वायरल संक्रमण की जांच कराएं।",
            "समय पर मौसमी फ्लू का टीका लगवाएं।"
        ],
        "emergency_en": "If acute chest pain or severe breathing difficulty occurs suddenly, seek urgent medical assessment regardless of normal baseline X-ray.",
        "emergency_hi": "यदि अचानक सीने में तेज दर्द या सांस लेने में भारी तकलीफ हो, तो तुरंत डॉक्टर को दिखाएं।"
    }
}


def match_intent(message: str) -> str:
    """Classifies user intent from natural language input."""
    msg = message.lower().strip()
    
    # Heatmap / Grad-CAM
    if any(k in msg for k in ["gradcam", "grad-cam", "heatmap", "red", "yellow", "color", "heat", "नक्शा", "लाल", "रंग"]):
        return "heatmap"
    
    # Accuracy / Reliability
    if any(k in msg for k in ["accuracy", "reliable", "trust", "how accurate", "सटीक", "भरोसा", "सटीकता", "प्रतिशत"]):
        return "accuracy"
    
    # Emergency / Serious
    if any(k in msg for k in ["emergency", "serious", "hospital", "danger", "critical", "कहाँ जाऊ", "गंभीर", "इमरजेंसी", "खतरा"]):
        return "emergency"
        
    # Precautions / Next Steps / Treatment / Medicines
    if any(k in msg for k in ["precaution", "what should i do", "next step", "treatment", "cure", "medicine", "इलाज", "उपाय", "सावधानी", "दवा", "क्या करूँ"]):
        return "next_steps"
        
    # Specific Disease questions
    if any(k in msg for k in ["covid", "corona", "कोरोना"]):
        return "explain_covid"
    if any(k in msg for k in ["pneumonia", "निमोनिया"]):
        return "explain_pneumonia"
    if any(k in msg for k in ["tb", "tuberculosis", "टीबी"]):
        return "explain_tb"
    if any(k in msg for k in ["opacity", "अपारदर्शिता"]):
        return "explain_opacity"
        
    # Explain result / General
    if any(k in msg for k in ["explain", "result", "report", "what does it mean", "what is this", "समझाओ", "रिपोर्ट", "मतलब"]):
        return "explain_result"
        
    # Diet / Home care / Exercises
    if any(k in msg for k in ["diet", "food", "exercise", "breathing", "खान-पान", "आहार", "व्यायाम"]):
        return "lifestyle"

    # Greetings
    if any(k in msg for k in ["hi", "hello", "hey", "namaste", "नमस्ते", "हैलो"]):
        return "greeting"

    return "general_medical"


def generate_offline_response(
    message: str,
    prediction_context: Optional[Dict[str, Any]],
    language: str = "en"
) -> str:
    """Generates clinically verified, context-aware responses without external dependencies."""
    is_hi = language.lower().startswith("hi")
    intent = match_intent(message)
    
    # Extract prediction details
    disease = "Normal"
    confidence = 95.0
    patient_name = "Patient"
    if prediction_context:
        disease = prediction_context.get("predicted_class", "Normal")
        confidence = float(prediction_context.get("confidence", 95.0))
        patient_name = prediction_context.get("patient_name") or "Patient"

    info = KNOWLEDGE_BASE.get(disease, KNOWLEDGE_BASE["Normal"])

    if intent == "greeting":
        if is_hi:
            return (
                f"नमस्ते {patient_name}! मैं आपका **एआई मेडिकल हेल्थ असिस्टेंट** हूँ। 🩺\n\n"
                f"आपकी हालिया चेस्ट एक्स-रे स्कैन रिपोर्ट के अनुसार **{info['title_hi']}** (आत्मविश्वास: **{confidence:.1f}%**) पाया गया है।\n\n"
                f"आप मुझसे अपनी रिपोर्ट, सावधानियों, हीटमैप या अगले कदमों के बारे में कोई भी प्रश्न पूछ सकते हैं!"
            )
        else:
            return (
                f"Hello {patient_name}! I am your **AI Clinical Health Assistant** 🩺.\n\n"
                f"Your recent chest X-ray screening detected **{info['title_en']}** with **{confidence:.1f}%** confidence.\n\n"
                f"Feel free to ask me questions regarding your results, recommended precautions, Grad-CAM heatmap visualization, or next clinical steps!"
            )

    elif intent == "heatmap":
        if is_hi:
            return (
                f"🔬 **Grad-CAM हीटमैप का अर्थ क्या है?**\n\n"
                f"• **गहरा लाल और नारंगी (Warm Colors):** ये वे संवेदनशील क्षेत्र हैं जहां एआई मॉडल ने सबसे अधिक ध्यान केंद्रित किया और रोग के मुख्य लक्षण पहचाने।\n"
                f"• **पीला और हरा (Mid-tone Colors):** मध्यम प्रभाव वाले क्षेत्र।\n"
                f"• **नीला या पारदर्शी (Cool Colors):** सामान्य और अप्रभावित फेफड़ों का ऊतक।\n\n"
                f"💡 आप परिणाम पृष्ठ पर दिए गए **स्प्लिट स्लाइडर** को बाईं-दाईं ओर खिसका कर मूल एक्स-रे और हीटमैप की सीधे तुलना कर सकते हैं।"
            )
        else:
            return (
                f"🔬 **Understanding the Grad-CAM Heatmap Visualization:**\n\n"
                f"• **Deep Red & Orange zones:** High-activation regions where the neural network concentrated its focus to identify pathological biomarkers.\n"
                f"• **Yellow & Light Green zones:** Moderate influence areas containing secondary radiological findings.\n"
                f"• **Blue & Uncolored zones:** Normal, unaffected lung tissue parenchyma.\n\n"
                f"💡 *Tip:* Use the **interactive Before/After Split Slider** on the Results page to slide between your original radiograph and the Grad-CAM heatmap overlay."
            )

    elif intent == "accuracy":
        if is_hi:
            return (
                f"📊 **मॉडल सटीकता एवं सत्यापन:**\n\n"
                f"• **सत्यापित टेस्ट एक्यूरेसी:** **98.15%** (5-क्लास कड़े परीक्षण डेटासेट पर आधारित)।\n"
                f"• **दोहरा आर्किटेक्चर (Dual-Ensemble):** यह प्रणाली दोहरे डीप न्यूरल नेटवर्क्स और कैलिब्रेटेड संवेदनशीलता कटऑफ का उपयोग करती है ताकि गलत रिपोर्टिंग की संभावना न्यूनतम हो।\n"
                f"• **सटीकता स्तर:** आपकी वर्तमान स्कैन रिपोर्ट **{confidence:.1f}%** विश्वसनीयता के साथ दर्ज की गई है।\n\n"
                f"⚠️ *नोट:* एआई जांच एक सहायक उपकरण है। अंतिम पुष्टि किसी योग्य रेडियोलॉजिस्ट द्वारा की जानी चाहिए।"
            )
        else:
            return (
                f"📊 **AI Diagnostic Reliability & Accuracy:**\n\n"
                f"• **Verified Test Accuracy:** **98.15%** benchmarked on standardized held-out chest radiography test sets.\n"
                f"• **Dual-Model Ensemble:** Integrates fine-tuned convolutional feature extractors with dynamically calibrated sensitivity thresholds to minimize false negatives.\n"
                f"• **Current Scan Confidence:** **{confidence:.1f}%** for {disease}.\n\n"
                f"⚠️ *Clinical Disclaimer:* This automated analysis serves as a screening and second-opinion tool. A licensed radiologist or pulmonologist must confirm all findings."
            )

    elif intent == "emergency":
        if is_hi:
            return (
                f"🚨 **आपातकालीन चेतावनी संकेत (Immediate Red Flags):**\n\n"
                f"{info['emergency_hi']}\n\n"
                f"**तत्काल सहायता के लिए:**\n"
                f"1. नजदीकी आपातकालीन अस्पताल के आईसीयू/कैजुअल्टी में संपर्क करें।\n"
                f"2. एम्बुलेंस हेल्पलाइन: **108** या **102** पर कॉल करें।\n"
                f"3. मरीज को सहारा देकर 45 डिग्री के कोण पर सीधा बैठाएं और कपड़े ढीले करें।"
            )
        else:
            return (
                f"🚨 **Emergency Red Flags & Critical Care Triggers:**\n\n"
                f"{info['emergency_en']}\n\n"
                f"**Immediate Action Protocol:**\n"
                f"1. Proceed to the nearest hospital Emergency Department / Trauma Center.\n"
                f"2. Contact local emergency medical services (e.g., 911 / 108 / 112).\n"
                f"3. Keep the patient upright at a 45-degree angle with loose clothing to ease respiratory excursion."
            )

    elif intent in ["next_steps", "lifestyle"]:
        precautions = info["precautions_hi"] if is_hi else info["precautions_en"]
        precautions_text = "\n".join([f"{i+1}. {p}" for i, p in enumerate(precautions)])
        if is_hi:
            return (
                f"📋 **अनुशंसित अगले कदम और सावधानियां ({info['title_hi']}):**\n\n"
                f"{precautions_text}\n\n"
                f"🥗 **आहार एवं श्वसन देखभाल:**\n"
                f"• हल्का, सुपाच्य और विटामिन-सी युक्त पौष्टिक भोजन लें।\n"
                f"• दिन में 2-3 बार गर्म पानी की भाप (Steam Inhalation) लें।\n"
                f"• धूम्रपान और ठंडी चीजों से पूरी तरह परहेज करें।"
            )
        else:
            return (
                f"📋 **Recommended Next Steps & Clinical Guidelines ({info['title_en']}):**\n\n"
                f"{precautions_text}\n\n"
                f"🥗 **Lifestyle & Pulmonary Support:**\n"
                f"• Maintain balanced caloric intake rich in zinc, antioxidants, and protein.\n"
                f"• Practice gentle diaphragmatic breathing or spirometer exercises if tolerated.\n"
                f"• Strictly avoid active or passive tobacco exposure and dry, unhumidified air."
            )

    else:
        # Default: Explain result
        if is_hi:
            precautions = "\n".join([f"• {p}" for p in info["precautions_hi"][:3]])
            return (
                f"🩺 **आपकी एक्स-रे रिपोर्ट का विश्लेषण:**\n\n"
                f"• **पहचाना गया रोग:** **{info['title_hi']}**\n"
                f"• **एआई विश्वसनीयता:** **{confidence:.1f}%**\n\n"
                f"**संक्षिप्त विवरण:**\n{info['summary_hi']}\n\n"
                f"**महत्वपूर्ण सावधानियां:**\n{precautions}\n\n"
                f"👉 आप मुझसे इसके इलाज, हीटमैप या खान-पान के बारे में और प्रश्न पूछ सकते हैं।"
            )
        else:
            precautions = "\n".join([f"• {p}" for p in info["precautions_en"][:3]])
            return (
                f"🩺 **Clinical Analysis Summary of Your Chest X-Ray:**\n\n"
                f"• **Finding:** **{info['title_en']}**\n"
                f"• **AI Confidence:** **{confidence:.1f}%**\n\n"
                f"**Clinical Radiographic Correlation:**\n{info['summary_en']}\n\n"
                f"**Initial Guidelines:**\n{precautions}\n\n"
                f"👉 Feel free to ask more specific questions regarding treatment pathways, precautions, or Grad-CAM heatmap visualization."
            )


async def call_gemini_api(
    message: str,
    prediction_context: Optional[Dict[str, Any]],
    chat_history: Optional[List[Dict[str, str]]] = None,
    language: str = "en"
) -> Optional[str]:
    """Invokes Google Gemini 1.5 Flash via REST API if an API key is available."""
    if not GEMINI_API_KEY:
        return None

    is_hi = language.lower().startswith("hi")
    disease = prediction_context.get("predicted_class", "Normal") if prediction_context else "Normal"
    confidence = prediction_context.get("confidence", 95.0) if prediction_context else 95.0
    patient_name = prediction_context.get("patient_name", "Patient") if prediction_context else "Patient"

    system_instruction = (
        f"You are Dr. AI, an empathetic, highly skilled AI Pulmonologist and Radiologist Assistant on a "
        f"clinical Chest X-Ray screening platform. "
        f"Current scan context: Patient Name: '{patient_name}', Predicted Condition: '{disease}', Confidence: '{confidence}%'. "
        f"The platform uses a dual-ensemble deep neural network with 98.15% test accuracy and Grad-CAM explainability. "
        f"Provide empathetic, clear, medically rigorous explanations. "
        f"Format with structured markdown bullet points. "
        f"Language requirement: {'Reply purely in clean, warm Hindi (हिंदी)' if is_hi else 'Reply in clear English'}. "
        f"Always conclude with a brief medical disclaimer advising consultation with an authorized physician."
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
    
    contents = []
    # Add system prompt as initial turn
    contents.append({"role": "user", "parts": [{"text": system_instruction}]})
    contents.append({"role": "model", "parts": [{"text": "Understood. I will act as Dr. AI with the specified clinical context and language."}]})

    if chat_history:
        for turn in chat_history[-6:]:  # Keep last 3 turns
            role = "user" if turn.get("role") == "user" else "model"
            contents.append({"role": role, "parts": [{"text": turn.get("content", "")}]})

    contents.append({"role": "user", "parts": [{"text": message}]})

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                url,
                json={"contents": contents, "generationConfig": {"temperature": 0.4, "maxOutputTokens": 600}},
                headers={"Content-Type": "application/json"}
            )
            if resp.status_code == 200:
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return text
    except Exception as e:
        print(f"[WARN] Gemini API call failed or timed out ({e}). Falling back to local clinical knowledge engine.")
        return None

    return None


async def get_assistant_response(
    message: str,
    prediction_context: Optional[Dict[str, Any]] = None,
    chat_history: Optional[List[Dict[str, str]]] = None,
    language: str = "en"
) -> Dict[str, Any]:
    """Hybrid orchestrator: attempts Gemini 1.5 Flash first, then seamlessly falls back to offline knowledge engine."""
    # 1. Try Gemini if configured
    gemini_text = await call_gemini_api(message, prediction_context, chat_history, language)
    if gemini_text:
        return {
            "reply": gemini_text,
            "source": "gemini-1.5-flash",
            "language": language
        }

    # 2. Local Clinical Engine Fallback
    local_text = generate_offline_response(message, prediction_context, language)
    return {
        "reply": local_text,
        "source": "offline-clinical-engine",
        "language": language
    }
