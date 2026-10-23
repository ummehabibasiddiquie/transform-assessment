import { parseJson } from "./json";

export type EvidenceKey = { code: string; name: string; positive: string; negative: string };

const RULES: { code: string; words: string[] }[] = [
  { code: "C01", words: ["adaptab", "learning"] },
  { code: "C02", words: ["problem solving", "root cause", "troubleshoot"] },
  { code: "C03", words: ["critical thinking", "judgment", "judgement"] },
  { code: "C04", words: ["communication"] },
  { code: "C05", words: ["ownership", "persistence", "independent execution", "drive"] },
  { code: "C06", words: ["accuracy", "attention to detail"] },
  { code: "C07", words: ["improvement", "process control", "change control"] },
  { code: "C08", words: ["quality", "defect", "sampling", "calibration", "qa"] },
  { code: "C09", words: ["delivery", "capacity", "planning", "prioriti", "productivity", "dependenc"] },
  { code: "C10", words: ["people", "coaching", "leadership", "workforce"] },
  { code: "C11", words: ["stakeholder", "escalation", "vendor"] },
  { code: "C12", words: ["research", "verification"] },
  { code: "C13", words: ["technical", "architecture", "security", "incident", "documentation", "risk"] },
  { code: "C14", words: ["recruit", "screening", "candidate judgment", "sourcing", "pipeline"] },
];

export function readEvidenceKeys(rows: { sourceId: string; title: string; payloadJson: string }[]) {
  return rows.map((row): EvidenceKey => {
    const payload = parseJson<Record<string, string>>(row.payloadJson, {});
    return {
      code: row.sourceId,
      name: row.title,
      positive: (payload.Positive_Evidence ?? "").replace(/^Positive:\s*/i, ""),
      negative: (payload.Negative_Evidence ?? "").replace(/^Negative:\s*/i, ""),
    };
  });
}

function matchingRules(competencyName: string) {
  const name = competencyName.toLowerCase();
  return RULES.filter((rule) => rule.words.some((word) => name.includes(word)));
}

export function competencyCodes(competencyName: string) {
  return matchingRules(competencyName).map((rule) => rule.code);
}

export function tasksForCompetency<
  T extends { competencyName: string; key?: { rubric: string; evidence: string } | null },
>(competencyName: string, tasks: T[]) {
  const rules = matchingRules(competencyName);
  const codes = new Set(rules.map((rule) => rule.code));
  const words = [competencyName.toLowerCase(), ...rules.flatMap((rule) => rule.words)];
  return tasks.filter((task) => {
    const taskCodes = task.competencyName.split(/[/,;\s]+/).filter(Boolean);
    if (taskCodes.some((code) => codes.has(code))) return true;
    if (task.competencyName.trim()) return false;
    const text = `${task.key?.rubric ?? ""} ${task.key?.evidence ?? ""}`.toLowerCase();
    return text.trim().length > 0 && words.some((word) => text.includes(word));
  });
}
