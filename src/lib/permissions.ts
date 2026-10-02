export const STAFF_ROLES = ["ADMIN", "EVALUATOR"] as const;

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
  editAssessment: ["ADMIN"],
  invite: ["ADMIN"],
  viewCandidates: ["ADMIN", "EVALUATOR"],
  score: ["ADMIN", "EVALUATOR"],
  interview: ["ADMIN"],
  decide: ["ADMIN"],
};

export function can(role: string, permission: Permission) {
  return (ALLOWED[permission] as string[]).includes(role);
}

export function homePath(role: string) {
  switch (role) {
    case "EVALUATOR":
      return "/console/candidates?status=COMPLETED";
    default:
      return "/console";
  }
}

export function workspaceLabel(role: string) {
  switch (role) {
    case "EVALUATOR":
      return "Evaluator workspace";
    default:
      return "Admin console";
  }
}

export function roleLabel(role: string) {
  switch (role) {
    case "ADMIN":
      return "System admin";
    case "EVALUATOR":
      return "Evaluator";
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
