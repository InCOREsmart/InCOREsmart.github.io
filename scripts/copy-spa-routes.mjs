import { access, cp, mkdir } from 'node:fs/promises';

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

// Vite builds calculator pages as real HTML entry points.
// Keep that HTML intact so title, description, canonical and structured data survive.
for (const route of ['hr-calculator', 'market-value']) {
  const target = 'dist/tools/' + route + '/index.html';
  await mkdir('dist/tools/' + route, { recursive: true });
  try {
    await access(target);
  } catch {
    await cp('dist/index.html', target);
  }
}
