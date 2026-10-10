import { mkdir, readFile, writeFile } from 'node:fs/promises';

const pageMetadata = {
  'hr-calculator': {
    title: 'Калькулятор потерь от текучести персонала | InCORE',
    description: 'Рассчитайте финансовые потери бизнеса из-за текучести персонала: затраты на замену, адаптацию и недополученную выручку. Настройте расчёт под свою компанию.',
    robots: 'index,follow',
    canonical: 'https://incoresmart.github.io/hr-calculator/',
    schema: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "Калькулятор потерь от текучести персонала InCORE",
      "url": "https://incoresmart.github.io/hr-calculator/",
      "description": "Интерактивный калькулятор для оценки финансовых потерь бизнеса от текучести персонала с учётом затрат на подбор, адаптацию и недополученную выручку.",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "inLanguage": "ru"
    },
    faqSchema: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Какие расходы учитывает калькулятор потерь от текучести персонала?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Расчёт складывает оценочную стоимость подбора замены, зарплату сотрудника за период адаптации и оценку недополученной выручки за это время."
          }
        },
        {
          "@type": "Question",
          "name": "Можно ли использовать результат как отраслевой норматив?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Нет. Это оценочная модель, результат которой зависит от введённых значений и допущений калькулятора."
          }
        },
        {
          "@type": "Question",
          "name": "Какие данные нужны для расчёта?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Средняя зарплата, число увольнений за год, длительность адаптации, выручка на сотрудника, размер HR-команды, зарплата HR и среднее количество наймов на одного HR в месяц."
          }
        }
      ]
    },
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
      <h2>Частые вопросы</h2>
      <h3>Какие расходы учитывает калькулятор?</h3>
      <p>Расчёт складывает оценочную стоимость подбора замены, зарплату сотрудника за период адаптации и оценку недополученной выручки за это время.</p>
      <h3>Можно ли использовать результат как отраслевой норматив?</h3>
      <p>Нет. Это оценочная модель, результат которой зависит от введённых вами значений и заложенных в калькулятор допущений.</p>
      <h3>Какие данные нужны для расчёта?</h3>
      <p>Средняя зарплата, число увольнений за год, длительность адаптации, выручка на сотрудника, размер HR-команды, зарплата HR и среднее количество наймов на одного HR в месяц.</p>
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
  const structuredData = [metadata.schema, metadata.faqSchema]
    .filter(Boolean)
    .map((schema) => `    <script type="application/ld+json">${JSON.stringify(schema)}</script>`)
    .join('\n');
  const structuredDataMarkup = structuredData ? `${structuredData}\n` : '';
  html = html.replace('</head>', `${structuredDataMarkup}    <link rel="canonical" href="${metadata.canonical}" />\n  </head>`);
  if (metadata.fallback) {
    html = html.replace('<div id="root"></div>', `<div id="root">${metadata.fallback}</div>`);
  }
  await writeFile(`dist/${route}/index.html`, html);
}

