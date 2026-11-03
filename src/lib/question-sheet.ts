import type { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import { parseChoices } from "./question-shape";

const RESPONSE_TYPES = new Set([
  "MCQ",
  "MULTI_SELECT",
  "RANKING",
  "ORDERING",
  "CLASSIFICATION",
  "MATCHING",
  "NUMERIC",
  "SHORT",
  "PRACTICAL",
]);

const RESPONSE_ALIASES: Record<string, string> = {
  SHORT_RESPONSE: "SHORT",
  SHORT_ANSWER: "SHORT",
  WRITTEN: "SHORT",
};

export function isQuestionWorkbook(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  return workbook.SheetNames.some((name) => {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[name], {
      defval: "",
      raw: false,
    });
    return rows.some((row) => "Question" in row && "Role_Code" in row && "Module" in row);
  });
}

const MODULES = new Set(["ROLE", "COMMON_APTITUDE", "COMMON_PROBLEM_SOLVING"]);

export type ImportMode = "add" | "replace";

export type QuestionSheetResult = {
  roles: number;
  created: number;
  updated: number;
  retired: number;
  replaceSkipped: boolean;
  sections: string[];
  errors: string[];
};

const COMMON_LABELS: Record<string, string> = {
  COMMON_APTITUDE: "Aptitude (all roles)",
  COMMON_PROBLEM_SOLVING: "Problem solving (all roles)",
};

function cell(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function yes(value: string) {
  const text = value.toLowerCase();
  return text === "yes" || text === "y" || text === "true" || text === "1";
}

function sheetRows(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const rows: { sheet: string; line: number; row: Record<string, unknown> }[] = [];
  for (const name of workbook.SheetNames) {
    const sheetRowsList = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[name], {
      defval: "",
      raw: false,
    });
    const isQuestionSheet = sheetRowsList.some(
      (row) => "Question" in row || "Prompt" in row || "Item_ID" in row,
    );
    if (!isQuestionSheet) continue;
    sheetRowsList.forEach((row, index) => rows.push({ sheet: name, line: index + 2, row }));
  }
  return rows;
}

