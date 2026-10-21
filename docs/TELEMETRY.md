# Flyer creator analytics

Use the same PostHog public project key and ingestion host as the main MUCOSA site.
Copy `.env.example` to `.env.local` for local builds, or put the values in the
Cloudflare BUILD environment:

```env
VITE_TELEMETRY_ENABLED=true
VITE_POSTHOG_KEY=phc_your_project_key
VITE_POSTHOG_HOST=https://us.i.posthog.com
VITE_TELEMETRY_ENVIRONMENT=production
VITE_APP_RELEASE=your_git_commit_sha
VITE_TELEMETRY_ALLOW_DEV=false
```

Use `https://eu.i.posthog.com` for an EU project. Rebuild after changing values.
Worker runtime bindings alone cannot configure this static Vite frontend.

When configured, analytics starts automatically on arrival. A fixed informational
notice explains collection and provides Got it and Turn off analytics buttons.
Dismissing the notice does not change collection or imply consent. Preferences
can be reopened using Analytics preferences. Saved opt-outs and GPC/Do Not Track
are respected. The notice appears on every full document visit.

`src/analytics.ts` initializes the provider-independent `src/telemetry-core.js`.
No analytics SDK loads when configuration is missing or collection is blocked.
SDK failures do not interrupt the flyer editor. Automatic capture, recording,
remote add-ons, and surveys are disabled. All five Web Vitals are recorded when
the browser supports them. Document metrics are not SPA transition timings.

## Events

- `$pageview`: one initial document visit.
- `web_vital`: LCP, INP, CLS, FCP, TTFB with metric ID, value, rating, and unit.
- `flyer_downloaded`: after PNG creation and invoking the browser download.
- `flyer_shared`: only after native sharing resolves successfully. Canceled shares
  do not count; browsers without native sharing use the download event instead.

Events include `environment`, `release`, and `site_host`. Filter or break down
`site_host` in the same PostHog project to separate the main site and flyer site.
Names, roles, photos, captions, filenames, and flyer contents are not sent.
URL query strings and fragments are removed. PostHog receives ordinary request
metadata; review IP handling and retention in the project's settings.

Identity and opt-out preferences use localStorage and are separate per origin.
This implementation combines dashboards, not individual cross-domain identities.

## Verify

Run `pnpm test:telemetry` and `pnpm build`.
Open a production preview or deployment with the build variables configured.
On a fresh visit, check PostHog Live events for `$pageview` before clicking Got it.
Create and download a flyer; check for `flyer_downloaded` without any photo/name
properties. Turn analytics off, reload, and confirm collection remains off.
Use a test PostHog project if setting `VITE_TELEMETRY_ALLOW_DEV=true` locally.
For a dashboard, add visitors/pageviews, `site_host` breakdown, export counts, and
p75 `web_vital.value` grouped by `metric_name`. CLS is a score; other units are ms.
