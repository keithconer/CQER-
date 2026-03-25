export type ThematicAreaOption = {
  code: "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";
  value: string;
  label: string;
};

export const THEMATIC_AREA_OPTIONS: ThematicAreaOption[] = [
  {
    code: "A",
    value: "Sustainable Agri-Fisheries and Nutritional Security",
    label: "1. A. Sustainable Agri-Fisheries and Nutritional Security",
  },
  {
    code: "B",
    value: "Digital Multimedia and Cultural and Artistic Innovations",
    label: "2. B. Digital Multimedia and Cultural and Artistic Innovations",
  },
  {
    code: "C",
    value: "Societal Advancement and Economic Mobility",
    label: "3. C. Societal Advancement and Economic Mobility",
  },
  {
    code: "D",
    value: "One Health and One Welfare",
    label: "4. D. One Health and One Welfare",
  },
  {
    code: "E",
    value: "E-commerce, Industrial and Market Competitiveness",
    label: "5. E. E-commerce, Industrial and Market Competitiveness",
  },
  {
    code: "F",
    value: "Effective Governance, Gender Equity, and Justice",
    label: "6. F. Effective Governance, Gender Equity, and Justice",
  },
  {
    code: "G",
    value: "Next-Generation Engineering, ICT Solutions, and Artificial Intelligence",
    label: "7. G. Next-Generation Engineering, ICT Solutions, and Artificial Intelligence",
  },
  {
    code: "H",
    value: "Biodiversity and Environmental Conservation, Climate Action, and Inclusive Disaster Resilience and Preparedness",
    label: "8. H. Biodiversity and Environmental Conservation, Climate Action, and Inclusive Disaster Resilience and Preparedness",
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
  // Handle legacy values, variants, and typos seen in existing data or user input.
  [normalize("Agri-Fisheries and Food Security"), "A"],
  [normalize("Biodiversity and Environmental Conservation"), "B"],
  [normalize("Smart Engineering, ICT, and Industrial Competitiveness"), "C"],
  [normalize("Smart Engineering, ICT and Industrial Competitiveness"), "C"],
  [normalize("Public Health and Welfare"), "D"],
  [normalize("Societal Development and Equality"), "E"],
  [normalize("Biodiversity and Envrionmental Conservation"), "B"],
]);

export function getThematicAreaLetter(value: string): ThematicAreaOption["code"] | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^([A-H])\b/i);
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
