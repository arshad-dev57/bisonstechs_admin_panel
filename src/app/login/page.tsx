"use client";

import { useState } from "react";
import { loginWithPassword, setAdminTokens } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await loginWithPassword(email, password);
      if (!res.success) {
        setError((res as { message?: string }).message || "Invalid email or password");
        return;
      }

      // Direct login (no OTP) — token comes on the first response.
      const token = res.data?.token || (res as { token?: string }).token;
      const refreshToken =
        res.data?.refreshToken || (res as { refreshToken?: string }).refreshToken;
      const user = res.data?.user || (res as { user?: Record<string, unknown> }).user;

      if (!token) {
        setError("Login successful but no token received");
        return;
      }

      setAdminTokens(token, refreshToken);
      if (user) localStorage.setItem("admin_user", JSON.stringify(user));
      setSuccess(true);
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 600);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 font-bold text-white text-lg">
            B
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">Bisons Techs</p>
            <p className="text-xs text-zinc-400">Admin Panel</p>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
          {success ? (
            <div className="py-8 text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
                  <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className="mb-2 text-xl font-bold text-white">Login Successful!</h2>
              <p className="text-sm text-zinc-400">Redirecting to dashboard...</p>
            </div>
          ) : (
            <>
              <h1 className="mb-1 text-xl font-bold text-white">Sign in</h1>
              <p className="mb-6 text-sm text-zinc-400">
                Sign in with your BisonsTechs admin account
              </p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@bisonstechs.dev"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {error && (
                  <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
                >
                  {loading ? "Signing in…" : "Sign in"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
