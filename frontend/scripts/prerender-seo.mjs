// Post-build SEO prerender.
//
// Vite outputs a single `dist/index.html` with one set of meta tags. Without
// this script, every route (`/`, `/docs`, `/privacy`, `/terms`) serves the
// same HTML — so Googlebot pre-JS sees identical canonical/title/description
// on different URLs, treats them as duplicates, and overrides our declared
// canonical (this is the "Duplicate, Google chose different canonical than
// user" warning in Search Console).
//
// We patch `dist/index.html` with the homepage tags and emit a sibling file
// per public route (`dist/docs.html`, etc.) with that route's own
// self-canonical, title, and description. With `cleanUrls: true` in
// vercel.json, requests to `/docs` serve `dist/docs.html` directly.

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, '..', 'dist');
const SITE = 'https://discipline-x.me';
const OG_IMAGE = `${SITE}/favicon.svg`;

const routes = [
  {
    out: 'index.html',
    path: '/',
    title: 'DisciplineX — Stay Sharp. Ship Daily.',
    description:
      'Competitive productivity & discipline monitoring platform. Build streaks, ship daily proof, and stay accountable with AI-powered habit tracking, focus timers, and live leaderboards.',
  },
  {
    out: 'docs.html',
    path: '/docs',
    title: 'DisciplineX Docs — How to use the platform',
    description:
      'Get started with DisciplineX: onboarding, daily tasks, proof submission, streaks, focus mode, habits, AI coach, squads, leaderboards, and admin workflows.',
  },
  {
    out: 'privacy.html',
    path: '/privacy',
    title: 'Privacy Policy — DisciplineX',
    description:
      'How DisciplineX collects, uses, and protects your data. Account details, task submissions, analytics, third-party processors, and your rights.',
  },
  {
    out: 'terms.html',
    path: '/terms',
    title: 'Terms of Service — DisciplineX',
    description:
      'The rules for using DisciplineX: accounts, acceptable use, content ownership, billing, account locking, termination, and liability.',
  },
];

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildSeoBlock({ path, title, description }) {
  const url = `${SITE}${path}`;
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  return `    <title>${t}</title>
    <meta name="description" content="${d}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${t}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:image" content="${OG_IMAGE}" />
    <meta property="og:site_name" content="DisciplineX" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${url}" />
    <meta name="twitter:title" content="${t}" />
    <meta name="twitter:description" content="${d}" />
    <meta name="twitter:image" content="${OG_IMAGE}" />`;
}

function injectSeo(html, route) {
  // Strip the placeholder <title> Vite emits so we don't end up with two.
  const stripped = html.replace(/\s*<title>[\s\S]*?<\/title>/i, '');
  const block = buildSeoBlock(route);
  // Inject right before </head> so it overrides anything earlier.
  return stripped.replace(/<\/head>/i, `${block}\n  </head>`);
}

async function main() {
  const template = await readFile(resolve(DIST, 'index.html'), 'utf8');
  for (const route of routes) {
    const html = injectSeo(template, route);
    await writeFile(resolve(DIST, route.out), html, 'utf8');
    console.log(`[seo] wrote dist/${route.out} (${route.path})`);
  }
}

main().catch((err) => {
  console.error('[seo] prerender failed:', err);
  process.exit(1);
});
