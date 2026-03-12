/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import Icon from "@/components/ui/icon";

/* ─────────────── mock data ─────────────── */
const MEMBERS = [
  { id: 1, name: "Алексей Воронов", role: "Администратор", rep: 98, msgs: 1240, status: "online",  joined: "15 янв 2024", violations: 0 },
  { id: 2, name: "Мария Крылова",   role: "Старожил",      rep: 84, msgs: 876,  status: "online",  joined: "3 мар 2024",  violations: 1 },
  { id: 3, name: "Денис Орлов",     role: "Активный",      rep: 67, msgs: 432,  status: "offline", joined: "20 апр 2024", violations: 2 },
  { id: 4, name: "Светлана Рыбина", role: "Участник",      rep: 52, msgs: 198,  status: "online",  joined: "1 июн 2024",  violations: 0 },
  { id: 5, name: "Игорь Волков",    role: "Новичок",       rep: 30, msgs: 45,   status: "offline", joined: "2 сен 2024",  violations: 3 },
  { id: 6, name: "Татьяна Лисова",  role: "Участник",      rep: 71, msgs: 310,  status: "online",  joined: "14 май 2024", violations: 1 },
];

const LOGS = [
  { id: 1, time: "12:41", action: "Предупреждение",    user: "Игорь Волков",   detail: "Спам: повтор сообщения ×4",             level: "warn" },
  { id: 2, time: "12:38", action: "Удалено сообщение", user: "Денис Орлов",    detail: "Запрещённое слово в тексте",             level: "info" },
  { id: 3, time: "12:20", action: "Мут 10 мин",        user: "Игорь Волков",   detail: "3-е нарушение подряд",                   level: "danger" },
  { id: 4, time: "11:55", action: "Новый участник",    user: "Кирилл Зайцев",  detail: "Прошёл капчу, принял правила",           level: "success" },
  { id: 5, time: "11:40", action: "Автофильтр",        user: "Система",        detail: "Заблокирована ссылка (внешний ресурс)",  level: "info" },
  { id: 6, time: "11:12", action: "Смена роли",        user: "Мария Крылова",  detail: "Участник → Старожил (800+ сообщений)",   level: "success" },
  { id: 7, time: "10:50", action: "Предупреждение",    user: "Светлана Рыбина", detail: "Капс: 85% заглавных букв",              level: "warn" },
];

const ANALYTICS = [
  { label: "Пн", msgs: 320, violations: 4 },
  { label: "Вт", msgs: 410, violations: 2 },
  { label: "Ср", msgs: 285, violations: 6 },
  { label: "Чт", msgs: 530, violations: 1 },
  { label: "Пт", msgs: 480, violations: 3 },
  { label: "Сб", msgs: 210, violations: 2 },
  { label: "Вс", msgs: 150, violations: 1 },
];

const FILTERS = [
  { id: "spam",     label: "Спам",              active: true,  count: 48 },
  { id: "caps",     label: "Капс (>70%)",        active: true,  count: 12 },
  { id: "links",    label: "Внешние ссылки",     active: false, count: 7  },
  { id: "flood",    label: "Флуд (≥3 повтора)",  active: true,  count: 31 },
  { id: "swear",    label: "Запрещённые слова",  active: true,  count: 19 },
  { id: "stickers", label: "Стикеры новичкам",   active: false, count: 5  },
];

/* ─────────────── helpers ─────────────── */
const roleColor: Record<string, string> = {
  "Администратор": "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
  "Старожил":      "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  "Активный":      "bg-green-500/10 text-green-400 border border-green-500/20",
  "Участник":      "bg-slate-500/10 text-slate-400 border border-slate-500/20",
  "Новичок":       "bg-red-500/10   text-red-400   border border-red-500/20",
};

const logColor: Record<string, string> = {
  warn:    "text-amber-400",
  info:    "text-sky-400",
  danger:  "text-red-400",
  success: "text-emerald-400",
};

