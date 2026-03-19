/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Toggle2, SectionTitle, Card, AccessBadge, INITIAL_COMMANDS, WARN_ACTIONS } from "./ui";

/* ══════════════════════════════════════════
   PAGE: COMMANDS
══════════════════════════════════════════ */
export function CommandsPage() {
  const [cmds, setCmds] = useState(INITIAL_COMMANDS);
  const [filter, setFilter] = useState<"all" | "admin" | "mod" | "everyone">("all");
  const toggle = (cmd: string) => setCmds(cs => cs.map(c => c.cmd === cmd ? { ...c, enabled: !c.enabled } : c));

  const filtered = filter === "all" ? cmds : cmds.filter(c => c.access === (filter === "everyone" ? "all" : filter));

  return (
    <div className="space-y-5">
      <div className="animate-fade-in">
        <h2 className="text-xl font-bold mb-1">Команды</h2>
        <p className="text-sm text-muted-foreground">Управляй доступными командами бота</p>
      </div>

      <div className="flex gap-2 flex-wrap animate-fade-in">
        {([
          { key: "all",      label: "Все"         },
          { key: "everyone", label: "Для всех"    },
          { key: "mod",      label: "Модераторы"  },
          { key: "admin",    label: "Админы"      },
        ] as const).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === f.key
              ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-400"
              : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((cmd, i) => (
          <div key={cmd.cmd}
            className={`animate-fade-in flex items-center gap-3 p-3 rounded-xl border border-border bg-card transition-opacity ${!cmd.enabled ? "opacity-50" : ""}`}
            style={{ animationDelay: `${i * 30}ms` }}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="mono text-sm font-bold text-cyan-400">{cmd.cmd}</span>
                <AccessBadge access={cmd.access} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{cmd.desc}</p>
            </div>
            <Toggle2 on={cmd.enabled} onChange={() => toggle(cmd.cmd)} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   PAGE: REPUTATION
══════════════════════════════════════════ */
export function ReputationPage() {
  const [enabled, setEnabled] = useState(true);
  const [showPublic, setShowPublic] = useState(false);
  const [autoRole, setAutoRole] = useState(true);

  const members = [
    { name: "Алексей Воронов", rep: 98, msgs: 1240, role: "Администратор", badge: "🏆" },
    { name: "Мария Крылова",   rep: 84, msgs: 876,  role: "Старожил",      badge: "⭐" },
    { name: "Татьяна Лисова",  rep: 71, msgs: 310,  role: "Активный",      badge: "👍" },
    { name: "Денис Орлов",     rep: 67, msgs: 432,  role: "Активный",      badge: "👍" },
    { name: "Светлана Рыбина", rep: 52, msgs: 198,  role: "Участник",      badge: ""   },
    { name: "Игорь Волков",    rep: 30, msgs: 45,   role: "Новичок",       badge: ""   },
  ];

  const thresholds = [
    { rep: 0,  msgs: 0,   label: "Новичок",  color: "text-slate-400" },
    { rep: 10, msgs: 50,  label: "Участник", color: "text-slate-300" },
    { rep: 40, msgs: 200, label: "Активный", color: "text-green-400" },
    { rep: 70, msgs: 600, label: "Старожил", color: "text-amber-400" },
  ];

  return (
    <div className="space-y-5">
      <div className="animate-fade-in">
        <h2 className="text-xl font-bold mb-1">Репутация</h2>
        <p className="text-sm text-muted-foreground">Система рейтинга участников группы</p>
      </div>

      <Card className="animate-fade-in space-y-3">
        <SectionTitle>Настройки</SectionTitle>
        {[
          { label: "Система репутации", sub: "Начислять баллы за активность и соблюдение правил", on: enabled,    set: setEnabled    },
          { label: "Публичный рейтинг", sub: "Участники видят репутацию друг друга",              on: showPublic, set: setShowPublic },
          { label: "Автосмена роли",    sub: "Менять роль при достижении порога",                 on: autoRole,   set: setAutoRole   },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.sub}</p>
            </div>
            <Toggle2 on={item.on} onChange={() => item.set(!item.on)} />
          </div>
        ))}
      </Card>

      <Card className="animate-fade-in">
        <SectionTitle>Пороги ролей</SectionTitle>
        <div className="space-y-2.5">
          {thresholds.map((t, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-20 shrink-0">
                <span className={`text-sm font-semibold ${t.color}`}>{t.label}</span>
              </div>
              <div className="flex-1 h-1.5 rounded-full bg-[hsl(220_12%_16%)]">
                <div className="h-full rounded-full bg-cyan-500/50" style={{ width: `${Math.min(100, t.rep + 10)}%` }} />
              </div>
              <div className="text-xs mono text-muted-foreground shrink-0">≥{t.rep} · {t.msgs} сообщ.</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="animate-fade-in">
        <SectionTitle>Топ участников</SectionTitle>
        <div className="space-y-2.5">
          {members.map((m, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="mono text-xs text-muted-foreground w-4 text-right shrink-0">{i + 1}</span>
              <div className="w-8 h-8 rounded-full bg-[hsl(220_12%_18%)] flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                {m.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{m.name} {m.badge}</div>
                <div className="text-xs text-muted-foreground">{m.role} · {m.msgs} сообщ.</div>
              </div>
              <div className="mono text-base font-bold text-cyan-400 shrink-0">{m.rep}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════
   PAGE: WARNS
══════════════════════════════════════════ */
function WarnToggleRow({ label, sub, initial }: { label: string; sub: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <Toggle2 on={on} onChange={() => setOn(!on)} />
    </div>
  );
}

export function WarnsPage() {
  const warned = [
    { name: "Игорь Волков",    warns: 3, last: "Спам (повтор ×4)",     time: "сегодня 12:41" },
    { name: "Денис Орлов",     warns: 2, last: "Запрещённое слово",    time: "вчера 18:10"   },
    { name: "Светлана Рыбина", warns: 1, last: "Капс (85% заглавных)", time: "вчера 11:40"   },
  ];
  const dotColors = ["hsl(38 92% 50%)", "hsl(25 95% 55%)", "hsl(10 90% 55%)", "hsl(0 72% 51%)"];

  return (
    <div className="space-y-5">
      <div className="animate-fade-in">
        <h2 className="text-xl font-bold mb-1">Предупреждения</h2>
        <p className="text-sm text-muted-foreground">Система варнов и автоматических санкций</p>
      </div>

      <Card className="animate-fade-in">
        <SectionTitle>Лестница санкций</SectionTitle>
        <div className="relative pl-5">
          <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
          {WARN_ACTIONS.map((step, i) => (
            <div key={i} className="relative flex items-center gap-3 mb-3.5 last:mb-0">
              <div className="absolute -left-1 w-2.5 h-2.5 rounded-full border-2 bg-background"
                style={{ borderColor: dotColors[i] }} />
              <div className="pl-3">
                <span className="mono text-sm font-bold" style={{ color: dotColors[i] }}>
                  {step.warns} {step.warns === 1 ? "варн" : "варна"}
                </span>
                <span className="text-sm text-muted-foreground ml-2">→ {step.action}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="animate-fade-in">
        <SectionTitle>Активные предупреждения</SectionTitle>
        <div className="space-y-3">
          {warned.map((w, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[hsl(220_12%_9%)] border border-border">
              <div className="w-8 h-8 rounded-full bg-[hsl(220_12%_16%)] flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                {w.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{w.name}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div key={j} className={`w-3 h-3 rounded-sm ${j < w.warns ? "bg-red-500" : "bg-[hsl(220_12%_22%)]"}`} />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{w.last}</p>
                <p className="text-xs text-muted-foreground mono">{w.time}</p>
              </div>
              <button className="shrink-0 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs hover:bg-red-500/20 transition-colors">
                Сбросить
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="animate-fade-in space-y-3">
        <SectionTitle>Параметры</SectionTitle>
        <WarnToggleRow label="Варны сгорают автоматически" sub="Через 7 дней без нарушений"   initial={true}  />
        <WarnToggleRow label="Варн при удалении сообщения"  sub="Автоматически назначать варн" initial={false} />
        <WarnToggleRow label="Уведомлять модераторов"        sub="Сообщение при новом варне"    initial={true}  />
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════
   PAGE: CONNECT
══════════════════════════════════════════ */
export function ConnectPage() {
  const [token, setToken] = useState("");
  const [groupId, setGroupId] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-5">
      <div className="animate-fade-in">
        <h2 className="text-xl font-bold mb-1">Подключение к Макс</h2>
        <p className="text-sm text-muted-foreground">Привяжи бота к своей группе в мессенджере Макс</p>
      </div>

      <Card className="animate-fade-in space-y-4">
        <SectionTitle>Инструкция</SectionTitle>
        {[
          { n: "1", text: "Открой Макс → найди официального бота @BotFather" },
          { n: "2", text: "Отправь /newbot → следуй инструкциям → получи токен" },
          { n: "3", text: "Добавь бота в свою группу с правами администратора" },
          { n: "4", text: "Скопируй токен и ID группы, вставь ниже" },
        ].map(step => (
          <div key={step.n} className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-cyan-400 mono">{step.n}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
          </div>
        ))}
      </Card>

      <Card className="animate-fade-in space-y-4">
        <SectionTitle>Данные бота</SectionTitle>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">API токен</label>
          <input type="password" value={token} onChange={e => setToken(e.target.value)}
            placeholder="1234567890:AABBccDD..."
            className="w-full rounded-lg bg-[hsl(220_12%_9%)] border border-border text-sm px-3 py-2.5 mono focus:outline-none focus:border-cyan-500/60 transition-colors" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">ID группы</label>
          <input type="text" value={groupId} onChange={e => setGroupId(e.target.value)}
            placeholder="-100123456789"
            className="w-full rounded-lg bg-[hsl(220_12%_9%)] border border-border text-sm px-3 py-2.5 mono focus:outline-none focus:border-cyan-500/60 transition-colors" />
        </div>
        <button onClick={() => setSaved(true)}
          className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 transition-colors text-sm font-bold text-[hsl(220_16%_8%)]">
          {saved ? "✓ Сохранено" : "Подключить бота"}
        </button>
      </Card>

      <Card className="animate-fade-in">
        <SectionTitle>Полезные ссылки</SectionTitle>
        <div className="space-y-1.5">
          {[
            { label: "Документация API Макс",         url: "https://dev.max.ru",       icon: "BookOpen"     },
            { label: "GroupHelp — аналог в Telegram", url: "https://grouphelp.bot",    icon: "ExternalLink" },
            { label: "Центр поддержки poehali.dev",   url: "https://poehali.dev/help", icon: "HelpCircle"   },
          ].map((link, i) => (
            <a key={i} href={link.url} target="_blank" rel="noreferrer"
              className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-[hsl(220_12%_14%)] transition-colors group">
              <Icon name={link.icon as any} size={14} className="text-muted-foreground group-hover:text-cyan-400 transition-colors" />
              <span className="text-sm group-hover:text-cyan-400 transition-colors">{link.label}</span>
              <Icon name="ArrowRight" size={12} className="text-muted-foreground ml-auto" />
            </a>
          ))}
        </div>
      </Card>
    </div>
  );
}
