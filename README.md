# MUCOSA Career Day 2026

React + TypeScript + Vite + Tailwind CSS, managed with pnpm. Photos are decoded, cropped, rendered, and exported entirely in the visitor’s browser. No accounts, database, or image-upload endpoint.

## Development

```sh
pnpm install
pnpm dev
```

## Production

```sh
pnpm build
pnpm preview
```

## Cloudflare Workers

The included `wrangler.jsonc` serves the `dist` build through Workers Static Assets.

```sh
pnpm exec wrangler login
pnpm deploy
```

After the first deployment, open Cloudflare → Workers & Pages → mucosa-career-day → Settings → Domains & Routes → Add → Custom Domain. Enter the chosen subdomain under the MUCOSA domain in your Cloudflare account. Alternatively add `routes: [{ pattern: "YOUR-CHOSEN-SUBDOMAIN.YOUR-DOMAIN", custom_domain: true }]` to `wrangler.jsonc` after replacing the placeholder with the actual domain. Do not deploy that placeholder.

The actual MUCOSA domain and Cloudflare account are intentionally not guessed. Deployment requires an authenticated Cloudflare account and access to its DNS zone.

## Branding and content

- Change `EVENT_DATE` in `src/event.ts` (YYYY-MM-DD) to update every event date: landing page, preview artwork, editor exports, sharing caption, and page metadata. Rebuild and redeploy after changing it. Dates use UTC so visitors in different timezones see the same day.

- The palette is **provisional**, from the supplied brief, and is not verified official MUCOSA branding. UI tokens are in `src/style.css`; canvas color tokens are in `src/flyer.ts`.
- MUCOSA/MUST branding uses text. The decorative `m` is a temporary interface mark, not an institutional logo. Replace it with official assets when available and add approved logos to the canvas renderer if desired.
- Event details and program copy are in `src/main.tsx`; exported event details are in `src/flyer.ts`.
- No confirmed participant or speaker endorsements are implied.
- Font requests use Google Fonts; images are never sent there. Export waits for fonts to load and falls back to Arial offline.

## Features

- JPG, PNG, WebP upload with size/type/decode validation
- Three campaign designs and four attendance messages
- Optional name, role, and tagline
- Drag photo positioning plus accessible horizontal, vertical, and zoom sliders
- Exact PNG sizes: portrait 1080×1350, square 1080×1080, story 1080×1920
- Native file sharing where supported; PNG download fallback
- Copyable suggested caption
- Mobile editing steps, keyboard controls, reduced-motion support

Background removal is not included; portraits retain their background.

## Manual release checks

1. Upload JPG, PNG, and WebP; reject unsupported or oversized files.
2. Drag, zoom, and adjust both position sliders; replace/remove/reset the photo.
3. Enter optional fields and switch all designs, messages, and formats.
4. Download each format and confirm exact PNG dimensions and visible event information.
5. On a mobile browser, verify editing steps, file sharing (or fallback download), and caption copy.
6. Verify that image data never appears in network requests.
