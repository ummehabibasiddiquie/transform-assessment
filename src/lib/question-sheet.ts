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

const MODULES = new Set(["ROLE", "COMMON_APTITUDE", "COMMON_PROBLEM_SOLVING"]);

export type QuestionSheetResult = {
  roles: number;
  created: number;
  updated: number;
  errors: string[];
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
  const name = workbook.SheetNames.includes("Questions")
    ? "Questions"
    : workbook.SheetNames[0];
  if (!name) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[name], {
    defval: "",
    raw: false,
  });
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
): Promise<QuestionSheetResult> {
  const rows = sheetRows(buffer);
  const result: QuestionSheetResult = { roles: 0, created: 0, updated: 0, errors: [] };
  if (rows.length === 0) {
    result.errors.push("The file has no question rows.");
    return result;
  }

  const tracks = new Map<string, string>();
  let seenRole = 0;

  for (const [index, row] of rows.entries()) {
    const line = index + 2;
    const roleCode = cell(row, "Role_Code", "Track_ID");
    const roleName = cell(row, "Role_Name", "Role");
    const level = cell(row, "Level");
    const moduleName = cell(row, "Module") || "ROLE";
    const title = cell(row, "Title");
    const prompt = cell(row, "Question", "Prompt");
    if (!roleCode || !title || !prompt) {
      result.errors.push(`Row ${line}: Role_Code, Title, and Question are required.`);
      continue;
    }
    if (!MODULES.has(moduleName)) {
      result.errors.push(`Row ${line}: Module must be ROLE, COMMON_APTITUDE, or COMMON_PROBLEM_SOLVING.`);
      continue;
    }

    let trackId = tracks.get(roleCode) ?? null;
    if (!trackId) {
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
      } else if (moduleName === "ROLE") {
        result.errors.push(`Row ${line}: unknown role ${roleCode}. Add Role_Name and Level on that row.`);
        continue;
      }
      if (trackId) tracks.set(roleCode, trackId);
    }

    const requestedType = cell(row, "Response_Type") || "MCQ";
    const optionsRaw = cell(row, "Options");
    const choices = parseChoices(optionsRaw);
    const responseType = RESPONSE_TYPES.has(requestedType)
      ? choices.length >= 2 && requestedType === "SHORT"
        ? "MCQ"
        : requestedType
      : choices.length >= 2
        ? "MCQ"
        : "SHORT";
    const sourceId = cell(row, "Item_ID") || `${roleCode}-${line}`;
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

  result.roles = seenRole;
  return result;
}

function optionsJsonFor(
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

function optionsText(optionsJson: string) {
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

export async function roleQuestionsBuffer(prisma: PrismaClient, roleCode: string) {
  const track = await prisma.assessmentTrack.findUnique({
    where: { code: roleCode },
    include: { items: { orderBy: { sourceId: "asc" } } },
  });
  if (!track) return null;
  const rows = track.items.map((item) => ({
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
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Questions");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
