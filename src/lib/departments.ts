export const DEPARTMENT_LABEL_BY_CODE = {
  DIT: "Department of Information Technology",
  DIET: "Department of Industrial Engineering and Technology",
  DAFE: "Department of Agricultural and Food Engineering",
  DCEEE: "Department of Computer Engineering and Electrical Engineering",
  DCEA: "Department of Civil Engineering and Architecture",
} as const;

export const DEPARTMENTS = [
  DEPARTMENT_LABEL_BY_CODE.DIT,
  DEPARTMENT_LABEL_BY_CODE.DIET,
  DEPARTMENT_LABEL_BY_CODE.DAFE,
  DEPARTMENT_LABEL_BY_CODE.DCEEE,
  DEPARTMENT_LABEL_BY_CODE.DCEA,
] as const;

export type DepartmentCode = keyof typeof DEPARTMENT_LABEL_BY_CODE;
export type DepartmentName = (typeof DEPARTMENTS)[number];

const DEPARTMENT_CODE_BY_NAME: Record<DepartmentName, DepartmentCode> = {
  "Department of Information Technology": "DIT",
  "Department of Industrial Engineering and Technology": "DIET",
  "Department of Agricultural and Food Engineering": "DAFE",
  "Department of Computer Engineering and Electrical Engineering": "DCEEE",
  "Department of Civil Engineering and Architecture": "DCEA",
};

const DEPARTMENT_BY_IDENTIFIER = {
  DIT: DEPARTMENT_LABEL_BY_CODE.DIT,
  DIET: DEPARTMENT_LABEL_BY_CODE.DIET,
  DAFE: DEPARTMENT_LABEL_BY_CODE.DAFE,
  DCEEE: DEPARTMENT_LABEL_BY_CODE.DCEEE,
  DCEA: DEPARTMENT_LABEL_BY_CODE.DCEA,
  "Department of Information Technology": DEPARTMENT_LABEL_BY_CODE.DIT,
  "Department of Industrial Engineering and Technology":
    DEPARTMENT_LABEL_BY_CODE.DIET,
  "Department of Agricultural and Food Engineering":
    DEPARTMENT_LABEL_BY_CODE.DAFE,
  "Department of Computer Engineering and Electrical Engineering":
    DEPARTMENT_LABEL_BY_CODE.DCEEE,
  "Department of Civil Engineering and Architecture":
    DEPARTMENT_LABEL_BY_CODE.DCEA,
} as const;

export const BS_INDUSTRIAL_TECHNOLOGY = "BS Industrial Technology";
export const DEPARTMENT_OF_INDUSTRIAL_ENGINEERING_AND_TECHNOLOGY =
  DEPARTMENT_LABEL_BY_CODE.DIET;

export const UNITS_BY_DEPARTMENT: Record<DepartmentName, string[]> = {
  "Department of Information Technology": [
    "BS Information Technology",
    "BS Computer Science",
  ],
  "Department of Industrial Engineering and Technology": [
    "BS Industrial Engineering",
    BS_INDUSTRIAL_TECHNOLOGY,
  ],
  "Department of Agricultural and Food Engineering": [
    "BS Agricultural and Biosystems Engineering",
  ],
  "Department of Computer Engineering and Electrical Engineering": [
    "BS Computer Engineering",
    "BS Electrical Engineering",
    "BS Electronics Engineering",
  ],
  "Department of Civil Engineering and Architecture": [
    "BS Architecture",
    "BS Civil Engineering",
  ],
};

export const BSINDT_TRACKS = [
  "Major in Automotive Technology",
  "Major in Electrical Engineering",
  "Major in Electronics Engineering",
] as const;
export type BsindtTrack = (typeof BSINDT_TRACKS)[number];

export function normalizeDepartment(
  department: string | null | undefined
): DepartmentName | null {
  if (!department) return null;
  return (
    DEPARTMENT_BY_IDENTIFIER[
      department as keyof typeof DEPARTMENT_BY_IDENTIFIER
    ] || null
  );
}

export function toDepartmentCode(
  department: string | null | undefined
): DepartmentCode | null {
  const normalized = normalizeDepartment(department);
  if (!normalized) return null;
  return DEPARTMENT_CODE_BY_NAME[normalized] || null;
}

export function getUnitsByDepartment(department: string | null | undefined) {
  const normalized = normalizeDepartment(department);
  if (!normalized) return [];
  return UNITS_BY_DEPARTMENT[normalized] || [];
}

export function isIndustrialEngineeringAndTechnologyDepartment(
  department: string | null | undefined
) {
  return (
    normalizeDepartment(department) ===
    DEPARTMENT_OF_INDUSTRIAL_ENGINEERING_AND_TECHNOLOGY
  );
}

export function buildUnitValue(unit: string, track?: string) {
  if (unit !== BS_INDUSTRIAL_TECHNOLOGY) return unit;
  return track ? `${BS_INDUSTRIAL_TECHNOLOGY} - ${track}` : BS_INDUSTRIAL_TECHNOLOGY;
}
