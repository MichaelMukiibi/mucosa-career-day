import { useState, useSyncExternalStore } from 'react';

import { telemetry } from './analytics';


export function TelemetryPreferences() {
  const consent = useSyncExternalStore(
    telemetry.subscribe,
    telemetry.getConsent,
    () => 'automatic',
  );
  const [open, setOpen] = useState(true);
  if (!telemetry.isConfigured()) return null;
  const blocked = telemetry.isPrivacyBlocked();
  const choose = (value: 'granted' | 'denied') => {
    void telemetry.setConsent(value);
    setOpen(false);
  };
  return (
    <div className="telemetry-preferences">
      <button
        className="text-link"
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        Analytics preferences
      </button>
      {open && (
        <section className="telemetry-notice" aria-label="Analytics notice">
          <h2>
            {blocked || consent === 'denied'
              ? 'Analytics is off.'
              : 'We use analytics to improve MUCOSA.'}
          </h2>
          <p>
            This site automatically measures page visits, selected button
            clicks, and page performance using PostHog. We don’t record your
            screen or form entries. You can turn analytics off at any time
            through Analytics preferences.
          </p>
          {blocked ? (
            <p>
              Your browser’s privacy preference is enabled. Analytics is off.
            </p>
          ) : (
            <div className="button-row">
              <button
                className="button button-primary"
                type="button"
                onClick={() =>
                  consent === 'denied' ? choose('granted') : setOpen(false)
                }
              >
                {consent === 'denied' ? 'Turn on analytics' : 'Got it'}
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => choose('denied')}
              >
                Turn off analytics
              </button>
            </div>
          )}
          <button
            className="text-link"
            type="button"
            onClick={() => setOpen(false)}
          >
            Dismiss notice
          </button>
        </section>
      )}
    </div>
  );
}


