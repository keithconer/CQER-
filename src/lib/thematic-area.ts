export type ThematicAreaOption = {
  code: "A" | "B" | "C" | "D" | "E";
  value: string;
  label: string;
};

export const THEMATIC_AREA_OPTIONS: ThematicAreaOption[] = [
  {
    code: "A",
    value: "Agri-Fisheries and Food Security",
    label: "A - Agri-Fisheries and Food Security",
  },
  {
    code: "B",
    value: "Biodiversity and Environmental Conservation",
    label: "B - Biodiversity and Environmental Conservation",
  },
  {
    code: "C",
    value: "Smart Engineering, ICT, and Industrial Competitiveness",
    label: "C - Smart Engineering, ICT, and Industrial Competitiveness",
  },
  {
    code: "D",
    value: "Public Health and Welfare",
    label: "D - Public Health and Welfare",
  },
  {
    code: "E",
    value: "Societal Development and Equality",
    label: "E - Societal Development and Equality",
  },
];

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[,\-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const THEMATIC_AREA_LOOKUP = new Map<string, ThematicAreaOption["code"]>([
  ...THEMATIC_AREA_OPTIONS.map((option) => [normalize(option.value), option.code] as const),
  // Handle variants/typos seen in existing data or user input.
  [normalize("Smart Engineering, ICT and Industrial Competitiveness"), "C"],
  [normalize("Biodiversity and Envrionmental Conservation"), "B"],
]);

export function getThematicAreaLetter(value: string): ThematicAreaOption["code"] | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^([A-E])\b/i);
  if (match) return match[1].toUpperCase() as ThematicAreaOption["code"];

  return THEMATIC_AREA_LOOKUP.get(normalize(trimmed)) ?? null;
}

export function formatThematicAreaLetters(value: unknown): string {
  if (value == null) return "";
  const values = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : typeof value === "string"
      ? [value]
      : [];

  if (values.length === 0) return "";

  const letters: string[] = [];
  values.forEach((entry) => {
    const letter = getThematicAreaLetter(entry);
    if (letter && !letters.includes(letter)) {
      letters.push(letter);
    }
  });

  return letters.join(", ");
}
