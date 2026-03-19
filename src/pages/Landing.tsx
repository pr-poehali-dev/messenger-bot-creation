import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

const FEATURES = [
  { icon: "Brain",       title: "ИИ-тональность",       desc: "Бот понимает агрессию и сарказм без списка запрещённых слов" },
  { icon: "Clock",       title: "Дежурный модератор",    desc: "Строгий режим ночью и в выходные, мягкий — в рабочие часы" },
  { icon: "Shield",      title: "Антиспам",              desc: "Капс, флуд, ссылки, повторы — всё под контролем" },
  { icon: "Star",        title: "Репутация",             desc: "Система рейтинга участников с автосменой ролей" },
  { icon: "AlertTriangle","title": "Предупреждения",     desc: "Лестница санкций: варн → мут → бан автоматически" },
  { icon: "BookOpen",    title: "Правила",               desc: "Бот отправляет правила новым участникам и по команде" },
];

const PLANS = [
  { plan: "month",   label: "1 месяц",   price: 59,  days: 30,  badge: null,      popular: false },
  { plan: "quarter", label: "3 месяца",  price: 149, days: 90,  badge: "Выгодно", popular: true  },
  { plan: "year",    label: "Год",       price: 590, days: 365, badge: "Лучший",  popular: false },
];

const STEPS = [
  { n: "1", title: "Создай бота",      desc: "Открой @BotFather в Макс, получи токен за 2 минуты" },
  { n: "2", title: "Подключи группу",  desc: "Вставь токен и ID группы в личном кабинете" },
  { n: "3", title: "Настрой правила",  desc: "Выбери что разрешено, что запрещено, установи санкции" },
  { n: "4", title: "Страж на посту",   desc: "Бот работает 24/7, ты управляешь через удобный интерфейс" },
];

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* NAV */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/90 backdrop-blur border-b border-border" : ""}`}>
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="https://cdn.poehali.dev/projects/a42d062d-9fbc-499f-a244-58736cf70e7a/files/dd4734fe-a2fe-44d2-97cf-3df5440f4a2c.jpg" alt="Страж" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-bold text-lg tracking-tight">Страж</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">Тарифы</a>
            <button onClick={() => navigate("/dashboard")}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-[hsl(220_16%_8%)] text-sm font-bold transition-colors">
              Войти
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-32 pb-20 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          7 дней бесплатно — без карты
        </div>
        <h1 className="text-5xl sm:text-6xl font-black leading-tight mb-6">
          Верный страж<br />
          <span className="text-cyan-400">твоей группы</span><br />
          в Макс
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
          ИИ-бот для модерации группы в мессенджере Макс. Защищает от спама, токсичности и нарушителей — пока ты занимаешься делами.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => navigate("/dashboard")}
            className="px-8 py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[hsl(220_16%_8%)] font-bold text-base transition-colors">
            Начать бесплатно
          </button>
          <a href="#how"
            className="px-8 py-4 rounded-xl border border-border hover:bg-secondary text-sm font-semibold transition-colors">
            Как это работает
          </a>
        </div>
        <p className="text-xs text-muted-foreground mt-4">Не нужна карта · Пробный период 7 дней · Отмена в любой момент</p>
      </section>

      {/* STATS */}
      <section className="px-6 pb-16">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-4">
          {[
            { val: "7 дней", label: "пробный период" },
            { val: "24/7",   label: "работает без остановок" },
            { val: "59 ₽",   label: "в месяц" },
          ].map((s, i) => (
            <div key={i} className="text-center p-5 rounded-2xl bg-card border border-border">
              <div className="text-2xl sm:text-3xl font-black text-cyan-400 mb-1">{s.val}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-3">Что умеет Страж</h2>
          <p className="text-muted-foreground text-center mb-10">Полный набор инструментов для порядка в группе</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="p-5 rounded-2xl bg-card border border-border hover:border-cyan-500/30 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition-colors">
                  <Icon name={f.icon} size={18} className="text-cyan-400" />
                </div>
                <h3 className="font-bold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-3">Как начать</h2>
          <p className="text-muted-foreground text-center mb-10">Запуск за 5 минут, без программирования</p>
          <div className="space-y-4">
            {STEPS.map((s, i) => (
              <div key={i} className="flex gap-4 p-5 rounded-2xl bg-card border border-border">
                <div className="w-10 h-10 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                  <span className="font-black text-cyan-400 mono">{s.n}</span>
                </div>
                <div>
                  <h3 className="font-bold mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-6 pb-24">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-3">Тарифы</h2>
          <p className="text-muted-foreground text-center mb-10">7 дней бесплатно, затем выбери удобный план</p>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            {PLANS.map((p) => (
              <div key={p.plan}
                className={`relative p-6 rounded-2xl border transition-colors ${p.popular
                  ? "bg-cyan-500/5 border-cyan-500/40"
                  : "bg-card border-border"}`}>
                {p.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-cyan-500 text-[hsl(220_16%_8%)] text-xs font-bold whitespace-nowrap">
                    {p.badge}
                  </div>
                )}
                <div className="text-sm text-muted-foreground mb-1">{p.label}</div>
                <div className="text-4xl font-black mb-1">{p.price}<span className="text-lg font-normal text-muted-foreground"> ₽</span></div>
                <div className="text-xs text-muted-foreground mb-5">
                  {p.plan === "month" ? "в месяц" : p.plan === "quarter" ? "≈ 50 ₽/мес" : "≈ 49 ₽/мес"}
                </div>
                <button onClick={() => navigate(`/dashboard`)}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${p.popular
                    ? "bg-cyan-500 hover:bg-cyan-400 text-[hsl(220_16%_8%)]"
                    : "bg-secondary hover:bg-secondary/80 text-foreground"}`}>
                  Выбрать
                </button>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">Оплата через ЮMoney · Безопасно · Можно отменить в любой момент</p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24">
        <div className="max-w-2xl mx-auto text-center p-10 rounded-3xl bg-cyan-500/5 border border-cyan-500/20">
          <div className="text-4xl mb-4">⚔️</div>
          <h2 className="text-3xl font-black mb-3">Начни бесплатно прямо сейчас</h2>
          <p className="text-muted-foreground mb-8">7 дней без ограничений. Никакой карты при регистрации.</p>
          <button onClick={() => navigate("/dashboard")}
            className="px-10 py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[hsl(220_16%_8%)] font-black text-base transition-colors">
            Попробовать бесплатно
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚔️</span>
            <span className="font-bold">Страж</span>
            <span className="text-xs text-muted-foreground ml-2">Модерация групп в Макс</span>
          </div>
          <div className="flex gap-5 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Политика конфиденциальности</a>
            <a href="#" className="hover:text-foreground transition-colors">Оферта</a>
            <a href="https://poehali.dev/help" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">Поддержка</a>
          </div>
        </div>
      </footer>
    </div>
  );
}