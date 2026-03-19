/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import Icon from "@/components/ui/icon";
import { type Page } from "@/components/bot/ui";
import { DashboardPage, WelcomePage, AntispamPage } from "@/components/bot/PagesGroup1";
import { CommandsPage, ReputationPage, WarnsPage, ConnectPage } from "@/components/bot/PagesGroup2";

/* ══════════════════════════════════════════
   NAV
══════════════════════════════════════════ */
const NAV: { key: Page; label: string; icon: string }[] = [
  { key: "dashboard",  label: "Главная",     icon: "LayoutDashboard" },
  { key: "welcome",    label: "Приветствие", icon: "Handshake"       },
  { key: "antispam",   label: "Антиспам",    icon: "ShieldCheck"     },
  { key: "commands",   label: "Команды",     icon: "Terminal"        },
  { key: "reputation", label: "Репутация",   icon: "Star"            },
  { key: "warns",      label: "Варны",       icon: "AlertTriangle"   },
  { key: "connect",    label: "Подключение", icon: "Link"            },
];

/* ══════════════════════════════════════════
   ROOT
══════════════════════════════════════════ */
export default function Index() {
  const [active, setActive] = useState<Page>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pages: Record<Page, React.ReactNode> = {
    dashboard:  <DashboardPage />,
    welcome:    <WelcomePage />,
    antispam:   <AntispamPage />,
    commands:   <CommandsPage />,
    reputation: <ReputationPage />,
    warns:      <WarnsPage />,
    connect:    <ConnectPage />,
  };

  return (
    <div className="min-h-screen bg-background grid-bg flex">
      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-56 border-r border-border flex flex-col transition-transform duration-200 bg-[hsl(220_18%_6%)]
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static
      `}>
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Icon name="Bot" size={16} className="text-cyan-400" />
            </div>
            <div>
              <div className="text-sm font-bold">Порядок</div>
              <div className="text-xs text-muted-foreground mono">GroupBot для Макс</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
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
            <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot inline-block" />
            <span className="text-xs text-muted-foreground">Бот подключён</span>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm">
          <button className="lg:hidden p-1.5 rounded-lg hover:bg-secondary" onClick={() => setSidebarOpen(true)}>
            <Icon name="Menu" size={18} />
          </button>
          <span className="text-sm font-semibold hidden lg:block">
            {NAV.find(n => n.key === active)?.label}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot inline-block" />
              <span className="text-xs text-emerald-400 font-semibold mono">онлайн</span>
            </div>
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
