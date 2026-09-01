/* Shared, dependency-free UI primitives (server-safe). */

import Link from "next/link";

export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="inline-flex items-center gap-2">
          {index > 0 && <span className="text-zinc-300 select-none">/</span>}
          {item.href ? (
            <Link href={item.href} className="font-medium transition-colors hover:text-indigo-600">
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-zinc-900">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm ${className}`}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="font-semibold text-zinc-900">{title}</h3>}
          {subtitle && <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  change,
  positive = true,
  icon,
}: {
  label: string;
  value: string;
  change: string;
  positive?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-500">{label}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          {icon}
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-zinc-900">{value}</p>
      <p className={`mt-1 text-xs font-medium ${positive ? "text-emerald-600" : "text-red-600"}`}>
        {change} <span className="text-zinc-400">vs last month</span>
      </p>
    </div>
  );
}

export function Badge({ tone = "zinc", children }: { tone?: "indigo" | "emerald" | "amber" | "red" | "zinc" | "sky"; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    zinc: "bg-zinc-100 text-zinc-600 ring-zinc-200",
    sky: "bg-sky-50 text-sky-700 ring-sky-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-semibold text-white">
      {initials}
    </div>
  );
}

export const money = (n: number) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(n);