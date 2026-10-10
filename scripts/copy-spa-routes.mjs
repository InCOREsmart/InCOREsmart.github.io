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

const template = await readFile('dist/index.html', 'utf8');
const defaultTitle = '<title>InCORE — система выплат за подтверждённый результат</title>';
const defaultDescription = '<meta name="description" content="InCORE — цифровая платформа, связывающая выплаты сотрудникам и командам с заранее определённым и подтверждённым результатом." />';
const defaultRobots = '<meta name="robots" content="noindex,follow" />';

for (const [route, metadata] of Object.entries(pageMetadata)) {
  await mkdir(`dist/${route}`, { recursive: true });
  let html = template.replace(defaultTitle, `<title>${metadata.title}</title>`);
  html = html.replace(defaultDescription, `<meta name="description" content="${metadata.description}" />`);
  html = html.replace(defaultRobots, `<meta name="robots" content="${metadata.robots}" />`);
  html = html.replace('</head>', `    <link rel="canonical" href="${metadata.canonical}" />\n  </head>`);
  await writeFile(`dist/${route}/index.html`, html);
}
