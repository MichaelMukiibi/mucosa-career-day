export const CONSENT_KEY = 'mucosa-analytics-consent';
const METRICS = new Set(['LCP', 'INP', 'CLS', 'FCP', 'TTFB']);
const EVENTS = {
  cta_clicked: ['destination', 'source'],
  event_details_opened: ['event_id', 'source'],
  community_link_clicked: ['destination', 'source'],
  resource_opened: ['destination', 'source'],
  carousel_navigated: ['direction', 'slide_number', 'source'],
  flyer_downloaded: ['format', 'design'],
  flyer_shared: ['format', 'design'],
};

export function cleanUrl(value, origin) {
  try {
    const url = new URL(value, origin);
    if (!['http:', 'https:'].includes(url.protocol)) return undefined;
    return `${url.origin}${url.pathname}`;
  } catch {
    return undefined;
  }
}

// Remove URL parameters from SDK-generated properties too, including initial
// attribution. No page titles, element text, or arbitrary user properties.
export function sanitizeEvent(event, origin, sanitizePath) {
  if (!event) return null;
  const scrub = (properties) =>
    Object.fromEntries(
      Object.entries(properties || {}).flatMap(([key, value]) => {
        if (['$set', '$set_once'].includes(key)) return [[key, scrub(value)]];
        if (/url|referrer/i.test(key) && typeof value === 'string') {
          const cleaned = cleanUrl(value, origin);
          if (!cleaned) return [];
          const url = new URL(cleaned);
          return [
            [
              key,
              /referrer/i.test(key)
                ? url.origin
                : `${url.origin}${sanitizePath(url.pathname)}`,
            ],
          ];
        }
        if (['$pathname', '$initial_pathname'].includes(key))
          return [[key, sanitizePath(value)]];
        if (key === 'metric_name') return [[key, value]];
        if (/email|phone|name|title|search|hash|utm_|gclid|fbclid/i.test(key))
          return [];
        return [[key, value]];
      }),
    );
  return { ...event, properties: scrub(event.properties) };
}

