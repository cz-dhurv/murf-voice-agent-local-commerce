// Two-language UI dictionary. No i18n library — two languages don't justify one.
// `hi` values are real Devanagari (rendered via Noto Sans Devanagari, see layout.tsx).
// ponytail: flat keys, one dict per language. Add a language = add a key here.

export type Language = 'en' | 'hi';

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
];

type Dict = {
  // nav
  navHome: string;
  navHowItWorks: string;
  navFeatures: string;
  navTechStack: string;
  navImpact: string;
  navAbout: string;
  navStar: string;
  navCta: string;
  language: string;

  // hero
  heroBadge: string;
  heroTitle1: string;
  heroTitle2: string;
  heroSubtitle: string;
  heroCall: string;
  heroDemo: string;
  stat247: string;
  stat247Sub: string;
  statLangs: string;
  statLangsSub: string;
  stat100: string;
  stat100Sub: string;

  // hero mini feature strip
  hf1Title: string;
  hf1Sub: string;
  hf2Title: string;
  hf2Sub: string;
  hf3Title: string;
  hf3Sub: string;
  hf4Title: string;
  hf4Sub: string;

  builtForBharat: string;
  builtForBharatSub: string;

  // widget card
  live: string;
  securePrivate: string;
  tryAsking: string;
  ask1: string;
  ask2: string;
  ask3: string;
  ask4: string;
  speakTip: string;

  // widget states
  wReadyTitle: string;
  wReadySub: string;
  wStart: string;
  wStartHint: string;
  wConnecting: string;
  wConnectingSub: string;
  wListeningTitle: string;
  wListeningSub: string;
  wSpeakingTitle: string;
  wSpeakingSub: string;
  wThinkingTitle: string;
  wThinkingSub: string;
  wYou: string;
  wAgent: string;
  wEndedTitle: string;
  wEndedSub: string;
  wRestart: string;
  wSpeaker: string;
  wEndCall: string;
  wMute: string;

  // mic errors
  micOffTitle: string;
  micOffSub: string;
  micNotFoundTitle: string;
  micNotFoundSub: string;
  micStep1: string;
  micStep2: string;
  micStep3: string;
  micRetry: string;

  // how it works
  howTitle: string;
  howSub: string;
  how1Title: string;
  how1Sub: string;
  how2Title: string;
  how2Sub: string;
  how3Title: string;
  how3Sub: string;
  how4Title: string;
  how4Sub: string;
  how5Title: string;
  how5Sub: string;
  howBanner: string;

  // features
  featTitle: string;
  featSub: string;
  feat1Title: string;
  feat1Sub: string;
  feat2Title: string;
  feat2Sub: string;
  feat3Title: string;
  feat3Sub: string;
  feat4Title: string;
  feat4Sub: string;
  feat5Title: string;
  feat5Sub: string;
  feat6Title: string;
  feat6Sub: string;
  feat7Title: string;
  feat7Sub: string;
  feat8Title: string;
  feat8Sub: string;
  feat9Title: string;
  feat9Sub: string;
  featCtaText: string;
  featCtaBtn: string;

  // tech stack
  techTitle: string;
  techSub: string;
  techGroupVoice: string;
  techGroupOrchestration: string;
  techGroupData: string;
  techGroupFrontend: string;
  techBuiltWith: string;
  techBuiltWithSub: string;

  // impact / about
  aboutTitle: string;
  aboutIntro: string;
  missionTitle: string;
  missionSub: string;
  visionTitle: string;
  visionSub: string;
  valuesTitle: string;
  valuesSub: string;
  whyTitle: string;
  whySub: string;
  joinTitle: string;
  joinSub: string;
  joinStar: string;
  joinContribute: string;

  // footer
  footerTagline: string;
  footerRights: string;

  // memory (Day 4 — persistent caller memory)
  navMemory: string;
  memTitle: string;
  memSub: string;
  memDbNote: string;
  memRefresh: string;
  memLoading: string;
  memEmptyTitle: string;
  memEmptySub: string;
  memCallers: string;
  memUnknown: string;
  memLangEn: string;
  memLangHi: string;
  memNoFacts: string;
  memLastSeen: string;
  memNever: string;
  memForget: string;
  memForgetConfirm: string;
  memToolsTitle: string;
  memToolsSub: string;
  memTool1Desc: string;
  memTool2Desc: string;
  memTool3Desc: string;
  memTool4Desc: string;
  memTool5Desc: string;
  memTool6Desc: string;
  memConsentTitle: string;
  memConsentSub: string;
  memPersistTitle: string;
  memPersistSub: string;
  memScriptTitle: string;
  memScriptSub: string;

  // ---- dashboard (the /dashboard product surface) ----
  dashName: string;
  dashBack: string;
  dnProfiles: string;
  dnMemory: string;
  dnTools: string;
  dnConsent: string;
  dnReturning: string;
  dnMultilingual: string;

  // caller profiles
  cpTitle: string;
  cpSub: string;
  cpSearchPh: string;
  cpAllLangs: string;
  statTotal: string;
  statNamed: string;
  statWithFacts: string;
  statHindi: string;
  cpView: string;
  cpNoResults: string;

  // caller detail
  cdBack: string;
  cdUserId: string;
  cdLanguage: string;
  cdLastInteraction: string;
  cdFactsTitle: string;
  cdEdit: string;
  cdDelete: string;
  cdSave: string;
  cdCancel: string;
  cdNameLabel: string;
  cdLangLabel: string;
  cdRemoveFact: string;
  cdSaving: string;
  cdNoFactsHint: string;

  // memory & data
  mdTitle: string;
  mdSub: string;
  mdStoreTitle: string;
  mdEngine: string;
  mdStatus: string;
  mdConnected: string;
  mdOffline: string;
  mdRecords: string;
  mdSize: string;
  mdDriver: string;
  mdPersistTitle: string;
  mdPersistBody: string;
  mdBackupTitle: string;
  mdBackupBody: string;

  // memory tools
  mtTitle: string;
  mtSub: string;
  mtInput: string;
  mtOutput: string;
  mtNote: string;

  // consent
  coTitle: string;
  coSub: string;
  coPromptTitle: string;
  coNeverTitle: string;
  coNeverBody: string;
  coRefuse: string;

  // returning caller
  reTitle: string;
  reSub: string;
  reStepsTitle: string;
  reStep1: string;
  reStep2: string;
  reStep3: string;
  reStep4: string;
  reExampleTitle: string;
  reExampleFirstLabel: string;
  reExampleReturnLabel: string;
  reNote: string;

  // multilingual
  mlTitle: string;
  mlSub: string;
  mlDetectTitle: string;
  mlDetectBody: string;
  mlScriptTitle: string;
  mlScriptBody: string;
  mlExamplesTitle: string;
};

