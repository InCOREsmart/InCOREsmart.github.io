import { cp, mkdir } from 'node:fs/promises';

const staticRoutes = [
  'about',
  'business',
  'specialists',
  'methodology',
  'blog',
  'tools'
];

for (const route of staticRoutes) {
  await cp(route, 'dist/' + route, { recursive: true });
}

for (const file of ['404.html', 'robots.txt', 'sitemap.xml', 'llms.txt']) {
  await cp(file, 'dist/' + file);
}

// Vite builds the calculator pages as real HTML entry points.
// Do not replace them with the SPA shell, otherwise the SEO metadata is lost.
for (const route of ['hr-calculator', 'market-value']) {
  const target = 'dist/tools/' + route + '/index.html';
  await mkdir('dist/tools/' + route, { recursive: true });
  try {
    await cp(target, target);
  } catch {
    await cp('dist/index.html', target);
  }
}
