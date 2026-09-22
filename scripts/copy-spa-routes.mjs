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
  await cp(route, `dist/${route}`, { recursive: true });
}

for (const file of ['404.html', 'robots.txt', 'sitemap.xml', 'llms.txt']) {
  await cp(file, `dist/${file}`);
}

for (const route of ['hr-calculator', 'market-value']) {
  await mkdir(`dist/tools/${route}`, { recursive: true });
  await cp('dist/index.html', `dist/tools/${route}/index.html`);
}
