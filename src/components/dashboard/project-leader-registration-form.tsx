"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import * as z from "zod";
import { addYears, differenceInCalendarDays, differenceInYears, endOfToday, format, isAfter, isValid, parse } from "date-fns";
import {
  AlertTriangle,
  Building2,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Save,
  Trash2,
  FolderOpen,
  Users,
  Target,
  Briefcase,
  Wallet,
} from "lucide-react";

import { FullscreenFormHeader } from "@/components/dashboard/fullscreen-form-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FileUpload } from "@/components/dashboard/file-upload";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { SDG_OPTIONS, normalizeSdgArray } from "@/lib/sdg";
import { cn, toTitleCase } from "@/lib/utils";
import { createProject, updateProject } from "@/lib/actions/projects";
import { type Project } from "@/components/dashboard/projects-table";
import { createProjectRegistrationGuidance, DEFAULT_DOCUMENT_ACCEPT } from "@/lib/document-uploads";

const agendaOptions = [
  "A - Agri-Fisheries and Food Security",
  "B - Biodiversity and Environmental Conservation",
  "C - Smart Engineering, ICT and Industrial Competitiveness",
  "D - Public Health and Welfare",
  "E - Societal Development and Equality",
  "F - Sustainable Agri-Fisheries and Nutritional Security",
  "G - Digital Multimedia and Cultural and Artistic Innovations",
  "H - Societal Advancement and Economic Mobility",
  "I - One Health and One Welfare",
  "J - E-commerce, Industrial and Market Competitiveness",
  "K - Effective Governance, Gender Equity, and Justice",
  "L - Next-Generation Engineering, ICT Solutions, and Artificial Intelligence",
  "M - Biodiversity and Environmental Conservation, Climate Action, and Inclusive Disaster Resilience, and Preparedness",
] as const;

const sdgOptions = SDG_OPTIONS;
const agencyCategoryOptions = ["government", "ngo", "private", "msme"] as const;
const natureOptions = ["Internal", "External"] as const;
const partnershipTypeOptions = ["MOA", "MOU", "LOA"] as const;
const levelOfPartnershipOptions = ["Local", "Regional", "National", "International"] as const;
const employmentOptions = ["Permanent", "Contract of Service"] as const;

const textValue = z.string().trim().min(1, "This field is required.");
const optionalTextValue = z.string().trim().optional().or(z.literal(""));
const nonNegativeNumber = z.coerce.number().min(0, "Value must be 0 or greater.");

function normalizeAgencyCategory(value: unknown): (typeof agencyCategoryOptions)[number] {
  const normalized = String(value || "").trim().toLowerCase();
  return agencyCategoryOptions.includes(normalized as (typeof agencyCategoryOptions)[number])
    ? (normalized as (typeof agencyCategoryOptions)[number])
    : "government";
}

const signatorySchema = z.object({
  designation: textValue,
  name: textValue,
});

const staffMemberSchema = z.object({
  name: textValue,
  employment: z.enum(employmentOptions),
});

const strategySchema = z
  .object({
    capacity_building: optionalTextValue,
    technical_assistance: optionalTextValue,
  })
  .refine(
    (value) =>
      (value.capacity_building || "").trim().length > 0 ||
      (value.technical_assistance || "").trim().length > 0,
    { message: "Provide at least one strategy detail.", path: ["capacity_building"] }
  );

const budgetYearSchema = z.object({
  year: z.number(),
  food_and_beverage: nonNegativeNumber,
  travel: nonNegativeNumber,
  suppliers_and_materials: nonNegativeNumber,
  communication: nonNegativeNumber,
  other_mooe: nonNegativeNumber,
});

const partnerAgencySchema = z
  .object({
    name: textValue,
    location: textValue,
    category: z.enum(agencyCategoryOptions),
    head_designation: textValue,
    contact_details: textValue,
    nature_of_partnership: z.enum(natureOptions),
    funding_agency_name: optionalTextValue,
    level_of_partnership: z.enum(levelOfPartnershipOptions),
    type_of_partnership: z.enum(partnershipTypeOptions),
    bor_approval_date: z.date().nullable(),
    date_notarized: z.date().nullable(),
    signatories: z.array(signatorySchema).min(1, "Add at least one signatory."),
  })
  .superRefine((value, ctx) => {
    if (value.nature_of_partnership === "External" && !(value.funding_agency_name || "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["funding_agency_name"],
        message: "Funding agency name is required for external partnerships.",
      });
    }

    if (value.bor_approval_date && isAfter(value.bor_approval_date, endOfToday())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bor_approval_date"],
        message: "Future dates are not allowed.",
      });
    }

    if (value.date_notarized && isAfter(value.date_notarized, endOfToday())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["date_notarized"],
        message: "Future dates are not allowed.",
      });
    }
  });

const formSchema = z.object({
  project_title: textValue,
  budget: nonNegativeNumber,
  start_date: z.string().trim().min(1, "Start date is required."),
  end_date: z.string().trim().min(1, "End date is required."),
  extension_agenda: z.array(z.string()).min(1, "Select at least one agenda."),
  sdg_main: z.array(z.string()).min(1, "Select at least one SDG."),
  sdg_sub: z.array(z.string()).min(1, "Select at least one SDG."),
  target_beneficiaries: textValue,
  department_unit: textValue,
  partner_agencies: z.array(partnerAgencySchema).min(1, "Add at least one partner agency."),
  rationale: textValue,
  objectives: textValue,
  strategies: z.array(strategySchema).min(1, "Add at least one strategy."),
  publication_text: optionalTextValue,
  patents_text: optionalTextValue,
  people_services_text: optionalTextValue,
  places_partnerships_text: optionalTextValue,
  policy_text: optionalTextValue,
  social_impact_text: optionalTextValue,
  economic_impact_text: optionalTextValue,
  environmental_impact_text: optionalTextValue,
  project_leader_name: textValue,
  project_leader_employment: z.enum(employmentOptions),
  co_project_leaders: z.array(staffMemberSchema),
  project_coordinators: z.array(staffMemberSchema),
  project_facilitators: z.array(staffMemberSchema),
  project_assistants: z.array(staffMemberSchema),
  budget_summary: z
    .array(budgetYearSchema)
    .min(1, "Budget years will be generated from the project dates."),
  needs_assessment_title: optionalTextValue,
  needs_assessment_dates: z.array(z.date()),
  needs_assessment_place: optionalTextValue,
  needs_assessment_results_used: optionalTextValue,
  documents: z
    .array(
      z.object({
        url: z.string(),
        name: z.string(),
      })
    )
    .default([]),
}).superRefine((value, ctx) => {
  const start = parseDateInput(value.start_date);
  const end = parseDateInput(value.end_date);
  const budgetSummaryTotal = value.budget_summary.reduce((sum, row) => sum + getBudgetRowTotal(row), 0);

  if (!start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["start_date"],
      message: "Use MM/dd/YYYY format.",
    });
  }

  if (!end) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["end_date"],
      message: "Use MM/dd/YYYY format.",
    });
  }

  if (start && end && end.getTime() < start.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["end_date"],
      message: "End date must be on or after the start date.",
    });
  }

  if (budgetSummaryTotal > Number(value.budget || 0)) {
    const overage = budgetSummaryTotal - Number(value.budget || 0);
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["budget_summary"],
      message: `Budget summary exceeds the available budget by PHP ${overage.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}.`,
    });
  }
});

