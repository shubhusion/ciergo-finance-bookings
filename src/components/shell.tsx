"use client";

import {
  LayoutDashboard, ShoppingCart, Settings2, CalendarDays, CheckSquare,
  FileText, Wallet, Contact, BarChart3, Settings, PanelLeft, Search, Bell,
  ChevronRight, Home,
} from "lucide-react";
import type { SessionResponse } from "@/lib/types";

const NAV = [
  { label: "Dashboard", Icon: LayoutDashboard },
  { label: "Sales", Icon: ShoppingCart, chevron: true },
  { label: "Operations", Icon: Settings2, chevron: true },
  { label: "Bookings", Icon: CalendarDays },
  { label: "Approvals", Icon: CheckSquare, chevron: true },
  { label: "Content", Icon: FileText },
  { label: "Finance", Icon: Wallet, chevron: true, active: true },
  { label: "Directory", Icon: Contact, chevron: true },
  { label: "Reports", Icon: BarChart3 },
];

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-gray-200 bg-white transition-all ${
        collapsed ? "w-[72px]" : "w-[184px]"
      }`}
    >
      <div className="flex h-14 items-center justify-between px-4">
        {!collapsed && (
          <span className="text-xl font-bold tracking-tight text-brand-700">ciergo</span>
        )}
        <button
          onClick={onToggle}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-50"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelLeft size={18} />
        </button>
      </div>

      <nav className="mt-4 flex-1 space-y-0.5 px-3">
        {NAV.map(({ label, Icon, chevron, active }) => (
          <button
            key={label}
            aria-current={active ? "page" : undefined}
            title={collapsed ? label : undefined}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors ${
              active
                ? "bg-brand-50 font-medium text-brand-700"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Icon size={16} className="shrink-0" />
            {!collapsed && <span className="flex-1 text-left">{label}</span>}
            {!collapsed && chevron && <ChevronRight size={14} className="text-gray-300" />}
          </button>
        ))}
      </nav>

      <div className="px-3 pb-4">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-gray-500 hover:bg-gray-50">
          <Settings size={16} />
          {!collapsed && <span className="flex-1 text-left">Settings</span>}
          {!collapsed && <ChevronRight size={14} className="text-gray-300" />}
        </button>
      </div>
    </aside>
  );
}

export function Topbar({
  crumbs,
  session,
}: {
  crumbs: string[];
  session: SessionResponse;
}) {
  return (
    <header className="flex h-14 items-center gap-4 px-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px] text-gray-500">
        <Home size={15} className="text-gray-400" />
        {crumbs.map((c, i) => (
          <span key={c} className="flex items-center gap-2">
            <span className="text-gray-300">/</span>
            <span className={i === crumbs.length - 1 ? "font-medium text-brand-600" : ""}>
              {c}
            </span>
          </span>
        ))}
      </nav>

      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <Search size={15} className="text-gray-400" />
          <input
            aria-label="Search or type command"
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-gray-400"
            placeholder="Search or type command..."
          />
          <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">⌘ K</kbd>
        </div>
      </div>

      <button className="relative text-gray-400 hover:text-gray-600" aria-label="Notifications">
        <Bell size={18} />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
      </button>

      <div className="flex items-center gap-2">
        <img
          src={session.avatarUrl}
          alt={session.name}
          className="h-8 w-8 shrink-0 rounded-full object-cover"
        />
        <div className="leading-tight">
          <div className="text-[13px] font-semibold text-gray-800">{session.name}</div>
          <div className="text-[11px] text-gray-400">
            {session.jobTitle ?? session.role}
          </div>
        </div>
      </div>
    </header>
  );
}
