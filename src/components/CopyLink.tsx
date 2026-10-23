"use client";

import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <code className="flex-1 overflow-x-auto rounded-md border border-staff-line bg-staff-bg px-3 py-2 text-xs text-staff-body">
        {url}
      </code>
      <button
        type="button"
        onClick={copy}
        className="rounded-md bg-staff-accent px-3 py-2 text-sm font-medium text-staff-bg"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
