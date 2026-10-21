import { createTelemetry } from './telemetry-core.js';
const env = (import.meta as ImportMeta & { env: Record<string, string | boolean | undefined> }).env;
let storage: Storage | undefined;
try { storage = globalThis.localStorage; } catch { /* Storage is optional. */ }
export const telemetry = createTelemetry({
  enabled: env.VITE_TELEMETRY_ENABLED === 'true' && (env.PROD || env.VITE_TELEMETRY_ALLOW_DEV === 'true'),
  key: env.VITE_POSTHOG_KEY,
  host: env.VITE_POSTHOG_HOST,
  environment: env.VITE_TELEMETRY_ENVIRONMENT,
  release: env.VITE_APP_RELEASE,
  origin: globalThis.location?.origin,
  initialPath: globalThis.location?.pathname,
  storage,
  privacySignal: () => (globalThis.navigator as Navigator & { globalPrivacyControl?: boolean })?.globalPrivacyControl === true || globalThis.navigator?.doNotTrack === '1',
  sanitizePath: (path: string) => path === '/' ? '/' : '/not-found',
  loadProvider: async () => (await import('posthog-js/dist/module.no-external')).default,
  loadVitals: () => import('web-vitals'),
});
export const trackEvent = (name: string, properties?: Record<string, unknown>) => telemetry.trackEvent(name, properties);
void telemetry.init();
telemetry.pageview(globalThis.location?.pathname || '/');
