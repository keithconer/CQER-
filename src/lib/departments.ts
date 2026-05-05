export const DEPARTMENT_LABEL_BY_CODE = {
  DIT: "Department of Information Technology",
  DIET: "Department of Industrial Engineering and Technology",
  DAFE: "Department of Agricultural and Food Engineering",
  DCEEE: "Department of Computer Engineering and Electrical Engineering",
  DCEA: "Department of Civil Engineering and Architecture",
} as const;

export type DepartmentCode = keyof typeof DEPARTMENT_LABEL_BY_CODE;

export const BS_INDUSTRIAL_TECHNOLOGY = "BS Industrial Technology";
export const DEPARTMENT_OF_INDUSTRIAL_ENGINEERING_AND_TECHNOLOGY =
  DEPARTMENT_LABEL_BY_CODE.DIET;

export const BSINDT_TRACKS = [
  "Major in Automotive Technology",
  "Major in Electrical Engineering",
  "Major in Electronics Engineering",
] as const;
export type BsindtTrack = (typeof BSINDT_TRACKS)[number];

export type DepartmentUnitOption = {
  id: string;
  name: string;
};

export type DepartmentOption = {
  id: string;
  name: string;
  units: DepartmentUnitOption[];
};

const STATIC_DEPARTMENT_DIRECTORY: DepartmentOption[] = [
  {
    id: "fallback-dit",
    name: DEPARTMENT_LABEL_BY_CODE.DIT,
    units: [
      { id: "fallback-dit-it", name: "BS Information Technology" },
      { id: "fallback-dit-cs", name: "BS Computer Science" },
    ],
  },
  {
    id: "fallback-diet",
    name: DEPARTMENT_LABEL_BY_CODE.DIET,
    units: [
      { id: "fallback-diet-ie", name: "BS Industrial Engineering" },
      { id: "fallback-diet-it", name: BS_INDUSTRIAL_TECHNOLOGY },
    ],
  },
  {
    id: "fallback-dafe",
    name: DEPARTMENT_LABEL_BY_CODE.DAFE,
    units: [
      {
        id: "fallback-dafe-abe",
        name: "BS Agricultural and Biosystems Engineering",
      },
    ],
  },
  {
    id: "fallback-dceee",
    name: DEPARTMENT_LABEL_BY_CODE.DCEEE,
    units: [
      { id: "fallback-dceee-coe", name: "BS Computer Engineering" },
      { id: "fallback-dceee-ee", name: "BS Electrical Engineering" },
      { id: "fallback-dceee-ece", name: "BS Electronics Engineering" },
    ],
  },
  {
    id: "fallback-dcea",
    name: DEPARTMENT_LABEL_BY_CODE.DCEA,
    units: [
      { id: "fallback-dcea-arch", name: "BS Architecture" },
      { id: "fallback-dcea-ce", name: "BS Civil Engineering" },
    ],
  },
];

export const DEPARTMENTS = STATIC_DEPARTMENT_DIRECTORY.map(
  (department) => department.name
) as readonly string[];
export type DepartmentName = (typeof DEPARTMENTS)[number];