const en: Dict = {
  navHome: 'Home',
  navHowItWorks: 'How It Works',
  navFeatures: 'Features',
  navTechStack: 'Tech Stack',
  navImpact: 'Impact',
  navAbout: 'About',
  navStar: 'Star on GitHub',
  navCta: 'Get Started',
  language: 'Language',

  heroBadge: 'AI Voice Agent for Rural India',
  heroTitle1: 'AI Voice Agent for',
  heroTitle2: 'Bharat',
  heroSubtitle:
    'Empowering India’s shopkeepers with a 24/7 voice assistant that speaks their language — order from your local shop, and get real help with UPI, GST, sarkari yojana and going online.',
  heroCall: 'Call the Voice Agent',
  heroDemo: 'Watch Demo',
  stat247: '24/7',
  stat247Sub: 'Always Available',
  statLangs: 'Hinglish',
  statLangsSub: 'Speaks your way',
  stat100: '100%',
  stat100Sub: 'For Bharat',

  hf1Title: 'Natural Conversations',
  hf1Sub: 'Talk naturally in your language. It understands you.',
  hf2Title: 'Local Language Support',
  hf2Sub: 'Hindi, English and Hinglish — no jargon.',
  hf3Title: 'Real Information',
  hf3Sub: 'Accurate help on payments, schemes and online business.',
  hf4Title: '24/7 Availability',
  hf4Sub: 'Always here to help, anytime, anywhere.',

  builtForBharat: 'Built for Bharat, by Bharat',
  builtForBharatSub: 'Open-source voice agent to empower every Indian shopkeeper.',

  live: 'Live',
  securePrivate: 'Secure & Private Conversation',
  tryAsking: 'Try asking about:',
  ask1: 'Order 5 kg atta from my shop',
  ask2: 'What is GST and do I need it?',
  ask3: 'Tell me about PM SVANidhi',
  ask4: 'Reorder my usual for tomorrow morning',
  speakTip: 'Tip: Just speak naturally, like talking to a real person.',

  wReadyTitle: 'DukaanSaathi',
  wReadySub:
    'Your local shop companion. Order your usual, or get help with UPI, GST, sarkari yojana and going online — all just by speaking.',
  wStart: 'Start the conversation',
  wStartHint: 'Just speak your question — in Hindi or English.',
  wConnecting: 'Connecting to DukaanSaathi…',
  wConnectingSub: 'Please wait a moment.',
  wListeningTitle: 'Listening…',
  wListeningSub: 'Go ahead — I’m listening carefully.',
  wSpeakingTitle: 'DukaanSaathi is speaking',
  wSpeakingSub: 'Listen to the answer.',
  wThinkingTitle: 'Thinking…',
  wThinkingSub: 'Just a moment.',
  wYou: 'You',
  wAgent: 'DukaanSaathi',
  wEndedTitle: 'Conversation ended',
  wEndedSub: 'Hope that helped. DukaanSaathi is here whenever you need it.',
  wRestart: 'Start a new conversation',
  wSpeaker: 'Speaker',
  wEndCall: 'End Call',
  wMute: 'Mute',

  micOffTitle: 'Microphone is blocked',
  micOffSub:
    'DukaanSaathi needs your microphone to listen. You have blocked microphone permission.',
  micNotFoundTitle: 'No microphone found',
  micNotFoundSub: 'No microphone was found on your device. Connect one and try again.',
  micStep1: 'Click the 🔒 (lock) icon in the address bar.',
  micStep2: 'Set “Microphone” to “Allow”.',
  micStep3: 'Reload the page and press Start again.',
  micRetry: 'Try again',

  howTitle: 'How It Works',
  howSub: 'Simple steps. Powerful impact.',
  how1Title: 'User Calls the Voice Agent',
  how1Sub: 'Users connect with our AI voice assistant in one tap.',
  how2Title: 'Natural Conversation',
  how2Sub: 'The AI understands questions in local languages and responds conversationally.',
  how3Title: 'AI Processes & Retrieves Info',
  how3Sub: 'It retrieves accurate information on payments, schemes and business.',
  how4Title: 'Helpful Response',
  how4Sub: 'Clear, easy-to-understand answers in the user’s own language.',
  how5Title: 'Actionable Help',
  how5Sub: 'Users get guidance, next steps and relevant resources to take action.',
  howBanner: 'Making technology accessible to every Indian, in every language.',

  featTitle: 'Powerful Features',
  featSub: 'Everything we built to serve Bharat better.',
  feat1Title: 'Multi-Language Support',
  feat1Sub: 'Speak in your language — Hindi, English and Hinglish, naturally mixed.',
  feat2Title: 'Natural Conversations',
  feat2Sub: 'Talk like you would to a human. It understands context and intent.',
  feat3Title: 'Real-time Voice',
  feat3Sub: 'Real-time voice interaction for a smooth, human-like experience.',
  feat4Title: 'Accurate Information',
  feat4Sub: 'Get information from trusted sources on schemes, GST and business.',
  feat5Title: '24/7 Availability',
  feat5Sub: 'Always available, anytime, anywhere. It never sleeps.',
  feat6Title: 'Secure & Private',
  feat6Sub: 'No OTP, PIN or bank details are ever asked. Your privacy comes first.',
  feat7Title: 'Low Bandwidth Friendly',
  feat7Sub: 'Optimized for rural India. Works even on slow networks.',
  feat8Title: 'Easy to Use',
  feat8Sub: 'No app to install, no typing. Just tap and talk.',
  feat9Title: 'Continuously Improving',
  feat9Sub: 'We keep improving every day to serve you better.',
  featCtaText: 'Have a question? Call our voice agent and try it yourself!',
  featCtaBtn: 'Call Now',

  techTitle: 'Tech Stack',
  techSub: 'Modern, scalable, and open source.',
  techGroupVoice: 'AI & Voice',
  techGroupOrchestration: 'Agent Orchestration',
  techGroupData: 'Speech & Language',
  techGroupFrontend: 'Frontend & Deployment',
  techBuiltWith: 'Built with ❤️ for Bharat',
  techBuiltWithSub: 'Open source. Community driven. Impact focused.',

  aboutTitle: 'About Voice for Bharat',
  aboutIntro:
    'Voice for Bharat is an open initiative to build AI voice agents that empower rural India with information, in their own language.',
  missionTitle: 'Our Mission',
  missionSub: 'Make technology accessible to every Indian by breaking the language barrier.',
  visionTitle: 'Our Vision',
  visionSub: 'A Bharat where everyone has equal access to information and opportunities.',
  valuesTitle: 'Our Values',
  valuesSub: 'Inclusivity, transparency, privacy, and community empowerment.',
  whyTitle: 'Why We Built This',
  whySub:
    'Millions of shopkeepers in rural India face barriers accessing information — language, literacy and digital complexity. Voice is the most natural interface, and we believe it can bridge that gap.',
  joinTitle: 'Join Our Mission',
  joinSub:
    'Star the repo, contribute, or build with us. Together, let’s build technology for Bharat.',
  joinStar: 'Star on GitHub',
  joinContribute: 'Contribute',

  footerTagline: 'Voice AI for every Indian shopkeeper.',
  footerRights: 'Built for the Murf Falcon challenge.',

  navMemory: 'Memory',
  memTitle: 'A Memory That Lasts',
  memSub:
    'DukaanSaathi remembers callers between calls. It greets returning shopkeepers by name and picks up where you left off — with your permission, and never anything sensitive.',
  memDbNote:
    'Live data from the agent’s own memory store (SQLite). These are real remembered callers — nothing is mocked.',
  memRefresh: 'Refresh',
  memLoading: 'Loading remembered callers…',
  memEmptyTitle: 'No callers remembered yet',
  memEmptySub:
    'When a caller lets DukaanSaathi remember them, their profile appears here. Have a conversation and say yes when it offers to remember you.',
  memCallers: 'Remembered callers',
  memUnknown: 'Unnamed caller',
  memLangEn: 'English',
  memLangHi: 'Hindi',
  memNoFacts: 'No facts saved yet',
  memLastSeen: 'Last talked',
  memNever: 'unknown',
  memForget: 'Forget',
  memForgetConfirm: 'Forget this caller and delete their saved data?',
  memToolsTitle: 'How the agent remembers',
  memToolsSub:
    'The agent calls these tools itself — memories live in a database, not in its prompt.',
  memTool1Desc: 'Recall what’s known about the caller currently on the line.',
  memTool2Desc: 'Save a name, language and business facts — only after the caller agrees.',
  memTool3Desc: 'Delete everything saved about a caller when they ask to be forgotten.',
  memTool4Desc: 'Record an order the caller places and remember it as their usual for next time.',
  memTool5Desc:
    'Look up an item in the shop’s own catalogue — its price and whether it’s in stock.',
  memTool6Desc: 'Total an order at shop prices, flagging anything out of stock or not carried.',
  memConsentTitle: 'Consent before saving',
  memConsentSub:
    'The agent always asks “क्या मैं यह आपके लिए याद रख लूँ?” before saving. Say no and nothing is stored. OTPs, PINs, Aadhaar and bank numbers are never saved.',
  memPersistTitle: 'Survives restarts',
  memPersistSub:
    'Memory is stored on disk, so what you told the agent in one call is still there in the next — even after the agent restarts.',
  memScriptTitle: 'Speaks & remembers in your script',
  memScriptSub:
    'Returning callers are greeted in their own language and native script — “नमस्ते रमेश जी! पिछली बार हमने UPI QR के बारे में बात की थी।”',

  dashName: 'Dashboard',
  dashBack: 'Back to site',
  dnProfiles: 'Caller Profiles',
  dnMemory: 'Memory & Data',
  dnTools: 'Memory Tools',
  dnConsent: 'Consent',
  dnReturning: 'Returning Callers',
  dnMultilingual: 'Multilingual',

  cpTitle: 'Caller Profiles',
  cpSub: 'View and manage the caller information the agent has remembered.',
  cpSearchPh: 'Search callers by name or ID…',
  cpAllLangs: 'All languages',
  statTotal: 'Total callers',
  statNamed: 'Named callers',
  statWithFacts: 'With saved facts',
  statHindi: 'Hindi speakers',
  cpView: 'View profile',
  cpNoResults: 'No callers match your search.',

  cdBack: 'Back to caller profiles',
  cdUserId: 'Caller ID',
  cdLanguage: 'Language',
  cdLastInteraction: 'Last interaction',
  cdFactsTitle: 'What the agent remembers',
  cdEdit: 'Edit',
  cdDelete: 'Delete profile',
  cdSave: 'Save changes',
  cdCancel: 'Cancel',
  cdNameLabel: 'Name',
  cdLangLabel: 'Language preference',
  cdRemoveFact: 'Remove',
  cdSaving: 'Saving…',
  cdNoFactsHint: 'The agent hasn’t saved any facts for this caller yet.',

  mdTitle: 'Memory & Data Management',
  mdSub: 'How caller information is stored and kept.',
  mdStoreTitle: 'Database status',
  mdEngine: 'Storage engine',
  mdStatus: 'Status',
  mdConnected: 'Connected',
  mdOffline: 'Not created yet',
  mdRecords: 'Caller records',
  mdSize: 'Storage used',
  mdDriver: 'Driver',
  mdPersistTitle: 'Persistent memory',
  mdPersistBody:
    'Caller profiles are written to a single SQLite file on disk, so what a caller told the agent survives a full restart. There is one table — callers — with one row per remembered caller.',
  mdBackupTitle: 'Backups',
  mdBackupBody:
    'No automated backup is configured. The whole store is one file (backend/data/memory.db) — copy that file to back it up or move it between machines.',

  mtTitle: 'Memory Tools',
  mtSub:
    'The functions the agent calls itself to remember callers — memories live in the database, not in the prompt.',
  mtInput: 'Input',
  mtOutput: 'Output',
  mtNote:
    'The agent decides when to call these during a conversation. Nothing is saved without the caller’s consent.',

  coTitle: 'Consent Management',
  coSub: 'The agent asks permission before remembering anything personal.',
  coPromptTitle: 'Consent prompt',
  coNeverTitle: 'Never saved',
  coNeverBody:
    'OTPs, PINs, Aadhaar numbers and bank details are never stored — only a name, language and a few business facts.',
  coRefuse: 'If the caller says no, their information is not saved.',

  reTitle: 'Returning Caller Experience',
  reSub: 'How the agent recognises and greets a caller it has met before.',
  reStepsTitle: 'Recognition & greeting',
  reStep1: 'Identifies the caller by their stable caller ID.',
  reStep2: 'Looks up what was saved, using lookup_caller.',
  reStep3: 'Greets them by name, in their language.',
  reStep4: 'Continues from the previous context, not from zero.',
  reExampleTitle: 'Example greeting',
  reExampleFirstLabel: 'First call',
  reExampleReturnLabel: 'Returning call',
  reNote: 'The agent doesn’t start from scratch — it continues where you left off.',

  mlTitle: 'Multilingual Support',
  mlSub: 'Automatic language detection with native-script replies.',
  mlDetectTitle: 'Language detection',
  mlDetectBody:
    'Speech-to-text runs Deepgram Nova-3 with language="multi", so a caller can speak Hindi, English or a mix without choosing a language first.',
  mlScriptTitle: 'Native script, not transliteration',
  mlScriptBody:
    'Each language is written in its own script — Hindi replies come back in Devanagari (नमस्ते), never romanised “namaste”.',
  mlExamplesTitle: 'Native-script examples',
};

