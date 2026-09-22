import { access, cp, mkdir } from 'node:fs/promises';

const staticRoutes = [
  'about',
  'business',
  'specialists',
  'methodology',
  'blog'
];

for (const route of staticRoutes) {
  await cp(route, 'dist/' + route, { recursive: true });
}

// tools/index.html is a static landing page, while the two calculator
// pages are Vite HTML entry points. Copy only the landing page here so
// the built calculator HTML is not overwritten by its source file.
await mkdir('dist/tools', { recursive: true });
await cp('tools/index.html', 'dist/tools/index.html');

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
