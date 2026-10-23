export type StaffTheme = "light" | "dark";

export const STAFF_THEME_COOKIE = "staff-theme";

export function readStaffTheme(value: string | undefined): StaffTheme | null {
  return value === "light" || value === "dark" ? value : null;
}