const hi: Dict = {
  navHome: 'होम',
  navHowItWorks: 'कैसे काम करता है',
  navFeatures: 'विशेषताएँ',
  navTechStack: 'टेक स्टैक',
  navImpact: 'प्रभाव',
  navAbout: 'हमारे बारे में',
  navStar: 'GitHub पर स्टार करें',
  navCta: 'शुरू करें',
  language: 'भाषा',

  heroBadge: 'ग्रामीण भारत के लिए AI वॉइस एजेंट',
  heroTitle1: 'AI वॉइस एजेंट',
  heroTitle2: 'भारत के लिए',
  heroSubtitle:
    'भारत के दुकानदारों के लिए 24/7 वॉइस असिस्टेंट, जो आपकी भाषा में बात करता है — अपनी दुकान से सामान मँगवाएँ, और UPI, GST, सरकारी योजना और ऑनलाइन बिज़नेस में मदद पाएँ।',
  heroCall: 'वॉइस एजेंट से बात करें',
  heroDemo: 'डेमो देखें',
  stat247: '24/7',
  stat247Sub: 'हमेशा उपलब्ध',
  statLangs: 'हिंग्लिश',
  statLangsSub: 'आपके अंदाज़ में',
  stat100: '100%',
  stat100Sub: 'भारत के लिए',

  hf1Title: 'स्वाभाविक बातचीत',
  hf1Sub: 'अपनी भाषा में सहज बात करें। यह आपको समझता है।',
  hf2Title: 'स्थानीय भाषा सपोर्ट',
  hf2Sub: 'हिंदी, अंग्रेज़ी और हिंग्लिश — कोई कठिन शब्द नहीं।',
  hf3Title: 'सही जानकारी',
  hf3Sub: 'पेमेंट, योजनाओं और ऑनलाइन बिज़नेस पर भरोसेमंद मदद।',
  hf4Title: '24/7 उपलब्धता',
  hf4Sub: 'कभी भी, कहीं भी मदद के लिए हमेशा तैयार।',

  builtForBharat: 'भारत के लिए, भारत द्वारा बनाया गया',
  builtForBharatSub: 'हर दुकानदार को सशक्त बनाने के लिए ओपन-सोर्स वॉइस एजेंट।',

  live: 'लाइव',
  securePrivate: 'सुरक्षित और निजी बातचीत',
  tryAsking: 'ये पूछकर देखें:',
  ask1: '5 किलो आटा मेरी दुकान से मँगवा दो',
  ask2: 'GST क्या है और क्या मुझे इसकी ज़रूरत है?',
  ask3: 'PM SVANidhi योजना के बारे में बताइए',
  ask4: 'मेरा रोज़ का सामान कल सुबह भेज दो',
  speakTip: 'सुझाव: बस सहज होकर बोलिए, जैसे किसी असली व्यक्ति से बात कर रहे हों।',

  wReadyTitle: 'दुकानसाथी',
  wReadySub:
    'आपका दुकान साथी। अपना रोज़ का सामान मँगवाएँ, या UPI, GST, सरकारी योजना और ऑनलाइन बिज़नेस में मदद पाएँ — सब बस बोलकर।',
  wStart: 'बातचीत शुरू करें',
  wStartHint: 'बस अपना सवाल बोलिए — हिंदी या अंग्रेज़ी में।',
  wConnecting: 'दुकानसाथी से जुड़ रहे हैं…',
  wConnectingSub: 'कृपया थोड़ी देर रुकिए।',
  wListeningTitle: 'सुन रहा हूँ…',
  wListeningSub: 'आप बोलिए — मैं ध्यान से सुन रहा हूँ।',
  wSpeakingTitle: 'दुकानसाथी बोल रहा है',
  wSpeakingSub: 'जवाब ध्यान से सुनिए।',
  wThinkingTitle: 'सोच रहा हूँ…',
  wThinkingSub: 'बस एक पल रुकिए।',
  wYou: 'आप',
  wAgent: 'दुकानसाथी',
  wEndedTitle: 'बातचीत खत्म हो गई',
  wEndedSub: 'उम्मीद है आपकी मदद हो गई। जब भी ज़रूरत हो, दुकानसाथी हाज़िर है।',
  wRestart: 'नई बातचीत शुरू करें',
  wSpeaker: 'स्पीकर',
  wEndCall: 'कॉल बंद करें',
  wMute: 'म्यूट',

  micOffTitle: 'माइक्रोफ़ोन बंद है',
  micOffSub: 'दुकानसाथी को सुनने के लिए माइक्रोफ़ोन चाहिए। आपने माइक की अनुमति ब्लॉक कर दी है।',
  micNotFoundTitle: 'माइक्रोफ़ोन नहीं मिला',
  micNotFoundSub: 'आपके डिवाइस पर कोई माइक्रोफ़ोन नहीं मिला। एक माइक लगाकर दोबारा कोशिश करें।',
  micStep1: 'एड्रेस बार में 🔒 (लॉक) आइकन पर क्लिक करें।',
  micStep2: '“माइक्रोफ़ोन” को “Allow” करें।',
  micStep3: 'पेज रीलोड करके दोबारा शुरू करें दबाएँ।',
  micRetry: 'दोबारा कोशिश करें',

  howTitle: 'कैसे काम करता है',
  howSub: 'आसान कदम। बड़ा असर।',
  how1Title: 'यूज़र वॉइस एजेंट को कॉल करता है',
  how1Sub: 'यूज़र एक टैप में हमारे AI वॉइस असिस्टेंट से जुड़ जाता है।',
  how2Title: 'स्वाभाविक बातचीत',
  how2Sub: 'AI स्थानीय भाषाओं में सवाल समझता है और बातचीत के अंदाज़ में जवाब देता है।',
  how3Title: 'AI जानकारी ढूँढता है',
  how3Sub: 'यह पेमेंट, योजनाओं और बिज़नेस पर सही जानकारी निकालता है।',
  how4Title: 'मददगार जवाब',
  how4Sub: 'यूज़र की अपनी भाषा में साफ़ और आसान जवाब।',
  how5Title: 'व्यावहारिक मदद',
  how5Sub: 'यूज़र को अगला कदम और ज़रूरी संसाधन मिलते हैं ताकि वे कार्रवाई कर सकें।',
  howBanner: 'हर भारतीय तक, हर भाषा में तकनीक पहुँचाना।',

  featTitle: 'शक्तिशाली विशेषताएँ',
  featSub: 'भारत की बेहतर सेवा के लिए हमने जो बनाया।',
  feat1Title: 'बहु-भाषा सपोर्ट',
  feat1Sub: 'अपनी भाषा में बोलें — हिंदी, अंग्रेज़ी और हिंग्लिश, सहज मिश्रण में।',
  feat2Title: 'स्वाभाविक बातचीत',
  feat2Sub: 'इंसान की तरह बात करें। यह संदर्भ और मंशा समझता है।',
  feat3Title: 'रियल-टाइम वॉइस',
  feat3Sub: 'सहज, इंसानों जैसी बातचीत के लिए रियल-टाइम वॉइस।',
  feat4Title: 'सही जानकारी',
  feat4Sub: 'योजनाओं, GST और बिज़नेस पर भरोसेमंद स्रोतों से जानकारी पाएँ।',
  feat5Title: '24/7 उपलब्धता',
  feat5Sub: 'कभी भी, कहीं भी हमेशा उपलब्ध। यह कभी नहीं सोता।',
  feat6Title: 'सुरक्षित और निजी',
  feat6Sub: 'OTP, PIN या बैंक डिटेल कभी नहीं पूछी जाती। आपकी निजता सबसे पहले।',
  feat7Title: 'कम बैंडविड्थ में भी',
  feat7Sub: 'ग्रामीण भारत के लिए बेहतर। धीमे नेटवर्क पर भी चलता है।',
  feat8Title: 'उपयोग में आसान',
  feat8Sub: 'कोई ऐप इंस्टॉल नहीं, कोई टाइपिंग नहीं। बस टैप करें और बोलें।',
  feat9Title: 'लगातार बेहतर होता',
  feat9Sub: 'आपकी बेहतर सेवा के लिए हम हर दिन सुधार करते हैं।',
  featCtaText: 'कोई सवाल है? हमारे वॉइस एजेंट को कॉल करें और खुद आज़माएँ!',
  featCtaBtn: 'अभी कॉल करें',

  techTitle: 'टेक स्टैक',
  techSub: 'आधुनिक, स्केलेबल और ओपन सोर्स।',
  techGroupVoice: 'AI और वॉइस',
  techGroupOrchestration: 'एजेंट ऑर्केस्ट्रेशन',
  techGroupData: 'स्पीच और भाषा',
  techGroupFrontend: 'फ्रंटएंड और डिप्लॉयमेंट',
  techBuiltWith: 'भारत के लिए ❤️ से बनाया',
  techBuiltWithSub: 'ओपन सोर्स। समुदाय संचालित। प्रभाव पर केंद्रित।',

  aboutTitle: 'Voice for Bharat के बारे में',
  aboutIntro:
    'Voice for Bharat एक ओपन पहल है जो AI वॉइस एजेंट बनाती है, ताकि ग्रामीण भारत को उसकी अपनी भाषा में जानकारी मिल सके।',
  missionTitle: 'हमारा मिशन',
  missionSub: 'भाषा की बाधा तोड़कर तकनीक को हर भारतीय तक पहुँचाना।',
  visionTitle: 'हमारा विज़न',
  visionSub: 'एक ऐसा भारत जहाँ हर किसी को जानकारी और अवसरों तक समान पहुँच हो।',
  valuesTitle: 'हमारे मूल्य',
  valuesSub: 'समावेशिता, पारदर्शिता, निजता और समुदाय का सशक्तिकरण।',
  whyTitle: 'हमने इसे क्यों बनाया',
  whySub:
    'ग्रामीण भारत के लाखों दुकानदारों को जानकारी पाने में बाधाएँ आती हैं — भाषा, साक्षरता और डिजिटल जटिलता। आवाज़ सबसे स्वाभाविक माध्यम है, और हमें विश्वास है कि यह इस खाई को पाट सकती है।',
  joinTitle: 'हमारे मिशन से जुड़ें',
  joinSub: 'रेपो को स्टार करें, योगदान दें, या हमारे साथ बनाएँ। आइए मिलकर भारत के लिए तकनीक बनाएँ।',
  joinStar: 'GitHub पर स्टार करें',
  joinContribute: 'योगदान दें',

  footerTagline: 'हर भारतीय दुकानदार के लिए वॉइस AI।',
  footerRights: 'Murf Falcon चैलेंज के लिए बनाया गया।',

  navMemory: 'याददाश्त',
  memTitle: 'ऐसी याददाश्त जो बनी रहे',
  memSub:
    'दुकानसाथी कॉल के बीच दुकानदारों को याद रखता है। लौटने वाले दुकानदार को नाम से नमस्ते कहता है और वहीं से बात आगे बढ़ाता है जहाँ छोड़ी थी — आपकी अनुमति से, और कभी कोई संवेदनशील जानकारी नहीं।',
  memDbNote:
    'यह एजेंट के अपने मेमोरी स्टोर (SQLite) का लाइव डेटा है। ये असली याद किए गए कॉलर हैं — कुछ भी नकली नहीं।',
  memRefresh: 'रीफ़्रेश',
  memLoading: 'याद किए गए कॉलर लोड हो रहे हैं…',
  memEmptyTitle: 'अभी कोई कॉलर याद नहीं',
  memEmptySub:
    'जब कोई कॉलर दुकानसाथी को खुद को याद रखने की अनुमति देता है, उसकी प्रोफ़ाइल यहाँ दिखेगी। बातचीत कीजिए और जब यह याद रखने को कहे तो हाँ कहिए।',
  memCallers: 'याद किए गए कॉलर',
  memUnknown: 'बिना नाम का कॉलर',
  memLangEn: 'अंग्रेज़ी',
  memLangHi: 'हिंदी',
  memNoFacts: 'अभी कोई जानकारी सहेजी नहीं',
  memLastSeen: 'पिछली बात',
  memNever: 'अज्ञात',
  memForget: 'भूल जाओ',
  memForgetConfirm: 'इस कॉलर को भूल जाएँ और उसका सहेजा डेटा मिटा दें?',
  memToolsTitle: 'एजेंट कैसे याद रखता है',
  memToolsSub:
    'एजेंट ये टूल खुद इस्तेमाल करता है — यादें डेटाबेस में रहती हैं, प्रॉम्प्ट में नहीं।',
  memTool1Desc: 'अभी लाइन पर मौजूद कॉलर के बारे में जो पता है वह याद करता है।',
  memTool2Desc: 'नाम, भाषा और बिज़नेस की बातें सहेजता है — सिर्फ़ कॉलर की सहमति के बाद।',
  memTool3Desc: 'जब कॉलर कहे कि उसे भूल जाओ, तो उसका सहेजा सब कुछ मिटा देता है।',
  memTool4Desc:
    'कॉलर का दिया ऑर्डर दर्ज करता है और अगली बार के लिए उसे उसकी usual के रूप में याद रखता है।',
  memTool5Desc: 'दुकान की अपनी सूची में सामान ढूँढता है — उसका दाम और स्टॉक में है या नहीं।',
  memTool6Desc:
    'दुकान के दाम पर ऑर्डर का कुल जोड़ता है, और जो स्टॉक में नहीं या नहीं मिलता उसे बताता है।',
  memConsentTitle: 'सहेजने से पहले सहमति',
  memConsentSub:
    'एजेंट सहेजने से पहले हमेशा पूछता है “क्या मैं यह आपके लिए याद रख लूँ?”। आप मना करें तो कुछ नहीं सहेजा जाता। OTP, PIN, आधार और बैंक नंबर कभी नहीं सहेजे जाते।',
  memPersistTitle: 'रीस्टार्ट के बाद भी बनी रहती है',
  memPersistSub:
    'यादें डिस्क पर सहेजी जाती हैं, इसलिए एक कॉल में बताई बात अगली कॉल में भी मौजूद रहती है — एजेंट के रीस्टार्ट होने के बाद भी।',
  memScriptTitle: 'आपकी लिपि में बोलता और याद रखता है',
  memScriptSub:
    'लौटने वाले कॉलर का स्वागत उसकी अपनी भाषा और लिपि में होता है — “नमस्ते रमेश जी! पिछली बार हमने UPI QR के बारे में बात की थी।”',

  dashName: 'डैशबोर्ड',
  dashBack: 'साइट पर वापस',
  dnProfiles: 'कॉलर प्रोफ़ाइल',
  dnMemory: 'मेमोरी और डेटा',
  dnTools: 'मेमोरी टूल्स',
  dnConsent: 'सहमति',
  dnReturning: 'लौटने वाले कॉलर',
  dnMultilingual: 'बहुभाषी',

  cpTitle: 'कॉलर प्रोफ़ाइल',
  cpSub: 'एजेंट ने जो कॉलर जानकारी याद रखी है उसे देखें और प्रबंधित करें।',
  cpSearchPh: 'नाम या ID से कॉलर खोजें…',
  cpAllLangs: 'सभी भाषाएँ',
  statTotal: 'कुल कॉलर',
  statNamed: 'नाम वाले कॉलर',
  statWithFacts: 'सहेजी जानकारी वाले',
  statHindi: 'हिंदी बोलने वाले',
  cpView: 'प्रोफ़ाइल देखें',
  cpNoResults: 'आपकी खोज से कोई कॉलर मेल नहीं खाता।',

  cdBack: 'कॉलर प्रोफ़ाइल पर वापस',
  cdUserId: 'कॉलर ID',
  cdLanguage: 'भाषा',
  cdLastInteraction: 'पिछली बातचीत',
  cdFactsTitle: 'एजेंट को क्या याद है',
  cdEdit: 'संपादित करें',
  cdDelete: 'प्रोफ़ाइल मिटाएँ',
  cdSave: 'बदलाव सहेजें',
  cdCancel: 'रद्द करें',
  cdNameLabel: 'नाम',
  cdLangLabel: 'भाषा प्राथमिकता',
  cdRemoveFact: 'हटाएँ',
  cdSaving: 'सहेजा जा रहा है…',
  cdNoFactsHint: 'एजेंट ने इस कॉलर के लिए अभी कोई जानकारी नहीं सहेजी है।',

  mdTitle: 'मेमोरी और डेटा प्रबंधन',
  mdSub: 'कॉलर की जानकारी कैसे सहेजी और रखी जाती है।',
  mdStoreTitle: 'डेटाबेस स्थिति',
  mdEngine: 'स्टोरेज इंजन',
  mdStatus: 'स्थिति',
  mdConnected: 'जुड़ा हुआ',
  mdOffline: 'अभी नहीं बना',
  mdRecords: 'कॉलर रिकॉर्ड',
  mdSize: 'इस्तेमाल स्टोरेज',
  mdDriver: 'ड्राइवर',
  mdPersistTitle: 'स्थायी मेमोरी',
  mdPersistBody:
    'कॉलर प्रोफ़ाइल डिस्क पर एक ही SQLite फ़ाइल में लिखी जाती हैं, इसलिए कॉलर ने जो बताया वह एजेंट के पूरे रीस्टार्ट के बाद भी बना रहता है। एक ही टेबल है — callers — हर याद किए कॉलर के लिए एक पंक्ति।',
  mdBackupTitle: 'बैकअप',
  mdBackupBody:
    'कोई स्वचालित बैकअप सेट नहीं है। पूरा स्टोर एक फ़ाइल है (backend/data/memory.db) — बैकअप के लिए बस उस फ़ाइल की कॉपी बना लें।',

  mtTitle: 'मेमोरी टूल्स',
  mtSub:
    'ये फ़ंक्शन एजेंट कॉलर को याद रखने के लिए खुद कॉल करता है — यादें डेटाबेस में रहती हैं, प्रॉम्प्ट में नहीं।',
  mtInput: 'इनपुट',
  mtOutput: 'आउटपुट',
  mtNote:
    'बातचीत के दौरान इन्हें कब कॉल करना है यह एजेंट तय करता है। कॉलर की सहमति के बिना कुछ नहीं सहेजा जाता।',

  coTitle: 'सहमति प्रबंधन',
  coSub: 'एजेंट कोई भी निजी जानकारी याद रखने से पहले अनुमति माँगता है।',
  coPromptTitle: 'सहमति का सवाल',
  coNeverTitle: 'कभी नहीं सहेजा जाता',
  coNeverBody:
    'OTP, PIN, आधार नंबर और बैंक डिटेल कभी नहीं सहेजे जाते — सिर्फ़ नाम, भाषा और कुछ बिज़नेस बातें।',
  coRefuse: 'अगर कॉलर मना करे, तो उसकी जानकारी नहीं सहेजी जाती।',

  reTitle: 'लौटने वाले कॉलर का अनुभव',
  reSub: 'एजेंट पहले मिल चुके कॉलर को कैसे पहचानता और नमस्ते कहता है।',
  reStepsTitle: 'पहचान और अभिवादन',
  reStep1: 'कॉलर को उसके स्थायी कॉलर ID से पहचानता है।',
  reStep2: 'lookup_caller से सहेजी गई जानकारी निकालता है।',
  reStep3: 'उसे उसकी भाषा में नाम से नमस्ते कहता है।',
  reStep4: 'शून्य से नहीं, पिछले संदर्भ से बात आगे बढ़ाता है।',
  reExampleTitle: 'उदाहरण अभिवादन',
  reExampleFirstLabel: 'पहली कॉल',
  reExampleReturnLabel: 'लौटने वाली कॉल',
  reNote: 'एजेंट शुरू से नहीं शुरू करता — वहीं से आगे बढ़ता है जहाँ आपने छोड़ा था।',

  mlTitle: 'बहुभाषी सपोर्ट',
  mlSub: 'स्वचालित भाषा पहचान के साथ मूल-लिपि में जवाब।',
  mlDetectTitle: 'भाषा पहचान',
  mlDetectBody:
    'स्पीच-टू-टेक्स्ट Deepgram Nova-3 को language="multi" के साथ चलाता है, इसलिए कॉलर पहले भाषा चुने बिना हिंदी, अंग्रेज़ी या मिश्रण में बोल सकता है।',
  mlScriptTitle: 'मूल लिपि, लिप्यंतरण नहीं',
  mlScriptBody:
    'हर भाषा अपनी लिपि में लिखी जाती है — हिंदी के जवाब देवनागरी (नमस्ते) में आते हैं, कभी रोमन “namaste” में नहीं।',
  mlExamplesTitle: 'मूल-लिपि उदाहरण',
};

const dictionaries: Record<Language, Dict> = { en, hi };

export function t(lang: Language): Dict {
  return dictionaries[lang];
}
