const staticHref = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;

const sections = [
  { title: 'Для бизнеса', text: 'Стоимость сотрудника, найма, адаптации, текучести и недополученного результата.', href: '/business/' },
  { title: 'Для специалистов', text: 'Рыночная стоимость, доход, навыки и экономический вклад в результат.', href: '/specialists/' },
  { title: 'Методология', text: 'Как связать роль, навык, результат, экономическое событие и деньги.', href: '/methodology/' },
];

const tools = [
  { tag: 'B2B', title: 'Финансовые потери бизнеса', text: 'Оцените стоимость текучести, найма, адаптации и времени выхода на результат.', href: '/tools/hr-calculator/' },
  { tag: 'B2C', title: 'Рыночная стоимость специалиста', text: 'Структурируйте оценку своей профессиональной стоимости через навыки, результаты и рыночный контекст.', href: '/tools/market-value/' },
];

const articles = [
  ['Сколько стоит сотрудник для работодателя?', '/blog/skolko-stoit-sotrudnik/'],
  ['Сколько стоит ошибка найма?', '/blog/stoimost-oshibki-nayma/'],
  ['Как рассчитать производительную мощность команды?', '/blog/proizvoditelnaya-moshchnost-komandy/'],
  ['Time to Capacity: сколько времени сотрудник выходит на полную мощность?', '/blog/time-to-capacity/'],
  ['ФОТ и производительность: почему зарплата не равна результату?', '/blog/fot-i-proizvoditelnost/'],
  ['Сколько я стою на рынке труда?', '/blog/skolko-ya-stoyu-na-rynke-truda/'],
];

export function HomePage() {
  return (
    <main className="min-h-screen text-[#07133f] incore-calculator-bg">
      <header className="min-h-24 border-b border-slate-100">
        <div className="mx-auto flex min-h-24 max-w-[1180px] items-center justify-between px-6">
          <a href={staticHref("/")} className="flex items-center"><img src={`${import.meta.env.BASE_URL}incore-logo.png`} alt="InCORE" className="w-[150px] max-w-[150px] h-auto object-contain" /></a>
          <nav className="hidden gap-6 text-sm font-semibold text-slate-600 md:flex">
            <a href={staticHref("/business/")}>Для бизнеса</a>
            <a href={staticHref("/specialists/")}>Для специалистов</a>
            <a href={staticHref("/tools/")}>Калькуляторы</a>
            <a href={staticHref("/methodology/")}>Методология</a>
            <a href={staticHref("/blog/")}>Блог</a>
          </nav>
        </div>
      </header>

      <section>
        <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
          <p className="mb-5 inline-flex rounded-full bg-[#e9edff] px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-[#1727a8]">Экономика результата</p>
          <h1 className="max-w-4xl text-5xl font-black leading-[1.03] tracking-[-0.04em] md:text-7xl">Команда должна создавать результат, а не просто занимать должности</h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">InCORE связывает роль человека, необходимые навыки, измеримый результат и экономический эффект. Чтобы бизнес видел не только ФОТ, но и то, что получает за эти деньги.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href={staticHref("/business/")} className="rounded-xl bg-[#07133f] px-5 py-3.5 font-bold text-white">Для бизнеса</a>
            <a href={staticHref("/specialists/")} className="rounded-xl border border-slate-200 bg-white px-5 py-3.5 font-bold">Для специалистов</a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-3xl font-black tracking-tight md:text-4xl">Не с должности. С результата.</h2>
        <p className="mt-4 max-w-2xl text-slate-600">Экономическую ценность роли удобнее разбирать через то, что она должна создавать, какие навыки для этого нужны и какой экономический эффект возникает.</p>
        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {sections.map((item) => (
            <a key={item.href} href={staticHref(item.href)} className="rounded-2xl border border-slate-200 p-7 transition hover:-translate-y-0.5 hover:shadow-sm">
              <h3 className="text-xl font-extrabold">{item.title}</h3>
              <p className="mt-3 text-slate-600">{item.text}</p>
              <span className="mt-6 inline-block font-bold text-[#1727a8]">Подробнее →</span>
            </a>
          ))}
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-3xl font-black tracking-tight md:text-4xl">Инструменты</h2>
          <p className="mt-4 text-slate-600">Два разных вопроса. Поэтому два разных расчёта.</p>
          <div className="mt-9 grid gap-5 md:grid-cols-2">
            {tools.map((item) => (
              <div key={item.href} className="rounded-2xl border border-slate-200 bg-white p-7">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#1727a8]">{item.tag}</span>
                <h3 className="mt-3 text-2xl font-black">{item.title}</h3>
                <p className="mt-3 max-w-xl text-slate-600">{item.text}</p>
                <a href={staticHref(item.href)} className="mt-6 inline-flex rounded-xl bg-[#07133f] px-5 py-3 font-bold text-white">Открыть →</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="flex items-center gap-3 text-3xl font-black tracking-tight md:text-4xl"><img src={`${import.meta.env.BASE_URL}incore-icon.png`} alt="" aria-hidden="true" className="h-7 w-7 object-contain" />Роль → Навык → Результат → Экономическое событие → Деньги</h2>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">Это рабочая модель для тех случаев, где результат можно определить, наблюдать и связать с экономическим эффектом. Не попытка превратить любого человека в одну цифру.</p>
        <div className="mt-8">
          <a href={staticHref("/methodology/")} className="font-bold text-[#1727a8]">Читать методологию →</a>
        </div>
      </section>
<section className="border-t border-slate-100">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black tracking-tight md:text-4xl">Материалы по теме</h2>
              <p className="mt-3 text-slate-600">Ответы на конкретные вопросы, а не коллекция SEO-слов в человеческом обличье.</p>
            </div>
            <a href={staticHref("/blog/")} className="font-bold text-[#1727a8]">Весь блог →</a>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {articles.map(([title, href]) => (
              <a key={href} href={staticHref(href)} className="rounded-xl border border-slate-200 p-5 font-semibold hover:bg-slate-50">{title} <span className="text-[#1727a8]">→</span></a>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-5 px-5 py-8 text-sm text-slate-500">
          <a href={staticHref("/about/")}>Что такое InCORE</a>
          <a href={staticHref("/business/")}>Для бизнеса</a>
          <a href={staticHref("/specialists/")}>Для специалистов</a>
          <a href={staticHref("/tools/")}>Калькуляторы</a>
          <a href={staticHref("/methodology/")}>Методология</a>
          <a href={staticHref("/blog/")}>Блог</a>
        </div>
      </footer>
    </main>
  );
}
