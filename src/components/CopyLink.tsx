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
      <code className="flex-1 overflow-x-auto rounded-md border border-[#2a332a] bg-[#121612] px-3 py-2 text-xs text-[#c8cdb8]">
        {url}
      </code>
      <button
        type="button"
        onClick={copy}
        className="rounded-md bg-[#d9784a] px-3 py-2 text-sm font-medium text-[#121612]"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
