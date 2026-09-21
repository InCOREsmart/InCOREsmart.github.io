import { cp, mkdir } from 'node:fs/promises';

for (const route of ['hr-calculator', 'market-value']) {
  await mkdir(`dist/${route}`, { recursive: true });
  await cp('dist/index.html', `dist/${route}/index.html`);
}
