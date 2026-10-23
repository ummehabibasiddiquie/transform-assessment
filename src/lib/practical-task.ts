export type PracticalKind =
  | "count"
  | "classify"
  | "performance"
  | "reclassify"
  | "qualify"
  | "rank"
  | "validate"
  | "improve"
  | "written";

export type PracticalTable = {
  headers: string[];
  rows: string[][];
};

export type PracticalTaskView = {
  kind: PracticalKind;
  intro: string;
  table: PracticalTable | null;
  notes: string;
};

const HIDDEN_HEADER =
  /^(expected|expected new classification|expected decision|supported by source facts\??|candidate)$/i;

function cells(line: string) {
  return line.split("|").map((part) => part.trim());
}

function isTableLine(line: string) {
  return line.includes("|") && cells(line).filter(Boolean).length >= 2;
}

function prose(lines: string[]) {
  return lines
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !/^dataset:$/i.test(line) &&
        !/^ai statements and support labels:$/i.test(line) &&
        !/^candidate submission:/i.test(line),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function kindFor(prompt: string, headers: string[]): PracticalKind {
  const joined = headers.join(" ").toLowerCase();
  const text = prompt.toLowerCase();
  if (joined.includes("source count")) return "count";
  if (joined.includes("old classification")) return "reclassify";
  if (joined.includes("claim") || text.includes("include, exclude")) return "qualify";
  if (joined.includes("deadline") && joined.includes("impact")) return "rank";
  if (joined.includes("ai statement") || text.includes("ai-generated")) return "validate";
  if (joined.includes("average time") && joined.includes("error rate")) return "improve";
  if (joined.includes("hours") && joined.includes("records")) return "performance";
  if (joined.includes("description")) return "classify";
  return "written";
}

export function parsePracticalPrompt(prompt: string): PracticalTaskView {
  const lines = prompt.replace(/\r\n/g, "\n").split("\n");
  let start = -1;
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (isTableLine(lines[index]) && isTableLine(lines[index + 1])) {
      start = index;
      break;
    }
  }

  let headers: string[] = [];
  const rows: string[][] = [];
  let end = start;
  if (start >= 0) {
    headers = cells(lines[start]);
    end = start + 1;
    while (end < lines.length && isTableLine(lines[end])) {
      const row = cells(lines[end]);
      rows.push(headers.map((_, index) => row[index] ?? ""));
      end += 1;
    }
  }

  const hidden = new Set(
    headers.flatMap((header, index) => (HIDDEN_HEADER.test(header) ? [index] : [])),
  );
  const visibleHeaders = headers.filter((_, index) => !hidden.has(index));
  const visibleRows = rows.map((row) => row.filter((_, index) => !hidden.has(index)));

  return {
    kind: kindFor(prompt, visibleHeaders),
    intro: prose(lines.slice(0, start >= 0 ? start : lines.length)),
    table: visibleHeaders.length > 0 ? { headers: visibleHeaders, rows: visibleRows } : null,
    notes: start >= 0 ? prose(lines.slice(end)) : "",
  };
}
