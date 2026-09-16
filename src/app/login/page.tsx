"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("coach1@riverside.demo");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Login failed");
      return;
    }
    window.location.href = data.redirect;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <p className="text-xs uppercase tracking-widest text-accent">Measure → Compare → Improve</p>
        <h1 className="mt-2 text-2xl font-bold">Athletic Performance Platform</h1>
        <p className="mt-1 text-sm text-muted">Sign in as coach or student</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            Email
            <input
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="block text-sm">
            Password
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-3"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent py-3 font-semibold text-background disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-xs text-muted">
          Demo: coach1@riverside.demo or any student email from seed (e.g. student29@riverside.demo) — password123
        </p>
      </Card>
    </div>
  );
}
