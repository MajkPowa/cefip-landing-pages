import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.join(projectRoot, 'work', 'github-pages');
const clientRoot = path.join(projectRoot, 'dist', 'client');
const origin = process.env.PREVIEW_ORIGIN || 'http://localhost:3001';
const basePath = '/cefip-landing-pages';

if (!outputRoot.startsWith(path.join(projectRoot, 'work') + path.sep)) {
  throw new Error('Preview output must stay inside the project work directory.');
}

const routes = [
  { source: '/', target: 'index.html' },
  { source: '/rekonstrukce', target: 'rekonstrukce/index.html' },
  { source: '/vykup-nemovitosti', target: 'vykup-nemovitosti/index.html' },
  { source: '/ochrana-osobnich-udaju', target: 'ochrana-osobnich-udaju/index.html' },
  { source: '/dekujeme', target: 'dekujeme/index.html' },
];

function prepareHtml(source) {
  let html = source;

  html = html.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<link\b[^>]*(?:rel="modulepreload"|as="script")[^>]*>/gi, '');
  html = html.replace(/<aside class="cookie-banner"[\s\S]*?<\/aside>/i, '');

  const routeRewrites = [
    ['/ochrana-osobnich-udaju', `${basePath}/ochrana-osobnich-udaju/`],
    ['/vykup-nemovitosti', `${basePath}/vykup-nemovitosti/`],
    ['/rekonstrukce', `${basePath}/rekonstrukce/`],
    ['/dekujeme', `${basePath}/dekujeme/`],
  ];

  for (const [from, to] of routeRewrites) {
    html = html.replaceAll(`href="${from}"`, `href="${to}"`);
  }

  html = html.replaceAll('href="/"', `href="${basePath}/"`);
  html = html.replace(/(href|src)="\/(assets|fonts|_next)\//g, `$1="${basePath}/$2/`);
  html = html.replaceAll('href="/favicon.png"', `href="${basePath}/favicon.png"`);
  html = html.replaceAll('href="/og.png"', `href="${basePath}/og.png"`);
  html = html.replaceAll('content="http://localhost:3001/og.png"', `content="https://majkpowa.github.io${basePath}/og.png"`);
  html = html.replaceAll('content="https://cefip-rekonstrukce-vykup.majkpowa.chatgpt.site/og.png"', `content="https://majkpowa.github.io${basePath}/og.png"`);
  html = html.replaceAll('content="https://cefip-landing-pages-2026.web.app/og.png"', `content="https://majkpowa.github.io${basePath}/og.png"`);

  html = html.replace('<head>', `<head><meta name="robots" content="noindex,nofollow"><style>
    .github-preview-ribbon{position:relative;z-index:10000;background:#7f84ff;color:#080829;padding:10px 18px;text-align:center;font:600 14px/1.35 Arial,sans-serif}
    .github-preview-ribbon strong{font-weight:800}
    .preview-form-note{margin:0 0 14px;padding:10px 12px;background:#eef0ff;color:#080829;border-left:4px solid #7f84ff;font-weight:600}
    form[inert]{opacity:.82}
  </style>`);
  html = html.replace('<body>', '<body><div class="github-preview-ribbon"><strong>Statický náhled.</strong> Formulář a měření jsou zde záměrně vypnuté.</div>');
  html = html.replace(/<form\b/g, '<p class="preview-form-note">Plný formulář funguje pouze v serverové verzi.</p><form inert aria-disabled="true"');

  return html;
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await cp(clientRoot, outputRoot, { recursive: true });

const cssRoot = path.join(outputRoot, '_next', 'static', 'css');
for (const file of await readdir(cssRoot)) {
  if (!file.endsWith('.css')) continue;
  const cssPath = path.join(cssRoot, file);
  const css = await readFile(cssPath, 'utf8');
  await writeFile(cssPath, css.replaceAll('url(/fonts/', `url(${basePath}/fonts/`), 'utf8');
}

for (const route of routes) {
  const response = await fetch(new URL(route.source, origin));
  if (!response.ok) throw new Error(`Failed to render ${route.source}: HTTP ${response.status}`);
  const target = path.join(outputRoot, route.target);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, prepareHtml(await response.text()), 'utf8');
}

await writeFile(path.join(outputRoot, '.nojekyll'), '', 'utf8');
await writeFile(path.join(outputRoot, '404.html'), await readFile(path.join(outputRoot, 'index.html'), 'utf8'), 'utf8');

console.log(`GitHub Pages preview created at ${outputRoot}`);
