"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Breadcrumbs,
  Card,
  PageHeader,
} from "@/components/ui";
import {
  getCompanyStorageUsage,
  getCompanies,
  invalidateStorageCache,
  type CompanyStorageEntry,
  type StorageBreakdownItem,
  type CompanyRow,
} from "@/lib/api";

// ─── Storage formatting helpers ───────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Plan-based indicative storage limits (used only for UI progress bar context)
// These are NOT enforced limits — just for visual reference.
const PLAN_LIMIT_BYTES: Record<string, number> = {
  trial: 1 * 1024 * 1024 * 1024,       // 1 GB
  monthly: 5 * 1024 * 1024 * 1024,     // 5 GB
  yearly: 20 * 1024 * 1024 * 1024,     // 20 GB
  none: 512 * 1024 * 1024,             // 512 MB
  _default: 2 * 1024 * 1024 * 1024,    // 2 GB
};

function getPlanLimit(plan?: string): number {
  return PLAN_LIMIT_BYTES[plan ?? "_default"] ?? PLAN_LIMIT_BYTES._default;
}

type StatusTier = "Normal" | "Warning" | "Critical" | "Limit Reached";

function getStatus(pct: number): StatusTier {
  if (pct >= 100) return "Limit Reached";
  if (pct >= 90) return "Critical";
  if (pct >= 70) return "Warning";
  return "Normal";
}

const STATUS_STYLES: Record<StatusTier, { bar: string; badge: string; bg: string }> = {
  Normal: {
    bar: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    bg: "bg-emerald-50 border-emerald-200",
  },
  Warning: {
    bar: "bg-amber-400",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    bg: "bg-amber-50 border-amber-200",
  },
  Critical: {
    bar: "bg-red-500",
    badge: "bg-red-50 text-red-700 ring-red-200",
    bg: "bg-red-50 border-red-200",
  },
  "Limit Reached": {
    bar: "bg-red-700",
    badge: "bg-red-100 text-red-800 ring-red-300",
    bg: "bg-red-100 border-red-300",
  },
};

