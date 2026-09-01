"use client";

import { useEffect, useState } from "react";
import { DonutChart } from "@/components/charts";
import { Card, StatCard, PageHeader } from "@/components/ui";
import { getStats, getSubscriptionStats } from "@/lib/api";

const icons = {
  users: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.5 2.9-5.5 6.5-5.5s6.5 2 6.5 5.5" />
    </svg>
  ),
  clients: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h18v10H3z" />
      <path d="M3 10l6 4 6-4" />
    </svg>
  ),
  payments: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path d="M6.5 12h4" />
    </svg>
  ),
  revenue: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  ),
};

const money = (n: number) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(n);

const statusTone: Record<string, "emerald" | "amber" | "red"> = {
  Paid: "emerald",
  Pending: "amber",
  Failed: "red",
  Refunded: "red",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [subscriptionStats, setSubscriptionStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [statsRes, subStatsRes] = await Promise.all([
          getStats(),
          getSubscriptionStats()
        ]);
        
        if (statsRes.success) {
          setStats(statsRes.data);
        }
        if (subStatsRes.success) {
          setSubscriptionStats(subStatsRes.data);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  // Calculate trial vs subscribed users
  const trialUsers = subscriptionStats?.byPlan?.find((p: any) => p.plan === 'trial')?._count || 0;
  const subscribedUsers = subscriptionStats?.byPlan?.reduce((sum: number, p: any) => {
    if (p.plan === 'monthly' || p.plan === 'yearly') {
      return sum + p._count;
    }
    return sum;
  }, 0) || 0;

  const roleDistribution = subscriptionStats?.byPlan?.map((p: any) => ({
    label: p.plan.charAt(0).toUpperCase() + p.plan.slice(1),
    value: p._count,
    color: p.plan === 'trial' ? '#10b981' : p.plan === 'monthly' ? '#6366f1' : '#8b5cf6'
  })) || [];

  const totalUsers = stats?.totalUsers || 0;

  return (
    <main className="flex-1 p-5 md:p-8">
      <PageHeader
        title="Dashboard Overview"
        subtitle="Welcome back! Here's what's happening with your business today."
        action={
          <span className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Live data
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Users" value={String(totalUsers)} change="+" icon={icons.users} />
        <StatCard label="Active Clients" value={String(stats?.activeCompanies || 0)} change="+" icon={icons.clients} />
        <StatCard label="Trial Users" value={String(trialUsers)} change="+" icon={icons.revenue} />
        <StatCard label="Subscribed Users" value={String(subscribedUsers)} change="+" icon={icons.payments} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Subscription Distribution" subtitle="Users by subscription type" className="xl:col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <p className="text-sm font-medium text-emerald-700">Free Trial</p>
              <p className="text-2xl font-bold text-emerald-900">{trialUsers}</p>
            </div>
            <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-4">
              <p className="text-sm font-medium text-indigo-700">Subscribed</p>
              <p className="text-2xl font-bold text-indigo-900">{subscribedUsers}</p>
            </div>
          </div>
        </Card>
        <Card title="Plan Distribution" subtitle="Users grouped by plan">
          <DonutChart segments={roleDistribution} centerValue={String(totalUsers)} centerLabel="Users" />
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Revenue" subtitle={`Total Revenue: SAR ${subscriptionStats?.totalRevenue || 0}`} className="text-zinc-400">
          <div className="text-center py-8">
            <p className="text-3xl font-bold text-zinc-900">SAR {subscriptionStats?.totalRevenue || 0}</p>
            <p className="text-sm text-zinc-500 mt-2">Active subscriptions</p>
          </div>
        </Card>
        <Card title="Subscription Status" subtitle="Current subscription status breakdown" className="xl:col-span-2">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
              <p className="text-sm font-medium text-emerald-700">Active</p>
              <p className="text-2xl font-bold text-emerald-900">{subscriptionStats?.active || 0}</p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
              <p className="text-sm font-medium text-amber-700">Expired</p>
              <p className="text-2xl font-bold text-amber-900">{subscriptionStats?.expired || 0}</p>
            </div>
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
              <p className="text-sm font-medium text-red-700">Cancelled</p>
              <p className="text-2xl font-bold text-red-900">{subscriptionStats?.cancelled || 0}</p>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}