export function createTelemetry({
  enabled = false,
  key,
  host,
  environment,
  release = 'unversioned',
  origin = 'https://localhost',
  initialPath = '/',
  storage,
  collectionMode = 'automatic',
  privacySignal = () => false,
  sanitizePath = (path) => path,
  loadProvider,
  loadVitals,
}) {
  let validHost = false;
  try {
    validHost = new URL(host).protocol === 'https:';
  } catch {
    /* Disabled without a valid host. */
  }
  const configured = Boolean(enabled && key && validHost && environment);
  // Automatic collection is an operating mode, not a claim of user consent.
  // Preserve any explicit opt-out saved by the previous version of the site.
  let consent = collectionMode === 'automatic' ? 'automatic' : 'pending';
  try {
    const saved = storage?.getItem(CONSENT_KEY);
    if (['granted', 'denied'].includes(saved)) consent = saved;
  } catch {
    /* Storage can be blocked in private browsing. */
  }
  let provider;
  let initializing;
  let generation = 0;
  let startedVitals = false;
  let vitalsLoading;
  let currentPath;
  let lastPage;
  const subscribers = new Set();
  const metricIds = new Set();
  const permitted = () =>
    configured &&
    ['automatic', 'granted'].includes(consent) &&
    !privacySignal();
  const notify = () => subscribers.forEach((listener) => listener());
  const safe = (callback) => {
    try {
      return callback();
    } catch {
      return false;
    }
  };
  const capture = (event, properties) => {
    if (!provider || !permitted()) return false;
    return safe(() => {
      provider.capture(event, {
        ...properties,
        environment,
        release,
        site_host: new URL(origin).hostname,
      });
      return true;
    });
  };
  const sendPage = () => {
    if (!currentPath || currentPath === lastPage) return false;
    if (
      !capture('$pageview', {
        $current_url: `${origin}${currentPath}`,
        $pathname: currentPath,
      })
    )
      return false;
    lastPage = currentPath;
    return true;
  };
  const startVitals = async () => {
    if (startedVitals || !loadVitals || !permitted()) return;
    if (vitalsLoading) return vitalsLoading;
    vitalsLoading = (async () => {
      try {
        const vitals = await loadVitals();
        if (!permitted()) return;
        startedVitals = true;
        for (const name of METRICS)
          vitals[`on${name}`]((metric) => api.recordMetric(metric));
      } catch {
        // A blocked metrics chunk must not disable otherwise working analytics.
      } finally {
        vitalsLoading = undefined;
      }
    })();
    return vitalsLoading;
  };

  const api = {
    isConfigured: () => configured,
    isPrivacyBlocked: () => privacySignal(),
    getConsent: () => consent,
    subscribe(listener) {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
    async init() {
      if (!permitted()) return false;
      if (provider) {
        sendPage();
        await startVitals();
        return true;
      }
      if (initializing) return initializing;
      const version = generation;
      initializing = (async () => {
        try {
          const sdk = await loadProvider();
          if (!permitted() || version !== generation) return false;
          sdk.init(key, {
            api_host: host,
            autocapture: false,
            capture_pageview: false,
            capture_pageleave: false,
            capture_performance: false,
            capture_exceptions: false,
            capture_dead_clicks: false,
            rageclick: false,
            disable_session_recording: true,
            disable_surveys: true,
            disable_external_dependency_loading: true,
            advanced_disable_feature_flags: true,
            enable_recording_console_log: false,
            person_profiles: 'identified_only',
            persistence: 'localStorage',
            respect_dnt: true,
            before_send: (event) =>
              permitted() ? sanitizeEvent(event, origin, sanitizePath) : null,
          });
          sdk.opt_in_capturing({ captureEventName: false });
          provider = sdk;
          sendPage();
          await startVitals();
          return true;
        } catch {
          // Analytics is optional: blocked scripts or network failures must not
          // stop navigation, rendering, or the action the visitor requested.
          return false;
        } finally {
          initializing = undefined;
        }
      })();
      return initializing;
    },
    async setConsent(next) {
      if (!['granted', 'denied'].includes(next)) return false;
      consent = next;
      generation += 1;
      try {
        storage?.setItem(CONSENT_KEY, next);
      } catch {
        /* Use in-memory choice. */
      }
      if (next === 'denied') {
        safe(() => provider?.reset());
        safe(() => provider?.opt_out_capturing());
        lastPage = undefined;
      } else {
        safe(() => provider?.opt_in_capturing({ captureEventName: false }));
      }
      notify();
      // An earlier import may still be in flight when consent is changed.
      if (initializing) await initializing;
      return next === 'granted' ? api.init() : true;
    },
    pageview(path) {
      currentPath = sanitizePath(path.split(/[?#]/)[0]);
      if (!sendPage() && permitted()) void api.init();
    },
    trackEvent(name, properties = {}) {
      if (!EVENTS[name]) return false;
      const allowed = Object.fromEntries(
        EVENTS[name].flatMap((key) => {
          const value = properties[key];
          return (typeof value === 'string' &&
            value.length <= 200 &&
            !/[@?#]/.test(value)) ||
            (typeof value === 'number' && Number.isFinite(value))
            ? [[key, value]]
            : [];
        }),
      );
      return capture(name, {
        ...allowed,
        source: currentPath || sanitizePath(initialPath),
      });
    },
    recordMetric(metric) {
      if (
        !METRICS.has(metric.name) ||
        !Number.isFinite(metric.value) ||
        !['good', 'needs-improvement', 'poor'].includes(metric.rating)
      )
        return false;
      if (metricIds.has(metric.id)) return false;
      const sent = capture('web_vital', {
        metric_name: metric.name,
        value: metric.value,
        rating: metric.rating,
        metric_id: metric.id,
        navigation_type: metric.navigationType,
        // These are document metrics, not measurements of SPA route changes.
        page_path: sanitizePath(initialPath),
        unit: metric.name === 'CLS' ? 'score' : 'ms',
      });
      if (sent) metricIds.add(metric.id);
      return sent;
    },
    identify(internalId) {
      if (
        !permitted() ||
        !provider ||
        !/^[a-zA-Z0-9_-]{1,128}$/.test(internalId)
      )
        return false;
      return safe(() => {
        provider.identify(internalId);
        return true;
      });
    },
    reset() {
      return safe(() => {
        provider?.reset();
        return true;
      });
    },
  };
  return api;
}
