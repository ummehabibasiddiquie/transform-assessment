"use client";

import type { Dispatch, SetStateAction } from "react";
import { parseJson } from "@/lib/json";

export type ResourceLog = {
  tools: string;
  verified: string;
};

type Task = {
  id: string;
  family: string;
  title: string;
  instructions: string;
  referenceMaterial: string;
};

type Props = {
  task: Task;
  content: Record<string, unknown>;
  setContent: Dispatch<SetStateAction<Record<string, unknown>>>;
  previousLearn?: Record<string, unknown> | null;
};

export function TaskForm({ task, content, setContent, previousLearn }: Props) {
  if (task.family === "A") return <LearnForm task={task} content={content} setContent={setContent} />;
  if (task.family === "P") return <InvestigateForm task={task} content={content} setContent={setContent} />;
  if (task.family === "R") return <ResearchForm content={content} setContent={setContent} />;
  if (task.family === "C") {
    return (
      <ChangeForm
        content={content}
        setContent={setContent}
        previousLearn={previousLearn}
      />
    );
  }
  if (task.family === "M") return <MessageForm content={content} setContent={setContent} />;
  if (task.family === "I") return <ImproveForm content={content} setContent={setContent} />;
  return <CustomForm task={task} content={content} setContent={setContent} />;
}

