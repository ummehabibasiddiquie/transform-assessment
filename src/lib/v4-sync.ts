import type { PrismaClient } from "@prisma/client";
import { parseChoices } from "./question-shape";

type Row = Record<string, string>;

function field(row: Row, ...keys: string[]) {
  for (const key of keys) {
    if (row[key]) return row[key];
  }
  return "";
}

function bucketsForRole(role: string) {
  const name = role.toLowerCase();
  if (name.includes("recruit")) return ["TR-REC-F", "TR-REC-13"];
  if (name.includes("it")) return ["TR-IT-13", "TR-IT-M"];
  if (name === "operations executive" || name.startsWith("operations executive")) {
    return ["TR-OE-13"];
  }
  if (name.includes("project") || name.includes("quality")) {
    return ["TR-PROJ-13", "TR-OPS-13", "TR-QUAL-13", "TR-PM-M", "TR-OM-M", "TR-QM-M"];
  }
  return [];
}

function targetDifficulty(level: string) {
  const text = level.toLowerCase();
  if (text.includes("manager")) return 4;
  if (text.includes("fresher") || text.includes("jr")) return 2;
  return 3;
}

export async function syncV4Bank(
  prisma: PrismaClient,
  sheets: {
    tracks: Row[];
    objective: Row[];
    problemSolving: Row[];
    technical: Row[];
    simulations: Row[];
    sjt: Row[];
  },
) {
  if (sheets.tracks.length === 0) return { tracks: 0, items: 0 };

  await prisma.bankItem.deleteMany();
  await prisma.assessmentTrack.deleteMany();

  const trackIds = new Map<string, string>();
  for (const row of sheets.tracks) {
    const code = field(row, "Track_ID");
    if (!code) continue;
    const track = await prisma.assessmentTrack.create({
      data: {
        code,
        roleName: field(row, "Specific_Role_Track", "Parent_Profile"),
        level: field(row, "Level"),
        experienceBand: field(row, "Experience_Band"),
        parentProfile: field(row, "Parent_Profile"),
        competencies: field(row, "Core_Competencies"),
        assessmentTypes: field(row, "Primary_Assessment_Types"),
        aiPolicy: field(row, "AI_Policy"),
        criticalGates: field(row, "Critical_Gates"),
        status: "ACTIVE",
      },
    });
    trackIds.set(code, track.id);
  }

  const levelByCode = new Map(sheets.tracks.map((row) => [field(row, "Track_ID"), field(row, "Level")]));

  async function addItem(input: {
    sourceId: string;
    module: string;
    trackCode?: string;
    responseType: string;
    title: string;
    prompt: string;
    optionsJson?: string;
    answerKey?: string;
    rubric?: string;
    evidence?: string;
    competency?: string;
    difficulty?: string;
    timeLimitMin?: number;
    aiAllowed?: boolean;
    searchAllowed?: boolean;
    equivalentGroup?: string;
    isGate?: boolean;
    bank: string;
  }) {
    if (!input.sourceId || !input.prompt) return;
    const trackId = input.trackCode ? trackIds.get(input.trackCode) : null;
    if (input.trackCode && !trackId) return;
    await prisma.bankItem.create({
      data: {
        sourceId: input.sourceId,
        module: input.module,
        trackId,
        responseType: input.responseType,
        title: input.title || input.sourceId,
        prompt: input.prompt,
        optionsJson: input.optionsJson ?? "[]",
        answerKey: input.answerKey ?? "",
        rubric: input.rubric ?? "",
        evidence: input.evidence ?? "",
        competency: input.competency ?? "",
        difficulty: input.difficulty ?? "",
        timeLimitMin: input.timeLimitMin,
        aiAllowed: input.aiAllowed ?? false,
        searchAllowed: input.searchAllowed ?? false,
        equivalentGroup: input.equivalentGroup ?? "",
        isGate: input.isGate ?? false,
        status: "APPROVED",
        bank: input.bank,
      },
    });
  }

  const aptitude = sheets.objective.filter((row) => {
    const type = field(row, "Assessment_Type");
    return type === "Aptitude" || type === "Logical/Data Reasoning" || type === "Cognitive Reasoning";
  });
  for (const row of aptitude) {
    const choices = parseChoices(field(row, "Options"));
    await addItem({
      sourceId: field(row, "Item_ID"),
      module: "COMMON_APTITUDE",
      responseType: choices.length >= 2 ? "MCQ" : "SHORT",
      title: field(row, "Construct", "Family") || "Aptitude",
      prompt: field(row, "Question"),
      optionsJson: JSON.stringify(choices),
      answerKey: field(row, "Correct_Key"),
      rubric: field(row, "Explanation"),
      competency: field(row, "Construct"),
      difficulty: field(row, "Difficulty"),
      timeLimitMin: 1,
      aiAllowed: false,
      searchAllowed: false,
      bank: "OBJECTIVE",
    });
  }

  for (const row of sheets.problemSolving) {
    await addItem({
      sourceId: field(row, "Item_ID"),
      module: "COMMON_PROBLEM_SOLVING",
      responseType: "SHORT",
      title: field(row, "Family") || "Problem solving",
      prompt: [field(row, "Scenario"), field(row, "Response_Schema")].filter(Boolean).join("\n\n"),
      answerKey: field(row, "Answer_Key"),
      rubric: field(row, "Strong_Evidence"),
      evidence: field(row, "Weak_Evidence"),
      competency: field(row, "Competency"),
      difficulty: field(row, "Difficulty"),
      timeLimitMin: 2,
      aiAllowed: false,
      searchAllowed: false,
      bank: "PROBLEM_SOLVING",
    });
  }

  for (const row of sheets.simulations) {
    const sourceId = field(row, "Variant_ID");
    if (!sourceId.startsWith("OE-FR-")) continue;
    await addItem({
      sourceId,
      module: "ROLE",
      trackCode: "TR-OE-F",
      responseType: "PRACTICAL",
      title: field(row, "Theme", "Family"),
      prompt: field(row, "Candidate_Content"),
      answerKey: field(row, "Evaluator_Key"),
      rubric: field(row, "Evidence_Key"),
      difficulty: field(row, "Difficulty"),
      timeLimitMin: 8,
      aiAllowed: false,
      searchAllowed: false,
      equivalentGroup: field(row, "Equivalent_Group"),
      isGate: sourceId === "OE-FR-C01" || sourceId === "OE-FR-C05",
      bank: "WORK_SIMULATION",
    });
  }

  const counters = new Map<string, number>();
  for (const row of sheets.technical) {
    const codes = bucketsForRole(field(row, "Role"));
    if (codes.length === 0) continue;
    const key = codes.join("|");
    const index = counters.get(key) ?? 0;
    counters.set(key, index + 1);
    const trackCode = codes[index % codes.length];
    await addItem({
      sourceId: field(row, "Item_ID"),
      module: "ROLE",
      trackCode,
      responseType: "SHORT",
      title: field(row, "Skill_Area") || "Role task",
      prompt: field(row, "Task"),
      answerKey: field(row, "Answer_Key"),
      competency: field(row, "Competency"),
      difficulty: field(row, "Difficulty") || String(targetDifficulty(levelByCode.get(trackCode) ?? "")),
      timeLimitMin: 6,
      aiAllowed: false,
      searchAllowed: false,
      bank: "TECHNICAL",
    });
  }

  const roleTracks = [...trackIds.keys()].filter((code) => code !== "TR-OE-F");
  for (let index = 0; index < sheets.sjt.length; index += 1) {
    const row = sheets.sjt[index];
    const trackCode = roleTracks[index % Math.max(roleTracks.length, 1)];
    if (!trackCode) continue;
    const choices = parseChoices(field(row, "Options"));
    await addItem({
      sourceId: field(row, "Item_ID"),
      module: "ROLE",
      trackCode,
      responseType: choices.length >= 2 ? "MCQ" : "SHORT",
      title: field(row, "Family") || "Situational judgment",
      prompt: field(row, "Scenario"),
      optionsJson: JSON.stringify(choices),
      answerKey: field(row, "Best_Key"),
      rubric: field(row, "Scoring_Rule"),
      competency: field(row, "Competency"),
      difficulty: field(row, "Difficulty"),
      timeLimitMin: 2,
      aiAllowed: false,
      searchAllowed: false,
      bank: "SJT",
    });
  }

  return {
    tracks: await prisma.assessmentTrack.count(),
    items: await prisma.bankItem.count(),
  };
}
