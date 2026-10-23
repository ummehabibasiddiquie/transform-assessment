"use client";

import type { Dispatch, SetStateAction } from "react";
import { readChoices, readClassSpec, readMatchSpec } from "@/lib/question-shape";

function set(content: Record<string, unknown>, key: string, value: unknown) {
  return { ...content, [key]: value };
}

export function StructuredResponse({
  responseType,
  optionsJson,
  content,
  setContent,
}: {
  responseType: string;
  optionsJson: string;
  content: Record<string, unknown>;
  setContent: Dispatch<SetStateAction<Record<string, unknown>>>;
}) {
  const choices = readChoices(optionsJson);

  if ((responseType === "MCQ" || responseType === "MULTI_SELECT") && choices.length === 0) {
    return (
      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-[0.16em] text-ink-soft">Your answer</span>
        <textarea
          rows={8}
          value={String(content.answer ?? "")}
          onChange={(event) => setContent(set(content, "answer", event.target.value))}
          className="w-full rounded-md border border-line bg-paper px-3 py-2 leading-6"
        />
      </label>
    );
  }

  if (responseType === "MCQ") {
    return (
      <fieldset className="space-y-2">
        <legend className="text-xs uppercase tracking-[0.16em] text-ink-soft">Choose one</legend>
        {choices.map((choice) => (
          <label key={choice.id} className="flex items-start gap-2 text-sm leading-6">
            <input
              type="radio"
              name="choice"
              className="mt-1"
              checked={content.choice === choice.id}
              onChange={() => setContent(set(content, "choice", choice.id))}
            />
            <span>
              {choice.id}. {choice.label}
            </span>
          </label>
        ))}
      </fieldset>
    );
  }

  if (responseType === "MULTI_SELECT") {
    const selected = Array.isArray(content.selected) ? (content.selected as string[]) : [];
    return (
      <fieldset className="space-y-2">
        <legend className="text-xs uppercase tracking-[0.16em] text-ink-soft">Choose all that apply</legend>
        {choices.map((choice) => (
          <label key={choice.id} className="flex items-start gap-2 text-sm leading-6">
            <input
              type="checkbox"
              className="mt-1"
              checked={selected.includes(choice.id)}
              onChange={() => {
                const next = selected.includes(choice.id)
                  ? selected.filter((id) => id !== choice.id)
                  : [...selected, choice.id];
                setContent(set(content, "selected", next));
              }}
            />
            <span>
              {choice.id}. {choice.label}
            </span>
          </label>
        ))}
      </fieldset>
    );
  }

  if (responseType === "RANKING" || responseType === "ORDERING") {
    const fallback = choices.map((choice) => choice.id);
    const order =
      Array.isArray(content.order) && content.order.length > 0
        ? (content.order as string[])
        : fallback;
    function move(index: number, direction: -1 | 1) {
      const current = Array.isArray(content.order) && content.order.length > 0
        ? (content.order as string[])
        : fallback;
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return;
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      setContent(set(content, "order", next));
    }
    const labels = new Map(choices.map((choice) => [choice.id, choice.label]));
    return (
      <ol className="space-y-2">
        {order.map((id, index) => (
          <li key={id} className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2 text-sm">
            <span>
              {index + 1}. {labels.get(id) ?? id}
            </span>
            <span className="flex gap-2">
              <button type="button" className="text-xs" onClick={() => move(index, -1)}>
                Up
              </button>
              <button type="button" className="text-xs" onClick={() => move(index, 1)}>
                Down
              </button>
            </span>
          </li>
        ))}
      </ol>
    );
  }

  if (responseType === "CLASSIFICATION") {
    const spec = readClassSpec(optionsJson);
    const labels = (content.labels as Record<string, string>) ?? {};
    return (
      <div className="space-y-3">
        {spec.items.map((item) => (
          <label key={item.id} className="block text-sm">
            <span>{item.label}</span>
            <select
              className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2"
              value={labels[item.id] ?? ""}
              onChange={(event) =>
                setContent({ ...content, labels: { ...labels, [item.id]: event.target.value } })
              }
            >
              <option value="">Select</option>
              {spec.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    );
  }

  if (responseType === "MATCHING") {
    const spec = readMatchSpec(optionsJson);
    const pairs = (content.pairs as Record<string, string>) ?? {};
    return (
      <div className="space-y-3">
        {spec.left.map((item) => (
          <label key={item.id} className="block text-sm">
            <span>{item.label}</span>
            <select
              className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2"
              value={pairs[item.id] ?? ""}
              onChange={(event) =>
                setContent({ ...content, pairs: { ...pairs, [item.id]: event.target.value } })
              }
            >
              <option value="">Match</option>
              {spec.right.map((right) => (
                <option key={right.id} value={right.id}>
                  {right.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    );
  }

  if (responseType === "NUMERIC") {
    return (
      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-[0.16em] text-ink-soft">Number</span>
        <input
          inputMode="decimal"
          value={String(content.value ?? "")}
          onChange={(event) => setContent(set(content, "value", event.target.value))}
          className="w-full rounded-md border border-line bg-paper px-3 py-2"
        />
      </label>
    );
  }

  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-[0.16em] text-ink-soft">Your answer</span>
      <textarea
        rows={8}
        value={String(content.answer ?? "")}
        onChange={(event) => setContent(set(content, "answer", event.target.value))}
        className="w-full rounded-md border border-line bg-paper px-3 py-2 leading-6"
      />
    </label>
  );
}
