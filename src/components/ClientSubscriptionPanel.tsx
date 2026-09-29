"use client";

import { useEffect, useState } from "react";
import {
  updateCompanySubscription,
  type CompanyDetail,
  type SubscriptionPlanType,
} from "@/lib/api";

type Props = {
  detail: CompanyDetail;
  onUpdated: (detail: CompanyDetail) => void;
  onMessage: (msg: string) => void;
  onError: (msg: string) => void;
};

export default function ClientSubscriptionPanel({
  detail,
  onUpdated,
  onMessage,
  onError,
}: Props) {
  const cap = detail.capacity;
  const [plan, setPlan] = useState<SubscriptionPlanType>(
    (detail.subscriptionPlan as SubscriptionPlanType) || "trial"
  );
  const [productTier, setProductTier] = useState<"pos" | "erp_pos">(
    detail.productTier === "pos" ? "pos" : "erp_pos"
  );
  const [licensedUsers, setLicensedUsers] = useState(
    String(detail.licensedUsers ?? cap?.licensedUsers ?? 1)
  );
  const [licensedBranches, setLicensedBranches] = useState(
    String(detail.licensedBranches ?? cap?.licensedBranches ?? 1)
  );
  const [trialDays, setTrialDays] = useState("5");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPlan((detail.subscriptionPlan as SubscriptionPlanType) || "trial");
    setProductTier(detail.productTier === "pos" ? "pos" : "erp_pos");
    setLicensedUsers(String(detail.licensedUsers ?? cap?.licensedUsers ?? 1));
    setLicensedBranches(String(detail.licensedBranches ?? cap?.licensedBranches ?? 1));
  }, [detail.id, detail.subscriptionPlan, detail.productTier, detail.licensedUsers, detail.licensedBranches, cap?.licensedUsers, cap?.licensedBranches]);

  const usedUsers = cap?.usedUsers ?? detail._count?.users ?? detail.users?.length ?? 0;
  const usedBranches = cap?.usedBranches ?? 0;

  async function handleSave() {
    setSaving(true);
    onError("");
    const body: Parameters<typeof updateCompanySubscription>[1] = {
      subscriptionPlan: plan,
      productTier,
      licensedUsers: Math.max(1, parseInt(licensedUsers, 10) || 1),
      licensedBranches: Math.max(1, parseInt(licensedBranches, 10) || 1),
      subscriptionStatus: plan === "none" ? "expired" : "active",
    };
    if (plan === "trial") {
      body.trialDaysRemaining = Math.max(1, parseInt(trialDays, 10) || 5);
    }
    if (plan === "monthly" || plan === "yearly") {
      body.billingCycle = plan;
    }

    const res = await updateCompanySubscription(detail.id, body);
    setSaving(false);

    if (!res.success) {
      onError((res as { message?: string }).message || "Failed to update subscription");
      return;
    }

    const payload = res.data as {
      company?: Partial<CompanyDetail>;
      capacity?: CompanyDetail["capacity"];
    };

    onUpdated({
      ...detail,
      ...(payload?.company || {}),
      capacity: payload?.capacity ?? detail.capacity,
      users: detail.users,
    });
    onMessage(res.message || "Subscription updated — client can use assigned limits now.");
  }

  return (
    <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">Subscription & limits</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Assign plan, user seats and branches. Changes apply to all users in this client immediately.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span
            className={`rounded-full px-2.5 py-1 font-medium ${
              cap?.hasAccess ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
            }`}
          >
            {cap?.hasAccess ? "Access ON" : "Access OFF"}
          </span>
          <span className="rounded-full bg-white px-2.5 py-1 font-medium text-zinc-600 border border-zinc-200">
            Users {usedUsers} / {licensedUsers}
          </span>
          {productTier === "erp_pos" && (
            <span className="rounded-full bg-white px-2.5 py-1 font-medium text-zinc-600 border border-zinc-200">
              Branches {usedBranches} / {licensedBranches}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Plan</span>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as SubscriptionPlanType)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
          >
            <option value="trial">Trial (5 days free)</option>
            <option value="monthly">Monthly (paid)</option>
            <option value="yearly">Yearly (paid)</option>
            <option value="none">Revoke access</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Product</span>
          <select
            value={productTier}
            onChange={(e) => setProductTier(e.target.value as "pos" | "erp_pos")}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
          >
            <option value="erp_pos">ERP + POS</option>
            <option value="pos">POS only (desktop)</option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Licensed users</span>
          <input
            type="number"
            min={1}
            value={licensedUsers}
            onChange={(e) => setLicensedUsers(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs text-zinc-400">Use 999 for unlimited</span>
        </label>

        {productTier === "erp_pos" && (
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Licensed branches</span>
            <input
              type="number"
              min={1}
              value={licensedBranches}
              onChange={(e) => setLicensedBranches(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs text-zinc-400">Shops / warehouses they can create</span>
          </label>
        )}

        {plan === "trial" && (
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Trial days (default 5)</span>
            <input
              type="number"
              min={1}
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            />
          </label>
        )}
      </div>

      {(detail.trialEndDate || detail.subscriptionEndDate) && (
        <p className="mt-3 text-xs text-zinc-500">
          {detail.trialEndDate && plan === "trial" && (
            <>Trial ends: {new Date(detail.trialEndDate).toLocaleString()} · </>
          )}
          {detail.subscriptionEndDate && (plan === "monthly" || plan === "yearly") && (
            <>Subscription ends: {new Date(detail.subscriptionEndDate).toLocaleString()}</>
          )}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Apply subscription"}
        </button>
        {cap && !cap.canAddUser && cap.hasAccess && (
          <span className="self-center text-xs text-amber-700">
            At user seat limit — increase licensed users to allow more invites.
          </span>
        )}
        {cap && !cap.canAddBranch && cap.hasAccess && productTier === "erp_pos" && (
          <span className="self-center text-xs text-amber-700">
            At branch limit — increase licensed branches to allow new locations.
          </span>
        )}
      </div>
    </div>
  );
}
