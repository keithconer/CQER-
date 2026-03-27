"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import {
  BookOpenCheck,
  Briefcase,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  MapPin,
  Plus,
  Save,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { StepIndicator } from "@/components/step-indicator";
import { FileUpload } from "@/components/dashboard/file-upload";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { DEPARTMENTS, getAllUnits } from "@/lib/departments";
import { createTraining, updateTraining } from "@/lib/actions/trainings";
import { THEMATIC_AREA_OPTIONS } from "@/lib/thematic-area";
import { cn } from "@/lib/utils";

const stepLabels = ["Training Details", "Committee", "Participants", "Saving"];

const sdgOptions = [
  "1 - No Poverty",
  "2 - Zero Hunger",
  "3 - Good Health and Well-being",
  "4 - Quality Education",
  "5 - Gender Equality",
  "6 - Clean Water and Sanitation",
  "7 - Affordable and Clean Energy",
  "8 - Decent Work and Economic Growth",
  "9 - Industry, Innovation and Infrastructure",
  "10 - Reduced Inequalities",
  "11 - Sustainable Cities and Communities",
  "12 - Responsible Consumption and Production",
  "13 - Climate Action",
  "14 - Life Below Water",
  "15 - Life on Land",
  "16 - Peace, Justice and Strong Institutions",
  "17 - Partnerships for the Goals",
] as const;

const categoryOptions = [
  { value: "TVL", label: "TVL - Technical, Vocational, Livelihood" },
  { value: "CE", label: "CE - Continuing Education for Professional" },
  { value: "GAD", label: "GAD - Gender and Development" },
  { value: "AE", label: "AE - Agricultural and Environmental Training" },
  { value: "BE", label: "BE - Basic Education" },
  { value: "OTHERS", label: "Others" },
] as const;

const modeOptions = [
  { value: "FTF", label: "F2F - Face-to-face" },
  { value: "O", label: "O - Online / Videoconferencing" },
  { value: "H", label: "H - Hybrid" },
] as const;

const partnerAmountTypeOptions = [
  { value: "estimated", label: "Estimated" },
  { value: "exact", label: "Exact" },
] as const;

const disabilityOptions = [
  "Visual impairment",
  "Hearing impairment",
  "Speech impairment",
  "Physical disability",
  "Psychosocial disability",
  "Intellectual disability",
  "Learning disability",
  "Other",
] as const;

const programOptions = Array.from(new Set([...DEPARTMENTS, ...getAllUnits()])).sort((a, b) =>
  a.localeCompare(b)
);

const textValue = z.string().trim().min(1, "This field is required.");
const optionalTextValue = z.string().trim().optional().or(z.literal(""));
const nonNegativeNumber = z.coerce.number().min(0, "Value must be 0 or greater.");

const ratingBreakdownSchema = z.object({
  "5": nonNegativeNumber.default(0),
  "4": nonNegativeNumber.default(0),
  "3": nonNegativeNumber.default(0),
  "2": nonNegativeNumber.default(0),
  "1": nonNegativeNumber.default(0),
});

const studentSchema = z.object({
  name: textValue,
  program: textValue,
});

const disabilitySchema = z.object({
  disability_type: textValue,
});