type FormValues = z.infer<typeof formSchema>;

interface ProjectLeaderRegistrationFormProps {
  project?: Project | null;
  currentUserId: string;
  currentUserName: string;
  currentDepartment?: string | null;
  currentUnit?: string | null;
  onSuccess?: () => void;
  onClose?: () => void;
  isViewOnly?: boolean;
}

function sortDates(values: Date[]) {
  return [...values].sort((left, right) => left.getTime() - right.getTime());
}

function formatDateRange(values: Date[]) {
  const sorted = sortDates(values);
  if (sorted.length === 0) return "No dates selected";
  const start = sorted[0];
  const end = sorted[sorted.length - 1];
  return start.getTime() === end.getTime()
    ? format(start, "MMM d, yyyy")
    : `${format(start, "MMM d, yyyy")} to ${format(end, "MMM d, yyyy")}`;
}

function parseDateInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = parse(trimmed, "MM/dd/yyyy", new Date());
  if (!isValid(parsed)) return null;
  const normalized = format(parsed, "MM/dd/yyyy");
  return normalized === trimmed ? parsed : null;
}

function daysInMonth(month: number, year?: number | null) {
  if (!month || month < 1 || month > 12) return 31;
  const safeYear = year && year >= 1 ? year : 2024;
  return new Date(safeYear, month, 0).getDate();
}

function maskDateInput(rawValue: string) {
  const digits = rawValue.replace(/\D/g, "").slice(0, 8);
  if (!digits) return "";
  const monthRaw = digits.slice(0, 2);
  const dayRaw = digits.slice(2, 4);
  const yearRaw = digits.slice(4, 8);

  let masked = "";

  if (monthRaw.length > 0) {
    if (monthRaw.length === 1) {
      masked += monthRaw;
    } else {
      const month = Math.min(Math.max(Number(monthRaw), 1), 12);
      masked += String(month).padStart(2, "0");
    }
  }

  if (digits.length >= 2) {
    masked += "/";
  }

  if (dayRaw.length > 0) {
    if (dayRaw.length === 1) {
      masked += dayRaw;
    } else {
      const month = monthRaw.length === 2 ? Math.min(Math.max(Number(monthRaw), 1), 12) : 1;
      const year = yearRaw.length === 4 ? Number(yearRaw) : 2024;
      const day = Math.min(Math.max(Number(dayRaw), 1), daysInMonth(month, year));
      masked += String(day).padStart(2, "0");
    }
  }

  if (digits.length >= 4) {
    masked += "/";
  }

  if (yearRaw.length > 0) {
    masked += yearRaw;
  }

  return masked;
}

function formatDateInput(value?: Date | string | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (!isValid(date)) return "";
  return format(date, "MM/dd/yyyy");
}

function buildInclusiveDatesFromRange(start: Date | null, end: Date | null) {
  if (!start || !end) return [];
  const dates: Date[] = [];
  const pointer = new Date(start);
  while (pointer.getTime() <= end.getTime()) {
    dates.push(new Date(pointer));
    pointer.setDate(pointer.getDate() + 1);
  }
  return dates;
}

function getDurationLabel(values: Date[]) {
  const sorted = sortDates(values);
  if (sorted.length === 0) return "0 days";
  const start = sorted[0];
  const end = sorted[sorted.length - 1];
  const years = differenceInYears(end, start);
  if (years <= 0) {
    const days = differenceInCalendarDays(end, start) + 1;
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  const anchor = addYears(start, years);
  const remainingDays = differenceInCalendarDays(end, anchor);
  if (remainingDays === 0) {
    return `${years} year${years === 1 ? "" : "s"}`;
  }
  return `${years} year${years === 1 ? "" : "s"} and ${remainingDays} day${remainingDays === 1 ? "" : "s"}`;
}

function normalizeEmploymentValue(value: unknown): (typeof employmentOptions)[number] {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "cos" || normalized === "contract of service") {
    return "Contract of Service";
  }
  return "Permanent";
}

function getBudgetRowTotal(row?: FormValues["budget_summary"][number]) {
  if (!row) return 0;
  return (
    Number(row.food_and_beverage || 0) +
    Number(row.travel || 0) +
    Number(row.suppliers_and_materials || 0) +
    Number(row.communication || 0) +
    Number(row.other_mooe || 0)
  );
}

