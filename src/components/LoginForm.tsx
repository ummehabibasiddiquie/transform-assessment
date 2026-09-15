"use client";

import { useState } from "react";
import { loginStaff } from "@/lib/actions";
import { PasswordInput } from "@/components/PasswordInput";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function action(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await loginStaff(formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <form action={action} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-[0.16em] text-ink-soft">
          Work email
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue="ivan.p@example.net"
          className="w-full rounded-md border border-line bg-paper px-3 py-2.5 outline-none ring-clay/30 focus:ring-2"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-[0.16em] text-ink-soft">
          Password
        </span>
        <PasswordInput
          name="password"
          required
          autoComplete="current-password"
          defaultValue="transform123"
          className="rounded-md border border-line bg-paper px-3 py-2.5 outline-none ring-clay/30 focus:ring-2"
        />
      </label>
      {error ? <p className="text-sm text-clay">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full rounded-md px-4 py-2.5 text-sm font-medium disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Open hiring console"}
      </button>
    </form>
  );
}
