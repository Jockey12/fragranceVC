const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function sanitizePlainText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";

  return value.replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function sanitizeTextArray(values: unknown, maxItems: number, maxItemLength: number) {
  if (!Array.isArray(values)) return [];

  const normalized = values
    .map((value) => sanitizePlainText(value, maxItemLength).toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(normalized)).slice(0, maxItems);
}

export function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function sanitizeCssColor(value: unknown, fallback: string) {
  const color = sanitizePlainText(value, 16);

  return HEX_COLOR.test(color) ? color : fallback;
}

export function sanitizeExternalImageUrl(value: unknown) {
  const candidate = sanitizePlainText(value, 2048);
  if (!candidate) return undefined;

  try {
    const url = new URL(candidate);

    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