// Pretty table-name formatting
function fmtTableName(raw: string): string {
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnrichedCompany extends CompanyStorageEntry {
  subscriptionPlan?: string;
  isActive?: boolean;
  userCount?: number;
  limitBytes: number;
  usagePct: number;
  status: StatusTier;
}

type SortKey = "storage" | "name" | "pct";
type SortDir = "desc" | "asc";

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-zinc-100 animate-pulse">
      {[40, 24, 24, 28, 32, 20].map((w, i) => (
        <td key={i} className="px-3 py-4">
          <div className={`h-3 rounded bg-zinc-200 w-${w}`} />
        </td>
      ))}
    </tr>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function UsageBar({ pct, tier }: { pct: number; tier: StatusTier }) {
  const clamped = Math.min(pct, 100);
  const style = STATUS_STYLES[tier];
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs text-zinc-500 w-9 text-right shrink-0">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

// ─── Detail modal ─────────────────────────────────────────────────────────────

function DetailModal({
  company,
  onClose,
}: {
  company: EnrichedCompany;
  onClose: () => void;
}) {
  const style = STATUS_STYLES[company.status];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <Avatar name={company.companyName} />
            <div>
              <h2 className="font-semibold text-zinc-900">{company.companyName}</h2>
              <p className="text-xs text-zinc-400 font-mono">{company.companyId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs text-zinc-500 mb-1">Database Storage</p>
              <p className="text-lg font-bold text-zinc-900">{fmtBytes(company.storageBytes)}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs text-zinc-500 mb-1">Indicative Limit</p>
              <p className="text-lg font-bold text-zinc-900">{fmtBytes(company.limitBytes)}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">based on plan</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs text-zinc-500 mb-1">Usage</p>
              <p className="text-lg font-bold text-zinc-900">{company.usagePct.toFixed(1)}%</p>
            </div>
          </div>

          {/* Status + usage bar */}
          <div className={`rounded-xl border p-4 ${style.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-700">Usage Status</span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${style.badge}`}>
                {company.status}
              </span>
            </div>
            <UsageBar pct={company.usagePct} tier={company.status} />
            <p className="mt-2 text-xs text-zinc-500">
              {fmtBytes(company.storageBytes)} used of {fmtBytes(company.limitBytes)} indicative limit
            </p>
          </div>

          {/* Cloud storage placeholder */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-700">Cloud / File Storage (Cloudinary)</p>
                <p className="text-xs text-zinc-400 mt-0.5">File storage metrics not yet available</p>
              </div>
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 bg-zinc-100 text-zinc-500 ring-zinc-200">
                Coming soon
              </span>
            </div>
          </div>

          {/* Database breakdown */}
          {company.breakdown && company.breakdown.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 mb-3">
                Database Breakdown
                <span className="ml-2 text-xs font-normal text-zinc-400">
                  ({company.breakdown.length} tables)
                </span>
              </h3>
              <div className="rounded-xl border border-zinc-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Table</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">Rows</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">Size</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide w-28">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {company.breakdown.map((item: StorageBreakdownItem) => {
                      const sharePct = company.storageBytes > 0
                        ? (item.storageBytes / company.storageBytes) * 100
                        : 0;
                      return (
                        <tr key={item.table} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                          <td className="px-4 py-2.5 text-zinc-700 font-medium">{fmtTableName(item.table)}</td>
                          <td className="px-4 py-2.5 text-right text-zinc-500">{item.rowCount.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right text-zinc-700 font-medium">{fmtBytes(item.storageBytes)}</td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <div className="w-16 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-indigo-400"
                                  style={{ width: `${Math.min(sharePct, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-zinc-400 w-8 text-right">{sharePct.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Accuracy disclaimer */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs text-amber-700 leading-relaxed">
              <span className="font-semibold">Estimated:</span>{" "}
              Database storage values are approximated using proportional row-count distribution
              (company rows ÷ total table rows × table size). Not exact per-tenant byte measurements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StoragePage() {
  const [storageReport, setStorageReport] = useState<{
    companies: CompanyStorageEntry[];
    totalStorageBytes: number;
    totalStorageMB: number;
    totalStorageGB: number;
    computedAt: string;
    fromCache: boolean;
    cacheExpiresInSeconds: number;
  } | null>(null);
  const [companyMap, setCompanyMap] = useState<Map<string, CompanyRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Filters / sort
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | StatusTier>("All");
  const [sortKey, setSortKey] = useState<SortKey>("storage");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Detail modal
  const [selected, setSelected] = useState<EnrichedCompany | null>(null);

  const load = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const [storageRes, companiesRes] = await Promise.all([
        getCompanyStorageUsage({ breakdown: true, forceRefresh }),
        getCompanies(),
      ]);

      if (!storageRes.success) {
        setError(storageRes.message || "Failed to load storage data");
        return;
      }

      // Build company info map for plan / active enrichment
      const map = new Map<string, CompanyRow>();
      if (companiesRes.success && companiesRes.data) {
        (companiesRes.data as CompanyRow[]).forEach((c) => map.set(c.id, c));
      }
      setCompanyMap(map);

      setStorageReport({
        companies: storageRes.companies ?? [],
        totalStorageBytes: storageRes.totalStorageBytes ?? 0,
        totalStorageMB: storageRes.totalStorageMB ?? 0,
        totalStorageGB: storageRes.totalStorageGB ?? 0,
        computedAt: storageRes.computedAt ?? "",
        fromCache: storageRes.fromCache ?? false,
        cacheExpiresInSeconds: storageRes.cacheExpiresInSeconds ?? 0,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Enrich storage entries with plan info + computed status
  const enriched: EnrichedCompany[] = useMemo(() => {
    if (!storageReport) return [];
    return storageReport.companies.map((entry) => {
      const info = companyMap.get(entry.companyId);
      const limitBytes = getPlanLimit(info?.subscriptionPlan);
      const usagePct = Math.min((entry.storageBytes / limitBytes) * 100, 999);
      return {
        ...entry,
        subscriptionPlan: info?.subscriptionPlan,
        isActive: info?.isActive,
        userCount: info?._count?.users,
        limitBytes,
        usagePct,
        status: getStatus(usagePct),
      };
    });
  }, [storageReport, companyMap]);

  // Filtered + sorted list
  const visible = useMemo(() => {
    let list = enriched.filter((c) => {
      const q = query.toLowerCase();
      const matchQ =
        !q ||
        c.companyName.toLowerCase().includes(q) ||
        c.companyId.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "All" || c.status === statusFilter;
      return matchQ && matchStatus;
    });

    list = [...list].sort((a, b) => {
      let diff = 0;
      if (sortKey === "storage") diff = a.storageBytes - b.storageBytes;
      else if (sortKey === "pct") diff = a.usagePct - b.usagePct;
      else diff = a.companyName.localeCompare(b.companyName);
      return sortDir === "asc" ? diff : -diff;
    });

    return list;
  }, [enriched, query, statusFilter, sortKey, sortDir]);

  // Summary stats
  const totalCompanies = enriched.length;
  const totalDbBytes = storageReport?.totalStorageBytes ?? 0;
  const statusCounts = useMemo(() => {
    const counts: Record<StatusTier, number> = {
      Normal: 0, Warning: 0, Critical: 0, "Limit Reached": 0,
    };
    enriched.forEach((c) => counts[c.status]++);
    return counts;
  }, [enriched]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="text-zinc-300 ml-1">↕</span>;
    return <span className="text-indigo-500 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  // ── Error states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="flex-1 p-5 md:p-8">
        <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Storage Usage" }]} />
        <PageHeader title="Storage Usage" subtitle="Loading storage data…" />
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm animate-pulse">
              <div className="h-3 w-24 bg-zinc-200 rounded mb-3" />
              <div className="h-7 w-16 bg-zinc-200 rounded" />
            </div>
          ))}
        </div>
        <Card>
          <table className="w-full text-sm">
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
            </tbody>
          </table>
        </Card>
      </main>
    );
  }


  if (error && !storageReport) {
    return (
      <main className="flex-1 p-5 md:p-8">
        <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Storage Usage" }]} />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 9v4M12 17h.01" /><circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-zinc-900">Failed to load storage data</h2>
          <p className="mt-1 text-sm text-zinc-500">{error}</p>
          <button
            onClick={() => load()}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <>
      <main className="flex-1 p-5 md:p-8">
        <Breadcrumbs
          items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Storage Usage" }]}
        />

        <PageHeader
          title="Storage Usage"
          subtitle="Company-wise database storage consumption across all tenants"
          action={
            <div className="flex items-center gap-2">
              {storageReport?.computedAt && (
                <span className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400">
                  <span className={`h-1.5 w-1.5 rounded-full ${storageReport.fromCache ? "bg-amber-400" : "bg-emerald-500"}`} />
                  {storageReport.fromCache ? "Cached" : "Live"} · {fmtDate(storageReport.computedAt)}
                </span>
              )}
              <button
                id="storage-refresh-btn"
                onClick={() => load(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-60"
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6M21 12a9 9 0 01-15 6.7L3 16" />
                </svg>
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          }
        />

        {/* Summary cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Total Companies</p>
            <p className="mt-2 text-2xl font-bold text-zinc-900">{totalCompanies}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Database Used</p>
            <p className="mt-2 text-2xl font-bold text-zinc-900">{fmtBytes(totalDbBytes)}</p>
            <p className="mt-0.5 text-xs text-zinc-400">PostgreSQL (estimated)</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Cloud / File Storage</p>
            <p className="mt-2 text-sm font-medium text-zinc-400 italic">Not available yet</p>
            <p className="mt-0.5 text-xs text-zinc-300">Cloudinary metrics pending</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-zinc-500">Status Overview</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                  {statusCounts.Normal} Normal
                </span>
                {statusCounts.Warning > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                    {statusCounts.Warning} Warning
                  </span>
                )}
                {statusCounts.Critical > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700 ring-1 ring-red-200">
                    {statusCounts.Critical} Critical
                  </span>
                )}
                {statusCounts["Limit Reached"] > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 ring-1 ring-red-300">
                    {statusCounts["Limit Reached"]} Limit
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Estimated disclaimer */}
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2.5">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
          <p className="text-xs text-amber-700 leading-relaxed">
            <span className="font-semibold">Database storage usage is an estimated tenant-level calculation.</span>{" "}
            Values are derived using proportional row-count distribution and are not exact per-company byte measurements.
            Usage % is relative to indicative limits based on subscription plan.
            Cloudinary/file storage is not yet available from the API.
          </p>
        </div>

        {/* Table card */}
        <Card>
          {/* Controls */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-xs">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
                </svg>
              </span>
              <input
                id="storage-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or ID…"
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:bg-white"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(["All", "Normal", "Warning", "Critical", "Limit Reached"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    statusFilter === f
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-left text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-3 py-3 font-medium">
                    <button onClick={() => toggleSort("name")} className="flex items-center hover:text-zinc-700">
                      Company <SortIcon k="name" />
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">Plan</th>
                  <th className="px-3 py-3 font-medium">
                    <button onClick={() => toggleSort("storage")} className="flex items-center hover:text-zinc-700">
                      DB Storage <SortIcon k="storage" />
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">Cloudinary</th>
                  <th className="px-3 py-3 font-medium">
                    <button onClick={() => toggleSort("pct")} className="flex items-center hover:text-zinc-700">
                      Usage <SortIcon k="pct" />
                    </button>
                  </th>
                  <th className="px-3 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-zinc-400">
                      {query || statusFilter !== "All"
                        ? "No companies match your filters."
                        : "No storage data available."}
                    </td>
                  </tr>
                )}
                {visible.map((c) => {
                  const style = STATUS_STYLES[c.status];
                  return (
                    <tr
                      key={c.companyId}
                      id={`storage-row-${c.companyId}`}
                      className="border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer transition-colors"
                      onClick={() => setSelected(c)}
                    >
                      {/* Company */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.companyName} />
                          <div className="min-w-0">
                            <p className="font-medium text-zinc-900 truncate">{c.companyName}</p>
                            <p className="text-xs text-zinc-400 font-mono truncate">{c.companyId.slice(0, 8)}…</p>
                          </div>
                        </div>
                      </td>
                      {/* Plan */}
                      <td className="px-3 py-3.5">
                        {c.subscriptionPlan ? (
                          <Badge tone={c.subscriptionPlan === "trial" ? "amber" : c.subscriptionPlan === "yearly" ? "emerald" : "indigo"}>
                            {c.subscriptionPlan}
                          </Badge>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      {/* DB Storage */}
                      <td className="px-3 py-3.5">
                        <p className="font-medium text-zinc-900">{fmtBytes(c.storageBytes)}</p>
                        <p className="text-xs text-zinc-400">of {fmtBytes(c.limitBytes)} limit</p>
                      </td>
                      {/* Cloudinary */}
                      <td className="px-3 py-3.5 text-zinc-400 text-xs italic">
                        N/A
                      </td>
                      {/* Usage bar */}
                      <td className="px-3 py-3.5">
                        <UsageBar pct={c.usagePct} tier={c.status} />
                      </td>
                      {/* Status badge */}
                      <td className="px-3 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${style.badge}`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {visible.length > 0 && (
            <p className="mt-3 text-xs text-zinc-400">
              Showing {visible.length} of {enriched.length} companies
              {storageReport?.fromCache && storageReport.cacheExpiresInSeconds > 0 && (
                <> · Cache expires in {Math.round(storageReport.cacheExpiresInSeconds / 60)} min</>
              )}
            </p>
          )}
        </Card>
      </main>

      {/* Detail modal */}
      {selected && (
        <DetailModal company={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