export function questionTemplateBuffer() {
  const rows = [
    {
      Item_ID: "Q-001",
      Role_Code: "TR-NEW-1",
      Role_Name: "Example Role",
      Level: "Fresher / Junior",
      Module: "ROLE",
      Response_Type: "MCQ",
      Title: "Sample question",
      Question: "Which option is correct?",
      Options: "A. Yes\nB. No",
      Answer_Key: "A",
      Competency: "Accuracy",
      Difficulty: "2",
      Time_Min: "2",
      AI_Allowed: "No",
      Search_Allowed: "No",
      Status: "Active",
    },
    {
      Item_ID: "Q-002",
      Role_Code: "TR-NEW-1",
      Role_Name: "Example Role",
      Level: "Fresher / Junior",
      Module: "ROLE",
      Response_Type: "SHORT",
      Title: "Sample written task",
      Question: "Describe the check you would do first.",
      Options: "",
      Answer_Key: "Names the first check and why.",
      Competency: "Problem solving",
      Difficulty: "3",
      Time_Min: "6",
      AI_Allowed: "Yes",
      Search_Allowed: "No",
      Status: "Active",
    },
    {
      Item_ID: "Q-003",
      Role_Code: "TR-NEW-1",
      Role_Name: "Example Role",
      Level: "Fresher / Junior",
      Module: "ROLE",
      Response_Type: "MULTI_SELECT",
      Title: "Sample multi-select",
      Question: "Which checks would you run?",
      Options: "A. Count check\nB. Source check\nC. Delete the file",
      Answer_Key: "A,B",
      Competency: "Accuracy",
      Difficulty: "2",
      Time_Min: "3",
      AI_Allowed: "No",
      Search_Allowed: "No",
      Status: "Active",
    },
    {
      Item_ID: "Q-004",
      Role_Code: "TR-NEW-1",
      Role_Name: "Example Role",
      Level: "Fresher / Junior",
      Module: "ROLE",
      Response_Type: "CLASSIFICATION",
      Title: "Sample classification",
      Question: "Classify each item.",
      Options: "Categories: CLEAR, UNCLEAR\nA. Bottle, 750 ml\nB. Bottle",
      Answer_Key: "A:CLEAR;B:UNCLEAR",
      Competency: "Judgement",
      Difficulty: "2",
      Time_Min: "4",
      AI_Allowed: "No",
      Search_Allowed: "No",
      Status: "Active",
    },
    {
      Item_ID: "APT-EXAMPLE-1",
      Role_Code: "COMMON",
      Role_Name: "All roles",
      Level: "All",
      Module: "COMMON_APTITUDE",
      Response_Type: "MCQ",
      Title: "Sample aptitude question",
      Question: "A team completes 18 records an hour for 5 hours. How many records?",
      Options: "A. 80\nB. 90\nC. 95\nD. 100",
      Answer_Key: "B",
      Competency: "Numerical reasoning",
      Difficulty: "2",
      Time_Min: "1",
      AI_Allowed: "No",
      Search_Allowed: "No",
      Status: "Active",
    },
    {
      Item_ID: "PS-EXAMPLE-1",
      Role_Code: "COMMON",
      Role_Name: "All roles",
      Level: "All",
      Module: "COMMON_PROBLEM_SOLVING",
      Response_Type: "SHORT",
      Title: "Sample problem-solving scenario",
      Question: "A weekly report shows a number that does not match the source. List the facts, what you do not know, and your first check.",
      Options: "",
      Answer_Key: "Separates facts from assumptions; checks the source before changing anything.",
      Competency: "Problem solving",
      Difficulty: "3",
      Time_Min: "4",
      AI_Allowed: "No",
      Search_Allowed: "No",
      Status: "Active",
    },
  ];
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = rows[0]
    ? Object.keys(rows[0]).map((key) => ({ wch: Math.max(key.length + 2, 18) }))
    : [];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Questions");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export async function importQuestionSheet(
  prisma: PrismaClient,
  buffer: Buffer,
  mode: ImportMode = "add",
): Promise<QuestionSheetResult> {
  const rows = sheetRows(buffer);
  const result: QuestionSheetResult = {
    roles: 0,
    created: 0,
    updated: 0,
    retired: 0,
    replaceSkipped: false,
    sections: [],
    errors: [],
  };
  if (rows.length === 0) {
    result.errors.push("The file has no question rows.");
    return result;
  }

  const tracks = new Map<string, string>();
  const trackNames = new Map<string, string>();
  const sections = new Map<string, { module: string; trackId: string | null; sourceIds: string[] }>();
  let seenRole = 0;

  for (const { sheet, line: sheetLine, row } of rows) {
    const line = `${sheet} row ${sheetLine}`;
    const moduleName = cell(row, "Module") || "ROLE";
    const roleCode = cell(row, "Role_Code", "Track_ID") || (moduleName === "ROLE" ? "" : "COMMON");
    const roleName = cell(row, "Role_Name", "Role");
    const level = cell(row, "Level");
    const title = cell(row, "Title");
    const prompt = cell(row, "Question", "Prompt");
    if (!roleCode || !title || !prompt) {
      result.errors.push(`${line}: Role_Code, Title, and Question are required.`);
      continue;
    }
    if (!MODULES.has(moduleName)) {
      result.errors.push(`${line}: Module must be ROLE, COMMON_APTITUDE, or COMMON_PROBLEM_SOLVING.`);
      continue;
    }

    let trackId = moduleName === "ROLE" ? (tracks.get(roleCode) ?? null) : null;
    if (moduleName === "ROLE" && !trackId) {
      const existing = await prisma.assessmentTrack.findUnique({ where: { code: roleCode } });
      if (existing) {
        trackId = existing.id;
        if (roleName || level) {
          await prisma.assessmentTrack.update({
            where: { id: existing.id },
            data: {
              roleName: roleName || existing.roleName,
              level: level || existing.level,
              status: "ACTIVE",
            },
          });
        }
      } else if (roleName && level) {
        const created = await prisma.assessmentTrack.create({
          data: { code: roleCode, roleName, level, status: "ACTIVE" },
        });
        trackId = created.id;
        seenRole += 1;
      } else {
        result.errors.push(`${line}: unknown role ${roleCode}. Add Role_Name and Level on that row.`);
        continue;
      }
      tracks.set(roleCode, trackId);
      const track = await prisma.assessmentTrack.findUnique({ where: { id: trackId } });
      trackNames.set(trackId, track ? `${track.roleName} — ${track.level}` : roleCode);
    }

    const requestedType =
      RESPONSE_ALIASES[cell(row, "Response_Type")] ??
      (cell(row, "Response_Type") || "MCQ");
    const optionsRaw = cell(row, "Options");
    const choices = parseChoices(optionsRaw);
    const responseType = RESPONSE_TYPES.has(requestedType)
      ? choices.length >= 2 && requestedType === "SHORT"
        ? "MCQ"
        : requestedType
      : choices.length >= 2
        ? "MCQ"
        : "SHORT";
    const sourceId = cell(row, "Item_ID") || `${roleCode}-${sheet}-${sheetLine}`;
    const sectionKey = moduleName === "ROLE" ? `ROLE:${trackId}` : moduleName;
    const section = sections.get(sectionKey) ?? { module: moduleName, trackId, sourceIds: [] };
    section.sourceIds.push(sourceId);
    sections.set(sectionKey, section);
    const data = {
      module: moduleName,
      trackId: moduleName === "ROLE" ? trackId : null,
      responseType,
      title,
      prompt,
      optionsJson: optionsJsonFor(responseType, optionsRaw, choices),
      answerKey: cell(row, "Answer_Key"),
      competency: cell(row, "Competency"),
      difficulty: cell(row, "Difficulty"),
      timeLimitMin: Number(cell(row, "Time_Min")) || (responseType === "PRACTICAL" ? 8 : 2),
      aiAllowed: moduleName === "ROLE" ? yes(cell(row, "AI_Allowed")) : false,
      searchAllowed: moduleName === "ROLE" ? yes(cell(row, "Search_Allowed")) : false,
      status: cell(row, "Status").toLowerCase() === "retired" ? "RETIRED" : "APPROVED",
      bank: "UPLOAD",
    };
    const current = await prisma.bankItem.findUnique({ where: { sourceId } });
    if (current) {
      await prisma.bankItem.update({ where: { sourceId }, data });
      result.updated += 1;
    } else {
      await prisma.bankItem.create({ data: { sourceId, ...data } });
      result.created += 1;
    }
  }

  result.sections = [...sections.values()].map((section) =>
    section.module === "ROLE"
      ? (trackNames.get(section.trackId ?? "") ?? "Role")
      : (COMMON_LABELS[section.module] ?? section.module),
  );

  if (mode === "replace") {
    if (result.errors.length > 0) {
      result.replaceSkipped = true;
    } else {
      for (const section of sections.values()) {
        const retired = await prisma.bankItem.updateMany({
          where: {
            module: section.module,
            ...(section.module === "ROLE" ? { trackId: section.trackId } : {}),
            sourceId: { notIn: section.sourceIds },
            status: "APPROVED",
          },
          data: { status: "RETIRED" },
        });
        result.retired += retired.count;
      }
    }
  }

  result.roles = seenRole;
  return result;
}

