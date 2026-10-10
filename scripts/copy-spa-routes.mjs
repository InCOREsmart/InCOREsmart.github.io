import { mkdir, readFile, writeFile } from 'node:fs/promises';

const pageMetadata = {
  'hr-calculator': {
    title: 'Калькулятор потерь от текучести персонала | InCORE',
    description: 'Рассчитайте финансовые потери бизнеса из-за текучести персонала: затраты на замену, адаптацию и недополученную выручку. Настройте расчёт под свою компанию.',
    robots: 'index,follow',
    canonical: 'https://incoresmart.github.io/hr-calculator/',
  },
  'market-value': {
    title: 'Калькулятор рыночной стоимости специалиста | InCORE',
    description: 'Регистрация для доступа к калькулятору рыночной стоимости специалиста InCORE.',
    robots: 'noindex,follow',
    canonical: 'https://incoresmart.github.io/market-value/',
  },
};

function upsertMeta(html, name, content) {
  const tag = \`<meta name="\${name}" content="\${content}" />\`;
  const pattern = new RegExp(\`<meta\\s+name=["']\${name}["'][^>]*>\`, 'i');
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', \`    \${tag}\\n  </head>\`);
}

function upsertCanonical(html, href) {
  const tag = \`<link rel="canonical" href="\${href}" />\`;
  const pattern = /<link\\s+rel=["']canonical["'][^>]*>/i;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', \`    \${tag}\\n  </head>\`);
}

const template = await readFile('dist/index.html', 'utf8');

for (const [route, metadata] of Object.entries(pageMetadata)) {
  await mkdir(\`dist/\${route}\`, { recursive: true });
  let html = template.replace(/<title>[\\s\\S]*?<\\/title>/i, \`<title>\${metadata.title}</title>\`);
  html = upsertMeta(html, 'description', metadata.description);
  html = upsertMeta(html, 'robots', metadata.robots);
  html = upsertCanonical(html, metadata.canonical);
  await writeFile(\`dist/\${route}/index.html\`, html);
}