const formSchema = z
  .object({
    college: textValue,
    department: textValue,
    lead_units: z.array(z.string()).default([]),
    visibility_scope: z.enum(["department", "all_departments", "specific_departments"]).default("department"),
    visible_departments: z.array(z.string()).default([]),
    contact_person: textValue,
    contact_details: textValue,
    related_curricular_offerings: z.array(z.string()).default([]),
    training_title: z
      .string()
      .trim()
      .min(1, "Title of training is required.")
      .regex(/^[A-Za-z0-9\s.,()/-]+$/, "Use letters, numbers, and basic punctuation only."),
    related_project_id: optionalTextValue,
    related_project_title: optionalTextValue,
    date_mode: z.enum(["days", "hours"]).default("days"),
    inclusive_dates: z.array(z.date()).default([]),
    manual_hours: z.coerce.number().min(0).max(8).nullable().default(null),
    venue_platform: textValue,
    sdg_main: z.array(z.string()).min(1, "Select at least one main SDG."),
    sdg_sub: z.array(z.string()).min(1, "Select at least one sub SDG."),
    thematic_area: z.array(z.string()).min(1, "Select at least one thematic area."),
    training_category: z.enum(["TVL", "CE", "GAD", "AE", "BE", "OTHERS"]),
    training_category_other: optionalTextValue,
    training_mode: z.enum(["FTF", "O", "H"]),
    faculty_male: nonNegativeNumber.default(0),
    faculty_female: nonNegativeNumber.default(0),
    faculty_permanent: nonNegativeNumber.default(0),
    faculty_cos: nonNegativeNumber.default(0),
    non_academic_male: nonNegativeNumber.default(0),
    non_academic_female: nonNegativeNumber.default(0),
    cvsu_students: z.array(studentSchema).default([]),
    cvsu_students_male: nonNegativeNumber.default(0),
    cvsu_students_female: nonNegativeNumber.default(0),
    partner_agencies_male: nonNegativeNumber.default(0),
    partner_agencies_female: nonNegativeNumber.default(0),
    participants_male_total: nonNegativeNumber.default(0),
    participants_female_total: nonNegativeNumber.default(0),
    participants_overall_total: nonNegativeNumber.default(0),
    tvl_solo_parent: nonNegativeNumber.default(0),
    tvl_4ps_members: nonNegativeNumber.default(0),
    tvl_disabilities_count: nonNegativeNumber.default(0),
    tvl_disability_breakdown: z.array(disabilitySchema).default([]),
    total_persons_trained: nonNegativeNumber.default(0),
    conducted_days_count: nonNegativeNumber.default(0),
    days_multiplier: z.coerce.number().min(0).default(0),
    weighted_days_trained: z.coerce.number().min(0).default(0),
    days_trained_per_weight: z.coerce.number().min(0).default(0),
    total_trainees_surveyed: nonNegativeNumber.default(0),
    rating_relevance_breakdown: ratingBreakdownSchema,
    rating_quality_breakdown: ratingBreakdownSchema,
    rating_timeliness_breakdown: ratingBreakdownSchema,
    total_clients_requesting_trainings: nonNegativeNumber.default(0),
    total_requests_responded_next_3_days: nonNegativeNumber.default(0),
    amount_charged_to_cvsu: z.coerce.number().min(0).default(0),
    amount_charged_to_partner_agency: z.coerce.number().min(0).default(0),
    partner_agency_amount_type: z.enum(["estimated", "exact"]).default("estimated"),
    expense_partner_agency_name: optionalTextValue,
    partner_agencies: z.array(z.string()).default([]),
    remarks: optionalTextValue,
    documents: z
      .array(
        z.object({
          url: z.string(),
          name: z.string(),
        })
      )
      .default([]),
  })
  .superRefine((values, ctx) => {
    if (values.date_mode === "days" && values.inclusive_dates.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["inclusive_dates"],
        message: "Select at least one date.",
      });
    }

    if (values.date_mode === "hours" && (!values.manual_hours || values.manual_hours <= 0 || values.manual_hours > 8)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["manual_hours"],
        message: "Enter a value from 1 to 8 hours.",
      });
    }

    if (values.training_category === "OTHERS" && !values.training_category_other.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["training_category_other"],
        message: "Specify the category.",
      });
    }

    if (values.training_category === "TVL" && values.tvl_disabilities_count !== values.tvl_disability_breakdown.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tvl_disability_breakdown"],
        message: "Match the disability entries to the declared count.",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;
type RatingBreakdown = FormValues["rating_relevance_breakdown"];

export interface TrainingRecord {
  id: string;
  college: string;
  department: string;
  lead_units: string[] | null;
  visibility_scope?: "department" | "all_departments" | "specific_departments" | null;
  visible_departments?: string[] | null;
  contact_person: string;
  contact_details: string;
  related_curricular_offerings: string[] | null;
  training_title: string;
  related_project_id?: string | null;
  related_project_title?: string | null;
  date_mode: "days" | "hours";
  inclusive_dates: string[] | null;
  manual_hours: number | null;
  venue_platform: string;
  sdg_goals: string[] | null;
  sdg_main?: string[] | null;
  sdg_sub?: string[] | null;
  training_category: "TVL" | "CE" | "GAD" | "AE" | "BE" | "OTHERS";
  training_category_other: string | null;
  training_mode: "FTF" | "O" | "H";
  faculty_male: number;
  faculty_female: number;
  faculty_permanent?: number | null;
  faculty_cos?: number | null;
  non_academic_male: number;
  non_academic_female: number;
  cvsu_students?: { name: string; program: string }[] | null;
  cvsu_students_male: number;
  cvsu_students_female: number;
  partner_agencies_male: number;
  partner_agencies_female: number;
  participants_prefer_not_say?: number | null;
  participants_male_total: number;
  participants_female_total: number;
  participants_overall_total: number;
  category_student?: number | null;
  category_farmer?: number | null;
  category_fisherfolk?: number | null;
  category_ag_technical?: number | null;
  category_government_employee?: number | null;
  category_private_employee?: number | null;
  category_4ps?: number | null;
  category_others?: number | null;
  category_total?: number | null;
  tvl_solo_parent: number;
  tvl_4ps_members: number;
  tvl_disabilities_count: number;
  tvl_disability_breakdown: { disability_type: string }[] | null;
  tvl_total_persons_trained?: number | null;
  total_persons_trained?: number | null;
  conducted_days_count: number;
  days_multiplier: number;
  weighted_days_trained: number;
  days_trained_per_weight: number;
  total_trainees_surveyed: number;
  rating_relevance: number;
  rating_equality: number;
  rating_timeliness: number;
  rating_relevance_breakdown?: RatingBreakdown | null;
  rating_quality_breakdown?: RatingBreakdown | null;
  rating_timeliness_breakdown?: RatingBreakdown | null;
  total_clients_requesting_trainings: number;
  total_requests_responded_next_3_days: number;
  amount_charged_to_cvsu: number;
  amount_charged_to_partner_agency: number;
  partner_agency_amount_type?: "estimated" | "exact" | null;
  expense_partner_agency_name?: string | null;
  partner_agencies: string[] | null;
  thematic_area: string[] | null;
  remarks: string | null;
  documents: { url: string; name: string }[] | null;
  created_by?: string | null;
}

export interface TrainingProjectOption {
  id: string;
  title: string;
}

interface TrainingsFormProps {
  department: string;
  currentUserName: string;
  userType?: "super_admin" | "college_coordinator" | "unit_coordinator" | "extension_office" | "project_leader";
  unit?: string | null;
  unitOptions?: string[];
  existingPartnerAgencies?: string[];
  projectOptions?: TrainingProjectOption[];
  record?: TrainingRecord | null;
  isViewOnly?: boolean;
  onSuccess: (action: "created" | "updated") => void;
  onClose?: () => void;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function normalizeStudentArray(value: unknown): { name: string; program: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      name: String((item as { name?: unknown })?.name || "").trim(),
      program: String((item as { program?: unknown })?.program || "").trim(),
    }))
    .filter((item) => item.name && item.program);
}

function normalizeDisabilityArray(value: unknown): { disability_type: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      disability_type: String((item as { disability_type?: unknown })?.disability_type || "").trim(),
    }))
    .filter((item) => item.disability_type);
}

function normalizeRatingBreakdown(value: unknown): RatingBreakdown {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    "5": Number(source["5"] || 0),
    "4": Number(source["4"] || 0),
    "3": Number(source["3"] || 0),
    "2": Number(source["2"] || 0),
    "1": Number(source["1"] || 0),
  };
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

