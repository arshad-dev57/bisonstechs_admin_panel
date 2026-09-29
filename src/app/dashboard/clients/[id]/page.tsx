"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Avatar, Badge, Breadcrumbs, Card, PageHeader } from "@/components/ui";
import ClientSubscriptionPanel from "@/components/ClientSubscriptionPanel";
import {
  getCompany,
  updateCompanyStatus,
  deleteCompany,
  type CompanyDetail,
} from "@/lib/api";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = String(params.id || "");

  const [detail, setDetail] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError("");
    const res = await getCompany(clientId);
    if (res.success && res.data) {
      setDetail(res.data as CompanyDetail);
    } else {
      setError((res as { message?: string }).message || "Failed to load client");
      setDetail(null);
    }
    setLoading(false);
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
        subtitle={detail.email || "No email on file"}
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

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      </div>

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
                <th className="px-3 py-3 font-medium">Role</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {detail.users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-zinc-400">
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
                  <td className="px-3 py-3 capitalize text-zinc-600">{u.role}</td>
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