export function ResourceFields({
  log,
  setLog,
}: {
  log: ResourceLog;
  setLog: Dispatch<SetStateAction<ResourceLog>>;
}) {
  return (
    <section className="mt-8 border-t border-line pt-6">
      <h2 className="font-serif text-xl">How you used tools</h2>
      <p className="mt-1 mb-4 text-sm text-ink-soft">
        Using search or AI is allowed. Note what you used and whether you checked it.
      </p>
      <Field
        label="Tools used"
        value={log.tools}
        onChange={(value) => setLog({ ...log, tools: value })}
      />
      <label className="mt-4 block space-y-1.5">
        <span className="text-xs uppercase tracking-[0.16em] text-ink-soft">
          Did you verify important claims?
        </span>
        <select
          value={log.verified}
          onChange={(event) => setLog({ ...log, verified: event.target.value })}
          className="w-full rounded-md border border-line bg-paper px-3 py-2"
        >
          <option value="">Select</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
          <option value="na">Not applicable</option>
        </select>
      </label>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  rows = 4,
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

function set(content: Record<string, unknown>, key: string, value: unknown) {
  return { ...content, [key]: value };
}

function LearnForm({
  task,
  content,
  setContent,
}: {
  task: Task;
  content: Record<string, unknown>;
  setContent: Dispatch<SetStateAction<Record<string, unknown>>>;
}) {
  const material = parseJson<{
    labelled: { id: string; text: string; label: string }[];
    classify: { id: string; text: string }[];
  }>(task.referenceMaterial, { labelled: [], classify: [] });
  const labels = (content.labels as Record<string, string>) ?? {};
  const notes = (content.notes as Record<string, string>) ?? {};

  return (
    <div>
      <div className="rounded-lg border border-line bg-paper-2 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Study these first</p>
        <ul className="mt-3 space-y-2 text-sm">
          {material.labelled.map((item) => (
            <li key={item.id} className="flex gap-3">
              <span className="w-20 shrink-0 font-medium">{item.label}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
      <Field
        label="The rule, in your own words"
        value={content.rule}
        onChange={(value) => setContent(set(content, "rule", value))}
      />
      <div className="mt-6 space-y-4">
        <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Classify these</p>
        {material.classify.map((item) => (
          <div key={item.id} className="rounded-md border border-line p-3">
            <p className="text-sm">{item.text}</p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              {["CLEAR", "UNCLEAR", "UNCERTAIN"].map((option) => (
                <label key={option} className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name={`label-${item.id}`}
                    checked={labels[item.id] === option}
                    onChange={() =>
                      setContent({
                        ...content,
                        labels: { ...labels, [item.id]: option },
                      })
                    }
                  />
                  {option}
                </label>
              ))}
            </div>
            <input
              value={notes[item.id] ?? ""}
              placeholder="If uncertain, say why"
              onChange={(event) =>
                setContent({
                  ...content,
                  notes: { ...notes, [item.id]: event.target.value },
                })
              }
              className="mt-2 w-full rounded-md border border-line bg-paper px-3 py-1.5 text-sm"
            />
          </div>
        ))}
      </div>
      <Field
        label="Assumptions you made"
        value={content.assumptions}
        onChange={(value) => setContent(set(content, "assumptions", value))}
      />
      <Field
        label="At least one genuine uncertainty"
        value={content.uncertainty}
        onChange={(value) => setContent(set(content, "uncertainty", value))}
      />
    </div>
  );
}

function InvestigateForm({
  task,
  content,
  setContent,
}: {
  task: Task;
  content: Record<string, unknown>;
  setContent: Dispatch<SetStateAction<Record<string, unknown>>>;
}) {
  const material = parseJson<{
    targetPerHour: number;
    people: { name: string; rate: number }[];
  }>(task.referenceMaterial, { targetPerHour: 20, people: [] });

  return (
    <div>
      <div className="rounded-lg border border-line bg-paper-2 p-4 text-sm">
        <p>Expected rate: {material.targetPerHour} records / hour</p>
        <ul className="mt-2 space-y-1">
          {material.people.map((person) => (
            <li key={person.name}>
              {person.name} — {person.rate}/hour
            </li>
          ))}
        </ul>
      </div>
      <Field label="What we know" value={content.known} onChange={(value) => setContent(set(content, "known", value))} />
      <Field label="What we do not know" value={content.unknown} onChange={(value) => setContent(set(content, "unknown", value))} />
      <Field label="Possible causes" value={content.causes} onChange={(value) => setContent(set(content, "causes", value))} />
      <Field label="Checks I would perform first" value={content.checks} onChange={(value) => setContent(set(content, "checks", value))} />
      <Field label="Why I would check them in that order" value={content.whyOrder} onChange={(value) => setContent(set(content, "whyOrder", value))} />
      <Field label="If the first check confirms the issue" value={content.action} onChange={(value) => setContent(set(content, "action", value))} />
    </div>
  );
}

function ResearchForm({
  content,
  setContent,
}: {
  content: Record<string, unknown>;
  setContent: Dispatch<SetStateAction<Record<string, unknown>>>;
}) {
  const companies = (content.companies as Record<string, string>[]) ?? [{}, {}, {}];
  while (companies.length < 3) companies.push({});

  function updateCompany(index: number, key: string, value: string) {
    const next = companies.map((item, i) => (i === index ? { ...item, [key]: value } : item));
    setContent({ ...content, companies: next });
  }

  return (
    <div>
      {companies.slice(0, 3).map((company, index) => (
        <div key={index} className="mt-5 rounded-lg border border-line p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Company {index + 1}</p>
          <input
            className="mt-3 w-full rounded-md border border-line bg-paper px-3 py-2"
            placeholder="Company name"
            value={company.name ?? ""}
            onChange={(event) => updateCompany(index, "name", event.target.value)}
          />
          <input
            className="mt-2 w-full rounded-md border border-line bg-paper px-3 py-2"
            placeholder="Official source URL"
            value={company.official ?? ""}
            onChange={(event) => updateCompany(index, "official", event.target.value)}
          />
          <input
            className="mt-2 w-full rounded-md border border-line bg-paper px-3 py-2"
            placeholder="Second source URL"
            value={company.second ?? ""}
            onChange={(event) => updateCompany(index, "second", event.target.value)}
          />
          <Field label="Why it qualifies" value={company.why} onChange={(value) => updateCompany(index, "why", value)} rows={3} />
          <Field label="Evidence of product / development" value={company.evidence} onChange={(value) => updateCompany(index, "evidence", value)} rows={3} />
          <Field label="Uncertainty" value={company.uncertainty} onChange={(value) => updateCompany(index, "uncertainty", value)} rows={2} />
        </div>
      ))}
      <Field label="One result you rejected" value={content.rejected} onChange={(value) => setContent(set(content, "rejected", value))} />
      <Field label="Why you rejected it" value={content.rejectedWhy} onChange={(value) => setContent(set(content, "rejectedWhy", value))} />
      <Field label="How you used search and/or AI" value={content.method} onChange={(value) => setContent(set(content, "method", value))} />
    </div>
  );
}

function ChangeForm({
  content,
  setContent,
  previousLearn,
}: {
  content: Record<string, unknown>;
  setContent: Dispatch<SetStateAction<Record<string, unknown>>>;
  previousLearn?: Record<string, unknown> | null;
}) {
  const labels = (previousLearn?.labels as Record<string, string> | undefined) ?? {};
  return (
    <div>
      {previousLearn ? (
        <div className="rounded-lg border border-line bg-paper-2 p-4 text-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Your Task 1 rule</p>
          <p className="mt-2 whitespace-pre-wrap">{String(previousLearn.rule ?? "No rule saved")}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-ink-soft">Your earlier labels</p>
          <ul className="mt-2 space-y-1">
            {Object.entries(labels).map(([id, label]) => (
              <li key={id}>
                {id}: {label}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-ink-soft">No Task 1 answers were saved to revisit.</p>
      )}
      <Field label="Which answers change?" value={content.changes} onChange={(value) => setContent(set(content, "changes", value))} />
      <Field label="Why they change" value={content.why} onChange={(value) => setContent(set(content, "why", value))} />
      <Field label="What you would rework, and what you would not" value={content.scope} onChange={(value) => setContent(set(content, "scope", value))} />
      <Field label="Questions you would ask before reworking" value={content.questions} onChange={(value) => setContent(set(content, "questions", value))} />
    </div>
  );
}

function MessageForm({
  content,
  setContent,
}: {
  content: Record<string, unknown>;
  setContent: Dispatch<SetStateAction<Record<string, unknown>>>;
}) {
  return (
    <div>
      <Field label="The message you would send internally" value={content.message} onChange={(value) => setContent(set(content, "message", value))} rows={8} />
      <Field label="What you would do next" value={content.nextAction} onChange={(value) => setContent(set(content, "nextAction", value))} />
      <Field label="Information to collect before escalating further" value={content.info} onChange={(value) => setContent(set(content, "info", value))} />
    </div>
  );
}

function ImproveForm({
  content,
  setContent,
}: {
  content: Record<string, unknown>;
  setContent: Dispatch<SetStateAction<Record<string, unknown>>>;
}) {
  return (
    <div>
      <Field label="What you would standardise" value={content.standardise} onChange={(value) => setContent(set(content, "standardise", value))} />
      <Field label="What you would automate or use AI for" value={content.automate} onChange={(value) => setContent(set(content, "automate", value))} />
      <Field label="What must still be manually verified" value={content.verify} onChange={(value) => setContent(set(content, "verify", value))} />
      <Field label="Quality controls" value={content.controls} onChange={(value) => setContent(set(content, "controls", value))} />
      <Field label="Metrics you would track" value={content.metrics} onChange={(value) => setContent(set(content, "metrics", value))} />
      <Field label="How you would handle speed versus accuracy" value={content.tradeoff} onChange={(value) => setContent(set(content, "tradeoff", value))} />
    </div>
  );
}

function CustomForm({
  task,
  content,
  setContent,
}: {
  task: Task;
  content: Record<string, unknown>;
  setContent: Dispatch<SetStateAction<Record<string, unknown>>>;
}) {
  const notes =
    task.referenceMaterial && !task.referenceMaterial.trim().startsWith("{")
      ? task.referenceMaterial
      : "";
  return (
    <div>
      {notes ? (
        <div className="rounded-lg border border-line bg-paper-2 p-4 text-sm leading-6 whitespace-pre-wrap">
          {notes}
        </div>
      ) : null}
      <Field
        label="Your answer"
        value={content.answer}
        onChange={(value) => setContent(set(content, "answer", value))}
        rows={10}
      />
    </div>
  );
}