function getDayMultiplier(mode: "days" | "hours", dayCount: number) {
  if (mode === "hours") return 0.5;
  if (dayCount >= 5) return 2;
  if (dayCount >= 3) return 1.5;
  if (dayCount === 2) return 1.25;
  if (dayCount === 1) return 1;
  return 0;
}

function getAverageRating(breakdown: RatingBreakdown) {
  const totalResponses =
    breakdown["5"] + breakdown["4"] + breakdown["3"] + breakdown["2"] + breakdown["1"];
  if (totalResponses === 0) return 1;
  const weightedTotal =
    breakdown["5"] * 5 +
    breakdown["4"] * 4 +
    breakdown["3"] * 3 +
    breakdown["2"] * 2 +
    breakdown["1"];
  return Number((weightedTotal / totalResponses).toFixed(2));
}

function MultiDatePicker({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: Date[];
  onChange: (value: Date[]) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-11 w-full justify-start rounded-xl border-border/60 bg-background px-3 text-left text-sm font-normal",
            value.length === 0 && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          <span className="truncate">{value.length > 0 ? formatDateRange(value) : placeholder || "Select dates"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="multiple" selected={value} onSelect={(dates) => onChange(dates || [])} initialFocus />
      </PopoverContent>
    </Popover>
  );
}

function NumberField({
  control,
  name,
  label,
  disabled,
  readOnly = false,
}: {
  control: Control<FormValues>;
  name: keyof FormValues;
  label: string;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs">{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              min="0"
              value={field.value ?? 0}
              onChange={(event) => field.onChange(event.target.value === "" ? 0 : Number(event.target.value))}
              readOnly={readOnly}
              disabled={disabled}
              className={cn("h-10 rounded-xl text-sm", readOnly && "bg-muted/20")}
            />
          </FormControl>
          <FormMessage className="text-xs" />
        </FormItem>
      )}
    />
  );
}

