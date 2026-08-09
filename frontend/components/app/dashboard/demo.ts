// ⚠️ ALL data in this file is illustrative sample data for UI surfaces that do not
// have a live backend yet. Anything rendered from here MUST wear a <DemoBadge/>.
// The ONLY real data in this dashboard comes from useCallers() (SQLite caller
// memory) and the LiveKit voice session. Keeping the fake data quarantined here
// makes the real/mock boundary obvious and the future backend swap mechanical.

export type Track = 'agriculture' | 'commerce' | 'finance' | 'health' | 'general';

// ---------------- Live conversation (mockup's default tab) ----------------
export type ConvoTurn = {
  who: 'agent' | 'caller';
  native: string;
  translation: string;
  at: string; // display time
};

export const DEMO_CONVERSATION: ConvoTurn[] = [
  {
    who: 'agent',
    native: 'नमस्ते रमेश जी! फिर से आपकी दुकान पर स्वागत है। आज मैं क्या मदद कर सकता हूँ?',
    translation: 'Hello Ramesh ji! Welcome back to your shop. How can I help you today?',
    at: '02:01',
  },
  {
    who: 'caller',
    native: 'मुझे कपास के बीज के दाम जानने हैं।',
    translation: 'I want to know the price of cotton seeds.',
    at: '02:06',
  },
  {
    who: 'agent',
    native: 'कपास के बीज ₹1,200 प्रति पैकेट हैं और अभी स्टॉक में हैं। कितने पैकेट चाहिए?',
    translation:
      'Cotton seeds are ₹1,200 per packet and currently in stock. How many packets would you like?',
    at: '02:09',
  },
  {
    who: 'caller',
    native: 'तीन पैकेट दे दीजिए।',
    translation: 'Give me three packets.',
    at: '02:13',
  },
];

// ---------------- Call insights / debug (mockup tabs) ----------------
export const DEMO_INSIGHTS = [
  { label: 'Detected intent', value: 'Product enquiry → order', tone: 'info' as const },
  { label: 'Sentiment', value: 'Positive', tone: 'success' as const },
  { label: 'Detected language', value: 'Hindi (auto)', tone: 'brand' as const },
  { label: 'Consent', value: 'Granted', tone: 'success' as const },
];

export const DEMO_AGENT_LOGS: { t: string; level: 'info' | 'ok' | 'warn'; msg: string }[] = [
  { t: '02:00', level: 'info', msg: 'Session started · caller matched usr_ramesh_k' },
  { t: '02:00', level: 'ok', msg: 'STT (Deepgram Nova-3) connected · language=multi' },
  { t: '02:01', level: 'ok', msg: 'TTS (Murf Falcon, voice=Anisha) streaming' },
  { t: '02:06', level: 'info', msg: 'tool:lookup_product("cotton seeds") → ₹1,200 · in_stock' },
  { t: '02:13', level: 'warn', msg: 'tool:place_order pending — awaiting confirmation' },
];

export const DEMO_DEBUG = {
  room: 'dukaan-live-7f3a',
  agent: 'dukaan-agent',
  model: 'gemini-1.5 · murf-falcon · deepgram-nova-3',
  vad: 'silero',
  latencyMs: 412,
};

// ---------------- Live calls ----------------
export const DEMO_LIVE_CALLS = [
  {
    id: 'c1',
    name: 'Ramesh Kumar',
    phone: '+91 98765 43210',
    track: 'Agriculture',
    lang: 'हिंदी',
    dur: '02:15',
    state: 'connected' as const,
  },
  {
    id: 'c2',
    name: 'Priya Sharma',
    phone: '+91 91234 56780',
    track: 'Commerce',
    lang: 'हिंदी',
    dur: '00:48',
    state: 'ringing' as const,
  },
  {
    id: 'c3',
    name: 'Anonymous',
    phone: '+91 90000 11122',
    track: 'General',
    lang: 'मराठी',
    dur: '05:32',
    state: 'on-hold' as const,
  },
];

// ---------------- Call history ----------------
export const DEMO_HISTORY = [
  {
    id: 'h1',
    name: 'Ramesh Kumar',
    phone: '+91 98765 43210',
    when: '2026-08-10 09:02',
    dur: '4m 12s',
    track: 'Agriculture',
    outcome: 'order-placed' as const,
    lang: 'हिंदी',
  },
  {
    id: 'h2',
    name: 'Sunita Devi',
    phone: '+91 99887 66554',
    when: '2026-08-10 08:40',
    dur: '2m 05s',
    track: 'Commerce',
    outcome: 'info' as const,
    lang: 'हिंदी',
  },
  {
    id: 'h3',
    name: 'Arjun Patel',
    phone: '+91 90011 22334',
    when: '2026-08-09 18:21',
    dur: '6m 38s',
    track: 'Finance',
    outcome: 'order-placed' as const,
    lang: 'ગુજરાતી',
  },
  {
    id: 'h4',
    name: 'Anonymous',
    phone: '+91 98000 45678',
    when: '2026-08-09 16:03',
    dur: '0m 52s',
    track: 'General',
    outcome: 'missed' as const,
    lang: 'हिंदी',
  },
  {
    id: 'h5',
    name: 'Meena Iyer',
    phone: '+91 93456 12000',
    when: '2026-08-09 12:47',
    dur: '3m 19s',
    track: 'Health',
    outcome: 'info' as const,
    lang: 'தமிழ்',
  },
];

