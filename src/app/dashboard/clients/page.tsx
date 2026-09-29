"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Badge, Breadcrumbs, Card, PageHeader } from "@/components/ui";
import { getCompanies, updateCompanyStatus, type CompanyRow } from "@/lib/api";

const searchIcon = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" });
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_TRIAL_DAYS = 5;

function daysBetween(from: number, to: number) {
  return Math.floor((to - from) / MS_PER_DAY);
}

type PeriodInfo = {
  usedDays: number;
  totalDays: number | null;
  remainingDays: number | null;
  label: string;
};

function getPeriodInfo(c: CompanyRow): PeriodInfo | null {
  const plan = (c.subscriptionPlan || "").toLowerCase();
  const now = Date.now();

  let startRaw: string | null | undefined;
  let endRaw: string | null | undefined;

  if (plan === "trial") {
    startRaw = c.trialStartDate || c.createdAt;
    endRaw = c.trialEndDate;
  } else if (plan === "monthly" || plan === "yearly") {
    startRaw = c.subscriptionStartDate || c.createdAt;
    endRaw = c.subscriptionEndDate;
  } else {
    return null;
  }

  if (!startRaw && !endRaw) return null;

  const start = startRaw ? new Date(startRaw).getTime() : null;
  const end = endRaw ? new Date(endRaw).getTime() : null;
  const usedDays = start != null ? Math.max(0, daysBetween(start, now)) : 0;

  if (start != null && end != null) {
    const totalDays = Math.max(1, daysBetween(start, end));
    const remainingDays = daysBetween(now, end);
    const clampedUsed = Math.min(usedDays, totalDays);
    return {
      usedDays: clampedUsed,
      totalDays,
      remainingDays,
      label:
        remainingDays < 0
          ? `${clampedUsed} of ${totalDays} days used · expired`
          : `${clampedUsed} of ${totalDays} days used`,
    };
  }

  if (start != null) {
    const totalDays = plan === "trial" ? DEFAULT_TRIAL_DAYS : null;
    return {
      usedDays,
      totalDays,
      remainingDays: totalDays != null ? Math.max(0, totalDays - usedDays) : null,
      label: totalDays != null ? `${usedDays} of ${totalDays} days used` : `${usedDays} days used`,
    };
  }

  if (end != null) {
    const remainingDays = daysBetween(now, end);
    const totalDays = plan === "trial" ? DEFAULT_TRIAL_DAYS : null;
    const usedDaysGuess = totalDays != null ? Math.max(0, totalDays - Math.max(0, remainingDays)) : 0;
    return {
      usedDays: usedDaysGuess,
      totalDays,
      remainingDays,
      label:
        totalDays != null
          ? `${usedDaysGuess} of ${totalDays} days used`
          : remainingDays >= 0
            ? `${remainingDays}d left`
            : "Expired",
    };
  }

  return null;
}

function formatPeriod(c: CompanyRow): string | undefined {
  const info = getPeriodInfo(c);
  if (!info) return undefined;

  const plan = (c.subscriptionPlan || "").toLowerCase();
  const startRaw =
    plan === "trial"
      ? c.trialStartDate || c.createdAt
      : c.subscriptionStartDate || c.createdAt;
  const endRaw = plan === "trial" ? c.trialEndDate : c.subscriptionEndDate;

  const parts = [info.label];
  if (info.remainingDays != null) {
    if (info.remainingDays < 0) parts.push(`${Math.abs(info.remainingDays)}d overdue`);
    else if (info.remainingDays === 0) parts.push("ends today");
    else parts.push(`${info.remainingDays}d left`);
  }
  if (startRaw && endRaw) {
    parts.push(`${fmtDate(startRaw)} → ${fmtDate(endRaw)}`);
  }
  return parts.join(" · ");
}

type BillingTone = "indigo" | "emerald" | "amber" | "red" | "zinc" | "sky";

