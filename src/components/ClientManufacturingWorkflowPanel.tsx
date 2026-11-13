"use client";

import { useEffect, useState } from "react";
import {
  updateCompanyManufacturingWorkflow,
  type CompanyDetail,
  type ManufacturingWorkflow,
} from "@/lib/api";

type Props = {
  detail: CompanyDetail;
  onUpdated: (detail: CompanyDetail) => void;
  onMessage: (msg: string) => void;
  onError: (msg: string) => void;
};

const OPTIONS: {
  value: ManufacturingWorkflow;
  title: string;
  desc: string;
}[] = [
  {
    value: "STANDARD",
    title: "STANDARD",
    desc: "Standard ERP Manufacturing",
  },
  {
    value: "TEXTILE_WEAVING",
    title: "TEXTILE_WEAVING",
    desc: "Textile Weaving Suite (Yadgar Fabrics Flow)",
  },
];

export default function ClientManufacturingWorkflowPanel({
  detail,
  onUpdated,
  onMessage,
  onError,
}: Props) {
  const current = (detail.manufacturingWorkflow || "STANDARD") as ManufacturingWorkflow;
  const [workflow, setWorkflow] = useState<ManufacturingWorkflow>(current);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setWorkflow((detail.manufacturingWorkflow || "STANDARD") as ManufacturingWorkflow);
  }, [detail.id, detail.manufacturingWorkflow]);

  const isTextile = workflow === "TEXTILE_WEAVING";
  const dirty = workflow !== current;

  async function handleSave() {
    setSaving(true);
    onError("");
    const res = await updateCompanyManufacturingWorkflow(detail.id, workflow);
    setSaving(false);

    if (!res.success) {
      onError(
        (res as { message?: string }).message || "Failed to update manufacturing workflow"
      );
      return;
    }

    const payload = res.data as {
      company?: Partial<CompanyDetail>;
      capacity?: CompanyDetail["capacity"];
    };

    onUpdated({
      ...detail,
      ...(payload?.company || {}),
      manufacturingWorkflow: payload?.company?.manufacturingWorkflow || workflow,
      capacity: payload?.capacity ?? detail.capacity,
      users: detail.users,
    });
    onMessage(
      res.message ||
        (workflow === "TEXTILE_WEAVING"
          ? "Textile Weaving Suite activated."
          : "Standard ERP Manufacturing restored.")
    );
  }

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">Manufacturing Workflow Mode</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Platform-only control. Activates the Yadgar Fabrics textile weaving registers for this
            tenant without changing their standard manufacturing data.
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            current === "TEXTILE_WEAVING"
              ? "bg-amber-200 text-amber-900"
              : "bg-zinc-100 text-zinc-700 border border-zinc-200"
          }`}
        >
          {current === "TEXTILE_WEAVING" ? "Textile Weaving Active" : "Standard"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((opt) => {
          const active = workflow === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setWorkflow(opt.value)}
              className={`rounded-xl border bg-white px-4 py-3 text-left transition-all ${
                active
                  ? "border-amber-500 ring-2 ring-amber-200"
                  : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <p className="text-sm font-semibold text-zinc-900">{opt.title}</p>
              <p className="mt-1 text-xs text-zinc-500">{opt.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !dirty}
          className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save manufacturing workflow"}
        </button>
        {dirty && (
          <p className="text-xs text-zinc-500">
            Will switch to {isTextile ? "Textile Weaving Suite" : "Standard ERP Manufacturing"}.
          </p>
        )}
      </div>
    </div>
  );
}