function RatingBreakdownFields({
  control,
  name,
  title,
  disabled,
}: {
  control: Control<FormValues>;
  name: "rating_relevance_breakdown" | "rating_quality_breakdown" | "rating_timeliness_breakdown";
  title: string;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-background p-4">
      <div className="mb-4">
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        {(["5", "4", "3", "2", "1"] as const).map((score) => (
          <FormField
            key={score}
            control={control}
            name={`${name}.${score}`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">{score}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    value={field.value ?? 0}
                    onChange={(event) => field.onChange(event.target.value === "" ? 0 : Number(event.target.value))}
                    disabled={disabled}
                    className="h-10 rounded-xl text-sm"
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        ))}
      </div>
    </div>
  );
}

function StudentFields({
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
  return (
    <div className="rounded-2xl border border-border/40 bg-background p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Student {index + 1}</p>
        {!disabled && (
          <Button type="button" variant="outline" className="rounded-xl text-destructive" onClick={onRemove}>
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </Button>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <FormField
          control={control}
          name={`cvsu_students.${index}.name`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Name</FormLabel>
              <FormControl>
                <Input {...field} disabled={disabled} className="h-10 rounded-xl text-sm" />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`cvsu_students.${index}.program`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Program</FormLabel>
              <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                <FormControl>
                  <SelectTrigger className="h-10 rounded-xl text-sm">
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {programOptions.map((option) => (
                    <SelectItem key={option} value={option} className="text-sm">
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

function buildDefaultValues(
  record: TrainingRecord | null | undefined,
  department: string,
  currentUserName: string,
  unit?: string | null
): FormValues {
  return {
    college: record?.college || "CEIT",
    department: record?.department || department || "",
    lead_units: normalizeStringArray(record?.lead_units).length > 0 ? normalizeStringArray(record?.lead_units) : unit ? [unit] : [],
    visibility_scope: record?.visibility_scope || "department",
    visible_departments: normalizeStringArray(record?.visible_departments),
    contact_person: record?.contact_person || currentUserName,
    contact_details: record?.contact_details || [department, unit].filter(Boolean).join(" / ") || "N/A",
    related_curricular_offerings:
      normalizeStringArray(record?.related_curricular_offerings).length > 0
        ? normalizeStringArray(record?.related_curricular_offerings)
        : unit
          ? [unit]
          : [],
    training_title: record?.training_title || "",
    related_project_id: String(record?.related_project_id || ""),
    related_project_title: String(record?.related_project_title || ""),
    date_mode: record?.date_mode || "days",
    inclusive_dates: toDateArray(record?.inclusive_dates),
    manual_hours: record?.manual_hours ?? null,
    venue_platform: record?.venue_platform || "",
    sdg_main: normalizeStringArray(record?.sdg_main),
    sdg_sub: normalizeStringArray(record?.sdg_sub),
    thematic_area: normalizeStringArray(record?.thematic_area),
    training_category: record?.training_category || "TVL",
    training_category_other: record?.training_category_other || "",
    training_mode: record?.training_mode || "FTF",
    faculty_male: Number(record?.faculty_male || 0),
    faculty_female: Number(record?.faculty_female || 0),
    faculty_permanent: Number(record?.faculty_permanent || 0),
    faculty_cos: Number(record?.faculty_cos || 0),
    non_academic_male: Number(record?.non_academic_male || 0),
    non_academic_female: Number(record?.non_academic_female || 0),
    cvsu_students: normalizeStudentArray(record?.cvsu_students),
    cvsu_students_male: Number(record?.cvsu_students_male || 0),
    cvsu_students_female: Number(record?.cvsu_students_female || 0),
    partner_agencies_male: Number(record?.partner_agencies_male || 0),
    partner_agencies_female: Number(record?.partner_agencies_female || 0),
    participants_male_total: Number(record?.participants_male_total || 0),
    participants_female_total: Number(record?.participants_female_total || 0),
    participants_overall_total: Number(record?.participants_overall_total || 0),
    tvl_solo_parent: Number(record?.tvl_solo_parent || 0),
    tvl_4ps_members: Number(record?.tvl_4ps_members || 0),
    tvl_disabilities_count: Number(record?.tvl_disabilities_count || 0),
    tvl_disability_breakdown: normalizeDisabilityArray(record?.tvl_disability_breakdown),
    total_persons_trained: Number(record?.total_persons_trained || record?.tvl_total_persons_trained || record?.participants_overall_total || 0),
    conducted_days_count: Number(record?.conducted_days_count || 0),
    days_multiplier: Number(record?.days_multiplier || 0),
    weighted_days_trained: Number(record?.weighted_days_trained || 0),
    days_trained_per_weight: Number(record?.days_trained_per_weight || 0),
    total_trainees_surveyed: Number(record?.total_trainees_surveyed || 0),
    rating_relevance_breakdown: normalizeRatingBreakdown(record?.rating_relevance_breakdown),
    rating_quality_breakdown: normalizeRatingBreakdown(record?.rating_quality_breakdown),
    rating_timeliness_breakdown: normalizeRatingBreakdown(record?.rating_timeliness_breakdown),
    total_clients_requesting_trainings: Number(record?.total_clients_requesting_trainings || 0),
    total_requests_responded_next_3_days: Number(record?.total_requests_responded_next_3_days || 0),
    amount_charged_to_cvsu: Number(record?.amount_charged_to_cvsu || 0),
    amount_charged_to_partner_agency: Number(record?.amount_charged_to_partner_agency || 0),
    partner_agency_amount_type: record?.partner_agency_amount_type || "estimated",
    expense_partner_agency_name:
      record?.expense_partner_agency_name || normalizeStringArray(record?.partner_agencies)[0] || "",
    partner_agencies: normalizeStringArray(record?.partner_agencies),
    remarks: record?.remarks || "",
    documents: Array.isArray(record?.documents) ? record.documents : [],
  };
}

export function TrainingsForm({
  department,
  currentUserName,
  unit,
  existingPartnerAgencies = [],
  projectOptions = [],
  record,
  isViewOnly = false,
  onSuccess,
  onClose,
}: TrainingsFormProps) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const autoSubmitStartedRef = React.useRef(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: buildDefaultValues(record, department, currentUserName, unit),
  });

  const studentArray = useFieldArray({
    control: form.control,
    name: "cvsu_students",
  });

  const disabilityArray = useFieldArray({
    control: form.control,
    name: "tvl_disability_breakdown",
  });

  const dateMode = useWatch({ control: form.control, name: "date_mode" });
  const selectedDates = useWatch({ control: form.control, name: "inclusive_dates" }) || [];
  const manualHours = Number(useWatch({ control: form.control, name: "manual_hours" }) || 0);
  const trainingCategory = useWatch({ control: form.control, name: "training_category" });
  const disabilityCount = Number(useWatch({ control: form.control, name: "tvl_disabilities_count" }) || 0);

  const facultyMale = Number(useWatch({ control: form.control, name: "faculty_male" }) || 0);
  const facultyFemale = Number(useWatch({ control: form.control, name: "faculty_female" }) || 0);
  const nonAcademicMale = Number(useWatch({ control: form.control, name: "non_academic_male" }) || 0);
  const nonAcademicFemale = Number(useWatch({ control: form.control, name: "non_academic_female" }) || 0);
  const studentsMale = Number(useWatch({ control: form.control, name: "cvsu_students_male" }) || 0);
  const studentsFemale = Number(useWatch({ control: form.control, name: "cvsu_students_female" }) || 0);
  const partnerMale = Number(useWatch({ control: form.control, name: "partner_agencies_male" }) || 0);
  const partnerFemale = Number(useWatch({ control: form.control, name: "partner_agencies_female" }) || 0);

  const maleTotal = facultyMale + nonAcademicMale + studentsMale + partnerMale;
  const femaleTotal = facultyFemale + nonAcademicFemale + studentsFemale + partnerFemale;
  const grandTotal = maleTotal + femaleTotal;
  const conductedDays = dateMode === "days" ? selectedDates.length : 0;
  const dayMultiplier = getDayMultiplier(dateMode, conductedDays);
  const daysTrainedPerWeight = dateMode === "hours" ? 0.5 : Number((conductedDays * dayMultiplier).toFixed(2));
  const weightedDaysTrained = Number((grandTotal * daysTrainedPerWeight).toFixed(2));

  React.useEffect(() => {
    form.setValue("participants_male_total", maleTotal, { shouldDirty: true });
    form.setValue("participants_female_total", femaleTotal, { shouldDirty: true });
    form.setValue("participants_overall_total", grandTotal, { shouldDirty: true });
    form.setValue("total_persons_trained", grandTotal, { shouldDirty: true });
    form.setValue("conducted_days_count", conductedDays, { shouldDirty: true });
    form.setValue("days_multiplier", dayMultiplier, { shouldDirty: true });
    form.setValue("days_trained_per_weight", daysTrainedPerWeight, { shouldDirty: true });
    form.setValue("weighted_days_trained", weightedDaysTrained, { shouldDirty: true });
  }, [conductedDays, dayMultiplier, daysTrainedPerWeight, femaleTotal, form, grandTotal, maleTotal, weightedDaysTrained]);

  React.useEffect(() => {
    const currentLength = disabilityArray.fields.length;
    if (disabilityCount > currentLength) {
      for (let index = currentLength; index < disabilityCount; index += 1) {
        disabilityArray.append({ disability_type: "" });
      }
    } else if (disabilityCount < currentLength) {
      for (let index = currentLength; index > disabilityCount; index -= 1) {
        disabilityArray.remove(index - 1);
      }
    }
  }, [disabilityArray, disabilityCount]);

  React.useEffect(() => {
    if (currentStep < 4) {
      autoSubmitStartedRef.current = false;
    }
  }, [currentStep]);

  const stepOneFields: (keyof FormValues)[] = [
    "training_title",
    "venue_platform",
    "sdg_main",
    "sdg_sub",
    "thematic_area",
    "training_category",
    "training_mode",
  ];
  const stepTwoFields: (keyof FormValues)[] = [
    "faculty_male",
    "faculty_female",
    "faculty_permanent",
    "faculty_cos",
    "non_academic_male",
    "non_academic_female",
    "cvsu_students_male",
    "cvsu_students_female",
    "partner_agencies_male",
    "partner_agencies_female",
  ];
  const stepThreeFields: (keyof FormValues)[] = [
    "total_trainees_surveyed",
    "amount_charged_to_cvsu",
    "amount_charged_to_partner_agency",
    "partner_agency_amount_type",
  ];

  async function validateStep(step: number) {
    if (step === 1) {
      const targetFields = [...stepOneFields, dateMode === "days" ? "inclusive_dates" : "manual_hours"];
      return form.trigger(targetFields, { shouldFocus: true });
    }
    if (step === 2) {
      return form.trigger(stepTwoFields, { shouldFocus: true });
    }
    if (step === 3) {
      return form.trigger(stepThreeFields, { shouldFocus: true });
    }
    return true;
  }

  async function goNext() {
    const valid = await validateStep(currentStep);
    if (!valid) return;
    setCurrentStep((previous) => Math.min(4, previous + 1));
    document.getElementById("trainings-scroll-area")?.scrollTo(0, 0);
  }

  function goPrevious() {
    setCurrentStep((previous) => Math.max(1, previous - 1));
    document.getElementById("trainings-scroll-area")?.scrollTo(0, 0);
  }

  const handleSubmit = React.useCallback(async (values: FormValues) => {
    setIsSubmitting(true);
    const selectedProject = projectOptions.find((item) => item.id === values.related_project_id);
    const payload = {
      college: values.college,
      department: values.department,
      lead_units: values.lead_units,
      visibility_scope: values.visibility_scope,
      visible_departments: values.visible_departments,
      contact_person: values.contact_person,
      contact_details: values.contact_details,
      related_curricular_offerings: values.related_curricular_offerings,
      training_title: values.training_title,
      related_project_id: values.related_project_id || null,
      related_project_title: selectedProject?.title || values.related_project_title || "",
      date_mode: values.date_mode,
      inclusive_dates: sortDates(values.inclusive_dates).map((date) => format(date, "yyyy-MM-dd")),
      manual_hours: values.date_mode === "hours" ? values.manual_hours : null,
      venue_platform: values.venue_platform,
      sdg_goals: Array.from(new Set([...values.sdg_main, ...values.sdg_sub])),
      sdg_main: values.sdg_main,
      sdg_sub: values.sdg_sub,
      training_category: values.training_category,
      training_category_other: values.training_category_other,
      training_mode: values.training_mode,
      faculty_male: values.faculty_male,
      faculty_female: values.faculty_female,
      faculty_permanent: values.faculty_permanent,
      faculty_cos: values.faculty_cos,
      non_academic_male: values.non_academic_male,
      non_academic_female: values.non_academic_female,
      cvsu_students: values.cvsu_students,
      cvsu_students_male: values.cvsu_students_male,
      cvsu_students_female: values.cvsu_students_female,
      partner_agencies_male: values.partner_agencies_male,
      partner_agencies_female: values.partner_agencies_female,
      participants_prefer_not_say: 0,
      participants_male_total: values.participants_male_total,
      participants_female_total: values.participants_female_total,
      participants_overall_total: values.participants_overall_total,
      category_student: 0,
      category_farmer: 0,
      category_fisherfolk: 0,
      category_ag_technical: 0,
      category_government_employee: 0,
      category_private_employee: 0,
      category_4ps: 0,
      category_others: 0,
      category_total: values.participants_overall_total,
      tvl_solo_parent: values.training_category === "TVL" ? values.tvl_solo_parent : 0,
      tvl_4ps_members: values.training_category === "TVL" ? values.tvl_4ps_members : 0,
      tvl_disabilities_count: values.training_category === "TVL" ? values.tvl_disabilities_count : 0,
      tvl_disability_breakdown: values.training_category === "TVL" ? values.tvl_disability_breakdown : [],
      tvl_total_persons_trained: values.total_persons_trained,
      total_persons_trained: values.total_persons_trained,
      conducted_days_count: values.conducted_days_count,
      days_multiplier: values.days_multiplier,
      weighted_days_trained: values.weighted_days_trained,
      days_trained_per_weight: values.days_trained_per_weight,
      total_trainees_surveyed: values.total_trainees_surveyed,
      rating_relevance: getAverageRating(values.rating_relevance_breakdown),
      rating_equality: getAverageRating(values.rating_quality_breakdown),
      rating_timeliness: getAverageRating(values.rating_timeliness_breakdown),
      rating_relevance_breakdown: values.rating_relevance_breakdown,
      rating_quality_breakdown: values.rating_quality_breakdown,
      rating_timeliness_breakdown: values.rating_timeliness_breakdown,
      total_clients_requesting_trainings: values.total_clients_requesting_trainings,
      total_requests_responded_next_3_days: values.total_requests_responded_next_3_days,
      amount_charged_to_cvsu: values.amount_charged_to_cvsu,
      amount_charged_to_partner_agency: values.amount_charged_to_partner_agency,
      partner_agency_amount_type: values.partner_agency_amount_type,
      expense_partner_agency_name: values.expense_partner_agency_name,
      partner_agencies: values.expense_partner_agency_name ? [values.expense_partner_agency_name] : [],
      thematic_area: values.thematic_area,
      remarks: values.remarks || "",
      documents: values.documents,
    };

    const result = record?.id ? await updateTraining(record.id, payload) : await createTraining(payload);
    setIsSubmitting(false);

    if (result?.error) {
      alert(result.error);
      setCurrentStep(3);
      return;
    }

    onSuccess(record?.id ? "updated" : "created");
  }, [onSuccess, projectOptions, record]);

  React.useEffect(() => {
    if (currentStep !== 4 || isViewOnly || autoSubmitStartedRef.current) return;
    autoSubmitStartedRef.current = true;
    const timeout = window.setTimeout(() => {
      void form.handleSubmit(handleSubmit)();
    }, 1200);
    return () => window.clearTimeout(timeout);
  }, [currentStep, form, handleSubmit, isViewOnly]);

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => event.preventDefault()}
        className="flex h-full min-h-0 flex-col bg-background"
      >
        <div className="border-b border-border/50 bg-background px-5 py-4 sm:px-7 lg:px-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-2xl bg-[#159E44]/10 p-2">
                  <BookOpenCheck className="h-5 w-5 text-[#159E44]" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {isViewOnly ? "Training Record" : record?.id ? "Update Training" : "Create Training"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Capture the training profile with the same clean, step-based experience used in project registration.
                  </p>
                </div>
              </div>
            </div>
            <Button type="button" variant="outline" className="rounded-xl" onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
          </div>
          <div className="mt-6">
            <StepIndicator currentStep={currentStep} totalSteps={stepLabels.length} labels={stepLabels} />
          </div>
        </div>

        <div id="trainings-scroll-area" className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7 lg:px-10">
          {currentStep === 1 && (
            <div className="space-y-6">
              <Card className="rounded-3xl border-border/40 shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    Training Details
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Capture the title, schedule, SDGs, thematic area, category, method, and project link.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 xl:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="training_title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Title of Training</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={isViewOnly} className="h-10 rounded-xl text-sm" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="venue_platform"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Venue / Platform</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input {...field} disabled={isViewOnly} className="h-10 rounded-xl pl-10 text-sm" />
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="rounded-2xl border border-border/40 bg-muted/10 p-4">
                    <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_200px_200px]">
                      <FormField
                        control={form.control}
                        name="date_mode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Dates Conducted</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange} disabled={isViewOnly}>
                              <FormControl>
                                <SelectTrigger className="h-10 rounded-xl text-sm">
                                  <SelectValue placeholder="Select mode" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="days" className="text-sm">Inclusive dates</SelectItem>
                                <SelectItem value="hours" className="text-sm">Less than 8 hours</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                      {dateMode === "days" ? (
                        <FormField
                          control={form.control}
                          name="inclusive_dates"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Inclusive Dates</FormLabel>
                              <FormControl>
                                <MultiDatePicker
                                  value={field.value}
                                  onChange={field.onChange}
                                  disabled={isViewOnly}
                                  placeholder="Select one or more dates"
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      ) : (
                        <FormField
                          control={form.control}
                          name="manual_hours"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Number of Hours</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Clock3 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    type="number"
                                    min="1"
                                    max="8"
                                    value={field.value ?? ""}
                                    onChange={(event) => field.onChange(event.target.value === "" ? null : Number(event.target.value))}
                                    disabled={isViewOnly}
                                    className="h-10 rounded-xl pl-10 text-sm"
                                    placeholder="e.g. 6"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      )}
                      <FormItem>
                        <FormLabel className="text-xs">Number of Days</FormLabel>
                        <Input value={String(conductedDays)} readOnly className="h-10 rounded-xl bg-muted/20 text-sm" />
                      </FormItem>
                      <FormItem>
                        <FormLabel className="text-xs">Number of Hours</FormLabel>
                        <Input value={dateMode === "hours" ? String(manualHours) : "-"} readOnly className="h-10 rounded-xl bg-muted/20 text-sm" />
                      </FormItem>
                    </div>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="sdg_main"
                      render={({ field }) => (
                        <FormItem className="rounded-2xl border border-border/40 bg-background p-4">
                          <FormLabel className="text-sm font-semibold">SDG Main</FormLabel>
                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            {sdgOptions.map((option) => (
                              <label key={option} className="flex items-start gap-3 rounded-xl border border-border/40 px-3 py-2">
                                <Checkbox
                                  checked={field.value.includes(option)}
                                  disabled={isViewOnly}
                                  onCheckedChange={() =>
                                    field.onChange(
                                      field.value.includes(option)
                                        ? field.value.filter((item) => item !== option)
                                        : [...field.value, option]
                                    )
                                  }
                                />
                                <span className="text-xs leading-5">{option}</span>
                              </label>
                            ))}
                          </div>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sdg_sub"
                      render={({ field }) => (
                        <FormItem className="rounded-2xl border border-border/40 bg-background p-4">
                          <FormLabel className="text-sm font-semibold">SDG Sub</FormLabel>
                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            {sdgOptions.map((option) => (
                              <label key={option} className="flex items-start gap-3 rounded-xl border border-border/40 px-3 py-2">
                                <Checkbox
                                  checked={field.value.includes(option)}
                                  disabled={isViewOnly}
                                  onCheckedChange={() =>
                                    field.onChange(
                                      field.value.includes(option)
                                        ? field.value.filter((item) => item !== option)
                                        : [...field.value, option]
                                    )
                                  }
                                />
                                <span className="text-xs leading-5">{option}</span>
                              </label>
                            ))}
                          </div>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="thematic_area"
                    render={({ field }) => (
                      <FormItem className="rounded-2xl border border-border/40 bg-background p-4">
                        <FormLabel className="text-sm font-semibold">Thematic Area</FormLabel>
                        <div className="mt-4 grid gap-2 lg:grid-cols-2">
                          {THEMATIC_AREA_OPTIONS.map((option) => (
                            <label key={option.value} className="flex items-start gap-3 rounded-xl border border-border/40 px-3 py-2">
                              <Checkbox
                                checked={field.value.includes(option.value)}
                                disabled={isViewOnly}
                                onCheckedChange={() =>
                                  field.onChange(
                                    field.value.includes(option.value)
                                      ? field.value.filter((item) => item !== option.value)
                                      : [...field.value, option.value]
                                  )
                                }
                              />
                              <span className="text-xs leading-5">{option.label}</span>
                            </label>
                          ))}
                        </div>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 xl:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="training_category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Category of Training</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange} disabled={isViewOnly}>
                            <FormControl>
                              <SelectTrigger className="h-10 rounded-xl text-sm">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categoryOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value} className="text-sm">
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="training_mode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Mode / Method of Training</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange} disabled={isViewOnly}>
                            <FormControl>
                              <SelectTrigger className="h-10 rounded-xl text-sm">
                                <SelectValue placeholder="Select mode" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {modeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value} className="text-sm">
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  {trainingCategory === "OTHERS" && (
                    <FormField
                      control={form.control}
                      name="training_category_other"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Please Specify</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={isViewOnly} className="h-10 rounded-xl text-sm" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="related_project_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Name of the Project if Part of the Project</FormLabel>
                        <Select
                          value={field.value || "none"}
                          onValueChange={(value) => {
                            const normalizedValue = value === "none" ? "" : value;
                            field.onChange(normalizedValue);
                            const selected = projectOptions.find((project) => project.id === normalizedValue);
                            form.setValue("related_project_title", selected?.title || "", { shouldDirty: true });
                          }}
                          disabled={isViewOnly}
                        >
                          <FormControl>
                            <SelectTrigger className="h-10 rounded-xl text-sm">
                              <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none" className="text-sm">Not linked to a project</SelectItem>
                            {projectOptions.map((project) => (
                              <SelectItem key={project.id} value={project.id} className="text-sm">
                                {project.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <Card className="rounded-3xl border-border/40 shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-5 w-5 text-primary" />
                    Organizing Committee
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Enter committee counts and list CvSU student organizers with their programs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 xl:grid-cols-2">
                    <Card className="rounded-2xl border-border/40 shadow-none">
                      <CardHeader><CardTitle className="text-sm">Faculty Member</CardTitle></CardHeader>
                      <CardContent className="grid gap-4 md:grid-cols-2">
                        <NumberField control={form.control} name="faculty_male" label="Male" disabled={isViewOnly} />
                        <NumberField control={form.control} name="faculty_female" label="Female" disabled={isViewOnly} />
                        <NumberField control={form.control} name="faculty_permanent" label="Permanent" disabled={isViewOnly} />
                        <NumberField control={form.control} name="faculty_cos" label="COS" disabled={isViewOnly} />
                      </CardContent>
                    </Card>
                    <Card className="rounded-2xl border-border/40 shadow-none">
                      <CardHeader><CardTitle className="text-sm">Non-Acad</CardTitle></CardHeader>
                      <CardContent className="grid gap-4 md:grid-cols-2">
                        <NumberField control={form.control} name="non_academic_male" label="Male" disabled={isViewOnly} />
                        <NumberField control={form.control} name="non_academic_female" label="Female" disabled={isViewOnly} />
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="rounded-2xl border-border/40 shadow-none">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                      <div>
                        <CardTitle className="text-sm">CvSU Students</CardTitle>
                        <CardDescription className="text-xs">Add names dynamically and assign programs from existing departments and units.</CardDescription>
                      </div>
                      {!isViewOnly && (
                        <Button
                          type="button"
                          className="rounded-xl bg-[#159E44] text-white hover:bg-[#128A3B]"
                          onClick={() => studentArray.append({ name: "", program: "" })}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Student
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <NumberField control={form.control} name="cvsu_students_male" label="Male" disabled={isViewOnly} />
                        <NumberField control={form.control} name="cvsu_students_female" label="Female" disabled={isViewOnly} />
                      </div>
                      {studentArray.fields.length > 0 ? (
                        <div className="space-y-4">
                          {studentArray.fields.map((field, index) => (
                            <StudentFields
                              key={field.id}
                              control={form.control}
                              index={index}
                              disabled={isViewOnly}
                              onRemove={() => studentArray.remove(index)}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-border/50 px-4 py-8 text-center text-sm text-muted-foreground">
                          No CvSU student names added yet.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-border/40 shadow-none">
                    <CardHeader><CardTitle className="text-sm">Partner Agencies</CardTitle></CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      <NumberField control={form.control} name="partner_agencies_male" label="Male" disabled={isViewOnly} />
                      <NumberField control={form.control} name="partner_agencies_female" label="Female" disabled={isViewOnly} />
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </div>
          )}
          {currentStep === 3 && (
            <div className="space-y-6">
              <Card className="rounded-3xl border-border/40 shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Briefcase className="h-5 w-5 text-primary" />
                    Participants and Expenses
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Review all participant totals, training weight calculations, satisfaction ratings, and expenses.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      { label: "Faculty Member", male: facultyMale, female: facultyFemale },
                      { label: "Non-Acad", male: nonAcademicMale, female: nonAcademicFemale },
                      { label: "CvSU Students", male: studentsMale, female: studentsFemale },
                      { label: "Partner Agencies", male: partnerMale, female: partnerFemale },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border border-border/40 bg-background p-4">
                        <p className="text-xs font-semibold text-muted-foreground">{item.label}</p>
                        <div className="mt-3 space-y-1 text-sm">
                          <p>Male: <span className="font-semibold">{item.male}</span></p>
                          <p>Female: <span className="font-semibold">{item.female}</span></p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <NumberField control={form.control} name="participants_male_total" label="Total Male" disabled readOnly />
                    <NumberField control={form.control} name="participants_female_total" label="Total Female" disabled readOnly />
                    <NumberField control={form.control} name="participants_overall_total" label="Grand Total of Participants" disabled readOnly />
                  </div>

                  {trainingCategory === "TVL" && (
                    <Card className="rounded-2xl border-border/40 shadow-none">
                      <CardHeader><CardTitle className="text-sm">TVL-Specific Fields</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 lg:grid-cols-3">
                          <NumberField control={form.control} name="tvl_solo_parent" label="Solo Parents" disabled={isViewOnly} />
                          <NumberField control={form.control} name="tvl_4ps_members" label="4PS Members" disabled={isViewOnly} />
                          <NumberField control={form.control} name="tvl_disabilities_count" label="With Disabilities" disabled={isViewOnly} />
                        </div>
                        {disabilityArray.fields.length > 0 && (
                          <div className="grid gap-4 lg:grid-cols-2">
                            {disabilityArray.fields.map((field, index) => (
                              <FormField
                                key={field.id}
                                control={form.control}
                                name={`tvl_disability_breakdown.${index}.disability_type`}
                                render={({ field: itemField }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Disability Type {index + 1}</FormLabel>
                                    <Select value={itemField.value} onValueChange={itemField.onChange} disabled={isViewOnly}>
                                      <FormControl>
                                        <SelectTrigger className="h-10 rounded-xl text-sm">
                                          <SelectValue placeholder="Select disability" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {disabilityOptions.map((option) => (
                                          <SelectItem key={option} value={option} className="text-sm">
                                            {option}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage className="text-xs" />
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <NumberField control={form.control} name="total_persons_trained" label="Total Persons Trained" disabled readOnly />
                    <NumberField control={form.control} name="conducted_days_count" label="Number of Days" disabled readOnly />
                    <NumberField control={form.control} name="days_multiplier" label="Weight Multiplier" disabled readOnly />
                    <NumberField control={form.control} name="days_trained_per_weight" label="Days Trained per Weight" disabled readOnly />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <NumberField control={form.control} name="weighted_days_trained" label="Weighted Days Trained" disabled readOnly />
                    <NumberField control={form.control} name="total_trainees_surveyed" label="Total Number of Trainees Surveyed" disabled={isViewOnly} />
                  </div>

                  <RatingBreakdownFields control={form.control} name="rating_relevance_breakdown" title="Clients Ratings Based on Relevance of the Training" disabled={isViewOnly} />
                  <RatingBreakdownFields control={form.control} name="rating_quality_breakdown" title="Clients Ratings Based on Quality of the Training" disabled={isViewOnly} />
                  <RatingBreakdownFields control={form.control} name="rating_timeliness_breakdown" title="Clients Ratings Based on Timeliness of the Training" disabled={isViewOnly} />

                  <div className="grid gap-4 md:grid-cols-2">
                    <NumberField control={form.control} name="total_clients_requesting_trainings" label="Total Number of Clients Requesting Trainings" disabled={isViewOnly} />
                    <NumberField control={form.control} name="total_requests_responded_next_3_days" label="Requests Responded in the Next 3 Days" disabled={isViewOnly} />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-primary" />
                      <h3 className="text-sm font-semibold">Training Expenses and Source of Funds</h3>
                    </div>
                    <div className="grid gap-4 xl:grid-cols-2">
                      <NumberField control={form.control} name="amount_charged_to_cvsu" label="Amount Charged to CvSU" disabled={isViewOnly} />
                      <NumberField control={form.control} name="amount_charged_to_partner_agency" label="Amount Charged to Partner Agency" disabled={isViewOnly} />
                    </div>
                    <div className="grid gap-4 xl:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="partner_agency_amount_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Partner Agency Amount Type</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange} disabled={isViewOnly}>
                              <FormControl>
                                <SelectTrigger className="h-10 rounded-xl text-sm">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {partnerAmountTypeOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value} className="text-sm">
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="expense_partner_agency_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Name of Partner Agency</FormLabel>
                            <Select
                              value={field.value || "none"}
                              onValueChange={(value) => {
                                const nextValue = value === "none" ? "" : value;
                                field.onChange(nextValue);
                                form.setValue("partner_agencies", nextValue ? [nextValue] : [], { shouldDirty: true });
                              }}
                              disabled={isViewOnly}
                            >
                              <FormControl>
                                <SelectTrigger className="h-10 rounded-xl text-sm">
                                  <SelectValue placeholder="Select partner agency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none" className="text-sm">None selected</SelectItem>
                                {existingPartnerAgencies.map((agency) => (
                                  <SelectItem key={agency} value={agency} className="text-sm">
                                    {agency}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Card className="rounded-2xl border-border/40 shadow-none">
                    <CardHeader>
                      <CardTitle className="text-sm">Uploading of Documents</CardTitle>
                      <CardDescription className="text-xs">
                        Upload PDF files to the private `cqer-trainings_pdf` bucket. Maximum 8MB per file.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="documents"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <FileUpload
                                value={field.value}
                                onChange={field.onChange}
                                disabled={isViewOnly}
                                bucket="cqer-trainings_pdf"
                                accept=".pdf"
                                maxSizeInMB={8}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="remarks"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Remarks</FormLabel>
                            <FormControl>
                              <Textarea {...field} disabled={isViewOnly} className="min-h-24 rounded-2xl text-sm" />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <Card className="rounded-3xl border-border/40 shadow-none">
                <CardHeader>
                  <CardTitle className="text-center text-lg">{isViewOnly ? "Training Summary" : isSubmitting ? "Saving..." : "Preparing Save"}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center py-10">
                  <div className="mb-4 rounded-full bg-primary/10 p-6">
                    <Save className={cn("h-10 w-10 text-primary", !isViewOnly && "animate-pulse")} />
                  </div>
                  <p className="max-w-md text-center text-sm text-muted-foreground">
                    {isViewOnly
                      ? "This record is displayed in the same step-based layout used for editing and creation."
                      : "Please wait a moment while the training record is automatically saved, similar to project registration."}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <div className="border-t border-border/50 bg-background px-5 py-4 sm:px-7 lg:px-10">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">Step {currentStep} of {stepLabels.length}</div>
            <div className="flex flex-wrap justify-end gap-3">
              {currentStep > 1 && (
                <Button type="button" variant="outline" className="rounded-xl" onClick={goPrevious}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
              )}
              {currentStep < 4 && (
                <Button
                  type="button"
                  className="rounded-xl bg-[#159E44] text-white hover:bg-[#128A3B]"
                  onClick={goNext}
                  disabled={isSubmitting}
                >
                  {currentStep === 3 && !isViewOnly ? "Save Training" : "Next"}
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
