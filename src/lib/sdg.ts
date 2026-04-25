export const SDG_OPTIONS = Array.from({ length: 17 }, (_, index) => `SDG ${index + 1}`);

function extractSdgNumber(value: string) {
  const match = value.match(/\b(1[0-7]|[1-9])\b/);
  if (!match) return null;
  const number = Number(match[1]);
  return number >= 1 && number <= 17 ? number : null;
}

export function normalizeSdgValue(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const number = extractSdgNumber(raw);
  return number ? `SDG ${number}` : raw;
}

export function normalizeSdgArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => normalizeSdgValue(item))
        .filter((item) => SDG_OPTIONS.includes(item))
    )
  );
}
