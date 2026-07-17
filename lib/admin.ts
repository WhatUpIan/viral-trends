/**
 * Admin allowlist for privileged actions (manual daily ingest, etc.).
 * Always includes ianmcarson@gmail.com; add more via ADMIN_EMAILS (comma-separated).
 */
const DEFAULT_ADMINS = ["ianmcarson@gmail.com"];

export function getAdminEmails(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...DEFAULT_ADMINS, ...fromEnv])];
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}
