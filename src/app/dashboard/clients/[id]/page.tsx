"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Avatar, Badge, Breadcrumbs, Card, PageHeader } from "@/components/ui";
import ClientSubscriptionPanel from "@/components/ClientSubscriptionPanel";
import {
  getCompany,
  getCompanyActivity,
  updateCompanyStatus,
  deleteCompany,
  type CompanyActivityPayload,
  type CompanyDetail,
} from "@/lib/api";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtRelative(iso?: string | null) {
  if (!iso) return "Never";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "Never";
  const diffMs = Date.now() - t;
  if (diffMs < 0) return "Just now";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return fmtDate(iso);
}

function actionLabel(action: string) {
  const a = (action || "").toLowerCase();
  if (a === "login") return "Logged in";
  if (a === "page_view") return "Opened page";
  if (a === "active") return "Using app";
  return action || "Activity";
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  const display = (value || "").trim();
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 text-sm text-zinc-900 break-words">{display || "—"}</p>
    </div>
  );
}

function businessDetailValue(
  details: Record<string, unknown> | null | undefined,
  key: string
): string {
  if (!details || typeof details !== "object") return "";
  const raw = details[key];
  if (raw == null) return "";
  return String(raw).trim();
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = String(params.id || "");

  const [detail, setDetail] = useState<CompanyDetail | null>(null);
  const [activity, setActivity] = useState<CompanyActivityPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setActivityLoading(true);
    setError("");
    const [res, activityRes] = await Promise.all([
      getCompany(clientId),
      getCompanyActivity(clientId, 100),
    ]);
    if (res.success && res.data) {
      setDetail(res.data as CompanyDetail);
    } else {
      setError((res as { message?: string }).message || "Failed to load client");
      setDetail(null);
    }
    if (activityRes.success && activityRes.data) {
      setActivity(activityRes.data as CompanyActivityPayload);
    } else {
      setActivity(null);
    }
    setLoading(false);
    setActivityLoading(false);
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggleStatus() {
    if (!detail) return;
    if (detail.isActive) {
      const ok = window.confirm(
        `Deactivate "${detail.name}"?\n\nAll users in this client will lose access until you activate again.`
      );
      if (!ok) return;
    }
    setToggling(true);
    setActionMessage("");
    const res = await updateCompanyStatus(detail.id, !detail.isActive);
    setToggling(false);
    if (res.success) {
      setDetail((prev) => (prev ? { ...prev, isActive: !prev.isActive } : prev));
      setActionMessage(
        res.message ||
          `Client "${detail.name}" has been ${detail.isActive ? "deactivated" : "activated"}.`
      );
    } else {
      setError((res as { message?: string }).message || "Failed to update status");
    }
  }

  async function handleDeleteCompany() {
    if (!detail || deleting) return;

    const userCount = detail.users?.length ?? 0;
    const ok = window.confirm(
      `Delete company "${detail.name}" permanently?\n\nThis will permanently delete:\n• The company\n• All ${userCount} user account(s)\n• All related ERP / POS / accounting data\n\nThis cannot be undone.`
    );
    if (!ok) return;

    const typed = window.prompt(
      `Type the company name exactly to confirm deletion:\n\n${detail.name}`
    );
    if (typed === null) return;
    if (typed.trim() !== detail.name.trim()) {
      setError("Company name did not match. Deletion cancelled.");
      return;
    }

    setDeleting(true);
    setError("");
    setActionMessage("");
    const res = await deleteCompany(detail.id);
    setDeleting(false);

    if (res.success) {
      router.push("/dashboard/clients");
      return;
    }

    setError((res as { message?: string }).message || "Failed to delete company");
  }

  if (loading) {
    return (
      <main className="flex-1 p-5 md:p-8">
        <div className="flex items-center justify-center py-24 text-sm text-zinc-400 gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          Loading client…
        </div>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="flex-1 p-5 md:p-8">
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Clients", href: "/dashboard/clients" },
            { label: "Not found" },
          ]}
        />
        <p className="text-sm text-red-600">{error || "Client not found."}</p>
        <Link
          href="/dashboard/clients"
          className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Back to clients
        </Link>
      </main>
    );
  }

  const cap = detail.capacity;
  const admin = detail.admin || detail.users.find((u) => u.role === "admin") || detail.users[0] || null;
  const adminPhone = admin?.contactNo || admin?.phone || detail.phone || "";
  const adminAddress = admin?.address || detail.address || "";
  const adminWebsite = admin?.websiteLink || detail.website || "";
  const taxReg =
    detail.taxRegistrationNumber ||
    businessDetailValue(admin?.businessDetails, "taxRegistrationNumber");
  const industry = businessDetailValue(admin?.businessDetails, "industry");
  const registeredBusinessType =
    detail.businessType || businessDetailValue(admin?.businessDetails, "businessType");

  return (
    <main className="flex-1 p-5 md:p-8">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Clients", href: "/dashboard/clients" },
          { label: detail.name },
        ]}
      />

      <PageHeader
        title={detail.name}
        subtitle={
          admin
            ? `${admin.firstName} ${admin.lastName} · ${admin.country || "—"}${adminPhone ? ` · ${adminPhone}` : ""}`
            : detail.email || "No email on file"
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/dashboard/clients")}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              ← All clients
            </button>
            <button
              type="button"
              onClick={load}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={toggling || deleting}
              className={`rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60 ${
                detail.isActive
                  ? "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                  : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              {toggling ? "…" : detail.isActive ? "Deactivate client" : "Activate client"}
            </button>
            <button
              type="button"
              onClick={handleDeleteCompany}
              disabled={deleting || toggling}
              className="rounded-lg border border-red-600 bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? "Deleting…" : "Delete company"}
            </button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {actionMessage && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {actionMessage}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Status</p>
          <div className="mt-2">
            <Badge tone={detail.isActive ? "emerald" : "red"}>
              {detail.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Plan</p>
          <p className="mt-2 font-semibold capitalize text-zinc-900">{detail.subscriptionPlan}</p>
          {detail.productTier && (
            <p className="text-xs text-zinc-500 capitalize">{detail.productTier.replace("_", " + ")}</p>
          )}
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Users</p>
          <p className="mt-2 text-xl font-bold text-zinc-900">
            {cap?.usedUsers ?? detail.users.length}
            {detail.licensedUsers != null && (
              <span className="text-base font-normal text-zinc-400"> / {detail.licensedUsers}</span>
            )}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Joined</p>
          <p className="mt-2 font-semibold text-zinc-900">{fmtDate(detail.createdAt)}</p>
          {detail.businessType && (
            <p className="text-xs text-zinc-500">{detail.businessType}</p>
          )}
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Last used app</p>
          <p className="mt-2 font-semibold text-zinc-900">
            {fmtRelative(activity?.summary.lastActiveAt || detail.lastActiveAt)}
          </p>
          {(activity?.summary.lastActiveAt || detail.lastActiveAt) && (
            <p className="text-xs text-zinc-500">
              {fmtDate(activity?.summary.lastActiveAt || detail.lastActiveAt!)}
            </p>
          )}
        </div>
      </div>

      <Card
        title="Admin & registration details"
        subtitle="Information captured when this client registered on the platform"
        className="mb-6"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <DetailField
            label="Admin name"
            value={admin ? `${admin.firstName} ${admin.lastName}` : null}
          />
          <DetailField label="Admin email" value={admin?.email || detail.email} />
          <DetailField label="Country" value={admin?.country} />
          <DetailField label="Phone / contact" value={adminPhone} />
          <DetailField label="Company email" value={detail.email} />
          <DetailField label="Company phone" value={detail.phone} />
          <DetailField label="Organization" value={admin?.organizationName || detail.name} />
          <DetailField label="Business type" value={registeredBusinessType} />
          <DetailField label="Industry" value={industry} />
          <DetailField label="Tax registration #" value={taxReg} />
          <DetailField label="Website" value={adminWebsite} />
          <DetailField
            label="Registered"
            value={admin?.createdAt ? fmtDate(admin.createdAt) : fmtDate(detail.createdAt)}
          />
          <div className="sm:col-span-2 lg:col-span-3">
            <DetailField label="Address" value={adminAddress} />
          </div>
        </div>
      </Card>

      <Card
        title="App usage activity"
        subtitle="When users from this client open and use your web app"
        className="mb-6"
      >
        {activityLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-zinc-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            Loading activity…
          </div>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3">
                <p className="text-[11px] uppercase tracking-wide text-zinc-400">Active today</p>
                <p className="mt-1 text-lg font-bold text-zinc-900">
                  {activity?.summary.activeUsersToday ?? 0}
                  <span className="text-sm font-normal text-zinc-400">
                    {" "}
                    / {activity?.summary.totalUsers ?? detail.users.length}
                  </span>
                </p>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3">
                <p className="text-[11px] uppercase tracking-wide text-zinc-400">Active this week</p>
                <p className="mt-1 text-lg font-bold text-zinc-900">
                  {activity?.summary.activeUsersWeek ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3">
                <p className="text-[11px] uppercase tracking-wide text-zinc-400">Events today</p>
                <p className="mt-1 text-lg font-bold text-zinc-900">
                  {activity?.summary.eventsToday ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3">
                <p className="text-[11px] uppercase tracking-wide text-zinc-400">Events this week</p>
                <p className="mt-1 text-lg font-bold text-zinc-900">
                  {activity?.summary.eventsWeek ?? 0}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-zinc-100">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                    <th className="px-3 py-2.5 font-medium">When</th>
                    <th className="px-3 py-2.5 font-medium">User</th>
                    <th className="px-3 py-2.5 font-medium">Action</th>
                    <th className="px-3 py-2.5 font-medium">Source</th>
                    <th className="px-3 py-2.5 font-medium">Page</th>
                  </tr>
                </thead>
                <tbody>
                  {(!activity?.events || activity.events.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-3 py-10 text-center text-zinc-400">
                        No app usage yet. Activity appears after this client logs into the web app.
                      </td>
                    </tr>
                  )}
                  {(activity?.events || []).map((e) => (
                    <tr key={e.id} className="border-b border-zinc-100">
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <p className="font-medium text-zinc-800">{fmtRelative(e.createdAt)}</p>
                        <p className="text-[11px] text-zinc-400">{fmtDateTime(e.createdAt)}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-zinc-900">{e.user?.name || "Unknown"}</p>
                        <p className="text-xs text-zinc-500">{e.user?.email || "—"}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          tone={
                            e.action === "login"
                              ? "indigo"
                              : e.action === "page_view"
                                ? "sky"
                                : "emerald"
                          }
                        >
                          {actionLabel(e.action)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 capitalize text-zinc-600">{e.source || "web"}</td>
                      <td className="px-3 py-2.5 text-zinc-500 font-mono text-xs">
                        {e.path || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <ClientSubscriptionPanel
        detail={detail}
        onUpdated={setDetail}
        onMessage={setActionMessage}
        onError={setError}
      />

      <Card
        title="Danger zone"
        subtitle="Permanently remove this client organization from the platform"
        className="mb-6 border-red-200"
      >
        <p className="mb-4 text-sm text-zinc-600">
          Deleting <span className="font-semibold text-zinc-900">{detail.name}</span> will
          permanently erase the company, all of its users, and all related ERP / POS /
          accounting data. This cannot be undone.
        </p>
        <button
          type="button"
          onClick={handleDeleteCompany}
          disabled={deleting || toggling}
          className="rounded-lg border border-red-600 bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {deleting ? "Deleting company…" : "Delete company permanently"}
        </button>
      </Card>

      <Card title={`Users (${detail.users.length})`} subtitle="Accounts in this client organization">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-3 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium">Email</th>
                <th className="px-3 py-3 font-medium">Country</th>
                <th className="px-3 py-3 font-medium">Phone</th>
                <th className="px-3 py-3 font-medium">Role</th>
                <th className="px-3 py-3 font-medium">Last active</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {detail.users.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-zinc-400">
                    No users in this client.
                  </td>
                </tr>
              )}
              {detail.users.map((u) => (
                <tr key={u.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={`${u.firstName} ${u.lastName}`} />
                      <span className="font-medium text-zinc-900">
                        {u.firstName} {u.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-zinc-500">{u.email}</td>
                  <td className="px-3 py-3 text-zinc-600">{u.country || "—"}</td>
                  <td className="px-3 py-3 text-zinc-600">
                    {u.contactNo || u.phone || "—"}
                  </td>
                  <td className="px-3 py-3 capitalize text-zinc-600">{u.role}</td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-zinc-800">{fmtRelative(u.lastActiveAt)}</p>
                    {u.lastActiveAt && (
                      <p className="text-[11px] text-zinc-400">{fmtDate(u.lastActiveAt)}</p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={u.isActive ? "emerald" : "red"}>
                      {u.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-zinc-500">{fmtDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