function getBillingStatus(c: CompanyRow): { label: string; tone: BillingTone; detail?: string } {
  const plan = (c.subscriptionPlan || "").toLowerCase();
  const status = (c.subscriptionStatus || "").toLowerCase();
  const now = Date.now();
  const trialEnd = c.trialEndDate ? new Date(c.trialEndDate).getTime() : null;
  const subEnd = c.subscriptionEndDate ? new Date(c.subscriptionEndDate).getTime() : null;
  const period = formatPeriod(c);

  if (plan === "monthly" || plan === "yearly") {
    const expired =
      status === "expired" || status === "cancelled" || (subEnd != null && subEnd < now);
    if (expired) {
      return {
        label: "Subscription Expired",
        tone: "red",
        detail: period || (subEnd ? `Ended ${fmtDate(c.subscriptionEndDate!)}` : undefined),
      };
    }
    return {
      label: plan === "yearly" ? "Yearly Active" : "Monthly Active",
      tone: "indigo",
      detail: period || "On subscription",
    };
  }

  if (plan === "trial") {
    const expired =
      status === "expired" || status === "cancelled" || (trialEnd != null && trialEnd < now);
    if (expired) {
      return {
        label: "Trial Expired",
        tone: "red",
        detail: period || (trialEnd ? `Ended ${fmtDate(c.trialEndDate!)}` : undefined),
      };
    }
    if (status !== "active" && status) {
      return {
        label: "Trial Inactive",
        tone: "amber",
        detail: period || status,
      };
    }
    return {
      label: "Trial Active",
      tone: "amber",
      detail: period || (trialEnd ? `Until ${fmtDate(c.trialEndDate!)}` : undefined),
    };
  }

  if (plan === "none" || !plan) {
    return { label: "No Plan", tone: "zinc" };
  }

  return {
    label: status === "active" ? `${plan} · Active` : `${plan} · ${status || "Unknown"}`,
    tone: status === "active" ? "sky" : "zinc",
  };
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await getCompanies();
    if (res.success && res.data) {
      setClients(res.data as CompanyRow[]);
    } else {
      setError((res as { message?: string }).message || "Failed to load clients");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const matchesFilter =
        filter === "All" ||
        (filter === "Active" && c.isActive) ||
        (filter === "Inactive" && !c.isActive);
      const q = query.toLowerCase();
      const matchesQuery =
        c.name.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.businessType || "").toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [clients, query, filter]);

  async function handleToggle(id: string, name: string, currentlyActive: boolean) {
    if (currentlyActive) {
      const ok = window.confirm(
        `Deactivate "${name}"?\n\nAll users in this client will lose access to the web app and desktop POS until you activate again.`
      );
      if (!ok) return;
    }

    setToggling(id);
    setActionMessage("");
    const res = await updateCompanyStatus(id, !currentlyActive);
    if (res.success) {
      setClients((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isActive: !currentlyActive } : c))
      );
      setActionMessage(
        res.message ||
          `Client "${name}" has been ${currentlyActive ? "deactivated" : "activated"}.`
      );
    } else {
      setError((res as { message?: string }).message || "Failed to update client status");
    }
    setToggling(null);
  }

  const activeCount = clients.filter((c) => c.isActive).length;
  const inactiveCount = clients.length - activeCount;
  const trialActiveCount = clients.filter((c) => getBillingStatus(c).label === "Trial Active").length;
  const subscribedCount = clients.filter((c) => {
    const label = getBillingStatus(c).label;
    return label === "Monthly Active" || label === "Yearly Active";
  }).length;

  return (
    <main className="flex-1 p-5 md:p-8">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Clients" },
        ]}
      />

      <PageHeader
        title="Clients"
        subtitle="All registered clients on the platform"
        action={
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6M21 12a9 9 0 01-15 6.7L3 16" />
            </svg>
            Refresh
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-zinc-500">Total Clients</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900">{clients.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-zinc-500">Account Active</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{activeCount}</p>
          <p className="mt-1 text-xs text-zinc-400">{inactiveCount} inactive</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-zinc-500">Trial Active</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{trialActiveCount}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-zinc-500">On Subscription</p>
          <p className="mt-2 text-2xl font-bold text-indigo-600">{subscribedCount}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
      {actionMessage && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {actionMessage}
        </div>
      )}

      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-xs">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400">
              {searchIcon}
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients…"
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:bg-white"
            />
          </div>
          <div className="flex gap-2">
            {(["All", "Active", "Inactive"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === f ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-zinc-400 text-sm gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              Loading clients…
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-3 py-3 font-medium">Client</th>
                  <th className="px-3 py-3 font-medium">Plan</th>
                  <th className="px-3 py-3 font-medium">Users</th>
                  <th className="px-3 py-3 font-medium">Joined</th>
                  <th className="px-3 py-3 font-medium">Days Used</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-zinc-400">
                      No clients found.
                    </td>
                  </tr>
                )}
                {filtered.map((c) => {
                  const billing = getBillingStatus(c);
                  const period = getPeriodInfo(c);
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer"
                      onClick={() => router.push(`/dashboard/clients/${c.id}`)}
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.name} />
                          <div>
                            <p className="font-medium text-zinc-900">{c.name}</p>
                            <p className="text-xs text-zinc-500">{c.email || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div>
                          <span className="capitalize text-zinc-700">{c.subscriptionPlan}</span>
                          {c.productTier && (
                            <p className="text-xs text-zinc-400 capitalize">{c.productTier.replace("_", " + ")}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-zinc-700 font-medium">
                        {c._count.users}
                        {c.licensedUsers != null && (
                          <span className="text-zinc-400 font-normal"> / {c.licensedUsers}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-zinc-500">{fmtDate(c.createdAt)}</td>
                      <td className="px-3 py-3">
                        {period ? (
                          <div>
                            <p className="font-semibold text-zinc-900">
                              {period.usedDays}
                              {period.totalDays != null ? (
                                <span className="font-normal text-zinc-500"> / {period.totalDays} days</span>
                              ) : (
                                <span className="font-normal text-zinc-500"> days</span>
                              )}
                            </p>
                            {period.remainingDays != null && (
                              <p className="text-[11px] text-zinc-400">
                                {period.remainingDays < 0
                                  ? `${Math.abs(period.remainingDays)}d overdue`
                                  : period.remainingDays === 0
                                    ? "Ends today"
                                    : `${period.remainingDays}d left`}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col items-start gap-1.5 max-w-[260px]">
                          <Badge tone={c.isActive ? "emerald" : "red"}>
                            {c.isActive ? "Account Active" : "Account Inactive"}
                          </Badge>
                          <Badge tone={billing.tone}>{billing.label}</Badge>
                          {billing.detail && (
                            <p className="text-[11px] leading-snug text-zinc-500">{billing.detail}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggle(c.id, c.name, c.isActive)}
                          disabled={toggling === c.id}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                            c.isActive
                              ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                          }`}
                        >
                          {toggling === c.id ? "…" : c.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </main>
  );
}
