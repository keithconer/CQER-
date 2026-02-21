export const DEPARTMENTS = ["DAFE", "DIT", "DCEA", "DCEEE", "DIET"] as const;

export type DepartmentCode = (typeof DEPARTMENTS)[number];

export const UNITS_BY_DEPARTMENT: Record<DepartmentCode, string[]> = {
  DAFE: ["BSABE"],
  DIT: ["IT", "CS"],
  DCEA: ["Archi", "Comp Eng"],
  DCEEE: ["CpE", "EE", "EEE"],
  DIET: ["BSIE", "BSINDT"],
};

export const BSINDT_TRACKS = ["Automotive", "Electrical"] as const;
export type BsindtTrack = (typeof BSINDT_TRACKS)[number];

export function buildUnitValue(unit: string, track?: string) {
  if (unit !== "BSINDT") return unit;
  return track ? `BSINDT - ${track}` : "BSINDT";
}