export function optionsJsonFor(
  responseType: string,
  raw: string,
  choices: ReturnType<typeof parseChoices>,
) {
  if (responseType === "CLASSIFICATION") {
    const categoriesMatch = raw.match(/Categories?\s*:\s*(.+)/i);
    const categories = categoriesMatch
      ? categoriesMatch[1]
          .split(/[|,]/)
          .map((part) => part.trim())
          .filter(Boolean)
      : ["CLEAR", "UNCLEAR"];
    return JSON.stringify({ items: choices, categories });
  }
  if (responseType === "MATCHING") {
    const leftBlock = raw.match(/Left\s*:\s*([\s\S]*?)(?:Right\s*:|$)/i)?.[1] ?? "";
    const rightBlock = raw.match(/Right\s*:\s*([\s\S]*)$/i)?.[1] ?? "";
    const left = parseChoices(leftBlock);
    const right = parseChoices(rightBlock);
    if (left.length > 0 && right.length > 0) {
      return JSON.stringify({ left, right });
    }
    const midpoint = Math.ceil(choices.length / 2);
    return JSON.stringify({
      left: choices.slice(0, midpoint),
      right: choices.slice(midpoint),
    });
  }
  return JSON.stringify(choices);
}

export function optionsText(optionsJson: string) {
  try {
    const parsed = JSON.parse(optionsJson) as
      | { id?: string; label?: string }[]
      | { items?: { id: string; label: string }[]; categories?: string[] }
      | { left?: { id: string; label: string }[]; right?: { id: string; label: string }[] };
    if (Array.isArray(parsed)) {
      return parsed
        .filter((choice) => choice.id && choice.label)
        .map((choice) => `${choice.id}. ${choice.label}`)
        .join("\n");
    }
    if ("categories" in parsed) {
      const items = (parsed.items ?? [])
        .map((choice) => `${choice.id}. ${choice.label}`)
        .join("\n");
      return `Categories: ${(parsed.categories ?? []).join(", ")}\n${items}`.trim();
    }
    if ("left" in parsed || "right" in parsed) {
      const left = (parsed.left ?? [])
        .map((choice) => `${choice.id}. ${choice.label}`)
        .join("\n");
      const right = (parsed.right ?? [])
        .map((choice) => `${choice.id}. ${choice.label}`)
        .join("\n");
      return `Left:\n${left}\nRight:\n${right}`.trim();
    }
    return "";
  } catch {
    return "";
  }
}

