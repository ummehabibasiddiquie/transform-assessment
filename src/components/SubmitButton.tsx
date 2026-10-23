"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingText,
  className,
}: {
  children: ReactNode;
  pendingText: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className} inline-flex items-center gap-2 disabled:cursor-wait disabled:opacity-70`}
    >
      {pending ? (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {pending ? pendingText : children}
    </button>
  );
}
