"use client";

import { useState } from "react";
import { Card, PageHeader, Badge } from "@/components/ui";

interface PlanState {
  branches: number;
  users: number;
}

const pricingPlans = [
  {
    id: "pos",
    name: "POS",
    icon: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
        <line x1="12" y1="12" x2="12" y2="12.01" />
        <path d="M2 12h20" />
      </svg>
    ),
    prices: {
      PKR: { monthly: 4000, yearly: 24000 },
      USD: { monthly: 14, yearly: 86 }
    },
    features: [
      "Desktop POS app (Windows / Mac)",
      "Offline sales — sync when online",
      "Shifts, terminals & thermal receipts",
      "Inventory & sales tracking",
      "Barcode / QR scanning",
      "Customer management & basic reports",
      "Standard support"
    ],
    userPricing: null,
    description: "Perfect for retail businesses and shops"
  },
  {
    id: "erp-pos",
    name: "ERP + POS",
    icon: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
    prices: {
      PKR: { monthly: 9999, yearly: 72000 },
      USD: { monthly: 36, yearly: 257 }
    },
    features: [
      "Complete ERP System",
      "POS Integration",
      "Accounting & Finance",
      "HR & Payroll",
      "Inventory Management",
      "Advanced Analytics",
      "Multi-user Support",
      "Priority Support"
    ],
    userPricing: {
      baseUsers: 1,
      prices: {
        PKR: { monthly: 9999, yearly: 72000 },
        USD: { monthly: 36, yearly: 257 }
      }
    },
    description: "Complete business management solution"
  },
  {
    id: "custom",
    name: "Custom Package",
    icon: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    prices: {
      PKR: { monthly: 11200, yearly: 134400 },
      USD: { monthly: 40, yearly: 480 }
    },
    features: [
      "Attendance System",
      "Custom Solutions",
      "Pay-as-you-go Model",
      "Scalable Pricing",
      "Flexible Features",
      "Dedicated Support",
      "Custom Integrations"
    ],
    userPricing: {
      baseUsers: 20,
      prices: {
        PKR: { monthly: 14000, yearly: 168000 },
        USD: { monthly: 50, yearly: 600 }
      }
    },
    description: "Tailored solution for your specific needs"
  }
];

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [currency, setCurrency] = useState<"PKR" | "USD">("PKR");
  const [planStates, setPlanStates] = useState<{ [key: string]: PlanState }>({
    pos: { branches: 1, users: 1 },
    "erp-pos": { branches: 1, users: 1 },
    custom: { branches: 1, users: 20 }
  });

  const updatePlanState = (planId: string, key: keyof PlanState, value: number) => {
    setPlanStates(prev => ({
      ...prev,
      [planId]: { ...prev[planId], [key]: value }
    }));
  };

  const getPrice = (plan: any) => {
    const state = planStates[plan.id];
    const u = Math.max(1, state.users);
    const b = Math.max(1, state.branches);

    if (plan.id === "pos") {
      const rate = plan.prices[currency][billingPeriod];
      return rate * u;
    }

    if (plan.id === "erp-pos") {
      const rate = plan.prices[currency][billingPeriod];
      return rate * u * b;
    }

    // Custom package — legacy calculator
    const basePrice = plan.prices[currency][billingPeriod];
    let totalPrice = basePrice * b;
    if (plan.userPricing && state.users > plan.userPricing.baseUsers) {
      const additionalUsers = state.users - plan.userPricing.baseUsers;
      const userPrice = plan.userPricing.prices[currency][billingPeriod];
      totalPrice += userPrice * additionalUsers * b;
    }
    return totalPrice;
  };

  const formatPrice = (price: number) => {
    return `${currency === "PKR" ? "₨" : "$"}${price.toLocaleString()}`;
  };

  return (
    <main className="flex-1 p-5 md:p-8">
      <PageHeader
        title="Pricing Plans"
        subtitle="Choose the perfect plan for your business needs"
      />

      <div className="mb-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
        {/* Currency Toggle */}
        <div className="flex bg-zinc-100 rounded-lg p-1">
          <button
            onClick={() => setCurrency("PKR")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currency === "PKR" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600"
            }`}
          >
            PKR
          </button>
          <button
            onClick={() => setCurrency("USD")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currency === "USD" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600"
            }`}
          >
            USD
          </button>
        </div>

        {/* Billing Period Toggle */}
        <div className="flex bg-zinc-100 rounded-lg p-1">
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingPeriod === "monthly" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod("yearly")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingPeriod === "yearly" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600"
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {pricingPlans.map((plan) => {
          const state = planStates[plan.id];
          return (
            <Card key={plan.id} className="relative overflow-hidden">
              {plan.id === "erp-pos" && (
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-bl-lg">
                  Most Popular
                </div>
              )}
              
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mb-4">
                  {plan.icon}
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-2">{plan.name}</h3>
                <p className="text-sm text-zinc-500">{plan.description}</p>
              </div>

              {/* Branch Counter */}
              <div className="mb-4 flex items-center justify-center gap-3 bg-zinc-50 rounded-lg p-3">
                <span className="text-sm font-medium text-zinc-600">Branches:</span>
                <button
                  onClick={() => updatePlanState(plan.id, "branches", Math.max(1, state.branches - 1))}
                  className="w-7 h-7 rounded-md bg-white text-zinc-900 shadow-sm font-medium hover:bg-zinc-50 transition-colors text-sm"
                >
                  -
                </button>
                <span className="w-8 text-center font-semibold text-zinc-900">{state.branches}</span>
                <button
                  onClick={() => updatePlanState(plan.id, "branches", state.branches + 1)}
                  className="w-7 h-7 rounded-md bg-white text-zinc-900 shadow-sm font-medium hover:bg-zinc-50 transition-colors text-sm"
                >
                  +
                </button>
              </div>

              {/* User Counter */}
              <div className="mb-4 flex items-center justify-center gap-3 bg-zinc-50 rounded-lg p-3">
                <span className="text-sm font-medium text-zinc-600">Users:</span>
                <button
                  onClick={() => updatePlanState(plan.id, "users", Math.max(plan.userPricing?.baseUsers || 1, state.users - 1))}
                  className="w-7 h-7 rounded-md bg-white text-zinc-900 shadow-sm font-medium hover:bg-zinc-50 transition-colors text-sm"
                >
                  -
                </button>
                <span className="w-8 text-center font-semibold text-zinc-900">{state.users}</span>
                <button
                  onClick={() => updatePlanState(plan.id, "users", state.users + 1)}
                  className="w-7 h-7 rounded-md bg-white text-zinc-900 shadow-sm font-medium hover:bg-zinc-50 transition-colors text-sm"
                >
                  +
                </button>
              </div>

              {/* Price Display - Hide for Custom Package */}
              {plan.id !== "custom" && (
                <div className="text-center mb-6">
                  <div className="mb-2">
                    <span className="text-3xl font-bold text-zinc-900">
                      {formatPrice(getPrice(plan))}
                    </span>
                    <span className="text-zinc-500">/{billingPeriod}</span>
                  </div>
                  {billingPeriod === "monthly" && (
                    <div className="text-sm text-zinc-500">
                      <span className="line-through mr-2">
                        {formatPrice(plan.prices[currency].monthly * 12 * state.branches)}/year
                      </span>
                      <span className="text-emerald-600 font-semibold">
                        {formatPrice(plan.prices[currency].yearly * state.branches)}/year
                      </span>
                      <Badge tone="emerald">Save {Math.round((1 - plan.prices[currency].yearly / (plan.prices[currency].monthly * 12)) * 100)}%</Badge>
                    </div>
                  )}
                </div>
              )}

              {plan.userPricing && (
                <div className="bg-zinc-50 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-zinc-900 mb-2">User Pricing</h4>
                  <div className="text-sm text-zinc-600 space-y-1">
                    <p>• Base: {plan.userPricing.baseUsers} user(s) included</p>
                    <p>• Additional user: {formatPrice(plan.userPricing.prices[currency][billingPeriod])}/{billingPeriod}</p>
                  </div>
                </div>
              )}

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-zinc-600">
                    <svg className="h-5 w-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
        <h3 className="font-semibold text-amber-900 mb-2">Need Custom Solutions?</h3>
        <p className="text-sm text-amber-700">
          Contact our team for custom packages, enterprise solutions, or special requirements. 
          We offer flexible pricing based on your business needs and scale.
        </p>
      </div>
    </main>
  );
}