function formatPhpCurrency(value: number) {
  return `PHP ${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getUniqueYears(values: Date[]) {
  return Array.from(new Set(sortDates(values).map((item) => item.getFullYear()))).sort(
    (a, b) => a - b
  );
}

function toDateArray(value: unknown): Date[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (item instanceof Date) return item;
      if (typeof item === "string") return new Date(item);
      return null;
    })
    .filter((item): item is Date => item instanceof Date && !Number.isNaN(item.getTime()));
}

function getRegistrationData(project?: Project | null) {
  if (!project?.funding_data || typeof project.funding_data !== "object") return null;
  const maybeRegistration = (project.funding_data as Record<string, unknown>).registration_data;
  return maybeRegistration && typeof maybeRegistration === "object"
    ? (maybeRegistration as Record<string, unknown>)
    : null;
}

function getDepartmentUnitLabel(department?: string | null, unit?: string | null) {
  if (department && unit) return `${department} / ${unit}`;
  return department || unit || "Unassigned";
}

function buildDefaultValues(
  project: Project | null | undefined,
  currentUserName: string,
  department?: string | null,
  unit?: string | null
): FormValues {
  const registration = getRegistrationData(project);
  const budgetSummaryRaw = Array.isArray(registration?.budget_summary) ? registration?.budget_summary : [];
  const partnerAgenciesRaw = Array.isArray(registration?.partner_agencies) ? registration?.partner_agencies : [];
  const strategiesRaw = Array.isArray(registration?.strategies) ? registration?.strategies : [];
  const coLeadersRaw = Array.isArray(registration?.co_project_leaders) ? registration?.co_project_leaders : [];
  const coordinatorsRaw = Array.isArray(registration?.project_coordinators) ? registration?.project_coordinators : [];
  const facilitatorsRaw = Array.isArray(registration?.project_facilitators) ? registration?.project_facilitators : [];
  const assistantsRaw = Array.isArray(registration?.project_assistants) ? registration?.project_assistants : [];
  const inclusiveDates = toDateArray(registration?.inclusive_dates)
    .concat(project?.start_date ? [new Date(project.start_date)] : [])
    .concat(project?.end_date ? [new Date(project.end_date)] : []);
  const uniqueInclusiveDates = Array.from(
    new Map(sortDates(inclusiveDates).map((item) => [item.toISOString(), item])).values()
  );
  const startDateValue = uniqueInclusiveDates[0] || (project?.start_date ? new Date(project.start_date) : null);
  const endDateValue =
    uniqueInclusiveDates[uniqueInclusiveDates.length - 1] || (project?.end_date ? new Date(project.end_date) : null);
  const uniqueYears = getUniqueYears(uniqueInclusiveDates.length > 0 ? uniqueInclusiveDates : [new Date()]);

  return {
    project_title: String(registration?.project_title || project?.title || ""),
    budget: Number(registration?.budget || project?.budget_total || 0),
    start_date: formatDateInput(startDateValue),
    end_date: formatDateInput(endDateValue),
    extension_agenda: Array.isArray(registration?.extension_agenda)
      ? registration.extension_agenda.map((item) => String(item))
      : Array.isArray(project?.classification)
        ? project.classification
        : [],
    sdg_main: normalizeSdgArray(registration?.sdg_main),
    sdg_sub: normalizeSdgArray(registration?.sdg_sub),
    target_beneficiaries: String(
      registration?.target_beneficiaries ||
        (Array.isArray(project?.target_beneficiaries) ? project.target_beneficiaries.join(", ") : "")
    ),
    department_unit: String(registration?.department_unit || getDepartmentUnitLabel(department, unit)),
    partner_agencies:
      partnerAgenciesRaw.length > 0
        ? partnerAgenciesRaw.map((item) => {
            const record = item as Record<string, unknown>;
            return {
              name: String(record.name || ""),
              location: String(record.location || ""),
              category: normalizeAgencyCategory(record.category),
              head_designation: String(record.head_designation || ""),
              contact_details: String(record.contact_details || ""),
              nature_of_partnership: String(record.nature_of_partnership || "Internal") as (typeof natureOptions)[number],
              funding_agency_name: String(record.funding_agency_name || ""),
              level_of_partnership: (
                levelOfPartnershipOptions.includes(
                  `${String(record.level_of_partnership || "").trim().charAt(0).toUpperCase()}${String(record.level_of_partnership || "").trim().slice(1).toLowerCase()}` as never
                )
                  ? `${String(record.level_of_partnership || "").trim().charAt(0).toUpperCase()}${String(record.level_of_partnership || "").trim().slice(1).toLowerCase()}`
                  : "Local"
              ) as (typeof levelOfPartnershipOptions)[number],
              type_of_partnership: String(record.type_of_partnership || "MOA") as (typeof partnershipTypeOptions)[number],
              bor_approval_date: typeof record.bor_approval_date === "string" ? new Date(record.bor_approval_date) : null,
              date_notarized: typeof record.date_notarized === "string" ? new Date(record.date_notarized) : null,
              signatories:
                Array.isArray(record.signatories) && record.signatories.length > 0
                  ? record.signatories.map((entry) => ({
                      designation: String((entry as Record<string, unknown>).designation || ""),
                      name: String((entry as Record<string, unknown>).name || ""),
                    }))
                  : [{ designation: "", name: "" }],
            };
          })
        : [
            {
              name: "",
              location: "",
              category: "government",
              head_designation: "",
              contact_details: "",
              nature_of_partnership: "Internal",
              funding_agency_name: "",
              level_of_partnership: "Local",
              type_of_partnership: "MOA",
              bor_approval_date: null,
              date_notarized: null,
              signatories: [{ designation: "", name: "" }],
            },
          ],
    rationale: String(registration?.rationale || ""),
    objectives: String(registration?.objectives || ""),
    strategies:
      strategiesRaw.length > 0
        ? strategiesRaw.map((item) => {
            const record = item as Record<string, unknown>;
            return {
              capacity_building: String(record.capacity_building || ""),
              technical_assistance: String(record.technical_assistance || ""),
            };
          })
        : [{ capacity_building: "", technical_assistance: "" }],
    publication_text: String(registration?.publication_text || ""),
    patents_text: String(registration?.patents_text || ""),
    people_services_text: String(registration?.people_services_text || ""),
    places_partnerships_text: String(registration?.places_partnerships_text || ""),
    policy_text: String(registration?.policy_text || ""),
    social_impact_text: String(registration?.social_impact_text || ""),
    economic_impact_text: String(registration?.economic_impact_text || ""),
    environmental_impact_text: String(registration?.environmental_impact_text || ""),
    project_leader_name: String(
      registration?.project_leader_name || project?.proponents?.[0]?.name || currentUserName
    ),
    project_leader_employment: normalizeEmploymentValue(registration?.project_leader_employment),
    co_project_leaders: coLeadersRaw.map((item) => {
      const record = item as Record<string, unknown>;
      return {
        name: String(record.name || ""),
        employment: normalizeEmploymentValue(record.employment),
      };
    }),
    project_coordinators: coordinatorsRaw.map((item) => {
      const record = item as Record<string, unknown>;
      return {
        name: String(record.name || ""),
        employment: normalizeEmploymentValue(record.employment),
      };
    }),
    project_facilitators: facilitatorsRaw.map((item) => {
      const record = item as Record<string, unknown>;
      return {
        name: String(record.name || ""),
        employment: normalizeEmploymentValue(record.employment),
      };
    }),
    project_assistants:
      assistantsRaw.length > 0
        ? assistantsRaw.map((item) => {
            const record = item as Record<string, unknown>;
            return {
              name: String(record.name || ""),
              employment: normalizeEmploymentValue(record.employment),
            };
          })
        : (((project as Project & { project_assistants?: { name: string }[] })?.project_assistants) || []).map((item) => ({
            name: String(item.name || ""),
            employment: "Permanent" as const,
          })),
    budget_summary:
      budgetSummaryRaw.length > 0
        ? budgetSummaryRaw.map((item) => {
            const record = item as Record<string, unknown>;
            return {
              year: Number(record.year || new Date().getFullYear()),
              food_and_beverage: Number(record.food_and_beverage || 0),
              travel: Number(record.travel || 0),
              suppliers_and_materials: Number(record.suppliers_and_materials || 0),
              communication: Number(record.communication || 0),
              other_mooe: Number(record.other_mooe || 0),
            };
          })
        : uniqueYears.map((year) => ({
            year,
            food_and_beverage: 0,
            travel: 0,
            suppliers_and_materials: 0,
            communication: 0,
            other_mooe: 0,
          })),
    needs_assessment_title: String(registration?.needs_assessment_title || ""),
    needs_assessment_dates: toDateArray(registration?.needs_assessment_dates),
    needs_assessment_place: String(registration?.needs_assessment_place || ""),
    needs_assessment_results_used: String(registration?.needs_assessment_results_used || ""),
    documents: Array.isArray(project?.documents) ? project.documents : [],
  };
}

function MultiDatePicker({
  value,
  onChange,
  disabled,
  placeholder,
  disabledDate,
}: {
  value: Date[];
  onChange: (value: Date[]) => void;
  disabled?: boolean;
  placeholder?: string;
  disabledDate?: (date: Date) => boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-9 w-full justify-start rounded-xl border-border/60 bg-background px-3 text-left text-xs font-normal",
            value.length === 0 && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          <span className="truncate">{value.length > 0 ? formatDateRange(value) : placeholder || "Select dates"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="multiple"
          selected={value}
          onSelect={(dates) => onChange(sortDates(dates || []))}
          disabled={disabledDate}
          className="rounded-md border-0"
        />
      </PopoverContent>
    </Popover>
  );
}

function DateTextField({
  value,
  onChange,
  disabled,
  placeholder = "MM/dd/YYYY",
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <Input
      value={value}
      onChange={(event) => onChange(maskDateInput(event.target.value))}
      onKeyDown={(event) => {
        const allowedKeys = [
          "Backspace",
          "Delete",
          "Tab",
          "ArrowLeft",
          "ArrowRight",
          "Home",
          "End",
        ];
        if (allowedKeys.includes(event.key) || (event.ctrlKey || event.metaKey)) return;
        if (!/^\d$/.test(event.key)) {
          event.preventDefault();
        }
      }}
      disabled={disabled}
      placeholder={placeholder}
      inputMode="numeric"
      maxLength={10}
      className="h-9 rounded-xl text-xs"
    />
  );
}

function CheckboxGrid({
  options,
  values,
  onToggle,
  disabled,
}: {
  options: readonly string[];
  values: string[];
  onToggle: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {options.map((option) => {
        const checked = values.includes(option);
        return (
          <label
            key={option}
            className={cn(
              "flex min-h-12 items-start gap-3 rounded-2xl border border-border/40 bg-background px-4 py-3 text-sm",
              checked && "border-primary/50 bg-primary/5"
            )}
          >
            <Checkbox checked={checked} onCheckedChange={() => onToggle(option)} disabled={disabled} className="mt-0.5" />
            <span className="leading-5 text-[13px] sm:text-sm">{option}</span>
          </label>
        );
      })}
    </div>
  );
}

function DropdownMultiSelect({
  values,
  options,
  onToggle,
  disabled,
  placeholder,
}: {
  values: string[];
  options: readonly string[];
  onToggle: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-3">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="h-10 w-full justify-between rounded-xl border-border/60 px-3 text-xs font-normal"
          >
            <span className="truncate text-left">
              {values.length > 0 ? values.join(", ") : placeholder || "Select option/s"}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(26rem,calc(100vw-2rem))] rounded-2xl p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((option) => {
              const checked = values.includes(option);
              return (
                <label key={option} className="flex items-center gap-3 rounded-xl border border-border/40 px-3 py-2">
                  <Checkbox checked={checked} onCheckedChange={() => onToggle(option)} disabled={disabled} />
                  <span className="text-xs">{option}</span>
                </label>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function SdgGrid({
  values,
  onToggle,
  disabled,
}: {
  values: string[];
  onToggle: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <DropdownMultiSelect
      values={values}
      options={sdgOptions}
      onToggle={onToggle}
      disabled={disabled}
      placeholder="Select SDG/s"
    />
  );
}

function StaffListFields({
  control,
  name,
  label,
  disabled,
}: {
  control: Control<FormValues>;
  name: "co_project_leaders" | "project_coordinators" | "project_facilitators" | "project_assistants";
  label: string;
  disabled?: boolean;
}) {
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <div className="space-y-3 rounded-2xl border border-border/40 bg-muted/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label className="text-sm font-semibold">{label}</Label>
          <p className="text-xs text-muted-foreground">
            {name === "project_assistants"
              ? "Optional. Add team members only when applicable."
              : "Add one or more team members for this role."}
          </p>
        </div>
        {!disabled && (
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => append({ name: "", employment: "Permanent" })}>
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        )}
      </div>

      {fields.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 px-4 py-5 text-sm text-muted-foreground">
          No entries added yet.
        </p>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid gap-3 rounded-xl border border-border/40 bg-background p-4 xl:grid-cols-[minmax(0,1fr)_220px_44px]">
              <FormField
                control={control}
                name={`${name}.${index}.name`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={disabled} className="h-9 rounded-xl text-xs" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`${name}.${index}.employment`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Appointment</FormLabel>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange} disabled={disabled} className="grid grid-cols-2 gap-2 pt-2">
                        {employmentOptions.map((option) => (
                          <label
                            key={option}
                            className={cn(
                              "flex items-center justify-center rounded-xl border border-border/50 px-3 py-2 text-xs",
                              field.value === option && "border-primary/50 bg-primary/5 text-primary"
                            )}
                          >
                            <RadioGroupItem value={option} className="sr-only" />
                            {option}
                          </label>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <div className="flex items-end">
                {!disabled && (
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-xl text-destructive" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PartnerAgencyFields({
  control,
  index,
  disabled,
  onRemove,
}: {
  control: Control<FormValues>;
  index: number;
  disabled?: boolean;
  onRemove: () => void;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `partner_agencies.${index}.signatories` as never,
  });
  const nature = useWatch({
    control,
    name: `partner_agencies.${index}.nature_of_partnership` as never,
  }) as unknown as (typeof natureOptions)[number];

  return (
    <Card className="rounded-3xl border-border/40 shadow-none">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Partner Agency {index + 1}
            </CardTitle>
            <CardDescription className="text-xs">Capture the agency, partnership, and signatory details.</CardDescription>
          </div>
          {!disabled && (
            <Button type="button" variant="outline" className="rounded-xl text-destructive" onClick={onRemove}>
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <FormField control={control} name={`partner_agencies.${index}.name`} render={({ field }) => (
            <FormItem><FormLabel className="text-xs">Name of Partner Agency</FormLabel><FormControl><Input {...field} disabled={disabled} className="h-9 rounded-xl text-xs" /></FormControl><FormMessage className="text-xs" /></FormItem>
          )} />
          <FormField control={control} name={`partner_agencies.${index}.location`} render={({ field }) => (
            <FormItem><FormLabel className="text-xs">Location</FormLabel><FormControl><Input {...field} disabled={disabled} className="h-9 rounded-xl text-xs" /></FormControl><FormMessage className="text-xs" /></FormItem>
          )} />
          <FormField control={control} name={`partner_agencies.${index}.head_designation`} render={({ field }) => (
            <FormItem><FormLabel className="text-xs">Designation of the Head of Agency</FormLabel><FormControl><Input {...field} disabled={disabled} className="h-9 rounded-xl text-xs" /></FormControl><FormMessage className="text-xs" /></FormItem>
          )} />
          <FormField control={control} name={`partner_agencies.${index}.contact_details`} render={({ field }) => (
            <FormItem><FormLabel className="text-xs">Contact Details</FormLabel><FormControl><Input {...field} disabled={disabled} className="h-9 rounded-xl text-xs" /></FormControl><FormMessage className="text-xs" /></FormItem>
          )} />
          <FormField
            control={control}
            name={`partner_agencies.${index}.level_of_partnership`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Level of Partnership</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                  <FormControl>
                    <SelectTrigger className="h-9 rounded-xl text-xs">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {levelOfPartnershipOptions.map((option) => (
                      <SelectItem key={option} value={option} className="text-xs">
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`partner_agencies.${index}.category`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Category of Agency</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                  <FormControl>
                    <SelectTrigger className="h-9 rounded-xl text-xs capitalize">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {agencyCategoryOptions.map((option) => (
                      <SelectItem key={option} value={option} className="text-xs">
                        {toTitleCase(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`partner_agencies.${index}.nature_of_partnership`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Nature of Partnership</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                  <FormControl>
                    <SelectTrigger className="h-9 rounded-xl text-xs">
                      <SelectValue placeholder="Select partnership nature" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {natureOptions.map((option) => (
                      <SelectItem key={option} value={option} className="text-xs">
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`partner_agencies.${index}.type_of_partnership`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Type of Partnership</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                  <FormControl>
                    <SelectTrigger className="h-9 rounded-xl text-xs">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {partnershipTypeOptions.map((option) => (
                      <SelectItem key={option} value={option} className="text-xs">
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`partner_agencies.${index}.bor_approval_date`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Date of BOR&apos;S Approval</FormLabel>
                <FormControl>
                  <MultiDatePicker
                    value={field.value ? [field.value] : []}
                    onChange={(value) => field.onChange(value[0] || null)}
                    disabled={disabled}
                    disabledDate={(date) => isAfter(date, endOfToday())}
                    placeholder="Pick approval date"
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`partner_agencies.${index}.date_notarized`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Date Notarized</FormLabel>
                <FormControl>
                  <MultiDatePicker
                    value={field.value ? [field.value] : []}
                    onChange={(value) => field.onChange(value[0] || null)}
                    disabled={disabled}
                    disabledDate={(date) => isAfter(date, endOfToday())}
                    placeholder="Pick notarized date"
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>

        {nature === "External" && (
          <FormField
            control={control}
            name={`partner_agencies.${index}.funding_agency_name`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Name of Funding Agency</FormLabel>
                <FormControl>
                  <Input {...field} disabled={disabled} className="h-9 rounded-xl text-xs" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        )}

        <div className="space-y-3 rounded-2xl border border-border/50 bg-muted/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label className="text-sm font-semibold">Signatories of Agencies</Label>
              <p className="text-xs text-muted-foreground">Add one or more agency signatories.</p>
            </div>
            {!disabled && (
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => append({ designation: "", name: "" })}>
                <Plus className="mr-2 h-4 w-4" />
                Add Signatory
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {fields.map((field, signatoryIndex) => (
              <div key={field.id} className="grid gap-3 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)_44px]">
                <FormField
                  control={control}
                  name={`partner_agencies.${index}.signatories.${signatoryIndex}.designation`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Designation</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={disabled} className="h-9 rounded-xl text-xs" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name={`partner_agencies.${index}.signatories.${signatoryIndex}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Signatory Name</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={disabled} className="h-9 rounded-xl text-xs" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <div className="flex items-end">
                  {!disabled && fields.length > 1 && (
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-xl text-destructive" onClick={() => remove(signatoryIndex)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjectLeaderRegistrationForm({
  project,
  currentUserId,
  currentUserName,
  currentDepartment,
  currentUnit,
  onSuccess,
  onClose,
  isViewOnly = false,
}: ProjectLeaderRegistrationFormProps) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const stepLabels = ["Overview", "Partner Agency", "Program Design", "Staffing & Budget", "Review & Submit"];
  const defaultValues = React.useMemo(
    () => buildDefaultValues(project, currentUserName, currentDepartment, currentUnit),
    [project, currentUserName, currentDepartment, currentUnit]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues,
  });
  const typedControl = form.control as Control<FormValues>;

  const startDateInput = useWatch({ control: typedControl, name: "start_date" }) || "";
  const endDateInput = useWatch({ control: typedControl, name: "end_date" }) || "";
  const budgetInput = Number(useWatch({ control: typedControl, name: "budget" }) || 0);
  const inclusiveDates = React.useMemo(
    () => buildInclusiveDatesFromRange(parseDateInput(startDateInput), parseDateInput(endDateInput)),
    [startDateInput, endDateInput]
  );
  const budgetSummary = useWatch({ control: typedControl, name: "budget_summary" }) || [];
  const watchedDepartmentUnit =
    useWatch({ control: typedControl, name: "department_unit" }) ||
    getDepartmentUnitLabel(currentDepartment, currentUnit);
  const partnerAgenciesArray = useFieldArray({ control: typedControl, name: "partner_agencies" });
  const strategiesArray = useFieldArray({ control: typedControl, name: "strategies" });
  const budgetYearsArray = useFieldArray({ control: typedControl, name: "budget_summary" });
  const extensionAgenda = useWatch({ control: typedControl, name: "extension_agenda" }) || [];
  const sdgMain = useWatch({ control: typedControl, name: "sdg_main" }) || [];
  const sdgSub = useWatch({ control: typedControl, name: "sdg_sub" }) || [];
  const watchedPartnerAgencies = useWatch({ control: typedControl, name: "partner_agencies" }) || [];
  const projectRegistrationGuidance = React.useMemo(
    () =>
      createProjectRegistrationGuidance(
        watchedPartnerAgencies.some((agency) => agency?.nature_of_partnership === "External")
      ),
    [watchedPartnerAgencies]
  );

  React.useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  React.useEffect(() => {
    form.setValue("department_unit", getDepartmentUnitLabel(currentDepartment, currentUnit), {
      shouldDirty: false,
    });
    if (!project) {
      form.setValue("project_leader_name", currentUserName, { shouldDirty: false });
    }
  }, [form, currentDepartment, currentUnit, currentUserName, project]);

  React.useEffect(() => {
    const years = getUniqueYears(inclusiveDates);
    if (years.length === 0) return;
    const currentRows = form.getValues("budget_summary") || [];
    const byYear = new Map(currentRows.map((item) => [item.year, item]));
    const nextRows = years.map((year) => {
      const existing = byYear.get(year);
      return (
        existing || {
          year,
          food_and_beverage: 0,
          travel: 0,
          suppliers_and_materials: 0,
          communication: 0,
          other_mooe: 0,
        }
      );
    });
    if (JSON.stringify(currentRows) !== JSON.stringify(nextRows)) {
      budgetYearsArray.replace(nextRows);
    }
  }, [inclusiveDates, form, budgetYearsArray]);

  const budgetGrandTotal = budgetSummary.reduce((sum, item) => sum + getBudgetRowTotal(item), 0);
  const remainingBudget = Number((budgetInput - budgetGrandTotal).toFixed(2));
  const budgetExceededAmount = remainingBudget < 0 ? Math.abs(remainingBudget) : 0;
  const isBudgetExceeded = budgetExceededAmount > 0;
  const displayedBudgetTotal = remainingBudget;

  const handleToggleValue = (fieldName: "extension_agenda" | "sdg_main" | "sdg_sub", value: string) => {
    const current = form.getValues(fieldName);
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    form.setValue(fieldName, next, { shouldDirty: true, shouldValidate: true });
  };

  const goNext = async () => {
    const fieldsByStep: Record<number, (keyof FormValues)[]> = {
      1: ["project_title", "budget", "start_date", "end_date", "extension_agenda", "sdg_main", "sdg_sub", "target_beneficiaries", "department_unit"],
      2: ["partner_agencies"],
      3: [
        "rationale",
        "objectives",
        "strategies",
        "publication_text",
        "patents_text",
        "people_services_text",
        "places_partnerships_text",
        "policy_text",
        "social_impact_text",
        "economic_impact_text",
        "environmental_impact_text",
      ],
      4: ["project_leader_name", "project_leader_employment", "budget_summary"],
      5: [],
    };
    const valid = await form.trigger(fieldsByStep[currentStep]);
    if (valid) {
      if (currentStep === 4) {
        // Automatically save when navigating to step 5
        form.handleSubmit(onSubmit as never)();
      }
      setCurrentStep((prev) => Math.min(5, prev + 1));
      document.getElementById("registration-scroll-area")?.scrollTo(0, 0);
    }
  };

  async function onSubmit(values: FormValues) {
    if (isViewOnly) return;
    setIsSubmitting(true);

    const startDate = parseDateInput(values.start_date);
    const endDate = parseDateInput(values.end_date);
    const utilizedBudgetTotal = values.budget_summary.reduce((sum, row) => sum + getBudgetRowTotal(row), 0);
    const remainingBudgetTotal = Number((Number(values.budget || 0) - utilizedBudgetTotal).toFixed(2));
    const generatedInclusiveDates = buildInclusiveDatesFromRange(startDate, endDate);
    if (!startDate || !endDate || generatedInclusiveDates.length === 0) {
      setIsSubmitting(false);
      alert("Please provide a valid project start date and end date using MM/dd/YYYY.");
      return;
    }
    const registrationData = {
      ...values,
      inclusive_dates: generatedInclusiveDates.map((item) => item.toISOString()),
      partner_agencies: values.partner_agencies.map((agency) => ({
        ...agency,
        bor_approval_date: agency.bor_approval_date ? agency.bor_approval_date.toISOString() : null,
        date_notarized: agency.date_notarized ? agency.date_notarized.toISOString() : null,
      })),
      needs_assessment_dates: values.needs_assessment_dates.map((item) => item.toISOString()),
      duration: getDurationLabel(generatedInclusiveDates),
      budget_summary_total: utilizedBudgetTotal,
      budget_remaining: remainingBudgetTotal,
    };
    const budgetRequirements = values.budget_summary.map((yearRow) => ({
      name: `Year ${yearRow.year}`,
      amount: getBudgetRowTotal(yearRow),
    }));
    const fundingType = values.partner_agencies.some((agency) => agency.nature_of_partnership === "External")
      ? "externally funded"
      : "internally funded";

    const payload = {
      entry_type: "project" as const,
      title: values.project_title,
      project_title: values.project_title,
      project_leader_id: currentUserId,
      classification: values.extension_agenda,
      sdg_goals: Array.from(new Set([...values.sdg_main, ...values.sdg_sub])),
      academic_program: values.department_unit,
      major: "",
      proponents: [{ name: values.project_leader_name }],
      co_project_leaders: values.co_project_leaders.map((item) => ({ name: item.name })),
      project_assistants: values.project_assistants.map((item) => ({ name: item.name })),
      college: currentDepartment || "CEIT",
      collaborating_agencies: values.partner_agencies.map((agency) => agency.name).join(", "),
      target_beneficiaries: [values.target_beneficiaries],
      community_location: values.partner_agencies[0]?.location || "",
      category: "new",
      funding_source: fundingType,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      budget_requirements: budgetRequirements,
      budget_total: remainingBudgetTotal,
      gad_score: 0,
      contact_person: values.project_leader_name,
      contact_details: values.partner_agencies[0]?.contact_details || "",
      lead_units: currentDepartment ? [currentDepartment] : [],
      related_curricular_offerings: currentUnit ? [currentUnit] : [],
      visibility_scope: "specific_units" as const,
      visible_units: currentUnit ? [currentUnit] : [],
      visible_departments: currentDepartment ? [currentDepartment] : [],
      documents: values.documents,
      partner_agencies: values.partner_agencies,
      funding_data: {
        registration_data: registrationData,
      },
    };

    const result = project?.id ? await updateProject(project.id, payload) : await createProject(payload);

    setIsSubmitting(false);
    if (result?.error) {
      alert(result.error);
      return;
    }
    onSuccess?.();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as never)} onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") e.preventDefault(); }} className="flex h-full flex-col bg-background">
        <FullscreenFormHeader
          title={project?.id ? (isViewOnly ? "Project Registration Details" : "Update Project Registration") : "Register a New Project"}
          currentStep={currentStep}
          totalSteps={5}
          labels={stepLabels}
          onClose={onClose}
          items={[
            { icon: Building2, label: "Department / Unit", value: watchedDepartmentUnit },
            { icon: CalendarIcon, label: "Duration", value: getDurationLabel(inclusiveDates) },
            { icon: Wallet, label: "Available Budget", value: formatPhpCurrency(displayedBudgetTotal) },
          ]}
        />

        <div id="registration-scroll-area" className="flex-1 overflow-y-auto bg-background px-4 py-5 sm:px-6 lg:px-8">
          <div className="w-full">
          {currentStep === 1 && (
            <div className="space-y-6">
              <Card className="rounded-3xl border-border/50 shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    Project Overview
                  </CardTitle>
                  <CardDescription className="text-xs">Capture the core project definition before moving into the partnership details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-5 lg:grid-cols-2">
                    <FormField control={form.control} name="project_title" render={({ field }) => (
                      <FormItem className="min-w-0"><FormLabel className="text-xs">Project Title</FormLabel><FormControl><Input {...field} disabled={isViewOnly} className="h-9 rounded-xl text-xs" /></FormControl><FormMessage className="text-xs" /></FormItem>
                    )} />
                    <FormField control={form.control} name="budget" render={({ field }) => (
                      <FormItem className="min-w-0"><FormLabel className="text-xs">Budget</FormLabel><FormControl><Input value={field.value === 0 ? "" : (field.value ?? "")} onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))} onBlur={field.onBlur} name={field.name} ref={field.ref} type="number" min="0" disabled={isViewOnly} className="h-9 rounded-xl text-xs" /></FormControl><FormMessage className="text-xs" /></FormItem>
                    )} />
                  </div>
                  <div className="grid gap-5 xl:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem className="min-w-0">
                          <FormLabel className="text-xs">Start Date</FormLabel>
                          <FormControl>
                            <DateTextField value={field.value} onChange={field.onChange} disabled={isViewOnly} />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="end_date"
                      render={({ field }) => (
                        <FormItem className="min-w-0">
                          <FormLabel className="text-xs">End Date</FormLabel>
                          <FormControl>
                            <DateTextField value={field.value} onChange={field.onChange} disabled={isViewOnly} />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormItem><FormLabel className="text-xs">Duration</FormLabel><Input value={getDurationLabel(inclusiveDates)} readOnly className="h-9 rounded-xl bg-muted/20 text-xs" /></FormItem>
                  </div>
                  <div className="space-y-3">
                    <div><Label className="text-xs">University Extension Agenda</Label><p className="text-xs text-muted-foreground">Select one or more agenda areas for this registration.</p></div>
                    <CheckboxGrid options={agendaOptions} values={extensionAgenda} onToggle={(value) => handleToggleValue("extension_agenda", value)} disabled={isViewOnly} />
                    {form.formState.errors.extension_agenda?.message && (
                      <p className="text-xs font-medium text-destructive">{form.formState.errors.extension_agenda.message}</p>
                    )}
                  </div>
                  <div className="grid gap-6 xl:grid-cols-2">
                    <div className="min-w-0 space-y-3"><div><Label className="text-xs">SDG Main</Label><p className="text-xs text-muted-foreground">Choose the primary SDGs linked to this project.</p></div><SdgGrid values={sdgMain} onToggle={(value) => handleToggleValue("sdg_main", value)} disabled={isViewOnly} />{form.formState.errors.sdg_main?.message && <p className="text-xs font-medium text-destructive">{form.formState.errors.sdg_main.message}</p>}</div>
                    <div className="min-w-0 space-y-3"><div><Label className="text-xs">SDG Sub</Label><p className="text-xs text-muted-foreground">Choose the supporting SDGs linked to this project.</p></div><SdgGrid values={sdgSub} onToggle={(value) => handleToggleValue("sdg_sub", value)} disabled={isViewOnly} />{form.formState.errors.sdg_sub?.message && <p className="text-xs font-medium text-destructive">{form.formState.errors.sdg_sub.message}</p>}</div>
                  </div>
                  <div className="grid gap-5 lg:grid-cols-2">
                    <FormField control={form.control} name="target_beneficiaries" render={({ field }) => (
                      <FormItem className="min-w-0"><FormLabel className="text-xs">Target Beneficiaries</FormLabel><FormControl><Input {...field} disabled={isViewOnly} placeholder="Example: 50 female" className="h-9 rounded-xl text-xs" /></FormControl><FormMessage className="text-xs" /></FormItem>
                    )} />
                    <FormField control={form.control} name="department_unit" render={({ field }) => (
                      <FormItem className="min-w-0"><FormLabel className="text-xs">Department / Unit</FormLabel><FormControl><Input {...field} readOnly className="h-9 rounded-xl bg-muted/20 text-xs" /></FormControl><FormMessage className="text-xs" /></FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold">Partner Agency Section</h3>
                  <p className="text-sm text-muted-foreground">Track every internal or external partner and its formal agreement details.</p>
                </div>
                {!isViewOnly && (
                  <Button
                    type="button"
                    className="rounded-xl"
                    onClick={() => partnerAgenciesArray.append({
                      name: "",
                      location: "",
                      category: "government",
                      head_designation: "",
                      contact_details: "",
                      nature_of_partnership: "Internal",
                      funding_agency_name: "",
                      level_of_partnership: "Local",
                      type_of_partnership: "MOA",
                      bor_approval_date: null,
                      date_notarized: null,
                      signatories: [{ designation: "", name: "" }],
                    })}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Partner Agency
                  </Button>
                )}
              </div>
              <div className="space-y-5">
                {partnerAgenciesArray.fields.map((field, index) => (
                  <PartnerAgencyFields key={field.id} control={typedControl} index={index} disabled={isViewOnly} onRemove={() => partnerAgenciesArray.remove(index)} />
                ))}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <Card className="rounded-3xl border-border/40 shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-5 w-5 text-primary" />
                    Project Design
                  </CardTitle>
                  <CardDescription className="text-xs">Define the rationale, objectives, strategies, and expected outcomes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField control={form.control} name="rationale" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Rationale</FormLabel><FormControl><Textarea {...field} disabled={isViewOnly} className="min-h-24 rounded-2xl text-xs" /></FormControl><FormMessage className="text-xs" /></FormItem>
                  )} />
                  <FormField control={form.control} name="objectives" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs">Objectives</FormLabel><FormControl><Textarea {...field} disabled={isViewOnly} className="min-h-24 rounded-2xl text-xs" /></FormControl><FormMessage className="text-xs" /></FormItem>
                  )} />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold">Strategies Section</h4>
                        <p className="text-xs text-muted-foreground">Add one or more strategy blocks for capacity building and technical assistance.</p>
                      </div>
                      {!isViewOnly && (
                        <Button type="button" variant="outline" className="rounded-xl" onClick={() => strategiesArray.append({ capacity_building: "", technical_assistance: "" })}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Strategy
                        </Button>
                      )}
                    </div>
                    <div className="space-y-4">
                      {strategiesArray.fields.map((field, index) => (
                        <div key={field.id} className="rounded-2xl border border-border/40 bg-background p-4">
                          <div className="mb-4 flex items-center justify-between">
                            <p className="text-xs font-semibold">Strategy {index + 1}</p>
                            {!isViewOnly && strategiesArray.fields.length > 1 && (
                              <Button type="button" variant="outline" className="h-9 rounded-xl text-destructive" onClick={() => strategiesArray.remove(index)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                              </Button>
                            )}
                          </div>
                          <div className="grid gap-4 2xl:grid-cols-2">
                            <FormField control={form.control} name={`strategies.${index}.capacity_building`} render={({ field }) => (
                              <FormItem><FormLabel className="text-xs">Capacity Building</FormLabel><FormControl><Textarea {...field} disabled={isViewOnly} className="min-h-20 rounded-2xl text-xs" /></FormControl><FormMessage className="text-xs" /></FormItem>
                            )} />
                            <FormField control={form.control} name={`strategies.${index}.technical_assistance`} render={({ field }) => (
                              <FormItem><FormLabel className="text-xs">Technical Assistance</FormLabel><FormControl><Textarea {...field} disabled={isViewOnly} className="min-h-20 rounded-2xl text-xs" /></FormControl><FormMessage className="text-xs" /></FormItem>
                            )} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div><h4 className="text-sm font-semibold">Expected Outputs (6Ps / 3Is)</h4><p className="text-xs text-muted-foreground">Capture the narrative details for each expected output.</p></div>
                    <div className="grid gap-4 2xl:grid-cols-2">
                      {[
                        ["publication_text", "Publication"],
                        ["patents_text", "Patents / IP"],
                        ["people_services_text", "People Services"],
                        ["places_partnerships_text", "Places and Partnerships"],
                        ["policy_text", "Policy"],
                        ["social_impact_text", "Social Impact"],
                        ["economic_impact_text", "Economic Impact"],
                        ["environmental_impact_text", "Environmental Impact"],
                      ].map(([textName, label]) => (
                        <div key={label} className="rounded-2xl border border-border/40 bg-background p-4">
                          <div className="space-y-4">
                            <FormField control={form.control} name={textName as never} render={({ field }) => (
                              <FormItem><FormLabel className="text-xs">{label}</FormLabel><FormControl><Textarea value={String(field.value ?? "")} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} disabled={isViewOnly} className="min-h-20 rounded-2xl text-xs" /></FormControl><FormMessage className="text-xs" /></FormItem>
                            )} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <Card className="rounded-3xl border-border/40 shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Briefcase className="h-5 w-5 text-primary" />
                    Organization and Staffing
                  </CardTitle>
                  <CardDescription className="text-xs">Complete the team structure, budget summary, needs assessment, and optional document uploads.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-2xl border border-border/40 bg-muted/10 p-4">
                    <div className="mb-4"><h4 className="text-sm font-semibold">Project Leader</h4><p className="text-xs text-muted-foreground">This is the primary owner of the registration.</p></div>
                    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_260px]">
                      <FormField control={form.control} name="project_leader_name" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">Project Leader</FormLabel><FormControl><Input {...field} disabled={isViewOnly} className="h-9 rounded-xl text-xs" /></FormControl><FormMessage className="text-xs" /></FormItem>
                      )} />
                      <FormField control={form.control} name="project_leader_employment" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Appointment</FormLabel>
                          <FormControl>
                            <RadioGroup value={field.value} onValueChange={field.onChange} disabled={isViewOnly} className="grid grid-cols-2 gap-2 pt-2">
                              {employmentOptions.map((option) => (
                                <label key={option} className={cn("flex items-center justify-center rounded-xl border border-border/40 px-3 py-2 text-xs", field.value === option && "border-primary/50 bg-primary/5 text-primary")}>
                                  <RadioGroupItem value={option} className="sr-only" />
                                  {option}
                                </label>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                  <StaffListFields control={typedControl} name="co_project_leaders" label="Co-Project Leaders" disabled={isViewOnly} />
                  <StaffListFields control={typedControl} name="project_coordinators" label="Project Coordinators" disabled={isViewOnly} />
                  <StaffListFields control={typedControl} name="project_facilitators" label="Project Facilitators" disabled={isViewOnly} />
                  <StaffListFields control={typedControl} name="project_assistants" label="Project Assistants" disabled={isViewOnly} />

                  <Card className="rounded-3xl border-border/40 shadow-none">
                    <CardHeader><CardTitle className="text-sm">Budget Summary</CardTitle><CardDescription className="text-xs">Budget rows are automatically generated from the project start date and end date, then grouped by year.</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                      {budgetYearsArray.fields.map((field, index) => (
                        <div key={field.id} className="rounded-2xl border border-border/40 bg-background p-4">
                          <div className="mb-4 flex items-center justify-between">
                            <p className="text-sm font-semibold">Year {form.getValues(`budget_summary.${index}.year`)}</p>
                            <p className="text-xs font-medium text-primary">Total: {formatPhpCurrency(getBudgetRowTotal(budgetSummary[index]))}</p>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
                            {[
                              ["food_and_beverage", "Food and Beverage"],
                              ["travel", "Travel"],
                              ["suppliers_and_materials", "Suppliers and Materials"],
                              ["communication", "Communication"],
                              ["other_mooe", "Other MOOE"],
                            ].map(([name, label]) => (
                              <FormField key={name} control={form.control} name={`budget_summary.${index}.${name}` as never} render={({ field }) => (
                                <FormItem><FormLabel className="text-xs">{label}</FormLabel><FormControl><Input value={field.value === 0 ? "" : (field.value ?? "")} onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))} onBlur={field.onBlur} name={field.name} ref={field.ref} type="number" min="0" disabled={isViewOnly} className="h-9 rounded-xl text-xs" /></FormControl><FormMessage className="text-xs" /></FormItem>
                              )} />
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-border/40 bg-muted/10 px-4 py-3 text-xs">
                          <span className="font-semibold text-foreground">Original Budget:</span> {` ${formatPhpCurrency(budgetInput)}`}
                        </div>
                        <div className="rounded-2xl border border-border/40 bg-muted/10 px-4 py-3 text-xs">
                          <span className="font-semibold text-foreground">Budget Summary Total:</span> {` ${formatPhpCurrency(budgetGrandTotal)}`}
                        </div>
                        <div className={cn("rounded-2xl border px-4 py-3 text-xs", isBudgetExceeded ? "border-destructive/40 bg-destructive/5 text-destructive" : "border-border/40 bg-muted/10")}>
                          <span className="font-semibold">Remaining Budget:</span> {` ${formatPhpCurrency(remainingBudget)}`}
                        </div>
                      </div>
                      {isBudgetExceeded ? (
                        <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <p>Budget summary exceeds the available budget by {formatPhpCurrency(budgetExceededAmount)}. Reduce the breakdown amounts before saving.</p>
                        </div>
                      ) : null}
                      {form.formState.errors.budget_summary?.message ? (
                        <p className="text-xs font-medium text-destructive">{form.formState.errors.budget_summary.message}</p>
                      ) : null}
                    </CardContent>
                  </Card>

                  <Card className="rounded-3xl border-border/40 shadow-none">
                    <CardHeader><CardTitle className="text-sm">Needs Assessment Section</CardTitle><CardDescription className="text-xs">This can be completed now or updated later with supporting files.</CardDescription></CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <FormField control={form.control} name="needs_assessment_title" render={({ field }) => (
                          <FormItem><FormLabel className="text-xs">Title of Needs Assessment</FormLabel><FormControl><Input {...field} disabled={isViewOnly} className="h-9 rounded-xl text-xs" /></FormControl><FormMessage className="text-xs" /></FormItem>
                        )} />
                        <FormField control={form.control} name="needs_assessment_place" render={({ field }) => (
                          <FormItem><FormLabel className="text-xs">Place Conducted</FormLabel><FormControl><Input {...field} disabled={isViewOnly} className="h-9 rounded-xl text-xs" /></FormControl><FormMessage className="text-xs" /></FormItem>
                        )} />
                      </div>
                      <FormField control={form.control} name="needs_assessment_dates" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">Dates Conducted</FormLabel><FormControl><MultiDatePicker value={field.value} onChange={field.onChange} disabled={isViewOnly} placeholder="Select assessment dates" /></FormControl><FormMessage className="text-xs" /></FormItem>
                      )} />
                      <FormField control={form.control} name="needs_assessment_results_used" render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">How results were used</FormLabel><FormControl><Textarea {...field} disabled={isViewOnly} className="min-h-20 rounded-2xl text-xs" /></FormControl><FormMessage className="text-xs" /></FormItem>
                      )} />
                    </CardContent>
                  </Card>

                  <Card className="rounded-3xl border-border/40 shadow-none">
                    <CardHeader><CardTitle className="text-sm">Upload Documents</CardTitle><CardDescription className="text-xs">Upload the project registration supporting files as PDF or Excel. Supabase remains the primary storage and Cloudinary is used only as secure backup storage when needed.</CardDescription></CardHeader>
                    <CardContent>
                      <FormField control={form.control} name="documents" render={({ field }) => (
                        <FormItem><FormControl><FileUpload value={field.value} onChange={field.onChange} disabled={isViewOnly} bucket="cqer-projects_pdfs" accept={DEFAULT_DOCUMENT_ACCEPT} guidance={projectRegistrationGuidance} /></FormControl><FormMessage className="text-xs" /></FormItem>
                      )} />
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <Card className="rounded-3xl border-border/40 shadow-none">
                <CardHeader>
                  <CardTitle className="text-center text-lg">{isSubmitting ? "Saving..." : "Project Registration Complete"}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center py-10">
                   <div className="rounded-full bg-primary/10 p-6 mb-4">
                     <Save className={cn("h-10 w-10 text-primary", isSubmitting && "animate-pulse")} />
                   </div>
                   <p className="max-w-md text-center text-sm text-muted-foreground mb-6">
                     It automatically saves changes now, just wait a moment. Your registration is being processed into the system.
                   </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
        <div className="border-t border-border/50 bg-background px-5 py-4 sm:px-7 lg:px-10">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">Step {currentStep} of {stepLabels.length}</div>
            <div className="flex flex-wrap justify-end gap-3">
              {currentStep > 1 && (
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => { setCurrentStep((prev) => Math.max(1, prev - 1)); document.getElementById("registration-scroll-area")?.scrollTo(0, 0); }}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
              )}
              {currentStep < 5 && (
                <Button type="button" className="rounded-xl" onClick={goNext}>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
