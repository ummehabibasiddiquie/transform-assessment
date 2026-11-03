"use client";

import type { FormEvent, ReactNode } from "react";

export function ConfirmForm({
  action,
  message,
  onlyIf,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  onlyIf?: { field: string; value: string };
  className?: string;
  children: ReactNode;
}) {
  function confirmFirst(event: FormEvent<HTMLFormElement>) {
    if (onlyIf) {
      const value = new FormData(event.currentTarget).get(onlyIf.field);
      if (value !== onlyIf.value) return;
    }
    if (!window.confirm(message)) event.preventDefault();
  }

  return (
    <form action={action} onSubmit={confirmFirst} className={className}>
      {children}
    </form>
  );
}
