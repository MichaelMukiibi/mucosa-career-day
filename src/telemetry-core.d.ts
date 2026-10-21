export interface Telemetry {
  isConfigured(): boolean;
  isPrivacyBlocked(): boolean;
  getConsent(): string;
  subscribe(listener: () => void): () => void;
  init(): Promise<boolean>;
  setConsent(value: 'granted' | 'denied'): Promise<boolean>;
  pageview(path: string): void;
  trackEvent(name: string, properties?: Record<string, unknown>): boolean;
}
export function createTelemetry(options: Record<string, unknown>): Telemetry;
