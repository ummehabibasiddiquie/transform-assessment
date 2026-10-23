function runtimeEnv(parts: string[]) {
  // Joined at runtime so the production build does not freeze a missing value.
  // Vercel secrets are available when the site runs, not while it is building.
  return process.env[parts.join("_")];
}

export function authSecret() {
  const value = runtimeEnv(["AUTH", "SECRET"]);
  if (!value) throw new Error("AUTH_SECRET is not set");
  return value;
}

export function anthropicApiKey() {
  const value = runtimeEnv(["ANTHROPIC", "API", "KEY"]);
  if (!value) throw new Error("ANTHROPIC_API_KEY is not set");
  return value;
}