const logDot: Record<string, string> = {
  warn:    "bg-amber-400",
  info:    "bg-sky-400",
  danger:  "bg-red-400",
  success: "bg-emerald-400",
};

/* ─────────────── StatCard ─────────────── */
function StatCard({ icon, label, value, sub, color = "text-cyan-400", delay = 0 }: {
  icon: string; label: string; value: string | number;
  sub?: string; color?: string; delay?: number;
}) {
  return (
    <div className="stat-card animate-fade-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className={`text-2xl font-semibold ${color} mono`}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className="p-2 rounded-lg bg-[hsl(220_12%_16%)]">
          <Icon name={icon as any} size={18} className={color} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────── pages ─────────────── */
function DashboardPage() {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
          <span className="text-xs text-emerald-400 font-medium mono">Бот активен</span>
        </div>
        <h2 className="text-lg font-semibold">Сегодня, 12 марта</h2>
        <p className="text-sm text-muted-foreground">Группа «Команда ГлавСтрой» · 124 участника</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon="MessageSquare" label="Сообщений сегодня" value="482" sub="+12% к пн" delay={0} />
        <StatCard icon="ShieldAlert"   label="Нарушений"         value="7"   sub="3 автоблок." color="text-amber-400" delay={50} />
        <StatCard icon="UserCheck"     label="Новых участников"  value="4"   sub="Прошли капчу" color="text-emerald-400" delay={100} />
        <StatCard icon="TrendingUp"    label="Здоровье чата"     value="79%" sub="Норма" delay={150} />
      </div>

      <div className="stat-card animate-fade-in-delay-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Последние события</h3>
        <div className="space-y-2.5">
          {LOGS.slice(0, 4).map(log => (
            <div key={log.id} className="flex items-center gap-2.5">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${logDot[log.level]}`} />
              <span className={`text-xs font-medium ${logColor[log.level]}`}>{log.action}</span>
              <span className="text-xs text-muted-foreground truncate flex-1">— {log.user}</span>
              <span className="mono text-xs text-muted-foreground shrink-0">{log.time}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="stat-card animate-fade-in-delay-5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Быстрые действия</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Предупредить участника", icon: "AlertTriangle", color: "text-amber-400" },
            { label: "Отправить правила",       icon: "BookOpen",      color: "text-cyan-400"  },
            { label: "Очистить спам",           icon: "Trash2",        color: "text-red-400"   },
            { label: "Отчёт за день",           icon: "FileText",      color: "text-emerald-400" },
          ].map(a => (
            <button key={a.label}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-[hsl(220_12%_13%)] hover:bg-[hsl(220_12%_16%)] hover:border-[hsl(220_12%_24%)] transition-all text-left">
              <Icon name={a.icon as any} size={14} className={a.color} />
              <span className="text-xs font-medium leading-tight">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModerationPage() {
  const [filters, setFilters] = useState(FILTERS);
  const toggle = (id: string) =>
    setFilters(f => f.map(x => x.id === id ? { ...x, active: !x.active } : x));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Модерация</h2>
        <p className="text-sm text-muted-foreground">Фильтры автоматической проверки сообщений</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {filters.map((f, i) => (
          <button key={f.id} onClick={() => toggle(f.id)}
            className={`animate-fade-in flex items-center justify-between p-3.5 rounded-lg border text-left transition-all duration-150 ${
              f.active
                ? "bg-cyan-500/8 border-cyan-500/30 hover:bg-cyan-500/12"
                : "bg-card border-border opacity-60 hover:opacity-80"
            }`}
            style={{ animationDelay: `${i * 40}ms` }}>
            <div className="flex items-center gap-2.5">
              <div className={`w-2 h-2 rounded-full transition-colors ${f.active ? "bg-cyan-400 pulse-dot" : "bg-muted-foreground/40"}`} />
              <span className="text-sm font-medium">{f.label}</span>
            </div>
            <span className="mono text-xs text-muted-foreground">{f.count}</span>
          </button>
        ))}
      </div>

      <div className="stat-card space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Режим бота</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: "soft",     label: "Мягкий",          desc: "Объясняет",    icon: "MessageCircle" },
            { key: "balanced", label: "Сбалансированный", desc: "Предупреждает", icon: "Scale"        },
            { key: "strict",   label: "Строгий",          desc: "Блокирует",    icon: "ShieldX"       },
          ].map((m) => (
            <button key={m.key}
              className={`p-3 rounded-lg border text-center transition-all ${m.key === "balanced"
                ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300"
                : "bg-card border-border text-muted-foreground hover:border-[hsl(220_12%_28%)]"}`}>
              <Icon name={m.icon as any} size={16} className="mx-auto mb-1" />
              <div className="text-xs font-medium">{m.label}</div>
              <div className="text-xs opacity-60">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="stat-card">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Запрещённые слова</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {["казино", "крипто", "заработок100%", "ставки"].map(w => (
            <span key={w} className="badge-role bg-red-500/10 text-red-400 border border-red-500/20">
              {w} <span className="ml-1 opacity-50 cursor-pointer">✕</span>
            </span>
          ))}
        </div>
        <button className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
          <Icon name="Plus" size={14} /> Добавить слово
        </button>
      </div>
    </div>
  );
}

function MembersPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-1">Участники</h2>
        <p className="text-sm text-muted-foreground">Репутация и статусы членов группы</p>
      </div>
      <div className="space-y-2">
        {MEMBERS.map((m, i) => (
          <div key={m.id} className="animate-fade-in stat-card flex items-center gap-3"
               style={{ animationDelay: `${i * 40}ms` }}>
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-[hsl(220_12%_18%)] flex items-center justify-center text-sm font-semibold text-muted-foreground">
                {m.name.charAt(0)}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${
                m.status === "online" ? "bg-emerald-400" : "bg-slate-500"
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium truncate">{m.name}</span>
                <span className={`badge-role ${roleColor[m.role] || ""}`}>{m.role}</span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-muted-foreground mono">{m.msgs} сообщ.</span>
                {m.violations > 0 && (
                  <span className="text-xs text-red-400 mono">⚠ {m.violations} нар.</span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="mono text-base font-semibold text-cyan-400">{m.rep}</div>
              <div className="text-xs text-muted-foreground">репутация</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsPage() {
  const maxMsgs = Math.max(...ANALYTICS.map(d => d.msgs));
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Аналитика</h2>
        <p className="text-sm text-muted-foreground">Активность и здоровье чата за 7 дней</p>
      </div>

      <div className="stat-card">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Сообщения / Нарушения</h3>
        <div className="flex items-end gap-2 h-32">
          {ANALYTICS.map((d, i) => (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1 animate-fade-in"
                 style={{ animationDelay: `${i * 40}ms` }}>
              <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: "100px" }}>
                <div className="w-full rounded-t bg-red-500/40"     style={{ height: `${(d.violations / 7) * 30}px` }} />
                <div className="w-full rounded-t bg-cyan-400/70"    style={{ height: `${(d.msgs / maxMsgs) * 80}px` }} />
              </div>
              <span className="text-xs text-muted-foreground mono">{d.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-2 rounded-sm bg-cyan-400/70" /> Сообщения
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-2 rounded-sm bg-red-500/40" /> Нарушения
          </div>
        </div>
      </div>

      <div className="stat-card">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Здоровье чата</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-20 h-20 shrink-0">
            <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(220 12% 18%)" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(199 89% 48%)" strokeWidth="3"
                strokeDasharray="79 100" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="mono text-lg font-bold text-cyan-400">79%</span>
            </div>
          </div>
          <div className="space-y-2 flex-1">
            {[
              { label: "Токсичность",       val: 12, color: "bg-red-400" },
              { label: "Активность",        val: 68, color: "bg-cyan-400" },
              { label: "Новые участники",   val: 85, color: "bg-emerald-400" },
            ].map(bar => (
              <div key={bar.label}>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{bar.label}</span>
                  <span className="mono">{bar.val}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[hsl(220_12%_18%)]">
                  <div className={`h-full rounded-full ${bar.color}`} style={{ width: `${bar.val}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Топ автор",   val: "М. Крылова",    icon: "Crown",        color: "text-amber-400"  },
          { label: "Пик актив.",  val: "18:00–20:00",   icon: "TrendingUp",   color: "text-cyan-400"   },
          { label: "Тема дня",    val: "Новости",        icon: "MessageSquare",color: "text-emerald-400"},
        ].map((item, i) => (
          <div key={item.label} className="stat-card text-center animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
            <Icon name={item.icon as any} size={18} className={`mx-auto mb-1 ${item.color}`} />
            <div className="text-xs font-semibold">{item.val}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold mb-1">Отчёты</h2>
        <p className="text-sm text-muted-foreground">Готовые отчёты для бизнес-групп</p>
      </div>

      {[
        { title: "Ежедневный дайджест",    date: "12 мар 2026", size: "1 стр.", icon: "FileText",     color: "text-cyan-400"    },
        { title: "Недельная аналитика",    date: "10 мар 2026", size: "3 стр.", icon: "BarChart3",    color: "text-amber-400"   },
        { title: "Отчёт по нарушениям",    date: "10 мар 2026", size: "2 стр.", icon: "AlertTriangle",color: "text-red-400"     },
        { title: "Репутация участников",   date: "1 мар 2026",  size: "4 стр.", icon: "Users",        color: "text-emerald-400" },
      ].map((r, i) => (
        <div key={i}
          className="animate-fade-in stat-card flex items-center gap-3 cursor-pointer hover:border-cyan-500/30 transition-colors"
          style={{ animationDelay: `${i * 50}ms` }}>
          <div className="p-2.5 rounded-lg bg-[hsl(220_12%_16%)]">
            <Icon name={r.icon as any} size={18} className={r.color} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">{r.title}</div>
            <div className="text-xs text-muted-foreground mono">{r.date} · {r.size}</div>
          </div>
          <Icon name="Download" size={15} className="text-muted-foreground" />
        </div>
      ))}

      <div className="stat-card">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Расписание автоотчётов</h3>
        <div className="space-y-2">
          {[
            { label: "Ежедневно в 09:00",      target: "Администратор",      on: true  },
            { label: "Еженедельно (пн)",        target: "Руководитель группы", on: true  },
            { label: "При выбросе нарушений",   target: "Все модераторы",     on: false },
          ].map((row, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div>
                <span>{row.label}</span>
                <span className="text-xs text-muted-foreground ml-2">→ {row.target}</span>
              </div>
              <span className={`mono text-xs ${row.on ? "text-emerald-400" : "text-muted-foreground"}`}>
                {row.on ? "вкл" : "выкл"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LogsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-1">Логи</h2>
        <p className="text-sm text-muted-foreground">История действий бота сегодня</p>
      </div>
      <div className="space-y-1.5">
        {LOGS.map((log, i) => (
          <div key={log.id}
            className="animate-fade-in flex items-start gap-3 p-3 rounded-lg border border-border bg-card"
            style={{ animationDelay: `${i * 35}ms` }}>
            <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${logDot[log.level]}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold ${logColor[log.level]}`}>{log.action}</span>
                <span className="text-xs text-muted-foreground">— {log.user}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.detail}</p>
            </div>
            <span className="mono text-xs text-muted-foreground shrink-0">{log.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold mb-1">Настройки</h2>
        <p className="text-sm text-muted-foreground">Конфигурация бота «Порядок»</p>
      </div>

      {[
        {
          section: "Приветствие новых участников",
          items: [
            { label: "Показывать приветствие",  sub: "Бот отправляет сообщение при входе",     on: true  },
            { label: "Капча при входе",          sub: "Проверка: нажать кнопку «Я человек»",    on: true  },
            { label: "Таймаут для новичков",     sub: "Запрет медиа первые 24 часа",            on: false },
          ],
        },
        {
          section: "Система репутации",
          items: [
            { label: "Начислять репутацию",      sub: "За активность и соблюдение правил",       on: true  },
            { label: "Публичные баллы",           sub: "Участники видят рейтинг друг друга",      on: false },
            { label: "Автоматическая смена роли", sub: "По достижении порогов активности",       on: true  },
          ],
        },
        {
          section: "Уведомления",
          items: [
            { label: "Отчёт администратору",          sub: "Ежедневный дайджест в 09:00",            on: true },
            { label: "Алерт при выбросе нарушений",   sub: "Более 5 нарушений за час",               on: true },
          ],
        },
      ].map((block, bi) => (
        <div key={bi} className="stat-card space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{block.section}</h3>
          {block.items.map((item, ii) => (
            <div key={ii} className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.sub}</div>
              </div>
              <button
                className={`relative rounded-full transition-colors shrink-0 ${item.on ? "bg-cyan-500" : "bg-[hsl(220_12%_22%)]"}`}
                style={{ width: "40px", height: "22px" }}>
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: item.on ? "20px" : "2px" }} />
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─────────────── nav ─────────────── */
const NAV = [
  { key: "dashboard",  label: "Главная",   icon: "LayoutDashboard" },
  { key: "moderation", label: "Модерация", icon: "Shield"          },
  { key: "members",    label: "Участники", icon: "Users"           },
  { key: "analytics",  label: "Аналитика", icon: "BarChart3"       },
  { key: "reports",    label: "Отчёты",    icon: "FileBarChart"    },
  { key: "logs",       label: "Логи",      icon: "ScrollText"      },
  { key: "settings",   label: "Настройки", icon: "Settings"        },
];

/* ─────────────── root ─────────────── */
export default function Index() {
  const [active, setActive] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pages: Record<string, JSX.Element> = {
    dashboard:  <DashboardPage />,
    moderation: <ModerationPage />,
    members:    <MembersPage />,
    analytics:  <AnalyticsPage />,
    reports:    <ReportsPage />,
    logs:       <LogsPage />,
    settings:   <SettingsPage />,
  };

  return (
    <div className="min-h-screen bg-background grid-bg flex">
      {/* sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-56 bg-[hsl(220_18%_6%)] border-r border-border flex flex-col transition-transform duration-200
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:flex
      `}>
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Icon name="Bot" size={16} className="text-cyan-400" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight">Порядок</div>
              <div className="text-xs text-muted-foreground mono">v1.0 · МАКСбот</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV.map(item => (
            <button key={item.key}
              onClick={() => { setActive(item.key); setSidebarOpen(false); }}
              className={`nav-item w-full ${active === item.key ? "active" : ""}`}>
              <Icon name={item.icon as any} size={16} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
            <span className="text-xs text-muted-foreground">Макс API · подключён</span>
          </div>
        </div>
      </aside>

      {/* overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden"
             onClick={() => setSidebarOpen(false)} />
      )}

      {/* main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm">
          <button className="lg:hidden p-1.5 rounded-lg hover:bg-secondary"
                  onClick={() => setSidebarOpen(true)}>
            <Icon name="Menu" size={18} />
          </button>
          <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
            {NAV.find(n => n.key === active)?.label}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
              <span className="text-xs text-emerald-400 font-medium mono">онлайн</span>
            </div>
            <button className="p-2 rounded-lg hover:bg-secondary border border-border transition-colors">
              <Icon name="Bell" size={15} className="text-muted-foreground" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="max-w-2xl mx-auto px-4 py-5">
            {pages[active]}
          </div>
        </main>
      </div>
    </div>
  );
}