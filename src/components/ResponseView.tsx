import { parseJson } from "@/lib/json";
import { responseHasAnswer } from "@/lib/question-shape";

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
    <div className="space-y-4 text-sm leading-6 text-staff-body">
      {family === "A" ? <LearnView content={content} /> : null}
      {family === "P" ? <InvestigateView content={content} /> : null}
      {family === "R" ? <ResearchView content={content} /> : null}
      {family === "C" ? <ChangeView content={content} /> : null}
      {family === "M" ? <MessageView content={content} /> : null}
      {family === "I" ? <ImproveView content={content} /> : null}
      {family === "CUSTOM" || !["A", "P", "R", "C", "M", "I"].includes(family) ? (
        <AnswerBlocks content={content} />
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

function AnswerBlocks({ content }: { content: Record<string, unknown> }) {
  const labels = record(content.labels);
  const decisions = record(content.decisions);
  const support = record(content.support);
  const order = Array.isArray(content.order) ? content.order.map(String) : [];
  const selected = Array.isArray(content.selected) ? content.selected.map(String) : [];

  return (
    <div className="space-y-3">
      <Filled label="Choice" value={content.choice} />
      <Filled label="Selected" value={selected.length > 0 ? selected.join(", ") : ""} />
      <Filled label="Number" value={content.value} />
      <Filled label="Order" value={order.length > 0 ? order.join(" → ") : ""} />
      <Filled label="Classifications" value={labels ? pairs(labels) : ""} />
      <Filled label="Decisions" value={decisions ? pairs(decisions) : ""} />
      <Filled label="Source check" value={support ? pairs(support) : ""} />
      <Filled label="Mismatch rows" value={content.mismatches} />
      <Filled label="Source total" value={content.total} />
      <Filled label="Action" value={content.decision} />
      <Filled label="Below target" value={content.belowTarget} />
      <Filled label="Quality concern" value={content.qualityConcern} />
      <Filled label="Not a low performer yet" value={content.notLowPerformer} />
      <Filled label="Still needed on Ravi" value={content.raviNeeded} />
      <Filled label="Investigate first" value={content.investigateFirst} />
      <Filled label="Facts" value={content.facts} />
      <Filled label="Hypotheses" value={content.hypotheses} />
      <Filled label="Changed rows" value={content.changedRows} />
      <Filled
        label="Earlier work"
        value={
          content.scope === "all"
            ? "Restart all of the work"
            : content.scope === "affected"
              ? "Recheck only the affected work"
              : content.scope
        }
      />
      <Filled label="Missing evidence" value={content.missing} />
      <Filled label="Blocked task" value={content.blocked} />
      <Filled label="Checks before sharing" value={content.checks} />
      <Filled label="Start with" value={content.startAt} />
      <Filled label="Changes" value={content.changes} />
      <Filled label="Keep under human review" value={content.humanReview} />
      <Filled label="Measures" value={content.measures} />
      <Filled label="Answer" value={content.answer} />
      {!responseHasAnswer(JSON.stringify(content)) ? <Block label="Answer" value="" /> : null}
    </div>
  );
}

function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>);
  return entries.length > 0 ? Object.fromEntries(entries.map(([key, item]) => [key, String(item)])) : null;
}

function pairs(value: Record<string, string>) {
  return Object.entries(value)
    .map(([key, item]) => `${key}: ${item}`)
    .join("\n");
}

function Filled({ label, value }: { label: string; value: unknown }) {
  if (value == null || String(value).trim() === "") return null;
  return <Block label={label} value={value} />;
}

function Block({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-staff-muted">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-staff-text">
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
        <p className="text-xs uppercase tracking-[0.14em] text-staff-muted">Classifications</p>
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
        <div key={index} className="rounded-md border border-staff-line p-3">
          <p className="text-staff-strong">
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
      <Block label="Internal mes sage" value={content.message} />
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
