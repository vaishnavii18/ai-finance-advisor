
import { NavLink } from "react-router-dom";

import {
  LayoutDashboard,
  Wallet,
  Receipt,
  TrendingUp,
  AlertTriangle,
  Brain,
  Bot,
  Settings,
} from "lucide-react";

const menuItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/",
  },
  {
    icon: Receipt,
    label: "Expenses",
    path: "/expenses",
  },
  {
    icon: TrendingUp,
    label: "Forecast",
    path: "/forecast",
  },
  {
    icon: AlertTriangle,
    label: "Anomalies",
    path: "/anomalies",
  },
  {
    icon: Wallet,
    label: "Budget",
    path: "/budget",
  },
  {
    icon: Brain,
    label: "Explainability",
    path: "/explainability",
  },
  {
    icon: Bot,
    label: "AI Advisor",
    path: "/advisor",
  },
  {
    icon: Settings,
    label: "Settings",
    path: "/settings",
  },
];

export default function Sidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-white">
      <div className="px-5 pb-8 pt-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
            <span className="text-sm font-bold text-white">F</span>
          </div>

          <div>
            <h1 className="text-[15px] font-semibold tracking-tight">
              FinAdvisor
            </h1>

            <p className="text-[11px] text-slate-400">
              Personal Finance
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600/90 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={17}
                    className={
                      isActive ? "text-white" : "text-slate-500"
                    }
                  />

                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-5 py-4">
        <p className="text-[11px] text-slate-500">
          Final Year Project · 2026
        </p>
      </div>
    </aside>
  );
}