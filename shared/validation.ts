export class InputError extends Error {}
export function text(
  value: unknown,
  label: string,
  min: number,
  max: number,
): string {
  if (typeof value !== "string") throw new InputError(`${label} is required.`);
  const result = value.trim();
  if (result.length < min || result.length > max)
    throw new InputError(`${label} must contain ${min}–${max} characters.`);
  return result;
}
export function scoreToTenths(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 10 ||
    Math.abs(value * 10 - Math.round(value * 10)) > 0.000001
  )
    throw new InputError(
      "Choose a score from 0 to 10 with at most one decimal place.",
    );
  return Math.round(value * 10);
}
export function voteValue(value: unknown): -1 | 0 | 1 {
  if (value !== -1 && value !== 0 && value !== 1)
    throw new InputError("Invalid vote.");
  return value;
}
export function slugify(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 90) || "game"
  );
}
export function safeUrl(value: unknown): string {
  if (!value) return "";
  let url: URL;
  try {
    url = new URL(text(value, "Reference URL", 1, 1000));
  } catch {
    throw new InputError("Enter a valid URL.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:")
    throw new InputError("Use an http or https link.");
  return url.href;
}
export function assetUrl(value: unknown): string {
  if (typeof value === "string" && /^\/images\/[a-zA-Z0-9._-]+$/.test(value))
    return value;
  return safeUrl(value);
}
