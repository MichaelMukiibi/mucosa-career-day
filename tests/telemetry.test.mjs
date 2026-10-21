import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTelemetry,
  CONSENT_KEY,
  sanitizeEvent,
} from '../src/telemetry-core.js';

function setup(overrides = {}) {
  const calls = [];
  const observers = {};
  const store = new Map();
  let loads = 0;
  const sdk = {
    init: (...args) => calls.push(['init', ...args]),
    capture: (...args) => calls.push(['capture', ...args]),
    identify: (...args) => calls.push(['identify', ...args]),
    reset: () => calls.push(['reset']),
    opt_in_capturing: () => calls.push(['optin']),
    opt_out_capturing: () => calls.push(['optout']),
  };
  const telemetry = createTelemetry({
    enabled: true,
    collectionMode: 'opt-in',
    key: 'phc_test',
    host: 'https://us.i.posthog.com',
    environment: 'test',
    release: 'test-sha',
    origin: 'https://mucosa.test',
    initialPath: '/',
    storage: {
      getItem: (key) => store.get(key),
      setItem: (key, value) => store.set(key, value),
    },
    loadProvider: async () => {
      loads++;
      return sdk;
    },
    loadVitals: async () =>
      Object.fromEntries(
        ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'].map((name) => [
          `on${name}`,
          (callback) => {
            observers[name] = callback;
          },
        ]),
      ),
    ...overrides,
  });
  return {
    telemetry,
    calls,
    observers,
    store,
    sdk,
    loads: () => loads,
    events: () => calls.filter(([method]) => method === 'capture'),
  };
}

test('disabled or unconfigured telemetry never loads an SDK or sends data', async () => {
  for (const overrides of [
    { enabled: false },
    { key: '' },
    { host: '' },
    { host: 'http://unsafe.test' },
    { environment: '' },
  ]) {
    const t = setup(overrides);
    t.telemetry.pageview('/');
    await t.telemetry.setConsent('granted');
    assert.equal(t.loads(), 0);
    assert.equal(t.telemetry.trackEvent('cta_clicked'), false);
  }
});

test('nothing is collected before consent, including pre-consent interactions', async () => {
  const t = setup();
  t.telemetry.pageview('/');
  t.telemetry.trackEvent('cta_clicked', { destination: '/programs' });
  await t.telemetry.init();
  assert.equal(t.loads(), 0);
  await t.telemetry.setConsent('granted');
  assert.deepEqual(
    t.events().map((event) => event[1]),
    ['$pageview'],
  );
  assert.equal(t.store.get(CONSENT_KEY), 'granted');
});

test('automatic mode starts on arrival without consent and labels the site', async () => {
  const t = setup({ collectionMode: 'automatic' });
  t.telemetry.pageview('/');
  await t.telemetry.init();
  assert.equal(t.telemetry.getConsent(), 'automatic');
  assert.equal(t.loads(), 1);
  assert.deepEqual(
    t.events().map((event) => event[1]),
    ['$pageview'],
  );
  assert.equal(t.events()[0][2].site_host, 'mucosa.test');
  assert.equal(t.store.has(CONSENT_KEY), false);
});

test('automatic mode respects saved opt-outs and browser privacy signals', async () => {
  for (const overrides of [
    { storage: { getItem: () => 'denied' } },
    { privacySignal: () => true },
  ]) {
    const t = setup({ collectionMode: 'automatic', ...overrides });
    t.telemetry.pageview('/');
    await t.telemetry.init();
    assert.equal(t.loads(), 0);
    assert.equal(t.telemetry.trackEvent('cta_clicked'), false);
  }
});

test('automatic mode can be turned off and restarted explicitly', async () => {
  const t = setup({ collectionMode: 'automatic' });
  await t.telemetry.init();
  await t.telemetry.setConsent('denied');
  assert.equal(t.telemetry.trackEvent('cta_clicked'), false);
  await t.telemetry.setConsent('granted');
  assert.equal(t.telemetry.trackEvent('cta_clicked'), true);
});

test('pageviews are deduplicated for StrictMode but count genuine return visits', async () => {
  const t = setup();
  t.telemetry.pageview('/?email=private@example.com#private');
  await Promise.all([t.telemetry.setConsent('granted'), t.telemetry.init()]);
  await t.telemetry.init();
  t.telemetry.pageview('/');
  t.telemetry.pageview('/programs?secret=123');
  t.telemetry.pageview('/');
  assert.equal(t.loads(), 1);
  assert.deepEqual(
    t.events().map((e) => e[2].$pathname),
    ['/', '/programs', '/'],
  );
  assert.equal(t.events()[0][2].$current_url, 'https://mucosa.test/');
  assert.equal(t.events()[0][2].environment, 'test');
  assert.equal(t.events()[0][2].release, 'test-sha');
});

test('route changes while SDK loads send only the current page', async () => {
  let resolve;
  const pending = new Promise((done) => {
    resolve = done;
  });
  const t = setup({ loadProvider: () => pending });
  t.telemetry.pageview('/');
  const init = t.telemetry.setConsent('granted');
  t.telemetry.pageview('/news');
  resolve(t.sdk);
  await init;
  assert.deepEqual(
    t.events().map((event) => event[2].$pathname),
    ['/news'],
  );
});

test('denial during asynchronous SDK loading prevents initialization', async () => {
  let resolve;
  const pending = new Promise((done) => {
    resolve = done;
  });
  const t = setup({ loadProvider: () => pending });
  const granting = t.telemetry.setConsent('granted');
  const denying = t.telemetry.setConsent('denied');
  resolve(t.sdk);
  await Promise.all([granting, denying]);
  assert.equal(t.calls.length, 0);
});

