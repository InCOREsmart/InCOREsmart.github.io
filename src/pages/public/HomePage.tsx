import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ClipboardList, Search, ShieldCheck, Target, Users, WalletCards } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: ClipboardList,
    title: 'Опишите результат, а не идеального кандидата',
    text: 'Сформулируйте задачи, обязательные навыки и критерии, по которым будет понятно, что человек подходит.',
  },
  {
    number: '02',
    icon: Search,
    title: 'Сравнивайте людей по единым критериям',
    text: 'Структурированные ответы и подтверждения помогают быстрее отсеять нерелевантные отклики и сосредоточиться на сильных кандидатах.',
  },
  {
    number: '03',
    icon: CheckCircle2,
    title: 'Доведите подбор до понятного результата',
    text: 'Ведите кандидатов и этапы работы в одном кабинете. Фиксируйте решение, условия и итог найма.',
  },
];

const principles = [
  { icon: Target, title: 'Критерии вместо ключевых слов', text: 'Оценивайте соответствие реальным задачам роли, а не только совпадение формулировок в резюме.' },
  { icon: Users, title: 'Кандидаты, а не просмотры', text: 'Фокус на людях, которые подходят по требованиям и готовы обсуждать конкретную работу.' },
  { icon: WalletCards, title: 'Оплата за ценность', text: 'Двигаемся от продажи доступа к базе к модели, где ценность определяется результатом подбора.' },
];

export function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="InCORE — главная">
            <img src="/logo.png" alt="InCORE" className="h-9 w-auto" />
            <span className="hidden text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 sm:inline">Hiring by evidence</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link to="/login" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#000052] hover:bg-slate-100">Войти</Link>
            <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-[#000052] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#14147a]">
              Начать подбор <ArrowRight size={16} />
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#08083f] text-white">
        <div className="absolute inset-0 opacity-30" aria-hidden="true">
          <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full border border-white/20" />
          <div className="absolute right-0 top-0 h-72 w-72 rounded-full border border-white/10" />
          <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-[#b8860b]/20 blur-3xl" />
        </div>
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-slate-200">
              <span className="h-2 w-2 rounded-full bg-[#d4a017]" /> Новый подход к найму
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Хватит покупать доступ к резюме. <span className="text-[#e0bd63]">Найдите человека, который решит задачу.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              InCORE помогает работодателю описать роль через реальные задачи, сравнить кандидатов по понятным критериям и вести подбор до результата в одном рабочем пространстве.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d4a017] px-6 py-4 font-semibold text-[#10103e] shadow-lg hover:bg-[#e5b52f]">
                Создать заявку на подбор <ArrowRight size={18} />
              </Link>
              <a href="#how-it-works" className="inline-flex items-center justify-center rounded-xl border border-white/25 px-6 py-4 font-semibold text-white hover:bg-white/10">
                Как это работает
              </a>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-400">Начните с одной вакансии. Без необходимости перестраивать весь процесс найма.</p>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/[0.07] p-4 shadow-2xl backdrop-blur sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e0bd63]">Рабочее пространство</div>
                <h2 className="mt-2 text-xl font-semibold">Руководитель продаж</h2>
                <p className="mt-1 text-sm text-slate-300">Критерии роли и этапы подбора</p>
              </div>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-semibold text-emerald-200">Черновик</span>
            </div>
            <div className="space-y-3 py-5">
              {[
                ['Управление командой', 'Обязательный критерий', '100%'],
                ['Выполнение плана продаж', 'Подтверждение результатами', '85%'],
                ['Работа с CRM', 'Практический опыт', '70%'],
              ].map(([title, description, score]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{title}</span>
                    <span className="text-sm font-semibold text-[#e0bd63]">{score}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{description}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[#d4a017]" style={{ width: score }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4">
              <ShieldCheck className="h-6 w-6 shrink-0 text-[#e0bd63]" />
              <p className="text-sm leading-6 text-slate-200">Единые критерии помогают объяснить, почему кандидат подходит, и что ещё нужно проверить.</p>
            </div>
            <p className="mt-3 text-xs text-slate-500">Иллюстрация интерфейса. Данные на карточке демонстрационные.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#9a720b]">Что меняется</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#000052] sm:text-4xl">Не ещё одна доска объявлений. Рабочий процесс найма.</h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">Публикация вакансии сама по себе не закрывает позицию. InCORE строится вокруг задачи работодателя, подтверждений от кандидата и прозрачного решения.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {principles.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f2e9] text-[#80600b]"><Icon size={23} /></div>
              <h3 className="mt-5 text-xl font-semibold text-[#000052]">{title}</h3>
              <p className="mt-3 leading-7 text-slate-600">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#9a720b]">Процесс</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#000052] sm:text-4xl">От задачи до решения в трёх шагах</h2>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {steps.map(({ number, icon: Icon, title, text }) => (
              <article key={number} className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold tracking-[0.2em] text-[#9a720b]">{number}</span>
                  <Icon className="h-6 w-6 text-[#000052]" />
                </div>
                <h3 className="mt-6 text-xl font-semibold leading-7 text-[#000052]">{title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="overflow-hidden rounded-3xl bg-[#000052] px-6 py-10 text-white sm:px-10 sm:py-14 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#e0bd63]">Начните с конкретной роли</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Первый шаг к найму без лотереи из резюме.</h2>
            <p className="mt-4 leading-7 text-slate-300">Создайте аккаунт работодателя и оформите заявку. InCORE должен зарабатывать на решении задачи найма, а не на бесконечном просмотре базы.</p>
          </div>
          <Link to="/register" className="mt-8 inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#d4a017] px-6 py-4 font-semibold text-[#10103e] hover:bg-[#e5b52f] lg:mt-0">
            Запустить подбор <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>© {new Date().getFullYear()} InCORE</span>
          <span>Найм по подтверждённой ценности</span>
          <div className="flex gap-4"><Link to="/login" className="hover:text-[#000052]">Войти</Link><Link to="/register" className="hover:text-[#000052]">Регистрация</Link></div>
        </div>
      </footer>
    </main>
  );
}
