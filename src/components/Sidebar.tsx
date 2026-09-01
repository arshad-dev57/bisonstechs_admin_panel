"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const nav = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/dashboard/clients",
    label: "Clients",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c0-3.5 2.9-5.5 6.5-5.5s6.5 2 6.5 5.5" />
        <path d="M16 4.5a3.5 3.5 0 010 7" />
        <path d="M18 15c1.8.6 3.5 2 3.5 5" />
      </svg>
    ),
  },
  {
    href: "/dashboard/pricing",
    label: "Pricing",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    href: "/dashboard/payments",
    label: "Payments",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="6" width="19" height="12" rx="2" />
        <path d="M6.5 12h4" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState("admin@bisonstechs.dev");
  const [userName, setUserName] = useState("Admin");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("admin_user");
      if (raw) {
        const u = JSON.parse(raw);
        if (u.email) setUserEmail(u.email);
        const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
        if (name) setUserName(name);
      }
    } catch (_) {}
  }, []);

  function handleLogout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_refresh_token");
    localStorage.removeItem("admin_user");
    window.location.replace("/login");
  }

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-zinc-800 bg-zinc-950 text-zinc-100 md:h-screen md:w-64 md:border-b-0 md:border-r md:fixed md:left-0 md:top-0">
      <div className="flex items-center gap-3 px-5 py-4 md:border-b md:border-zinc-800 shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500 font-bold text-white">
          B
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Bisons Techs</p>
          <p className="text-xs text-zinc-400">Admin Panel</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-row gap-1 overflow-x-auto px-3 py-3 md:flex-col md:overflow-y-auto">
        {nav.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-indigo-500 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden border-t border-zinc-800 px-5 py-4 md:block shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{userName}</p>
            <p className="truncate text-xs text-zinc-400">{userEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="shrink-0 text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
