import { parseJson } from "@/lib/json";

export function ResponseView({
  family,
  contentJson,
  resourceLogJson,
}: {
  family: string;
  contentJson: string;
  resourceLogJson: string;
}) {
  const content = parseJson<Record<string, unknown>>(contentJson, {});
  const log = parseJson<Record<string, unknown>>(resourceLogJson, {});

  return (
    <div className="space-y-4 text-sm leading-6 text-[#c8cdb8]">
      {family === "A" ? <LearnView content={content} /> : null}
      {family === "P" ? <InvestigateView content={content} /> : null}
      {family === "R" ? <ResearchView content={content} /> : null}
      {family === "C" ? <ChangeView content={content} /> : null}
      {family === "M" ? <MessageView content={content} /> : null}
      {family === "I" ? <ImproveView content={content} /> : null}
      {family === "CUSTOM" || !["A", "P", "R", "C", "M", "I"].includes(family) ? (
        <Block label="Answer" value={content.answer} />
      ) : null}
      {Boolean(log.tools || log.verified) ? (
        <p>
          Tools: {String(log.tools ?? "not recorded")} · Verified:{" "}
          {String(log.verified ?? "not recorded")}
        </p>
      ) : null}
    </div>
  );
}

function Block({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-[#9aa392]">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-[#e7eadf]">
        {value ? String(value) : "—"}
      </p>
    </div>
  );
}

function LearnView({ content }: { content: Record<string, unknown> }) {
  const labels = (content.labels as Record<string, string>) ?? {};
  const notes = (content.notes as Record<string, string>) ?? {};
  return (
    <div className="space-y-3">
      <Block label="Observed rule" value={content.rule} />
      <Block label="Assumptions" value={content.assumptions} />
      <Block label="Uncertainty" value={content.uncertainty} />
      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-[#9aa392]">Classifications</p>
        <ul className="mt-2 space-y-1">
          {Object.entries(labels).map(([id, label]) => (
            <li key={id}>
              {id}: {label}
              {notes[id] ? ` — ${notes[id]}` : ""}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function InvestigateView({ content }: { content: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      <Block label="What we know" value={content.known} />
      <Block label="What we do not know" value={content.unknown} />
      <Block label="Possible causes" value={content.causes} />
      <Block label="First checks" value={content.checks} />
      <Block label="Why this order" value={content.whyOrder} />
      <Block label="If the first check confirms it" value={content.action} />
    </div>
  );
}

function ResearchView({ content }: { content: Record<string, unknown> }) {
  const companies = (content.companies as Record<string, string>[] | undefined) ?? [];
  return (
    <div className="space-y-3">
      {companies.map((company, index) => (
        <div key={index} className="rounded-md border border-[#2a332a] p-3">
          <p className="text-[#f3efe6]">
            {index + 1}. {company.name || "Unnamed"}
          </p>
          <p>Official: {company.official || "—"}</p>
          <p>Second: {company.second || "—"}</p>
          <p>Why it qualifies: {company.why || "—"}</p>
          <p>Evidence: {company.evidence || "—"}</p>
          <p>Uncertainty: {company.uncertainty || "—"}</p>
        </div>
      ))}
      <Block label="Rejected result" value={content.rejected} />
      <Block label="Why rejected" value={content.rejectedWhy} />
      <Block label="How search/AI was used" value={content.method} />
    </div>
  );
}

function ChangeView({ content }: { content: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      <Block label="What changes" value={content.changes} />
      <Block label="Why" value={content.why} />
      <Block label="Rework scope" value={content.scope} />
      <Block label="Questions before rework" value={content.questions} />
    </div>
  );
}

function MessageView({ content }: { content: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      <Block label="Internal message" value={content.message} />
      <Block label="Next action" value={content.nextAction} />
      <Block label="Information before escalating" value={content.info} />
    </div>
  );
}

function ImproveView({ content }: { content: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      <Block label="Standardise" value={content.standardise} />
      <Block label="Automate / AI" value={content.automate} />
      <Block label="Still verify manually" value={content.verify} />
      <Block label="Quality controls" value={content.controls} />
      <Block label="Metrics" value={content.metrics} />
      <Block label="Speed vs accuracy" value={content.tradeoff} />
    </div>
  );
}