const DEPARTMENT_CODE_BY_NAME: Record<string, DepartmentCode> = {
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

export const UNITS_BY_DEPARTMENT: Record<string, string[]> =
  STATIC_DEPARTMENT_DIRECTORY.reduce<Record<string, string[]>>(
    (acc, department) => {
      acc[department.name] = department.units.map((unit) => unit.name);
      return acc;
    },
    {}
  );

type SupabaseLike = {
  from: (table: string) => {
    select: (query: string) => {
      order: (
        column: string,
        options?: { ascending?: boolean; foreignTable?: string }
      ) => Promise<{ data: unknown; error: { message?: string } | null }>;
    };
  };
};

type RawDepartmentRow = {
  id?: string;
  name?: string;
  department_units?: Array<{ id?: string; name?: string }> | null;
};

function sortDirectory(directory: DepartmentOption[]) {
  return [...directory]
    .map((department) => ({
      ...department,
      units: [...department.units].sort((left, right) =>
        left.name.localeCompare(right.name)
      ),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function getFallbackDepartmentDirectory(): DepartmentOption[] {
  return sortDirectory(STATIC_DEPARTMENT_DIRECTORY);
}

export function getDepartmentNames(directory?: DepartmentOption[]) {
  return (directory && directory.length > 0
    ? directory
    : getFallbackDepartmentDirectory()
  ).map((department) => department.name);
}

export function normalizeDepartment(
  department: string | null | undefined,
  directory?: DepartmentOption[]
) {
  if (!department) return null;

  const fromStatic =
    DEPARTMENT_BY_IDENTIFIER[
      department as keyof typeof DEPARTMENT_BY_IDENTIFIER
    ] || null;
  if (fromStatic) return fromStatic;

  const availableDepartments = getDepartmentNames(directory);
  const match = availableDepartments.find((item) => item === department);
  return match || null;
}

export function toDepartmentCode(
  department: string | null | undefined,
  directory?: DepartmentOption[]
) {
  const normalized = normalizeDepartment(department, directory);
  if (!normalized) return null;
  return DEPARTMENT_CODE_BY_NAME[normalized] || null;
}

export function getUnitsByDepartment(
  department: string | null | undefined,
  directory?: DepartmentOption[]
) {
  const normalized = normalizeDepartment(department, directory) || department;
  if (!normalized) return [];

  const source =
    directory && directory.length > 0
      ? directory
      : getFallbackDepartmentDirectory();
  const matchedDepartment = source.find((item) => item.name === normalized);

  if (matchedDepartment) {
    return matchedDepartment.units.map((unit) => unit.name);
  }

  return UNITS_BY_DEPARTMENT[normalized] || [];
}

export function getAllUnits(directory?: DepartmentOption[]) {
  return getDepartmentNames(directory).flatMap((department) =>
    getUnitsByDepartment(department, directory)
  );
}

export function isIndustrialEngineeringAndTechnologyDepartment(
  department: string | null | undefined,
  directory?: DepartmentOption[]
) {
  return (
    normalizeDepartment(department, directory) ===
    DEPARTMENT_OF_INDUSTRIAL_ENGINEERING_AND_TECHNOLOGY
  );
}

export function buildUnitValue(unit: string, track?: string) {
  if (unit !== BS_INDUSTRIAL_TECHNOLOGY) return unit;
  return track ? `${BS_INDUSTRIAL_TECHNOLOGY} - ${track}` : BS_INDUSTRIAL_TECHNOLOGY;
}

export async function fetchDepartmentDirectory(supabase: SupabaseLike) {
  try {
    const { data, error } = await supabase
      .from("departments")
      .select("id, name, department_units(id, name)")
      .order("name", { ascending: true });

    if (error || !Array.isArray(data) || data.length === 0) {
      return getFallbackDepartmentDirectory();
    }

    const normalized = data
      .map((row) => {
        const department = row as RawDepartmentRow;
        const name = String(department.name || "").trim();
        if (!name) return null;

        return {
          id: String(department.id || name),
          name,
          units: Array.isArray(department.department_units)
            ? department.department_units
                .map((unit) => {
                  const unitName = String(unit?.name || "").trim();
                  if (!unitName) return null;
                  return {
                    id: String(unit?.id || unitName),
                    name: unitName,
                  };
                })
                .filter((unit): unit is DepartmentUnitOption => Boolean(unit))
            : [],
        } satisfies DepartmentOption;
      })
      .filter((department): department is DepartmentOption =>
        Boolean(department)
      );

    return normalized.length > 0
      ? sortDirectory(normalized)
      : getFallbackDepartmentDirectory();
  } catch {
    return getFallbackDepartmentDirectory();
  }
}
