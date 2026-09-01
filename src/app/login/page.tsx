"use client";

import { useState } from "react";
import { loginWithPassword, verifyLoginOtp } from "@/lib/api";

export default function LoginPage() {
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
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
      setStep("otp");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await verifyLoginOtp(email, otp);
      console.log("OTP Response:", JSON.stringify(res, null, 2));
      
      if (!res.success) {
        setError((res as { message?: string }).message || "Invalid OTP");
        return;
      }
      
      // Handle different response structures
      const token = res.data?.token || (res as any).token;
      const refreshToken = res.data?.refreshToken || (res as any).refreshToken;
      const user = res.data?.user || (res as any).user;
      
      if (!token) {
        console.error("No token in response:", res);
        setError("Login successful but no token received");
        return;
      }
      
      localStorage.setItem("admin_token", token);
      if (refreshToken) localStorage.setItem("admin_refresh_token", refreshToken);
      if (user) localStorage.setItem("admin_user", JSON.stringify(user));
      
      setSuccess(true);
      console.log("Token set, redirecting to dashboard...");
      
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch (err) {
      console.error("OTP Error:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
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
          {step === "credentials" ? (
            <>
              <h1 className="mb-1 text-xl font-bold text-white">Sign in</h1>
              <p className="mb-6 text-sm text-zinc-400">Sign in with your BisonsTechs account</p>

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
                  <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
                >
                  {loading ? "Signing in…" : "Continue"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="mb-1 text-xl font-bold text-white">Check your email</h1>
              <p className="mb-6 text-sm text-zinc-400">
                We sent a 6-digit code to <span className="text-zinc-200">{email}</span>
              </p>

              <form onSubmit={handleOtp} className="space-y-4">
                {success ? (
                  <div className="text-center py-8">
                    <div className="mb-4 flex justify-center">
                      <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Login Successful!</h2>
                    <p className="text-sm text-zinc-400">Redirecting to dashboard...</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-400">OTP Code</label>
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        required
                        inputMode="numeric"
                        placeholder="123456"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 tracking-widest text-center text-lg"
                      />
                    </div>

                    {error && (
                      <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading || otp.length < 6}
                      className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {loading ? "Verifying…" : "Verify & Sign in"}
                    </button>

                    <button
                      type="button"
                      onClick={() => { setStep("credentials"); setError(""); setOtp(""); }}
                      className="w-full text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      ← Back
                    </button>
                  </>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
