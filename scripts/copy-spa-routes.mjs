import { mkdir, readFile, writeFile } from 'node:fs/promises';

const pageMetadata = {
  'hr-calculator': {
    title: 'Калькулятор потерь от текучести персонала | InCORE',
    description: 'Рассчитайте финансовые потери бизнеса из-за текучести персонала: затраты на замену, адаптацию и недополученную выручку. Настройте расчёт под свою компанию.',
    robots: 'index,follow',
    canonical: 'https://incoresmart.github.io/hr-calculator/',
    fallback: `<main lang="ru">
      <h1>Калькулятор потерь бизнеса от текучести персонала</h1>
      <p>Оцените финансовые последствия увольнений с учётом затрат на подбор, оплаты труда в период адаптации и недополученной выручки до выхода сотрудника на продуктивность.</p>
      <h2>Что учитывает расчёт</h2>
      <ul>
        <li>Количество увольнений за год и стоимость подбора замены.</li>
        <li>Среднюю зарплату сотрудника и длительность адаптации.</li>
        <li>Выручку на одного сотрудника и потери продуктивности.</li>
        <li>Размер HR-команды и её пропускную способность по найму.</li>
      </ul>
      <p>Все исходные значения можно изменить в интерактивном калькуляторе. Итог зависит от введённых данных и не является универсальным отраслевым нормативом.</p>
    </main>`,
  },
  'market-value': {
    title: 'Калькулятор рыночной стоимости специалиста | InCORE',
    description: 'Страница регистрации для доступа к калькулятору рыночной стоимости специалиста InCORE.',
    robots: 'noindex,follow',
    canonical: 'https://incoresmart.github.io/market-value/',
    fallback: '',
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
  if (metadata.fallback) {
    html = html.replace('<div id="root"></div>', `<div id="root">${metadata.fallback}</div>`);
  }
  await writeFile(`dist/${route}/index.html`, html);
}
