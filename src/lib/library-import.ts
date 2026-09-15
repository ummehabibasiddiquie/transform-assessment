import type { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import { LIBRARY_VERSION, type ContentBank } from "./library";

type Row = Record<string, string>;

export type ImportSummary = {
  libraryVersion: string;
  fileName: string;
  counts: Record<string, number>;
  errors: string[];
};

const REQUIRED_SHEETS = [
  "01_Role_Library",
  "02_Competency_Library",
  "03_Assessment_Types",
  "04_Objective_Questions",
  "05_SJT",
  "06_Problem_Solving",
  "07_Research_Verification",
  "08_Communication",
  "09_Behavioural",
  "10_Work_Simulation",
  "11_Technical_Skills",
  "12_Live_Validation",
  "13_Role_Blueprints",
] as const;

function cell(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

function sheetRows(workbook: XLSX.WorkBook, name: string): Row[] {
  const sheet = workbook.Sheets[name];
  if (!sheet) return [];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  return raw.map((row) => {
    const next: Row = {};
    for (const [key, value] of Object.entries(row)) {
      next[key.trim()] = cell(value);
    }
    return next;
  });
}

function first(row: Row, ...keys: string[]) {
  for (const key of keys) {
    if (row[key]) return row[key];
  }
  return "";
}

function payload(row: Row) {
  return JSON.stringify(row);
}

async function replaceContent(
  prisma: PrismaClient,
  bank: ContentBank,
  rows: Array<{
    sourceId: string;
    family: string;
    title: string;
    candidateText: string;
    evaluatorKey: string;
    evidenceKey: string;
    competency: string;
    difficulty: string;
    aiPolicy: string;
    responseType: string;
    equivalentGroup: string;
    status: string;
    payloadJson: string;
  }>,
  errors: string[],
  sheet: string,
) {
  let created = 0;
  for (const row of rows) {
    if (!row.sourceId) {
      errors.push(`${sheet}: skipped a row with no ID.`);
      continue;
    }
    await prisma.libraryContentItem.upsert({
      where: { bank_sourceId: { bank, sourceId: row.sourceId } },
      update: { ...row, bank },
      create: { ...row, bank },
    });
    created += 1;
  }
  return created;
}

export async function importContentLibrary(
  prisma: PrismaClient,
  buffer: Buffer,
  meta: { fileName: string; importedById?: string },
): Promise<ImportSummary> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const errors: string[] = [];
  const counts: Record<string, number> = {};

  for (const name of REQUIRED_SHEETS) {
    if (!workbook.SheetNames.includes(name)) {
      errors.push(`Missing required sheet: ${name}`);
    }
  }

  await prisma.$transaction([
    prisma.libraryBlueprint.deleteMany(),
    prisma.libraryContentItem.deleteMany(),
    prisma.libraryAssessmentType.deleteMany(),
    prisma.libraryCompetency.deleteMany(),
    prisma.libraryRole.deleteMany(),
    prisma.libraryConfig.deleteMany(),
  ]);

  const roles = sheetRows(workbook, "01_Role_Library");
  for (const row of roles) {
    const sourceId = first(row, "Role_ID");
    if (!sourceId) {
      errors.push("01_Role_Library: skipped a row with no Role_ID.");
      continue;
    }
    await prisma.libraryRole.upsert({
      where: { sourceId },
      update: {
        name: first(row, "Role"),
        level: first(row, "Level"),
        experienceBand: first(row, "Experience_Band"),
        coreCapabilities: first(row, "Core_Capabilities"),
        profile: first(row, "Role_Profile"),
      },
      create: {
        sourceId,
        name: first(row, "Role"),
        level: first(row, "Level"),
        experienceBand: first(row, "Experience_Band"),
        coreCapabilities: first(row, "Core_Capabilities"),
        profile: first(row, "Role_Profile"),
      },
    });
  }
  counts.roles = await prisma.libraryRole.count();

  const competencies = sheetRows(workbook, "02_Competency_Library");
  for (const row of competencies) {
    const sourceId = first(row, "Competency_ID");
    if (!sourceId) {
      errors.push("02_Competency_Library: skipped a row with no Competency_ID.");
      continue;
    }
    await prisma.libraryCompetency.upsert({
      where: { sourceId },
      update: {
        name: first(row, "Competency"),
        definition: first(row, "Definition"),
        evidence: first(row, "Observable_Evidence"),
        levelUse: first(row, "Level_Use"),
      },
      create: {
        sourceId,
        name: first(row, "Competency"),
        definition: first(row, "Definition"),
        evidence: first(row, "Observable_Evidence"),
        levelUse: first(row, "Level_Use"),
      },
    });
  }
  counts.competencies = await prisma.libraryCompetency.count();

  const types = sheetRows(workbook, "03_Assessment_Types");
  for (const row of types) {
    const sourceId = first(row, "Type_ID");
    if (!sourceId) {
      errors.push("03_Assessment_Types: skipped a row with no Type_ID.");
      continue;
    }
    await prisma.libraryAssessmentType.upsert({
      where: { sourceId },
      update: {
        name: first(row, "Assessment_Type"),
        purpose: first(row, "Purpose"),
        use: first(row, "Use"),
        aiDefault: first(row, "AI_Default"),
      },
      create: {
        sourceId,
        name: first(row, "Assessment_Type"),
        purpose: first(row, "Purpose"),
        use: first(row, "Use"),
        aiDefault: first(row, "AI_Default"),
      },
    });
  }
  counts.assessmentTypes = await prisma.libraryAssessmentType.count();

  counts.OBJECTIVE = await replaceContent(
    prisma,
    "OBJECTIVE",
    sheetRows(workbook, "04_Objective_Questions").map((row) => ({
      sourceId: first(row, "Item_ID"),
      family: first(row, "Family", "Assessment_Type"),
      title: first(row, "Family", "Construct"),
      candidateText: first(row, "Question"),
      evaluatorKey: [first(row, "Correct_Key"), first(row, "Explanation")]
        .filter(Boolean)
        .join("\n\n"),
      evidenceKey: first(row, "Construct"),
      competency: first(row, "Construct"),
      difficulty: first(row, "Difficulty"),
      aiPolicy: first(row, "AI_Policy"),
      responseType: first(row, "Assessment_Type"),
      equivalentGroup: "",
      status: "ACTIVE",
      payloadJson: payload(row),
    })),
    errors,
    "04_Objective_Questions",
  );

  counts.SJT = await replaceContent(
    prisma,
    "SJT",
    sheetRows(workbook, "05_SJT").map((row) => ({
      sourceId: first(row, "Item_ID"),
      family: first(row, "Family"),
      title: first(row, "Family", "Competency"),
      candidateText: first(row, "Scenario"),
      evaluatorKey: [first(row, "Best_Key"), first(row, "Scoring_Rule")]
        .filter(Boolean)
        .join("\n\n"),
      evidenceKey: first(row, "Construct"),
      competency: first(row, "Competency"),
      difficulty: first(row, "Difficulty"),
      aiPolicy: first(row, "AI_Policy"),
      responseType: "SJT",
      equivalentGroup: "",
      status: "ACTIVE",
      payloadJson: payload(row),
    })),
    errors,
    "05_SJT",
  );

  counts.PROBLEM_SOLVING = await replaceContent(
    prisma,
    "PROBLEM_SOLVING",
    sheetRows(workbook, "06_Problem_Solving").map((row) => ({
      sourceId: first(row, "Item_ID"),
      family: first(row, "Family"),
      title: first(row, "Family", "Competency"),
      candidateText: first(row, "Scenario"),
      evaluatorKey: first(row, "Answer_Key"),
      evidenceKey: [first(row, "Strong_Evidence"), first(row, "Weak_Evidence")]
        .filter(Boolean)
        .join("\n\n"),
      competency: first(row, "Competency"),
      difficulty: first(row, "Difficulty"),
      aiPolicy: first(row, "AI_Policy"),
      responseType: first(row, "Response_Schema"),
      equivalentGroup: "",
      status: "ACTIVE",
      payloadJson: payload(row),
    })),
    errors,
    "06_Problem_Solving",
  );

  counts.RESEARCH = await replaceContent(
    prisma,
    "RESEARCH",
    sheetRows(workbook, "07_Research_Verification").map((row) => ({
      sourceId: first(row, "Item_ID"),
      family: first(row, "Family"),
      title: first(row, "Family"),
      candidateText: first(row, "Task"),
      evaluatorKey: first(row, "Answer_Key"),
      evidenceKey: [first(row, "Strong_Evidence"), first(row, "Weak_Evidence")]
        .filter(Boolean)
        .join("\n\n"),
      competency: first(row, "Competency"),
      difficulty: first(row, "Difficulty"),
      aiPolicy: first(row, "AI_Policy"),
      responseType: first(row, "Submission_Requirements"),
      equivalentGroup: "",
      status: "ACTIVE",
      payloadJson: payload(row),
    })),
    errors,
    "07_Research_Verification",
  );

  counts.COMMUNICATION = await replaceContent(
    prisma,
    "COMMUNICATION",
    sheetRows(workbook, "08_Communication").map((row) => ({
      sourceId: first(row, "Item_ID"),
      family: first(row, "Family"),
      title: first(row, "Family"),
      candidateText: [first(row, "Scenario"), first(row, "Candidate_Task")]
        .filter(Boolean)
        .join("\n\n"),
      evaluatorKey: first(row, "Strong_Rubric"),
      evidenceKey: first(row, "Weak_Evidence"),
      competency: first(row, "Competency"),
      difficulty: first(row, "Difficulty"),
      aiPolicy: first(row, "AI_Policy"),
      responseType: "",
      equivalentGroup: "",
      status: "ACTIVE",
      payloadJson: payload(row),
    })),
    errors,
    "08_Communication",
  );

  counts.BEHAVIOURAL = await replaceContent(
    prisma,
    "BEHAVIOURAL",
    sheetRows(workbook, "09_Behavioural").map((row) => ({
      sourceId: first(row, "Item_ID"),
      family: first(row, "Family"),
      title: first(row, "Family", "Construct"),
      candidateText: first(row, "Question"),
      evaluatorKey: first(row, "Rule"),
      evidenceKey: first(row, "Use"),
      competency: first(row, "Construct"),
      difficulty: first(row, "Difficulty"),
      aiPolicy: first(row, "AI_Policy"),
      responseType: first(row, "Response_Format"),
      equivalentGroup: "",
      status: "ACTIVE",
      payloadJson: payload(row),
    })),
    errors,
    "09_Behavioural",
  );

  counts.WORK_SIMULATION = await replaceContent(
    prisma,
    "WORK_SIMULATION",
    sheetRows(workbook, "10_Work_Simulation").map((row) => ({
      sourceId: first(row, "Variant_ID"),
      family: first(row, "Family"),
      title: first(row, "Theme", "Family"),
      candidateText: first(row, "Candidate_Content"),
      evaluatorKey: first(row, "Evaluator_Key"),
      evidenceKey: first(row, "Evidence_Key"),
      competency: "",
      difficulty: first(row, "Difficulty"),
      aiPolicy: first(row, "AI_Policy"),
      responseType: first(row, "Response_Type"),
      equivalentGroup: first(row, "Equivalent_Group"),
      status: first(row, "Status") || "ACTIVE",
      payloadJson: payload(row),
    })),
    errors,
    "10_Work_Simulation",
  );

  counts.TECHNICAL = await replaceContent(
    prisma,
    "TECHNICAL",
    sheetRows(workbook, "11_Technical_Skills").map((row) => ({
      sourceId: first(row, "Item_ID"),
      family: first(row, "Role", "Skill_Area"),
      title: first(row, "Skill_Area"),
      candidateText: first(row, "Task"),
      evaluatorKey: first(row, "Answer_Key"),
      evidenceKey: first(row, "Competency"),
      competency: first(row, "Competency"),
      difficulty: first(row, "Difficulty"),
      aiPolicy: first(row, "AI_Policy"),
      responseType: first(row, "Response_Type"),
      equivalentGroup: "",
      status: "ACTIVE",
      payloadJson: payload(row),
    })),
    errors,
    "11_Technical_Skills",
  );

  counts.LIVE_VALIDATION = await replaceContent(
    prisma,
    "LIVE_VALIDATION",
    sheetRows(workbook, "12_Live_Validation").map((row) => ({
      sourceId: first(row, "Probe_ID"),
      family: first(row, "Family"),
      title: first(row, "Family"),
      candidateText: first(row, "Question"),
      evaluatorKey: first(row, "Expected_Evidence"),
      evidenceKey: first(row, "Trigger"),
      competency: "",
      difficulty: "",
      aiPolicy: "",
      responseType: first(row, "Interviewer_Method"),
      equivalentGroup: "",
      status: "ACTIVE",
      payloadJson: payload(row),
    })),
    errors,
    "12_Live_Validation",
  );

  const blueprints = sheetRows(workbook, "13_Role_Blueprints");
  for (const row of blueprints) {
    const roleName = first(row, "Role");
    const level = first(row, "Level");
    const assessmentType = first(row, "Assessment_Type");
    if (!roleName || !assessmentType) {
      errors.push("13_Role_Blueprints: skipped a row missing Role or Assessment_Type.");
      continue;
    }
    await prisma.libraryBlueprint.upsert({
      where: { sourceId: `${roleName}|${level}|${assessmentType}` },
      update: {
        roleName,
        level,
        assessmentType,
        itemCount: first(row, "Item_Count"),
        weight: first(row, "Weight"),
        mandatory: first(row, "Mandatory"),
        aiPolicy: first(row, "AI_Policy"),
      },
      create: {
        sourceId: `${roleName}|${level}|${assessmentType}`,
        roleName,
        level,
        assessmentType,
        itemCount: first(row, "Item_Count"),
        weight: first(row, "Weight"),
        mandatory: first(row, "Mandatory"),
        aiPolicy: first(row, "AI_Policy"),
      },
    });
  }
  counts.blueprints = await prisma.libraryBlueprint.count();

  const configSheets: Array<[string, string, string[], string]> = [
    ["14_Scoring_Keys", "SCORING_KEY", ["Key_ID"], "Scope"],
    ["15_Evidence_Keys", "EVIDENCE_KEY", ["Competency_ID"], "Competency"],
    ["16_Variant_Groups", "VARIANT_GROUP", ["Group_ID"], "Family"],
    ["17_AI_Policies", "AI_POLICY", ["Policy_ID"], "Policy"],
    ["18_Critical_Gates", "CRITICAL_GATE", ["Gate_ID"], "Gate"],
    ["19_Adaptive_Rules", "ADAPTIVE_RULE", ["Rule_ID"], "Condition"],
    ["20_Calibration", "CALIBRATION", ["Metric_ID"], "Metric"],
  ];

  for (const [sheet, kind, idKeys, titleKey] of configSheets) {
    const rows = sheetRows(workbook, sheet);
    let created = 0;
    for (const row of rows) {
      const sourceId = first(row, ...idKeys);
      if (!sourceId) {
        errors.push(`${sheet}: skipped a row with no ID.`);
        continue;
      }
      await prisma.libraryConfig.upsert({
        where: { kind_sourceId: { kind, sourceId } },
        update: {
          title: first(row, titleKey),
          payloadJson: payload(row),
        },
        create: {
          kind,
          sourceId,
          title: first(row, titleKey),
          payloadJson: payload(row),
        },
      });
      created += 1;
    }
    counts[kind] = created;
  }

  const summary: ImportSummary = {
    libraryVersion: LIBRARY_VERSION,
    fileName: meta.fileName,
    counts,
    errors,
  };

  await prisma.libraryImport.create({
    data: {
      libraryVersion: LIBRARY_VERSION,
      fileName: meta.fileName,
      summaryJson: JSON.stringify(summary),
      importedById: meta.importedById ?? null,
    },
  });

  return summary;
}
