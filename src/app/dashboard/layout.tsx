"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      window.location.replace("/login");
    } else {
      setReady(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-zinc-50 text-zinc-900">
      <div className="hidden md:block fixed left-0 top-0 h-full w-64">
        <Sidebar />
      </div>
      <div className="flex-1 md:ml-64 min-h-screen">
        <div className="flex flex-col min-w-0">{children}</div>
      </div>
    </div>
  );
}
