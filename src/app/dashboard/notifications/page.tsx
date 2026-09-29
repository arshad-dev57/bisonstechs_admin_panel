"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Breadcrumbs, Card, PageHeader } from "@/components/ui";
import {
  getPlatformUsers,
  sendPlatformNotification,
  type PlatformUser,
} from "@/lib/api";

type Audience = "selected" | "all";
type NoticeType = "info" | "success" | "warning" | "error";

function userName(u: PlatformUser) {
  return [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.email;
}

export default function NotificationsPage() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [activeTotal, setActiveTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [audience, setAudience] = useState<Audience>("selected");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<NoticeType>("info");

  const load = useCallback(async (q = "") => {
    setLoading(true);
    setError("");
    const res = await getPlatformUsers(q, 300);
    if (res.success && Array.isArray(res.data)) {
      setUsers(res.data);
      if (typeof res.meta?.activeTotal === "number") setActiveTotal(res.meta.activeTotal);
    } else {
      setError((res as { message?: string }).message || "Failed to load users");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(query), query ? 280 : 0);
    return () => clearTimeout(t);
  }, [query, load]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return users;
    return users.filter((u) => {
      const hay = `${u.firstName} ${u.lastName} ${u.email} ${u.companyName} ${u.role}`.toLowerCase();
      return hay.includes(q);
    });
  }, [users, query]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleVisible() {
    const ids = filtered.map((u) => u.id);
    const allOn = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOn) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  async function handleSend() {
    setError("");
    setOk("");
    if (!title.trim() || !message.trim()) {
      setError("Title and message are required");
      return;
    }
    if (audience === "selected" && selected.size === 0) {
      setError("Select at least one user, or choose All users");
      return;
    }
    const count = audience === "all" ? activeTotal || users.filter((u) => u.isActive).length : selected.size;
    const okConfirm = window.confirm(
      audience === "all"
        ? `Send this notification to all ${count} active users?`
        : `Send this notification to ${count} selected user${count === 1 ? "" : "s"}?`
    );
    if (!okConfirm) return;

    setSending(true);
    const res = await sendPlatformNotification({
      title: title.trim(),
      message: message.trim(),
      audience,
      userIds: audience === "selected" ? [...selected] : undefined,
      type,
    });
    setSending(false);
    if (res.success) {
      setOk(res.message || `Sent to ${res.data?.sent ?? count} user(s)`);
      setTitle("");
      setMessage("");
      if (audience === "selected") setSelected(new Set());
    } else {
      setError((res as { message?: string }).message || "Failed to send notification");
    }
  }

  return (
    <main className="flex-1 p-5 md:p-8">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Notifications" },
        ]}
      />
      <PageHeader
        title="Notifications"
        subtitle="Send an in-app notice to selected users or everyone on the platform"
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {ok && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{ok}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card title="Compose" subtitle="Appears in the user’s notification inbox">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-zinc-700">Send to</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAudience("selected")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    audience === "selected" ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  Selected users ({selected.size})
                </button>
                <button
                  type="button"
                  onClick={() => setAudience("all")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    audience === "all" ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  All active users ({activeTotal || "…"})
                </button>
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-zinc-700">Type</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as NoticeType)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
              >
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Alert</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-zinc-700">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="e.g. Scheduled maintenance"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-zinc-700">Message</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="Write the notice users will see in the app"
                className="w-full resize-y rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              />
            </label>

            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {sending ? "Sending…" : audience === "all" ? "Send to all users" : "Send to selected"}
            </button>
          </div>
        </Card>

        <Card
          title="Users"
          subtitle={audience === "all" ? "Everyone active will receive this" : "Tick the people who should get this notice"}
        >
          <div className="mb-3 flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, company…"
              className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
            <button
              type="button"
              onClick={toggleVisible}
              disabled={audience === "all"}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
            >
              {filtered.length && filtered.every((u) => selected.has(u.id)) ? "Clear" : "Select visible"}
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : (
            <div className="max-h-[560px] overflow-auto rounded-xl border border-zinc-100">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="w-10 px-3 py-2" />
                    <th className="px-3 py-2 font-medium">User</th>
                    <th className="px-3 py-2 font-medium">Company</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const on = selected.has(u.id);
                    return (
                      <tr
                        key={u.id}
                        onClick={() => audience === "selected" && toggle(u.id)}
                        className={`border-t border-zinc-100 ${audience === "selected" ? "cursor-pointer hover:bg-zinc-50" : ""} ${on ? "bg-indigo-50/60" : ""}`}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={audience === "all" ? u.isActive : on}
                            disabled={audience === "all"}
                            onChange={() => toggle(u.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-zinc-900">{userName(u)}</p>
                          <p className="text-xs text-zinc-500">{u.email}</p>
                        </td>
                        <td className="px-3 py-2 text-zinc-600">{u.companyName}</td>
                        <td className="px-3 py-2">
                          <Badge tone={u.isActive ? "emerald" : "zinc"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                  {!filtered.length && (
                    <tr>
                      <td colSpan={4} className="px-3 py-10 text-center text-zinc-500">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
