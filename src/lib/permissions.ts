export const STAFF_ROLES = [
  "ADMIN",
  "DESIGNER",
  "EVALUATOR",
  "HIRING_MANAGER",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export type Permission =
  | "viewDashboard"
  | "manageStaff"
  | "editAssessment"
  | "invite"
  | "viewCandidates"
  | "score"
  | "interview"
  | "decide";

const ALLOWED: Record<Permission, StaffRole[]> = {
  viewDashboard: ["ADMIN"],
  manageStaff: ["ADMIN"],
  editAssessment: ["ADMIN", "DESIGNER"],
  invite: ["ADMIN", "DESIGNER", "HIRING_MANAGER"],
  viewCandidates: ["ADMIN", "DESIGNER", "EVALUATOR", "HIRING_MANAGER"],
  score: ["ADMIN", "EVALUATOR", "HIRING_MANAGER"],
  interview: ["ADMIN", "EVALUATOR", "HIRING_MANAGER"],
  decide: ["ADMIN", "HIRING_MANAGER"],
};

export function can(role: string, permission: Permission) {
  return (ALLOWED[permission] as string[]).includes(role);
}

export function homePath(role: string) {
  switch (role) {
    case "DESIGNER":
      return "/console/assessment";
    case "EVALUATOR":
      return "/console/candidates?status=COMPLETED";
    case "HIRING_MANAGER":
      return "/console/candidates";
    default:
      return "/console";
  }
}

export function workspaceLabel(role: string) {
  switch (role) {
    case "DESIGNER":
      return "Assessment designer";
    case "EVALUATOR":
      return "Evaluator workspace";
    case "HIRING_MANAGER":
      return "Interview workspace";
    default:
      return "Admin console";
  }
}

export function roleLabel(role: string) {
  switch (role) {
    case "ADMIN":
      return "System admin";
    case "DESIGNER":
      return "Assessment designer";
    case "EVALUATOR":
      return "Evaluator";
    case "HIRING_MANAGER":
      return "Hiring manager";
    default:
      return role.replaceAll("_", " ");
  }
}

export const STAFF_NAV = [
  { href: "/console", label: "Admin console", permission: "viewDashboard" as const },
  { href: "/console/assessment", label: "Assessment designer", permission: "editAssessment" as const },
  { href: "/console/library", label: "Content library", permission: "editAssessment" as const },
  { href: "/console/candidates", label: "Candidates", permission: "viewCandidates" as const },
  { href: "/console/candidates/new", label: "Invite candidate", permission: "invite" as const },
  { href: "/console/staff", label: "Staff users", permission: "manageStaff" as const },
];
