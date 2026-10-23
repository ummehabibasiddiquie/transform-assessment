"use client";

import { useState, type ReactNode } from "react";

export function CollapsibleList({
  title,
  summary,
  children,
  defaultOpen = false,
}: {
  title: string;
  summary?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-lg border border-staff-line">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span>
          <span className="font-serif text-xl text-staff-strong">{title}</span>
          {summary ? <span className="mt-1 block text-sm text-staff-muted">{summary}</span> : null}
        </span>
        <span className="shrink-0 rounded-md border border-staff-line px-3 py-1 text-xs uppercase tracking-[0.14em] text-staff-accent">
          {open ? "Close ▴" : "Open ▾"}
        </span>
      </button>
      {open ? <div className="border-t border-staff-line px-5 py-4">{children}</div> : null}
    </section>
  );
}

export function CollapsibleSection({
  title,
  countLabel,
  children,
  open,
  onToggle,
}: {
  title: string;
  countLabel: string;
  children: ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-lg border border-staff-line">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span>
          <span className="font-serif text-xl text-staff-strong">{title}</span>
          <span className="mt-1 block text-sm text-staff-muted">{countLabel}</span>
        </span>
        <span className="shrink-0 rounded-md border border-staff-line px-3 py-1 text-xs uppercase tracking-[0.14em] text-staff-accent">
          {open ? "Close ▴" : "Open ▾"}
        </span>
      </button>
      {open ? <div className="border-t border-staff-line px-5 py-4">{children}</div> : null}
    </div>
  );
}
