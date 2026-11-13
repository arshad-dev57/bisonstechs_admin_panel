"use client";

import { useCallback, useEffect, useState } from "react";
import { Breadcrumbs, Card, PageHeader } from "@/components/ui";
import {
  listAdminBackups,
  createFullBackup,
  deleteAdminBackup,
  downloadAdminBackupToComputer,
  getBackupSchedule,
  updateBackupSchedule,
  requestFullRestore,
  type BackupJobRow,
  type BackupSummary,
  type BackupSchedule,
} from "@/lib/api";

function fmtBytes(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_BADGE: Record<string, string> = {
  QUEUED: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  PROCESSING: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  FAILED: "bg-red-50 text-red-700 ring-red-200",
  RESTORING: "bg-amber-50 text-amber-800 ring-amber-200",
};

export default function BackupsPage() {
  const [jobs, setJobs] = useState<BackupJobRow[]>([]);
  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [schedule, setSchedule] = useState<BackupSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [restorePhrase, setRestorePhrase] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, schedRes] = await Promise.all([
        listAdminBackups({ limit: 100 }),
        getBackupSchedule(),
      ]);
      if (!listRes.success) throw new Error(listRes.message || "Failed to load backups");
      setJobs(listRes.data?.jobs || []);
      setSummary(listRes.data?.summary || null);
      if (schedRes.success) setSchedule(schedRes.data?.schedule || null);
    } catch (err: any) {
      setError(err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  const onCreate = async () => {
    setBusy("create");
    try {
      const res = await createFullBackup();
      if (!res.success) throw new Error(res.message || "Failed to queue backup");
      showToast("Full database backup queued");
      await load();
    } catch (err: any) {
      showToast(err.message || "Create failed");
    } finally {
      setBusy(null);
    }
  };

  const onDownload = async (job: BackupJobRow) => {
    setBusy(`dl-${job.id}`);
    try {
      await downloadAdminBackupToComputer(job.id, job.fileName || undefined);
      showToast("Download started — save to your computer or external drive");
    } catch (err: any) {
      showToast(err.message || "Download failed");
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async (job: BackupJobRow) => {
    if (!window.confirm(`Delete backup "${job.name}"? This cannot be undone.`)) return;
    setBusy(`del-${job.id}`);
    try {
      const res = await deleteAdminBackup(job.id);
      if (!res.success) throw new Error(res.message || "Delete failed");
      showToast("Backup deleted");
      await load();
    } catch (err: any) {
      showToast(err.message || "Delete failed");
    } finally {
      setBusy(null);
    }
  };

  const onSaveSchedule = async () => {
    if (!schedule) return;
    setBusy("schedule");
    try {
      const res = await updateBackupSchedule({
        enabled: schedule.enabled,
        frequency: schedule.frequency,
        runAtUtc: schedule.runAtUtc,
        dayOfWeek: schedule.dayOfWeek,
        retentionDays: schedule.retentionDays,
      });
      if (!res.success) throw new Error(res.message || "Schedule update failed");
      setSchedule(res.data?.schedule || schedule);
      showToast("Schedule saved");
    } catch (err: any) {
      showToast(err.message || "Schedule failed");
    } finally {
      setBusy(null);
    }
  };

  const onRestore = async () => {
    if (!restoreId) return;
    setBusy(`restore-${restoreId}`);
    try {
      const res = await requestFullRestore(restoreId, restorePhrase);
      showToast(res.message || (res.success ? "Restore acknowledged" : "Restore blocked"));
      setRestoreId(null);
      setRestorePhrase("");
    } catch (err: any) {
      showToast(err.message || "Restore failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="flex-1 p-5 md:p-8">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Backups" }]} />
      <PageHeader
        title="Backup Management"
        subtitle="Full Neon PostgreSQL backups for disaster recovery. Complements Neon PITR — does not replace it."
        action={
          <button
            type="button"
            onClick={onCreate}
            disabled={busy === "create"}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {busy === "create" ? "Queuing…" : "Create Full Database Backup"}
          </button>
        }
      />

      {toast && (
        <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-800">
          {toast}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}{" "}
          <button type="button" className="underline" onClick={load}>
            Retry
          </button>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Last Successful Backup", value: fmtDate(summary?.lastSuccessfulBackupAt) },
          { label: "Total Backups", value: String(summary?.totalBackups ?? "—") },
          { label: "Storage Used", value: fmtBytes(summary?.totalStorageBytes || 0) },
          {
            label: "Backup Status",
            value: summary?.activeStatus || "IDLE",
            sub: summary
              ? `Storage: ${summary.storageProvider} · pg_dump: ${summary.pgDumpAvailable ? "yes" : "fallback"}`
              : undefined,
          },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <span className="text-sm font-medium text-zinc-500">{s.label}</span>
            <p className="mt-2 text-2xl font-bold text-zinc-900">{s.value}</p>
            {s.sub && <p className="mt-1 text-xs text-zinc-400">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">Automatic Full Backups</h2>
          <p className="mb-4 text-xs text-zinc-500">
            Configure schedule here. Triggering is done by Railway Cron calling{" "}
            <code className="rounded bg-zinc-100 px-1">POST /api/admin/backups/run-scheduled</code> — not an
            in-memory Express timer.
          </p>
          {schedule ? (
            <div className="space-y-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={schedule.enabled}
                  onChange={(e) => setSchedule({ ...schedule, enabled: e.target.checked })}
                />
                Enabled
              </label>
              <div className="flex flex-wrap gap-3">
                <select
                  className="rounded-md border border-zinc-200 px-2 py-1.5"
                  value={schedule.frequency}
                  onChange={(e) => setSchedule({ ...schedule, frequency: e.target.value })}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
                <input
                  type="time"
                  className="rounded-md border border-zinc-200 px-2 py-1.5"
                  value={schedule.runAtUtc}
                  onChange={(e) => setSchedule({ ...schedule, runAtUtc: e.target.value })}
                />
                <span className="self-center text-xs text-zinc-500">UTC</span>
                {schedule.frequency === "weekly" && (
                  <select
                    className="rounded-md border border-zinc-200 px-2 py-1.5"
                    value={schedule.dayOfWeek ?? 0}
                    onChange={(e) => setSchedule({ ...schedule, dayOfWeek: Number(e.target.value) })}
                  >
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                      <option key={d} value={i}>
                        {d}
                      </option>
                    ))}
                  </select>
                )}
                <label className="flex items-center gap-2 text-xs text-zinc-600">
                  Retention
                  <input
                    type="number"
                    min={1}
                    max={365}
                    className="w-20 rounded-md border border-zinc-200 px-2 py-1.5"
                    value={schedule.retentionDays}
                    onChange={(e) => setSchedule({ ...schedule, retentionDays: Number(e.target.value) })}
                  />
                  days
                </label>
              </div>
              <button
                type="button"
                onClick={onSaveSchedule}
                disabled={busy === "schedule"}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
              >
                {busy === "schedule" ? "Saving…" : "Save Schedule"}
              </button>
              {schedule.lastRunAt && (
                <p className="text-xs text-zinc-500">Last run: {fmtDate(schedule.lastRunAt)}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">{loading ? "Loading…" : "No schedule config"}</p>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">Neon provider recovery</h2>
          <p className="text-sm text-zinc-600">
            Neon provides point-in-time recovery and branching. Application backups are an additional
            portable archive for offline retention and cross-environment restores. Prefer Neon PITR for
            production disasters; use these archives for portable copies and staging drills.
          </p>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Backup History</h2>
          <button type="button" onClick={load} className="text-xs font-medium text-indigo-600 hover:underline">
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-2 py-2 font-medium">Backup Name</th>
                <th className="px-2 py-2 font-medium">Type</th>
                <th className="px-2 py-2 font-medium">Companies</th>
                <th className="px-2 py-2 font-medium">Created</th>
                <th className="px-2 py-2 font-medium">Size</th>
                <th className="px-2 py-2 font-medium">Status</th>
                <th className="px-2 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && !jobs.length ? (
                <tr>
                  <td colSpan={7} className="px-2 py-8 text-center text-zinc-400">
                    Loading…
                  </td>
                </tr>
              ) : !jobs.length ? (
                <tr>
                  <td colSpan={7} className="px-2 py-8 text-center text-zinc-400">
                    No backups yet
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="border-b border-zinc-100">
                    <td className="px-2 py-3">
                      <div className="font-medium text-zinc-900">{job.name}</div>
                      {job.progressMessage && job.status !== "COMPLETED" && (
                        <div className="text-xs text-zinc-500">
                          {job.progressPercent}% — {job.progressMessage}
                        </div>
                      )}
                      {job.errorMessage && (
                        <div className="text-xs text-red-600">{job.errorMessage}</div>
                      )}
                    </td>
                    <td className="px-2 py-3 text-zinc-600">
                      {job.backupType === "FULL_DATABASE" ? "Full DB" : "Company"}
                    </td>
                    <td className="px-2 py-3 text-zinc-600">
                      {job.backupType === "FULL_DATABASE"
                        ? "All"
                        : (job.companies || []).map((c) => c.companyName).join(", ") || "—"}
                    </td>
                    <td className="px-2 py-3 text-zinc-600">{fmtDate(job.createdAt)}</td>
                    <td className="px-2 py-3 text-zinc-600">{fmtBytes(job.fileSizeBytes || 0)}</td>
                    <td className="px-2 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_BADGE[job.status] || STATUS_BADGE.QUEUED}`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={job.status !== "COMPLETED" || busy === `dl-${job.id}`}
                          onClick={() => onDownload(job)}
                          className="text-xs font-medium text-indigo-600 hover:underline disabled:opacity-40"
                        >
                          Download
                        </button>
                        {job.backupType === "FULL_DATABASE" && job.status === "COMPLETED" && (
                          <button
                            type="button"
                            onClick={() => {
                              setRestoreId(job.id);
                              setRestorePhrase("");
                            }}
                            className="text-xs font-medium text-amber-700 hover:underline"
                          >
                            Restore
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={["QUEUED", "PROCESSING", "RESTORING"].includes(job.status)}
                          onClick={() => onDelete(job)}
                          className="text-xs font-medium text-red-600 hover:underline disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {restoreId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900">Full database restore</h3>
            <p className="mt-2 text-sm text-zinc-600">
              This will <strong>not</strong> automatically overwrite production. Type{" "}
              <code className="rounded bg-zinc-100 px-1">RESTORE FULL DATABASE</code> to acknowledge. Prefer
              Neon PITR and always create a fresh backup first.
            </p>
            <input
              className="mt-3 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
              value={restorePhrase}
              onChange={(e) => setRestorePhrase(e.target.value)}
              placeholder="RESTORE FULL DATABASE"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
                onClick={() => setRestoreId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy?.startsWith("restore")}
                onClick={onRestore}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-60"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