const safeDealHtml = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Безопасная сделка: выплаты за подтверждённый результат | InCORE</title>
  <meta name="description" content="Как InCORE связывает бизнес-задачу, подтверждённый результат и выплату по заранее определённым правилам. Принцип работы модуля «Безопасная сделка»." />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href="https://incoresmart.github.io/bezopasnaya-sdelka/" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="Безопасная сделка: выплаты за подтверждённый результат | InCORE" />
  <meta property="og:description" content="Деньги следуют за заранее определённым и подтверждённым бизнес-результатом." />
  <meta property="og:url" content="https://incoresmart.github.io/bezopasnaya-sdelka/" />
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Безопасная сделка: выплаты за подтверждённый результат",
    "url": "https://incoresmart.github.io/bezopasnaya-sdelka/",
    "description": "Описание принципа работы InCORE: заранее определённые условия оплаты и выплата после подтверждения результата.",
    "inLanguage": "ru",
    "about": {
      "@type": "Thing",
      "name": "Оплата труда за подтверждённый бизнес-результат"
    }
  })}</script>
  <style>
    :root{color-scheme:light;--ink:#182230;--muted:#536273;--line:#dbe2e8;--accent:#155eef;--bg:#f6f8fb}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    header,main,footer{width:min(100% - 36px,900px);margin-inline:auto}header{padding:24px 0}header a,footer a{color:var(--accent);text-decoration:none;font-weight:650}
    main{background:#fff;border:1px solid var(--line);border-radius:20px;padding:clamp(24px,5vw,56px);margin-bottom:28px}
    h1{font-size:clamp(2rem,5vw,3.25rem);line-height:1.1;letter-spacing:-.035em;margin:0 0 22px}h2{font-size:1.45rem;line-height:1.25;margin:38px 0 12px}h3{font-size:1.05rem;margin:22px 0 6px}
    p,li{color:var(--muted)}strong{color:var(--ink)}.lead{font-size:1.2rem;color:var(--ink)}.steps{padding-left:1.3rem}.cta{display:inline-block;background:var(--accent);color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700;margin-top:10px}
    footer{padding:0 0 32px;color:var(--muted);font-size:.9rem}
  </style>
</head>
<body>
<header><a href="https://incoresmart.github.io/">InCORE</a></header>
<main>
  <article>
    <h1>Безопасная сделка: выплаты за подтверждённый результат</h1>
    <p class="lead">InCORE описывает финансовое правило, при котором деньги привязаны не просто к процессу или присутствию сотрудника, а к заранее определённому бизнес-результату и условиям его подтверждения.</p>
    <h2>В чём идея</h2>
    <p>Компания определяет, какой результат ей нужен, как его подтвердить и какая сумма связана с его достижением. Эти условия фиксируются заранее, чтобы участники понимали критерии выплаты до начала работы, а не после спора о том, что считать успехом.</p>
    <h2>Как устроен принцип «Безопасной сделки»</h2>
    <ol class="steps">
      <li><strong>Бизнес-задача.</strong> Компания формулирует конкретный результат и его ценность для бизнеса.</li>
      <li><strong>Правило оплаты.</strong> Заранее задаются условия, сумма и способ подтверждения результата.</li>
      <li><strong>Выполнение работы.</strong> Сотрудник или команда выполняет согласованную задачу.</li>
      <li><strong>Подтверждение.</strong> Результат проверяется по критериям, установленным компанией.</li>
      <li><strong>Выплата.</strong> Оплата следует согласованному правилу после подтверждения результата.</li>
    </ol>
    <h2>Что решает компания, а что делает система</h2>
    <p>Компания определяет бизнес-цель, критерии результата, сумму и порядок подтверждения. InCORE предназначен для цифровой фиксации и исполнения заданных правил. Система не должна подменять управленческое решение компании о том, какой результат ей нужен.</p>
    <h2>Чем это отличается от обычного KPI</h2>
    <p>KPI часто остаётся показателем в отчёте, который сам по себе не объясняет, как показатель связан с деньгами. В подходе InCORE финансовое правило связывает результат, условия подтверждения и выплату в одну заранее согласованную конструкцию.</p>
    <h2>Когда подход может быть полезен</h2>
    <ul>
      <li>Когда вознаграждение зависит от результата, этапа или выполнения согласованного плана.</li>
      <li>Когда нужно заранее зафиксировать критерии, чтобы снизить неоднозначность при расчёте вознаграждения.</li>
      <li>Когда руководителю важно видеть связь между бизнес-задачей, вкладом команды и расходами на оплату результата.</li>
    </ul>
    <h2>Важное уточнение</h2>
    <p>Финансовый эффект зависит от корректности выбранных показателей, качества подтверждения результата и условий конкретного процесса. Само наличие цифрового правила не гарантирует рост прибыли и не заменяет юридическую, финансовую или управленческую проверку.</p>
    <a class="cta" href="https://incoresmart.github.io/hr-calculator/">Рассчитать потери от текучести персонала</a>
  </article>
</main>
<footer>InCORE · Выплаты за заранее определённый и подтверждённый результат.</footer>
</body>
</html>`;

await mkdir('dist/bezopasnaya-sdelka', { recursive: true });
await writeFile('dist/bezopasnaya-sdelka/index.html', safeDealHtml);
