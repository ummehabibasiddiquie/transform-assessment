export type Choice = { id: string; label: string };

export type ClassSpec = { items: Choice[]; categories: string[] };

export type MatchSpec = { left: Choice[]; right: Choice[] };

export function parseChoices(raw: string): Choice[] {
  const parts = raw
    .split(/\r?\n|\s\|\s/)
    .map((part) => part.trim())
    .filter(Boolean);
  const choices: Choice[] = [];
  for (const part of parts) {
    const match = part.match(/^([A-Z])[.)]\s*(.+)$/);
    if (match) {
      choices.push({ id: match[1], label: match[2].trim() });
    }
  }
  return choices;
}

export function readChoices(optionsJson: string): Choice[] {
  try {
    const parsed = JSON.parse(optionsJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as { id?: unknown; label?: unknown };
      if (typeof row.id !== "string" || typeof row.label !== "string") return [];
      return [{ id: row.id, label: row.label }];
    });
  } catch {
    return [];
  }
}

export function readClassSpec(optionsJson: string): ClassSpec {
  try {
    const parsed = JSON.parse(optionsJson) as {
      items?: Choice[];
      categories?: string[];
    };
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
    };
  } catch {
    return { items: [], categories: [] };
  }
}

export function readMatchSpec(optionsJson: string): MatchSpec {
  try {
    const parsed = JSON.parse(optionsJson) as { left?: Choice[]; right?: Choice[] };
    return {
      left: Array.isArray(parsed.left) ? parsed.left : [],
      right: Array.isArray(parsed.right) ? parsed.right : [],
    };
  } catch {
    return { left: [], right: [] };
  }
}

export function permissionText(aiAllowed: boolean, searchAllowed: boolean) {
  if (!aiAllowed && !searchAllowed) return "Do not use AI or search on this task.";
  if (aiAllowed && searchAllowed) return "You may use search and AI. Verify anything important.";
  if (aiAllowed) return "You may use AI. Do not use web search. Verify anything important.";
  return "You may use web search. Do not use AI. Verify anything important.";
}

const STRUCTURED = new Set([
  "MCQ",
  "MULTI_SELECT",
  "RANKING",
  "ORDERING",
  "CLASSIFICATION",
  "MATCHING",
  "NUMERIC",
  "SHORT",
]);

export function isStructuredResponse(responseType: string) {
  return STRUCTURED.has(responseType);
}

export function responseHasAnswer(contentJson: string) {
  try {
    const content = JSON.parse(contentJson) as Record<string, unknown>;
    if (!content || typeof content !== "object") return false;
    return Object.entries(content).some(([key, value]) => {
      if (key === "kind") return false;
      if (Array.isArray(value)) return value.length > 0;
      if (value && typeof value === "object") return Object.keys(value).length > 0;
      return String(value ?? "").trim().length > 0;
    });
  } catch {
    return false;
  }
}
