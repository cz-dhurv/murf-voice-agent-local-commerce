import type { Language } from '@/lib/i18n';

export interface AppConfig {
  pageTitle: string;
  pageDescription: string;
  companyName: string;

  supportsChatInput: boolean;
  supportsVideoInput: boolean;
  supportsScreenShare: boolean;
  isPreConnectBufferEnabled: boolean;

  logo: string;
  startButtonText: string;
  accent?: string;
  logoDark?: string;
  accentDark?: string;

  // default UI language before the user picks one (persisted client-side)
  defaultLanguage?: Language;

  audioVisualizerType?: 'bar' | 'wave' | 'grid' | 'radial' | 'aura';
  audioVisualizerColor?: `#${string}`;
  audioVisualizerColorDark?: `#${string}`;
  audioVisualizerColorShift?: number;
  audioVisualizerBarCount?: number;
  audioVisualizerGridRowCount?: number;
  audioVisualizerGridColumnCount?: number;
  audioVisualizerRadialBarCount?: number;
  audioVisualizerRadialRadius?: number;
  audioVisualizerWaveLineWidth?: number;

  // agent dispatch configuration
  agentName?: string;

  // LiveKit Cloud Sandbox configuration
  sandboxId?: string;
}

export const APP_CONFIG_DEFAULTS: AppConfig = {
  companyName: 'DukaanSaathi',
  pageTitle: 'DukaanSaathi — Aapka Digital Dukaan Saathi',
  pageDescription:
    'Voice assistant for Indian shopkeepers. UPI, GST, sarkari yojana aur online business — sab kuch bol kar seekhein.',

  supportsChatInput: true,
  supportsVideoInput: false,
  supportsScreenShare: false,
  isPreConnectBufferEnabled: true,

  logo: '/dukaan-logo.svg',
  accent: '#EA580C',
  logoDark: '/dukaan-logo.svg',
  accentDark: '#FB923C',
  startButtonText: 'Baat shuru karein',

  defaultLanguage: 'en',

  // saffron voice bars — matches the shopkeeper brand
  audioVisualizerType: 'bar',
  audioVisualizerColor: '#EA580C',
  audioVisualizerColorDark: '#FB923C',
  audioVisualizerBarCount: 5,

  // agent dispatch configuration
  agentName: process.env.AGENT_NAME ?? undefined,

  // LiveKit Cloud Sandbox configuration
  sandboxId: undefined,
};