// ---------------- Analytics ----------------
export const DEMO_ANALYTICS = {
  kpis: [
    { label: 'Calls today', value: '86', delta: '+12%', up: true },
    { label: 'Avg. duration', value: '3m 42s', delta: '-8s', up: false },
    { label: 'Resolution rate', value: '78%', delta: '+4%', up: true },
    { label: 'Consent granted', value: '92%', delta: '+1%', up: true },
  ],
  // 14-day call volume — plotted as a simple inline bar chart, no chart lib.
  volume: [34, 41, 38, 52, 47, 61, 58, 66, 72, 69, 74, 81, 77, 86],
  languages: [
    { label: 'Hindi', pct: 58 },
    { label: 'Marathi', pct: 14 },
    { label: 'Gujarati', pct: 11 },
    { label: 'Tamil', pct: 9 },
    { label: 'Bengali', pct: 8 },
  ],
  tracks: [
    { label: 'Agriculture', pct: 44 },
    { label: 'Commerce', pct: 31 },
    { label: 'Finance', pct: 15 },
    { label: 'Health', pct: 10 },
  ],
};

// ---------------- Knowledge base ----------------
export const DEMO_KB = [
  {
    id: 'k1',
    title: 'Cotton seed varieties & pricing',
    track: 'Agriculture',
    chunks: 42,
    updated: '2026-08-08',
  },
  {
    id: 'k2',
    title: 'UPI & QR onboarding for shopkeepers',
    track: 'Finance',
    chunks: 28,
    updated: '2026-08-05',
  },
  {
    id: 'k3',
    title: 'Kharif season fertilizer schedule',
    track: 'Agriculture',
    chunks: 61,
    updated: '2026-08-01',
  },
  {
    id: 'k4',
    title: 'Return & refund policy',
    track: 'Commerce',
    chunks: 17,
    updated: '2026-07-29',
  },
];

// ---------------- Agents ----------------
export const DEMO_AGENTS = [
  {
    id: 'a1',
    name: 'DukaanSaathi — Retail',
    track: 'Commerce',
    voice: 'Anisha (Murf)',
    status: 'online' as const,
    calls: 4210,
  },
  {
    id: 'a2',
    name: 'KisanSaathi — Agriculture',
    track: 'Agriculture',
    voice: 'Anisha (Murf)',
    status: 'online' as const,
    calls: 6380,
  },
  {
    id: 'a3',
    name: 'PaisaSaathi — Finance',
    track: 'Finance',
    voice: 'Anisha (Murf)',
    status: 'draft' as const,
    calls: 0,
  },
];

// ---------------- Integrations ----------------
// status reflects what THIS project actually runs vs. what the mockup lists as
// aspirational. Never render an API key here — name only.
export type IntegrationStatus = 'connected' | 'available' | 'not-configured';
export const DEMO_INTEGRATIONS: {
  name: string;
  role: string;
  status: IntegrationStatus;
  real: boolean;
}[] = [
  {
    name: 'LiveKit Agents',
    role: 'Real-time voice pipeline & session orchestration',
    status: 'connected',
    real: true,
  },
  {
    name: 'Murf Falcon TTS',
    role: 'Streaming text-to-speech (voice: Anisha)',
    status: 'connected',
    real: true,
  },
  { name: 'Deepgram Nova-3', role: 'Multilingual speech-to-text', status: 'connected', real: true },
  { name: 'Google Gemini', role: 'LLM reasoning & responses', status: 'connected', real: true },
  { name: 'Silero VAD', role: 'Voice activity & turn detection', status: 'connected', real: true },
  { name: 'SQLite (node:sqlite)', role: 'Caller memory store', status: 'connected', real: true },
  {
    name: 'PostgreSQL',
    role: 'Production caller store (planned migration)',
    status: 'not-configured',
    real: false,
  },
  { name: 'Pinecone', role: 'Vector search for knowledge base', status: 'available', real: false },
  { name: 'LangChain', role: 'Retrieval & tool orchestration', status: 'available', real: false },
];

// ---------------- Recent conversations (control-center rail) ----------------
export const DEMO_RECENT = [
  {
    id: 'r1',
    name: 'Ramesh Kumar',
    snippet: 'Cotton seed order · 3 packets',
    when: '2m ago',
    track: 'Agriculture',
  },
  {
    id: 'r2',
    name: 'Sunita Devi',
    snippet: 'Asked about UPI QR setup',
    when: '18m ago',
    track: 'Commerce',
  },
  {
    id: 'r3',
    name: 'Arjun Patel',
    snippet: 'Loan eligibility enquiry',
    when: '1h ago',
    track: 'Finance',
  },
];

// Fleet-wide counters shown in the sidebar footer (mockup values).
export const DEMO_FLEET = {
  agentsOnline: '24/7',
  activeAgents: 12,
  callsToday: 86,
  totalCalls: '12,458',
};
