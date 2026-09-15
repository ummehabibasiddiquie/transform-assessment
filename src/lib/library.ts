export const LIBRARY_VERSION = "V2";

export const CONTENT_BANKS = [
  "OBJECTIVE",
  "SJT",
  "PROBLEM_SOLVING",
  "RESEARCH",
  "COMMUNICATION",
  "BEHAVIOURAL",
  "WORK_SIMULATION",
  "TECHNICAL",
  "LIVE_VALIDATION",
] as const;

export type ContentBank = (typeof CONTENT_BANKS)[number];

export const BANK_LABELS: Record<ContentBank, string> = {
  OBJECTIVE: "Objective questions",
  SJT: "Situational judgment",
  PROBLEM_SOLVING: "Problem solving",
  RESEARCH: "Research & verification",
  COMMUNICATION: "Communication",
  BEHAVIOURAL: "Behavioural",
  WORK_SIMULATION: "Work simulation",
  TECHNICAL: "Technical / skill",
  LIVE_VALIDATION: "Live validation",
};

export function bankLabel(bank: string) {
  return BANK_LABELS[bank as ContentBank] ?? bank;
}
