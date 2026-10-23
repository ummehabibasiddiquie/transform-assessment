"use client";

import type { Dispatch, SetStateAction } from "react";
import type { PracticalKind, PracticalTable, PracticalTaskView } from "@/lib/practical-task";

function set(content: Record<string, unknown>, key: string, value: unknown) {
  return { ...content, [key]: value };
}

function Area({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: unknown;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="mt-4 block space-y-1.5">
      <span className="text-xs uppercase tracking-[0.16em] text-ink-soft">{label}</span>
      <textarea
        rows={rows}
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-line bg-paper px-3 py-2 leading-6 outline-none focus:ring-2 focus:ring-clay/30"
      />
    </label>
  );
}

function ChoiceRow({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((option) => (
        <label key={option} className="flex items-center gap-1.5 text-sm">
          <input
            type="radio"
            name={name}
            checked={value === option}
            onChange={() => onChange(option)}
          />
          {option}
        </label>
      ))}
    </div>
  );
}

export function PracticalTask({
  view,
  content,
  setContent,
}: {
  view: PracticalTaskView;
  content: Record<string, unknown>;
  setContent: Dispatch<SetStateAction<Record<string, unknown>>>;
}) {
  const table = view.table;

  return (
    <div>
      {view.intro ? <p className="whitespace-pre-wrap leading-7">{view.intro}</p> : null}
      {table ? <DataTable view={view} table={table} content={content} setContent={setContent} /> : null}
      {view.notes ? (
        <p className="mt-4 whitespace-pre-wrap rounded-lg border border-line bg-paper-2 p-4 text-sm leading-6">
          {view.notes}
        </p>
      ) : null}
      <FollowUp kind={view.kind} table={table} content={content} setContent={setContent} />
    </div>
  );
}