type BankRow = Awaited<ReturnType<PrismaClient["bankItem"]["findMany"]>>[number];

const COMMON_TRACK = { code: "COMMON", roleName: "All roles", level: "All" };

export async function roleQuestionsBuffer(prisma: PrismaClient, roleCode: string) {
  if (roleCode === "ALL") return libraryBuffer(prisma);
  if (roleCode === "COMMON") {
    const items = await prisma.bankItem.findMany({
      where: { module: { in: ["COMMON_APTITUDE", "COMMON_PROBLEM_SOLVING"] } },
      orderBy: [{ module: "asc" }, { sourceId: "asc" }],
    });
    return questionsWorkbook([{ name: "COMMON", rows: questionRows(items, COMMON_TRACK) }]);
  }
  const track = await prisma.assessmentTrack.findUnique({
    where: { code: roleCode },
    include: { items: { orderBy: { sourceId: "asc" } } },
  });
  if (!track) return null;
  return questionsWorkbook([{ name: "Questions", rows: questionRows(track.items, track) }]);
}

async function libraryBuffer(prisma: PrismaClient) {
  const [common, tracks] = await Promise.all([
    prisma.bankItem.findMany({
      where: { module: { in: ["COMMON_APTITUDE", "COMMON_PROBLEM_SOLVING"] }, status: "APPROVED" },
      orderBy: [{ module: "asc" }, { sourceId: "asc" }],
    }),
    prisma.assessmentTrack.findMany({
      where: { status: "ACTIVE" },
      orderBy: { code: "asc" },
      include: { items: { where: { status: "APPROVED" }, orderBy: { sourceId: "asc" } } },
    }),
  ]);
  return questionsWorkbook([
    { name: "COMMON", rows: questionRows(common, COMMON_TRACK) },
    ...tracks.map((track) => ({
      name: track.code.replace(/[\\/?*[\]:]/g, "-").slice(0, 31),
      rows: questionRows(track.items, track),
    })),
  ]);
}

function questionsWorkbook(sheets: { name: string; rows: ReturnType<typeof questionRows> }[]) {
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sheet.rows), sheet.name);
  }
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function questionRows(items: BankRow[], track: { code: string; roleName: string; level: string }) {
  return items.map((item) => ({
    Item_ID: item.sourceId,
    Role_Code: track.code,
    Role_Name: track.roleName,
    Level: track.level,
    Module: item.module,
    Response_Type: item.responseType,
    Title: item.title,
    Question: item.prompt,
    Options: optionsText(item.optionsJson),
    Answer_Key: item.answerKey,
    Competency: item.competency,
    Difficulty: item.difficulty,
    Time_Min: item.timeLimitMin ?? "",
    AI_Allowed: item.aiAllowed ? "Yes" : "No",
    Search_Allowed: item.searchAllowed ? "Yes" : "No",
    Status: item.status === "RETIRED" ? "Retired" : "Active",
  }));
}
