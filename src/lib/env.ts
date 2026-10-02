export function authSecret() {
  // Joined at runtime so the production build does not freeze a missing value.
  // Vercel secrets are available when the site runs, not while it is building.
  const name = ["AUTH", "SECRET"].join("_");
  const value = process.env[name];
  if (!value) throw new Error("AUTH_SECRET is not set");
  return value;
}