function DataTable({
  view,
  table,
  content,
  setContent,
}: {
  view: PracticalTaskView;
  table: NonNullable<PracticalTaskView["table"]>;
  content: Record<string, unknown>;
  setContent: Dispatch<SetStateAction<Record<string, unknown>>>;
}) {
  const labels = (content.labels as Record<string, string>) ?? {};
  const decisions = (content.decisions as Record<string, string>) ?? {};
  const support = (content.support as Record<string, string>) ?? {};
  const perRow = view.kind === "classify" || view.kind === "reclassify" || view.kind === "qualify" || view.kind === "validate";

  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead className="bg-paper-2 text-xs uppercase tracking-[0.14em] text-ink-soft">
          <tr>
            {table.headers.map((header) => (
              <th key={header} className="px-3 py-2 font-medium">
                {header}
              </th>
            ))}
            {perRow ? <th className="px-3 py-2 font-medium">Your answer</th> : null}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => {
            const id = row[0] || row.join("-");
            return (
              <tr key={id} className="border-t border-line align-top">
                {row.map((cell, index) => (
                  <td key={`${id}-${index}`} className="px-3 py-2 leading-6">
                    {cell}
                  </td>
                ))}
                {view.kind === "classify" || view.kind === "reclassify" ? (
                  <td className="px-3 py-2">
                    <ChoiceRow
                      name={`class-${id}`}
                      value={labels[id] ?? ""}
                      options={["CLEAR", "UNCLEAR"]}
                      onChange={(value) =>
                        setContent({ ...content, labels: { ...labels, [id]: value } })
                      }
                    />
                  </td>
                ) : null}
                {view.kind === "qualify" ? (
                  <td className="px-3 py-2">
                    <ChoiceRow
                      name={`decision-${id}`}
                      value={decisions[id] ?? ""}
                      options={["Include", "Exclude", "Needs verification"]}
                      onChange={(value) =>
                        setContent({ ...content, decisions: { ...decisions, [id]: value } })
                      }
                    />
                  </td>
                ) : null}
                {view.kind === "validate" ? (
                  <td className="px-3 py-2">
                    <ChoiceRow
                      name={`support-${id}`}
                      value={support[id] ?? ""}
                      options={["Supported", "Not supported"]}
                      onChange={(value) =>
                        setContent({ ...content, support: { ...support, [id]: value } })
                      }
                    />
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FollowUp({
  kind,
  table,
  content,
  setContent,
}: {
  kind: PracticalKind;
  table: PracticalTable | null;
  content: Record<string, unknown>;
  setContent: Dispatch<SetStateAction<Record<string, unknown>>>;
}) {
  if (kind === "count") {
    return (
      <>
        <Area
          label="Mismatch row numbers"
          value={content.mismatches}
          onChange={(value) => setContent(set(content, "mismatches", value))}
        />
        <Area
          label="Correct source total"
          value={content.total}
          onChange={(value) => setContent(set(content, "total", value))}
          rows={2}
        />
        <Area
          label="Should the reported counts be changed now? What would you do?"
          value={content.decision}
          onChange={(value) => setContent(set(content, "decision", value))}
        />
      </>
    );
  }

  if (kind === "performance") {
    return (
      <>
        <Area label="Who is below 20 records an hour?" value={content.belowTarget} onChange={(value) => setContent(set(content, "belowTarget", value))} />
        <Area label="Where is the strongest quality concern?" value={content.qualityConcern} onChange={(value) => setContent(set(content, "qualityConcern", value))} />
        <Area label="Who should not be called a low performer yet?" value={content.notLowPerformer} onChange={(value) => setContent(set(content, "notLowPerformer", value))} />
        <Area label="What else do you need to know about Ravi?" value={content.raviNeeded} onChange={(value) => setContent(set(content, "raviNeeded", value))} />
        <Area label="Which issue would you investigate first?" value={content.investigateFirst} onChange={(value) => setContent(set(content, "investigateFirst", value))} />
        <Area label="Facts" value={content.facts} onChange={(value) => setContent(set(content, "facts", value))} />
        <Area label="Hypotheses" value={content.hypotheses} onChange={(value) => setContent(set(content, "hypotheses", value))} />
      </>
    );
  }

  if (kind === "reclassify") {
    return (
      <>
        <Area
          label="Which earlier CLEAR decisions change under the new rule?"
          value={content.changedRows}
          onChange={(value) => setContent(set(content, "changedRows", value))}
        />
        <label className="mt-4 block space-y-1.5">
          <span className="text-xs uppercase tracking-[0.16em] text-ink-soft">What should happen to the earlier work?</span>
          <select
            value={String(content.scope ?? "")}
            onChange={(event) => setContent(set(content, "scope", event.target.value))}
            className="w-full rounded-md border border-line bg-paper px-3 py-2"
          >
            <option value="">Select</option>
            <option value="affected">Recheck only the affected work</option>
            <option value="all">Restart all of the work</option>
          </select>
        </label>
      </>
    );
  }

  if (kind === "qualify") {
    return (
      <Area
        label="What evidence is still missing?"
        value={content.missing}
        onChange={(value) => setContent(set(content, "missing", value))}
      />
    );
  }

  if (kind === "rank") {
    return <RankList table={table} content={content} setContent={setContent} />;
  }

  if (kind === "validate") {
    return (
      <Area
        label="What would you check before sharing the report?"
        value={content.checks}
        onChange={(value) => setContent(set(content, "checks", value))}
      />
    );
  }

  if (kind === "improve") {
    return (
      <>
        <Area label="Where should improvement start?" value={content.startAt} onChange={(value) => setContent(set(content, "startAt", value))} />
        <Area label="What changes would you make?" value={content.changes} onChange={(value) => setContent(set(content, "changes", value))} />
        <Area label="What should stay under human review?" value={content.humanReview} onChange={(value) => setContent(set(content, "humanReview", value))} />
        <Area label="What would you measure to see if it worked?" value={content.measures} onChange={(value) => setContent(set(content, "measures", value))} />
      </>
    );
  }

  return (
    <Area
      label="Your answer"
      value={content.answer}
      onChange={(value) => setContent(set(content, "answer", value))}
      rows={8}
    />
  );
}

function RankList({
  table,
  content,
  setContent,
}: {
  table: PracticalTable | null;
  content: Record<string, unknown>;
  setContent: Dispatch<SetStateAction<Record<string, unknown>>>;
}) {
  const fallback = table?.rows.map((row) => row[0]).filter(Boolean) ?? [];
  const order =
    Array.isArray(content.order) && content.order.length > 0 ? (content.order as string[]) : fallback;

  function move(index: number, direction: -1 | 1) {
    const next = [...order];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setContent(set(content, "order", next));
  }

  return (
    <div className="mt-6">
      <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">
        Put the first five actions at the top
      </p>
      <ol className="mt-3 space-y-2">
        {order.map((id, index) => (
          <li key={id} className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2 text-sm">
            <span>
              {index + 1}. Task {id}
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
      <Area
        label="How would you handle a high-impact task that is blocked?"
        value={content.blocked}
        onChange={(value) => setContent(set(content, "blocked", value))}
      />
    </div>
  );
}
