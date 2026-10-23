import type { PrismaClient } from "@prisma/client";
import { parseJson } from "./json";
import type { Recommendation } from "./scoring";

export type Band = { min: number; recommendation: Recommendation; definition: string };

export type RoleBands = { bands: Band[]; scope: string; general: boolean };

const DEFAULT_BANDS: Band[] = [
  { min: 85, recommendation: "STRONG_HIRE", definition: "" },
  { min: 72, recommendation: "HIRE", definition: "" },
  { min: 60, recommendation: "HOLD", definition: "" },
  { min: 0, recommendation: "NO_HIRE", definition: "" },
];

function toRecommendation(label: string): Recommendation | null {
  const text = label.toLowerCase().trim();
  if (text.startsWith("strong hire")) return "STRONG_HIRE";
  if (text.startsWith("no hire")) return "NO_HIRE";
  if (text.startsWith("hire")) return "HIRE";
  if (text.startsWith("hold")) return "HOLD";
  return null;
}

function parseLevel(level: string) {
  const range = level.match(/^\s*(\d+)\s*[–—-]\s*\d+\s+(.+)$/);
  if (range) return { min: Number(range[1]), label: range[2] };
  const below = level.match(/^\s*<\s*\d+\s+(.+)$/);
  if (below) return { min: 0, label: below[1] };
  return null;
}

export async function bandsForRole(prisma: PrismaClient, roleLabel: string): Promise<RoleBands> {
  const rows = await prisma.libraryConfig.findMany({ where: { kind: "SCORING_KEY" } });
  const byScope = new Map<string, Band[]>();
  for (const row of rows) {
    const payload = parseJson<Record<string, string>>(row.payloadJson, {});
    const level = parseLevel(payload.Level ?? "");
    const recommendation = level ? toRecommendation(level.label) : null;
    if (!level || !recommendation) continue;
    const scope = payload.Scope ?? "";
    const list = byScope.get(scope) ?? [];
    list.push({ min: level.min, recommendation, definition: payload.Definition ?? "" });
    byScope.set(scope, list);
  }

  const label = roleLabel.toLowerCase();
  const scopes = [...byScope.keys()];
  const own = scopes.find((scope) => scope && label.startsWith(scope.toLowerCase()));
  const chosen = own ?? scopes[0];
  if (!chosen) return { bands: DEFAULT_BANDS, scope: "", general: true };
  const bands = [...(byScope.get(chosen) ?? [])].sort((a, b) => b.min - a.min);
  return { bands, scope: chosen, general: !own };
}

export function bandFor(score: number, bands: Band[]) {
  return bands.find((band) => score >= band.min) ?? bands[bands.length - 1];
}