test('revocation stops tracking; re-consent restarts without duplicate observers', async () => {
  const t = setup();
  t.telemetry.pageview('/');
  await t.telemetry.setConsent('granted');
  const lcp = t.observers.LCP;
  await t.telemetry.setConsent('denied');
  assert.equal(t.telemetry.trackEvent('cta_clicked'), false);
  assert.equal(
    t.telemetry.recordMetric({
      name: 'LCP',
      value: 1,
      rating: 'good',
      id: 'blocked',
    }),
    false,
  );
  assert.equal(t.store.get(CONSENT_KEY), 'denied');
  assert.equal(t.calls.at(-1)[0], 'optout');
  await t.telemetry.setConsent('granted');
  assert.equal(
    t.telemetry.trackEvent('cta_clicked', { destination: '/programs' }),
    true,
  );
  assert.equal(t.observers.LCP, lcp);
});

test('GPC/DNT privacy signal prevents collection even with saved consent', async () => {
  const t = setup({ privacySignal: () => true });
  await t.telemetry.setConsent('granted');
  assert.equal(t.loads(), 0);
});

test('storage exceptions and SDK failures do not escape into the app', async () => {
  const t = setup({
    storage: {
      getItem() {
        throw Error();
      },
      setItem() {
        throw Error();
      },
    },
    loadProvider: async () => {
      throw Error('blocked');
    },
  });
  assert.equal(await t.telemetry.setConsent('granted'), false);
  assert.equal(t.telemetry.trackEvent('cta_clicked'), false);
  const failing = setup();
  await failing.telemetry.setConsent('granted');
  failing.sdk.capture = () => {
    throw Error('network unavailable');
  };
  assert.equal(failing.telemetry.trackEvent('cta_clicked'), false);
});

test('all five metrics include units and document route, never duplicate IDs', async () => {
  const t = setup();
  await t.telemetry.setConsent('granted');
  t.telemetry.pageview('/programs');
  for (const name of ['LCP', 'INP', 'CLS', 'FCP', 'TTFB']) {
    const metric = {
      name,
      value: 0.1,
      rating: 'good',
      id: name,
      navigationType: 'navigate',
    };
    t.observers[name](metric);
    t.observers[name](metric);
  }
  const metrics = t.events().filter((event) => event[1] === 'web_vital');
  assert.equal(metrics.length, 5);
  assert.ok(metrics.every((event) => event[2].page_path === '/'));
  assert.equal(
    metrics.find((event) => event[2].metric_name === 'CLS')[2].unit,
    'score',
  );
  assert.equal(
    metrics.find((event) => event[2].metric_name === 'LCP')[2].unit,
    'ms',
  );
});

test('event schema strips arbitrary and sensitive properties; identity accepts internal IDs only', async () => {
  const t = setup();
  await t.telemetry.setConsent('granted');
  assert.equal(t.telemetry.trackEvent('arbitrary', {}), false);
  t.telemetry.trackEvent('cta_clicked', {
    destination: '/programs',
    email: 'secret@example.com',
    source: 'secret@example.com',
  });
  assert.equal(t.events()[0][2].email, undefined);
  assert.equal(t.events()[0][2].source, '/');
  assert.equal(t.telemetry.identify('secret@example.com'), false);
  assert.equal(t.telemetry.identify('member_123'), true);
});

test('SDK defaults disable automatic capture, replay, remote add-ons and surveys', async () => {
  const t = setup();
  await t.telemetry.setConsent('granted');
  const options = t.calls.find(([method]) => method === 'init')[2];
  for (const key of [
    'autocapture',
    'capture_pageview',
    'capture_pageleave',
    'capture_performance',
    'capture_exceptions',
  ])
    assert.equal(options[key], false);
  assert.equal(options.disable_session_recording, true);
  assert.equal(options.disable_external_dependency_loading, true);
  assert.equal(options.disable_surveys, true);
});

test('SDK-generated URL attribution is sanitized, including initial person properties', () => {
  const sanitizePath = (path) =>
    ['/', '/news'].includes(path) ? path : '/not-found';
  const event = sanitizeEvent(
    {
      event: '$pageview',
      properties: {
        $current_url: 'https://mucosa.test/news?email=secret#token',
        $referrer: 'https://search.test/private?token=secret',
        $pathname: '/secret@example.com',
        $set_once: {
          $initial_current_url: 'https://mucosa.test/?email=secret',
          $initial_utm_source: 'secret',
        },
        $title: 'private title',
      },
    },
    'https://mucosa.test',
    sanitizePath,
  );
  assert.equal(event.properties.$current_url, 'https://mucosa.test/news');
  assert.equal(event.properties.$referrer, 'https://search.test');
  assert.equal(event.properties.$pathname, '/not-found');
  assert.equal(
    event.properties.$set_once.$initial_current_url,
    'https://mucosa.test/',
  );
  assert.equal(event.properties.$set_once.$initial_utm_source, undefined);
  assert.equal(event.properties.$title, undefined);
  const vital = sanitizeEvent(
    {
      event: 'web_vital',
      properties: {
        metric_name: 'LCP',
        value: 123,
        page_path: '/',
        rating: 'good',
      },
    },
    'https://mucosa.test',
    sanitizePath,
  );
  assert.equal(vital.properties.metric_name, 'LCP');
  assert.equal(vital.properties.value, 123);
});

