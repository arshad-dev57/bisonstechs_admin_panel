"use client";

import { useMemo, useState } from "react";
import { Badge, Card, PageHeader } from "@/components/ui";
import { payments } from "@/lib/data";
import type { PaymentStatus } from "@/lib/data";

const money = (n: number) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(n);

const statusTone: Record<PaymentStatus, "emerald" | "amber" | "red" | "sky"> = {
  Paid: "emerald",
  Pending: "amber",
  Failed: "red",
  Refunded: "sky",
};

const filters: (PaymentStatus | "All")[] = ["All", "Paid", "Pending", "Failed", "Refunded"];

export default function PaymentsPage() {
  const [filter, setFilter] = useState<(PaymentStatus | "All")>("All");

  const filtered = useMemo(
    () => (filter === "All" ? payments : payments.filter((p) => p.status === filter)),
    [filter]
  );

  const totalCollected = payments
    .filter((p) => p.status === "Paid")
    .reduce((s, p) => s + p.amount, 0);

  const pendingAmount = payments
    .filter((p) => p.status === "Pending")
    .reduce((s, p) => s + p.amount, 0);

  return (
    <main className="flex-1 p-5 md:p-8">
      <PageHeader
        title="Payments"
        subtitle={`Track all incoming and outgoing transactions`}
        action={
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700">
            Export CSV
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-zinc-500">Collected (Paid)</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{money(totalCollected)}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-zinc-500">Pending</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{money(pendingAmount)}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-zinc-500">Paid Count</p>
          <p className="mt-2 text-2xl font-bold text-zinc-900">
            {payments.filter((p) => p.status === "Paid").length}
          </p>
        </div>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-3 py-3 font-medium">Transaction</th>
                <th className="px-3 py-3 font-medium">Customer</th>
                <th className="px-3 py-3 font-medium">Method</th>
                <th className="px-3 py-3 text-right font-medium">Amount</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-zinc-400">
                    No payments found.
                  </td>
                </tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="px-3 py-3 font-medium text-zinc-900">{p.id}</td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-zinc-900">{p.customer}</p>
                    <p className="text-xs text-zinc-500">{p.email}</p>
                  </td>
                  <td className="px-3 py-3 text-zinc-600">{p.method}</td>
                  <td className="px-3 py-3 text-right font-semibold text-zinc-900">{money(p.amount)}</td>
                  <td className="px-3 py-3">
                    <Badge tone={statusTone[p.status]}>{p.status}</Badge>
                  </td>
                  <td className="px-3 py-3 text-zinc-600">{p.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}