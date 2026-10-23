import type { PrismaClient } from "@prisma/client";
import { parseJson } from "./json";

export type GateRule = { name: string; trigger: string; effect: string };

export const GATE_STATUSES = [
  { value: "PASS", label: "Pass" },
  { value: "CONCERN", label: "Concern" },
  { value: "FAIL", label: "Fail" },
] as const;

const GUIDE_WORDS: { title: string; words: string[] }[] = [
  { title: "Fabrication", words: ["fabricat"] },
  { title: "Data Integrity", words: ["data integrity"] },
  {
    title: "Security/Safety",
    words: ["security", "access control", "data protection", "change safety", "change control", "safety"],
  },
  { title: "Verification", words: ["verification", "evidence"] },
  { title: "Ownership", words: ["ownership"] },
  { title: "Communication", words: ["escalation", "disclosure", "communication"] },
];

function splitGates(text: string) {
  return text
    .split(/[;\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function guideTitle(name: string) {
  const text = name.toLowerCase();
  return GUIDE_WORDS.find((guide) => guide.words.some((word) => text.includes(word)))?.title;
}

function sentenceCase(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export async function gateRules(
  prisma: PrismaClient,
  criticalGates: string,
  assessmentName: string,
): Promise<GateRule[]> {
  let names = splitGates(criticalGates);
  if (names.length === 0) {
    const tracks = await prisma.assessmentTrack.findMany({
      select: { roleName: true, level: true, criticalGates: true },
    });
    const match = tracks.find((track) => `${track.roleName} — ${track.level}` === assessmentName);
    names = splitGates(match?.criticalGates ?? "");
  }

  const configs = await prisma.libraryConfig.findMany({ where: { kind: "CRITICAL_GATE" } });
  const guides = configs.map((row) => {
    const payload = parseJson<Record<string, string>>(row.payloadJson, {});
    return {
      title: row.title,
      trigger: payload.Trigger ?? "",
      effect: payload.Decision_Effect ?? "",
      applicability: payload.Applicability ?? "",
    };
  });

  if (names.length === 0) {
    names = guides
      .filter((guide) => guide.applicability.toLowerCase() === "all")
      .map((guide) => guide.title);
  }

  return names.map((name) => {
    const title = guideTitle(name);
    const guide = guides.find((item) => item.title === title);
    return {
      name: sentenceCase(name),
      trigger: guide?.trigger ?? "",
      effect: guide?.effect ?? "",
    };
  });
}
