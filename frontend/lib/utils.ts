import { cache } from 'react';
import { TokenSource } from 'livekit-client';
import { APP_CONFIG_DEFAULTS } from '@/app-config';
import type { AppConfig } from '@/app-config';

export const CONFIG_ENDPOINT = process.env.NEXT_PUBLIC_APP_CONFIG_ENDPOINT;
export const SANDBOX_ID = process.env.SANDBOX_ID;

export interface SandboxConfig {
  [key: string]:
    | { type: 'string'; value: string }
    | { type: 'number'; value: number }
    | { type: 'boolean'; value: boolean }
    | null;
}

/**
 * Get the app configuration
 * @param headers - The headers of the request
 * @returns The app configuration
 *
 * @note React will invalidate the cache for all memoized functions for each server request.
 * https://react.dev/reference/react/cache#caveats
 */
export const getAppConfig = cache(async (headers: Headers): Promise<AppConfig> => {
  if (CONFIG_ENDPOINT) {
    const sandboxId = SANDBOX_ID ?? headers.get('x-sandbox-id') ?? '';

    try {
      if (!sandboxId) {
        throw new Error('Sandbox ID is required');
      }

      const response = await fetch(CONFIG_ENDPOINT, {
        cache: 'no-store',
        headers: { 'X-Sandbox-ID': sandboxId },
      });

      if (response.ok) {
        const remoteConfig: SandboxConfig = await response.json();

        const config: AppConfig = { ...APP_CONFIG_DEFAULTS, sandboxId };

        for (const [key, entry] of Object.entries(remoteConfig)) {
          if (entry === null) continue;
          // Only include app config entries that are declared in defaults and, if set,
          // share the same primitive type as the default value.
          if (
            (key in APP_CONFIG_DEFAULTS &&
              APP_CONFIG_DEFAULTS[key as keyof AppConfig] === undefined) ||
            (typeof config[key as keyof AppConfig] === entry.type &&
              typeof config[key as keyof AppConfig] === typeof entry.value)
          ) {
            // @ts-expect-error I'm not sure quite how to appease TypeScript, but we've thoroughly checked types above
            config[key as keyof AppConfig] = entry.value as AppConfig[keyof AppConfig];
          }
        }

        return config;
      } else {
        console.error(
          `ERROR: querying config endpoint failed with status ${response.status}: ${response.statusText}`
        );
      }
    } catch (error) {
      console.error('ERROR: getAppConfig() - lib/utils.ts', error);
    }
  }

  return APP_CONFIG_DEFAULTS;
});

/**
 * Get styles for the app
 * @param appConfig - The app configuration
 * @returns A string of styles
 */
export function getStyles(appConfig: AppConfig) {
  const { accent, accentDark } = appConfig;

  return [
    accent
      ? `:root { --primary: ${accent}; --primary-hover: color-mix(in srgb, ${accent} 80%, #000); }`
      : '',
    accentDark
      ? `.dark { --primary: ${accentDark}; --primary-hover: color-mix(in srgb, ${accentDark} 80%, #000); }`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Stable per-browser id so the agent recognizes a returning caller across calls.
 * Shared by the widget and the token source so both read/create the SAME id.
 */
export function getCallerId(): string {
  const KEY = 'dukaan-caller-id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

/**
 * Primary token source: bakes `caller_id` and `language` into the LiveKit token
 * as participant attributes, so they reach the agent atomically at join instead
 * of being set fire-and-forget after connect (which raced the greeting/first save).
 * localStorage is read at fetch time, so it reflects the current language toggle.
 */
export function getCallerTokenSource(appConfig: AppConfig) {
  return TokenSource.custom(async () => {
    const roomConfig = appConfig.agentName
      ? { agents: [{ agent_name: appConfig.agentName }] }
      : undefined;
    const res = await fetch('/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_config: roomConfig,
        participant_attributes: {
          caller_id: getCallerId(),
          language: localStorage.getItem('dukaan-lang') || '',
        },
      }),
    });
    if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
    return await res.json();
  });
}

/**
 * Get a token source for a sandboxed LiveKit session
 * @param appConfig - The app configuration
 * @returns A token source for a sandboxed LiveKit session
 */
export function getSandboxTokenSource(appConfig: AppConfig) {
  return TokenSource.custom(async () => {
    const url = new URL(process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT!, window.location.origin);
    const sandboxId = appConfig.sandboxId ?? '';
    const roomConfig = appConfig.agentName
      ? {
          agents: [{ agent_name: appConfig.agentName }],
        }
      : undefined;

    try {
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sandbox-Id': sandboxId,
        },
        body: JSON.stringify({
          room_config: roomConfig,
        }),
      });
      return await res.json();
    } catch (error) {
      console.error('Error fetching connection details:', error);
      throw new Error('Error fetching connection details!');
    }
  });
}
