"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";
import { CalendarIcon, Clock3, Mail, MapPin, UserRound } from "lucide-react";
import { format } from "date-fns";
import { createTraining, updateTraining } from "@/lib/actions/trainings";
import { DEPARTMENTS, getAllUnits, getUnitsByDepartment } from "@/lib/departments";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileUpload } from "./file-upload";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const sdgOptions = [
  { id: "Goal 1", label: "Goal 1 - No Poverty" },
  { id: "Goal 2", label: "Goal 2 - Zero Hunger" },
  { id: "Goal 3", label: "Goal 3 - Good Health and Well-being" },
  { id: "Goal 4", label: "Goal 4 - Quality Education" },
  { id: "Goal 5", label: "Goal 5 - Gender Equality" },
  { id: "Goal 6", label: "Goal 6 - Clean Water and Sanitation" },
  { id: "Goal 7", label: "Goal 7 - Affordable and Clean Energy" },
  { id: "Goal 8", label: "Goal 8 - Decent Work and Economic Growth" },
  { id: "Goal 9", label: "Goal 9 - Industry, Innovation and Infrastructure" },
  { id: "Goal 10", label: "Goal 10 - Reduced Inequality" },
  { id: "Goal 11", label: "Goal 11 - Sustainable Cities and Communities" },
  { id: "Goal 12", label: "Goal 12 - Responsible Consumption and Production" },
  { id: "Goal 13", label: "Goal 13 - Climate Action" },
  { id: "Goal 14", label: "Goal 14 - Life Below Water" },
  { id: "Goal 15", label: "Goal 15 - Life on Land" },
  { id: "Goal 16", label: "Goal 16 - Peace, Justice and Strong Institutions" },
  { id: "Goal 17", label: "Goal 17 - Partnerships for the Goals" },
];

const thematicAreaOptions = [
  "Agri-Fisheries and Food Security",
  "Biodiversity and Environmental Conservation",
  "Smart Engineering, ICT, and Industrial Competitiveness",
  "Public Health and Welfare",
  "Societal Development and Equality",
];

const categoryOptions = [
  { value: "TVL", label: "TVL - Technical, Vocational, Livelihood" },
  { value: "CE", label: "CE - Continuing Education for Professional" },
  { value: "GAD", label: "GAD - Gender and Development" },
  { value: "AE", label: "AE - Agricultural and Environmental Training" },
  { value: "BE", label: "BE - Basic Education" },
  { value: "OTHERS", label: "Others" },
] as const;

const modeOptions = [
  { value: "FTF", label: "FTF - Face-to-face" },
  { value: "O", label: "O - Online / Videoconferencing" },
  { value: "H", label: "H - Hybrid" },
] as const;

const disabilityTypes = [
  "Visual impairment",
  "Hearing impairment",
  "Speech impairment",
  "Physical disability",
  "Psychosocial disability",
  "Intellectual disability",
  "Learning disability",
  "Other",
];

const numField = z
  .preprocess(
    (value) => (value === "" || value === null || typeof value === "undefined" ? undefined : value),
    z.coerce.number().int().min(0).optional()
  )
  .transform((value) => value ?? 0);

const decimalField = z
  .preprocess(
    (value) => (value === "" || value === null || typeof value === "undefined" ? undefined : value),
    z.coerce.number().min(0).optional()
  )
  .transform((value) => value ?? 0);

const schema = z
  .object({
    college: z.string().min(1),
    department: z.string().min(1),
    lead_units: z.array(z.string()).min(1, "Select at least one lead unit"),
    visibility_scope: z.enum(["department", "all_departments", "specific_departments"]).default("department"),
    visible_departments: z.array(z.string()).default([]),
    contact_person: z.string().min(1, "Contact person is required"),
    contact_details: z.string().min(1, "Number / email is required"),
    related_curricular_offerings: z
      .array(z.string())
      .min(1, "Select at least one curricular offering"),
    training_title: z.string().min(1, "Title of training is required"),
    date_mode: z.enum(["days", "hours"]),
    inclusive_dates: z.array(z.date()).default([]),
    manual_hours: z.coerce.number().min(0).max(24).nullable().default(null),
    venue_platform: z.string().min(1, "Venue / platform is required"),
    sdg_goals: z.array(z.string()).min(1, "Select at least one SDG"),
    training_category: z.enum(["TVL", "CE", "GAD", "AE", "BE", "OTHERS"]),
    training_category_other: z.string().default(""),
    training_mode: z.enum(["FTF", "O", "H"]),
    faculty_male: numField,
    faculty_female: numField,
    non_academic_male: numField,
    non_academic_female: numField,
    cvsu_students_male: numField,
    cvsu_students_female: numField,
    partner_agencies_male: numField,
    partner_agencies_female: numField,
    participants_prefer_not_say: numField,
    participants_male_total: numField,
    participants_female_total: numField,
    participants_overall_total: numField,
    category_student: numField,
    category_farmer: numField,
    category_fisherfolk: numField,
    category_ag_technical: numField,
    category_government_employee: numField,
    category_private_employee: numField,
    category_4ps: numField,
    category_others: numField,
    category_total: numField,
    tvl_solo_parent: numField,
    tvl_4ps_members: numField,
    tvl_disabilities_count: numField,
    tvl_disability_breakdown: z
      .array(
        z.object({
          disability_type: z.string().min(1, "Disability type is required"),
          notes: z.string().optional(),
        })
      )
      .default([]),
    tvl_total_persons_trained: numField,
    conducted_days_count: numField,
    days_multiplier: decimalField,
    weighted_days_trained: decimalField,
    days_trained_per_weight: decimalField,
    total_trainees_surveyed: numField,
    rating_relevance: z.coerce.number().int().min(1).max(5),
    rating_equality: z.coerce.number().int().min(1).max(5),
    rating_timeliness: z.coerce.number().int().min(1).max(5),
    total_clients_requesting_trainings: numField,
    total_requests_responded_next_3_days: numField,
    amount_charged_to_cvsu: decimalField,
    amount_charged_to_partner_agency: decimalField,
    partner_agencies: z.array(z.string()).default([]),
    thematic_area: z.array(z.string()).default([]),
    remarks: z.string().default(""),
    documents: z.array(z.object({ url: z.string(), name: z.string() })).default([]),
  })
  .superRefine((values, ctx) => {
    if (values.date_mode === "days" && values.inclusive_dates.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["inclusive_dates"],
        message: "Select at least one date.",
      });
    }
    if (values.date_mode === "hours" && (!values.manual_hours || values.manual_hours <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["manual_hours"],
        message: "Enter total training hours.",
      });
    }
    if (values.training_category === "OTHERS" && !values.training_category_other.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["training_category_other"],
        message: "Specify the category.",
      });
    }
    if (
      values.training_category === "TVL" &&
      values.tvl_disabilities_count !== values.tvl_disability_breakdown.length
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tvl_disability_breakdown"],
        message: "Match the disability entries with the declared disability count.",
      });
    }
  });

type InputValues = z.input<typeof schema>;
type OutputValues = z.output<typeof schema>;

export interface TrainingRecord {
  id: string;
  college: string;
  department: string;
  lead_units: string[] | null;
  contact_person: string;
  contact_details: string;
  related_curricular_offerings: string[] | null;
  training_title: string;
  date_mode: "days" | "hours";
  inclusive_dates: string[] | null;
  manual_hours: number | null;
  venue_platform: string;
  sdg_goals: string[] | null;
  training_category: "TVL" | "CE" | "GAD" | "AE" | "BE" | "OTHERS";
  training_category_other: string | null;
  training_mode: "FTF" | "O" | "H";
  faculty_male: number;
  faculty_female: number;
  non_academic_male: number;
  non_academic_female: number;
  cvsu_students_male: number;
  cvsu_students_female: number;
  partner_agencies_male: number;
  partner_agencies_female: number;
  participants_prefer_not_say: number;
  participants_male_total: number;
  participants_female_total: number;
  participants_overall_total: number;
  category_student: number;
  category_farmer: number;
  category_fisherfolk: number;
  category_ag_technical: number;
  category_government_employee: number;
  category_private_employee: number;
  category_4ps: number;
  category_others: number;
  category_total: number;
  tvl_solo_parent: number;
  tvl_4ps_members: number;
  tvl_disabilities_count: number;
  tvl_disability_breakdown: { disability_type: string; notes?: string }[] | null;
  tvl_total_persons_trained: number;
  conducted_days_count: number;
  days_multiplier: number;
  weighted_days_trained: number;
  days_trained_per_weight: number;
  total_trainees_surveyed: number;
  rating_relevance: number;
  rating_equality: number;
  rating_timeliness: number;
  total_clients_requesting_trainings: number;
  total_requests_responded_next_3_days: number;
  amount_charged_to_cvsu: number;
  amount_charged_to_partner_agency: number;
  partner_agencies: string[] | null;
  thematic_area: string[] | null;
  remarks: string | null;
  documents: { url: string; name: string }[] | null;
  created_by?: string | null;
}

interface TrainingsFormProps {
  department: string;
  userType?: "super_admin" | "college_coordinator" | "unit_coordinator";
  unit?: string | null;
  unitOptions?: string[];
  existingPartnerAgencies?: string[];
  record?: TrainingRecord | null;
  isViewOnly?: boolean;
  onSuccess: (action: "created" | "updated") => void;
}

const toArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const toNumber = (value: unknown) => (typeof value === "number" ? value : Number(value || 0));

const toggleArrayItem = (source: string[], value: string) =>
  source.includes(value) ? source.filter((item) => item !== value) : [...source, value];

const normalizeDateArray = (dates: Date[]) =>
  [...dates]
    .sort((a, b) => a.getTime() - b.getTime())
    .map((d) => format(d, "yyyy-MM-dd"));

function getDayMultiplier(dayCount: number) {
  if (dayCount >= 5) return 2;
  if (dayCount >= 3) return 1.5;
  if (dayCount === 2) return 1.25;
  if (dayCount === 1) return 1;
  return 0;
}

function RatingField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-medium">{label}</p>
      <div className="flex flex-wrap gap-3">
        {[1, 2, 3, 4, 5].map((score) => (
          <label key={score} className="flex items-center gap-1.5 text-[10px]">
            <Checkbox
              checked={value === score}
              disabled={disabled}
              onCheckedChange={() => onChange(score)}
            />
            {score}
          </label>
        ))}
      </div>
    </div>
  );
}

export function TrainingsForm({
  department,
  userType,
  unit,
  unitOptions = [],
  existingPartnerAgencies = [],
  record,
  isViewOnly = false,
  onSuccess,
}: TrainingsFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const curricularOptions = React.useMemo(() => {
    if (userType === "super_admin") {
      return unitOptions.length > 0 ? unitOptions : getAllUnits();
    }
    if (userType === "college_coordinator") return unitOptions;
    if (userType === "unit_coordinator" && department) {
      const options = getUnitsByDepartment(department);
      if (options.length > 0) return options;
      return unit ? [unit] : [];
    }
    return [];
  }, [department, unit, unitOptions, userType]);

  const initialDates = React.useMemo(() => {
    if (!record?.inclusive_dates) return [];
    return record.inclusive_dates
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()));
  }, [record?.inclusive_dates]);

  const form = useForm<InputValues, unknown, OutputValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      college: "CEIT",
      department: record?.department || department || "",
      lead_units: record?.lead_units?.length
        ? record.lead_units
        : userType === "unit_coordinator" && department
          ? [department]
          : [],
      visibility_scope:
        userType === "super_admin"
          ? (((record as unknown as { visibility_scope?: string | null })?.visibility_scope === "specific_departments"
              ? "specific_departments"
              : (record as unknown as { visibility_scope?: string | null })?.visibility_scope === "all_departments"
                ? "all_departments"
                : "all_departments"))
          : "department",
      visible_departments:
        userType === "super_admin"
          ? ((record as unknown as { visible_departments?: string[] | null })?.visible_departments || [...DEPARTMENTS])
          : department
            ? [department]
            : [],
      contact_person: record?.contact_person || "",
      contact_details: record?.contact_details || "",
      related_curricular_offerings: toArray(record?.related_curricular_offerings),
      training_title: record?.training_title || "",
      date_mode: record?.date_mode || "days",
      inclusive_dates: initialDates,
      manual_hours: record?.manual_hours ?? null,
      venue_platform: record?.venue_platform || "",
      sdg_goals: toArray(record?.sdg_goals),
      training_category: record?.training_category || "TVL",
      training_category_other: record?.training_category_other || "",
      training_mode: record?.training_mode || "FTF",
      faculty_male: record?.faculty_male,
      faculty_female: record?.faculty_female,
      non_academic_male: record?.non_academic_male,
      non_academic_female: record?.non_academic_female,
      cvsu_students_male: record?.cvsu_students_male,
      cvsu_students_female: record?.cvsu_students_female,
      partner_agencies_male: record?.partner_agencies_male,
      partner_agencies_female: record?.partner_agencies_female,
      participants_prefer_not_say: record?.participants_prefer_not_say,
      participants_male_total: record?.participants_male_total ?? 0,
      participants_female_total: record?.participants_female_total ?? 0,
      participants_overall_total: record?.participants_overall_total ?? 0,
      category_student: record?.category_student,
      category_farmer: record?.category_farmer,
      category_fisherfolk: record?.category_fisherfolk,
      category_ag_technical: record?.category_ag_technical,
      category_government_employee: record?.category_government_employee,
      category_private_employee: record?.category_private_employee,
      category_4ps: record?.category_4ps,
      category_others: record?.category_others,
      category_total: record?.category_total ?? 0,
      tvl_solo_parent: record?.tvl_solo_parent,
      tvl_4ps_members: record?.tvl_4ps_members,
      tvl_disabilities_count: record?.tvl_disabilities_count,
      tvl_disability_breakdown: record?.tvl_disability_breakdown || [],
      tvl_total_persons_trained: record?.tvl_total_persons_trained ?? 0,
      conducted_days_count: record?.conducted_days_count ?? 0,
      days_multiplier: record?.days_multiplier ?? 0,
      weighted_days_trained: record?.weighted_days_trained ?? 0,
      days_trained_per_weight: record?.days_trained_per_weight,
      total_trainees_surveyed: record?.total_trainees_surveyed,
      rating_relevance: record?.rating_relevance ?? 3,
      rating_equality: record?.rating_equality ?? 3,
      rating_timeliness: record?.rating_timeliness ?? 3,
      total_clients_requesting_trainings: record?.total_clients_requesting_trainings,
      total_requests_responded_next_3_days: record?.total_requests_responded_next_3_days,
      amount_charged_to_cvsu: record?.amount_charged_to_cvsu,
      amount_charged_to_partner_agency: record?.amount_charged_to_partner_agency,
      partner_agencies: toArray(record?.partner_agencies),
      thematic_area: toArray(record?.thematic_area),
      remarks: record?.remarks || "",
      documents: record?.documents || [],
    },
  });

  const disabilityFields = useFieldArray({
    control: form.control,
    name: "tvl_disability_breakdown",
  });

  const dateMode = form.watch("date_mode");
  const trainingCategory = form.watch("training_category");
  const selectedDates = form.watch("inclusive_dates");
  const manualHours = form.watch("manual_hours");
  const disabilityCount = form.watch("tvl_disabilities_count");
  const watchedDepartment = form.watch("department");
  const visibilityScope = form.watch("visibility_scope");

  const maleTotal =
    toNumber(form.watch("faculty_male")) +
    toNumber(form.watch("non_academic_male")) +
    toNumber(form.watch("cvsu_students_male")) +
    toNumber(form.watch("partner_agencies_male"));
  const femaleTotal =
    toNumber(form.watch("faculty_female")) +
    toNumber(form.watch("non_academic_female")) +
    toNumber(form.watch("cvsu_students_female")) +
    toNumber(form.watch("partner_agencies_female"));
  const preferNotSay = toNumber(form.watch("participants_prefer_not_say"));

  const participantCategoryTotal =
    toNumber(form.watch("category_student")) +
    toNumber(form.watch("category_farmer")) +
    toNumber(form.watch("category_fisherfolk")) +
    toNumber(form.watch("category_ag_technical")) +
    toNumber(form.watch("category_government_employee")) +
    toNumber(form.watch("category_private_employee")) +
    toNumber(form.watch("category_4ps")) +
    toNumber(form.watch("category_others"));

  const tvlTotalPersonsTrained =
    toNumber(form.watch("tvl_solo_parent")) +
    toNumber(form.watch("tvl_4ps_members")) +
    toNumber(form.watch("tvl_disabilities_count"));

  React.useEffect(() => {
    form.setValue("participants_male_total", maleTotal, { shouldDirty: true });
    form.setValue("participants_female_total", femaleTotal, { shouldDirty: true });
    form.setValue("participants_overall_total", maleTotal + femaleTotal + preferNotSay, {
      shouldDirty: true,
    });
  }, [femaleTotal, form, maleTotal, preferNotSay]);

  React.useEffect(() => {
    form.setValue("category_total", participantCategoryTotal, { shouldDirty: true });
  }, [participantCategoryTotal, form]);

  React.useEffect(() => {
    form.setValue("tvl_total_persons_trained", tvlTotalPersonsTrained, { shouldDirty: true });
  }, [form, tvlTotalPersonsTrained]);

  React.useEffect(() => {
    const count = Math.max(0, Number(disabilityCount) || 0);
    const currentLength = disabilityFields.fields.length;
    if (count > currentLength) {
      for (let index = currentLength; index < count; index += 1) {
        disabilityFields.append({ disability_type: "", notes: "" });
      }
    } else if (count < currentLength) {
      for (let index = currentLength - 1; index >= count; index -= 1) {
        disabilityFields.remove(index);
      }
    }
  }, [disabilityCount, disabilityFields]);

  React.useEffect(() => {
    if (trainingCategory !== "TVL") {
      form.setValue("tvl_solo_parent", 0);
      form.setValue("tvl_4ps_members", 0);
      form.setValue("tvl_disabilities_count", 0);
      form.setValue("tvl_disability_breakdown", []);
      form.setValue("tvl_total_persons_trained", 0);
    }
  }, [form, trainingCategory]);

  React.useEffect(() => {
    if (userType === "unit_coordinator" && department) {
      form.setValue("department", department, { shouldValidate: true });
      form.setValue("visible_departments", [department], { shouldValidate: true });
    }
    if (userType === "college_coordinator" && department) {
      form.setValue("visible_departments", [department], { shouldValidate: false });
    }
    if (
      userType === "super_admin" &&
      visibilityScope === "all_departments" &&
      (form.getValues("visible_departments") || []).length !== DEPARTMENTS.length
    ) {
      form.setValue("visible_departments", [...DEPARTMENTS], { shouldValidate: true });
    }
  }, [department, form, userType, visibilityScope]);

  React.useEffect(() => {
    if (dateMode === "days") {
      const dayCount = selectedDates?.length || 0;
      const multiplier = getDayMultiplier(dayCount);
      form.setValue("conducted_days_count", dayCount, { shouldDirty: true });
      form.setValue("days_multiplier", multiplier, { shouldDirty: true });
      form.setValue("weighted_days_trained", Number((dayCount * multiplier).toFixed(2)), {
        shouldDirty: true,
      });
    } else {
      const hours = Number(manualHours || 0);
      const multiplier = hours > 0 && hours < 8 ? 0.5 : hours >= 8 ? 1 : 0;
      form.setValue("conducted_days_count", hours > 0 ? 1 : 0, { shouldDirty: true });
      form.setValue("days_multiplier", multiplier, { shouldDirty: true });
      form.setValue("weighted_days_trained", multiplier, { shouldDirty: true });
    }
  }, [dateMode, form, manualHours, selectedDates]);

  const onSubmit = async (values: OutputValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        college: "CEIT",
        department: values.department,
        lead_units: values.lead_units,
        visibility_scope: values.visibility_scope,
        visible_departments: values.visible_departments,
        contact_person: values.contact_person.trim(),
        contact_details: values.contact_details.trim(),
        related_curricular_offerings: values.related_curricular_offerings,
        training_title: values.training_title.trim(),
        date_mode: values.date_mode,
        inclusive_dates:
          values.date_mode === "days" ? normalizeDateArray(values.inclusive_dates || []) : [],
        manual_hours: values.date_mode === "hours" ? Number(values.manual_hours || 0) : null,
        venue_platform: values.venue_platform.trim(),
        sdg_goals: values.sdg_goals,
        training_category: values.training_category,
        training_category_other: values.training_category_other.trim(),
        training_mode: values.training_mode,
        faculty_male: values.faculty_male,
        faculty_female: values.faculty_female,
        non_academic_male: values.non_academic_male,
        non_academic_female: values.non_academic_female,
        cvsu_students_male: values.cvsu_students_male,
        cvsu_students_female: values.cvsu_students_female,
        partner_agencies_male: values.partner_agencies_male,
        partner_agencies_female: values.partner_agencies_female,
        participants_prefer_not_say: values.participants_prefer_not_say,
        participants_male_total: values.participants_male_total,
        participants_female_total: values.participants_female_total,
        participants_overall_total: values.participants_overall_total,
        category_student: values.category_student,
        category_farmer: values.category_farmer,
        category_fisherfolk: values.category_fisherfolk,
        category_ag_technical: values.category_ag_technical,
        category_government_employee: values.category_government_employee,
        category_private_employee: values.category_private_employee,
        category_4ps: values.category_4ps,
        category_others: values.category_others,
        category_total: values.category_total,
        tvl_solo_parent: values.training_category === "TVL" ? values.tvl_solo_parent : 0,
        tvl_4ps_members: values.training_category === "TVL" ? values.tvl_4ps_members : 0,
        tvl_disabilities_count:
          values.training_category === "TVL" ? values.tvl_disabilities_count : 0,
        tvl_disability_breakdown:
          values.training_category === "TVL" ? values.tvl_disability_breakdown : [],
        tvl_total_persons_trained:
          values.training_category === "TVL" ? values.tvl_total_persons_trained : 0,
        conducted_days_count: values.conducted_days_count,
        days_multiplier: values.days_multiplier,
        weighted_days_trained: values.weighted_days_trained,
        days_trained_per_weight: values.days_trained_per_weight,
        total_trainees_surveyed: values.total_trainees_surveyed,
        rating_relevance: values.rating_relevance,
        rating_equality: values.rating_equality,
        rating_timeliness: values.rating_timeliness,
        total_clients_requesting_trainings: values.total_clients_requesting_trainings,
        total_requests_responded_next_3_days: values.total_requests_responded_next_3_days,
        amount_charged_to_cvsu: values.amount_charged_to_cvsu,
        amount_charged_to_partner_agency: values.amount_charged_to_partner_agency,
        partner_agencies: values.partner_agencies,
        thematic_area: values.thematic_area,
        remarks: values.remarks.trim(),
        documents: values.documents || [],
      };

      const result = record?.id
        ? await updateTraining(record.id, payload)
        : await createTraining(payload);

      if (result.error) {
        alert(`Error: ${result.error}`);
        return;
      }

      onSuccess(record?.id ? "updated" : "created");
    } catch {
      alert("Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedDates = [...(selectedDates || [])].sort((a, b) => a.getTime() - b.getTime());
  const start = sortedDates[0];
  const end = sortedDates[sortedDates.length - 1];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <ScrollArea className="h-[72vh] pr-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="college"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">College</FormLabel>
                <FormControl>
                  <Input {...field} readOnly className="h-8 text-xs bg-muted/30" />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Department</FormLabel>
                {userType === "super_admin" ? (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isViewOnly}>
                    <FormControl>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DEPARTMENTS.map((departmentName) => (
                        <SelectItem key={departmentName} value={departmentName} className="text-xs">
                          {departmentName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <FormControl>
                    <Input {...field} readOnly className="h-8 text-xs bg-muted/30" />
                  </FormControl>
                )}
              </FormItem>
            )}
          />
        </div>

        {userType === "super_admin" && (
          <FormField
            control={form.control}
            name="visibility_scope"
            render={({ field }) => (
              <FormItem className="space-y-2 rounded-md border border-border/50 p-3">
                <FormLabel className="text-[10px]">Visibility</FormLabel>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-[10px]"><Checkbox checked={field.value === "all_departments"} disabled={isViewOnly} onCheckedChange={(checked) => checked && field.onChange("all_departments")} /> All departments</label>
                  <label className="flex items-center gap-2 text-[10px]"><Checkbox checked={field.value === "specific_departments"} disabled={isViewOnly} onCheckedChange={(checked) => checked && field.onChange("specific_departments")} /> Specific departments</label>
                </div>
                {field.value === "specific_departments" && (
                  <FormField
                    control={form.control}
                    name="visible_departments"
                    render={({ field: departmentField }) => (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {DEPARTMENTS.map((departmentName) => (
                          <label key={departmentName} className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1.5">
                            <Checkbox checked={(departmentField.value || []).includes(departmentName)} disabled={isViewOnly} onCheckedChange={() => departmentField.onChange(toggleArrayItem(departmentField.value || [], departmentName))} />
                            <span className="text-[10px]">{departmentName}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  />
                )}
              </FormItem>
            )}
          />
        )}

        <div className="mt-2 space-y-2 rounded-md border border-border/50 p-3">
          <FormField
            control={form.control}
            name="lead_units"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-[10px]">Lead unit</FormLabel>
                {userType === "unit_coordinator" ? (
                  <FormControl>
                    <Input
                      value={department || (field.value || []).join(", ")}
                      readOnly
                      className="h-8 text-[10px] bg-muted/30"
                    />
                  </FormControl>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {DEPARTMENTS.map((option) => (
                      <label
                        key={option}
                        className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1.5"
                      >
                        <Checkbox
                          checked={(field.value || []).includes(option)}
                          disabled={isViewOnly}
                          onCheckedChange={() =>
                            field.onChange(toggleArrayItem(field.value || [], option))
                          }
                        />
                        <span className="text-[10px]">{option}</span>
                      </label>
                    ))}
                  </div>
                )}
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="contact_person"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px]">Contact person</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <UserRound className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        {...field}
                        disabled={isViewOnly}
                        className="h-8 pl-7 text-[10px] placeholder:text-[9px]"
                        placeholder="Full name"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contact_details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px]">Number / Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        {...field}
                        disabled={isViewOnly}
                        className="h-8 pl-7 text-[10px] placeholder:text-[9px]"
                        placeholder="Mobile number or email"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="related_curricular_offerings"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-[10px]">Related curricular offering</FormLabel>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(userType === "super_admin" ? getUnitsByDepartment(watchedDepartment) : curricularOptions).length === 0 ? (
                    <p className="text-[10px] text-muted-foreground">No options available</p>
                  ) : (
                    (userType === "super_admin" ? getUnitsByDepartment(watchedDepartment) : curricularOptions).map((option) => (
                      <label
                        key={option}
                        className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1.5"
                      >
                        <Checkbox
                          checked={(field.value || []).includes(option)}
                          disabled={isViewOnly}
                          onCheckedChange={() =>
                            field.onChange(toggleArrayItem(field.value || [], option))
                          }
                        />
                        <span className="text-[10px]">{option}</span>
                      </label>
                    ))
                  )}
                </div>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="training_title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px]">Title of training</FormLabel>
                <FormControl>
                  <Input {...field} className="h-8 text-[10px]" disabled={isViewOnly} />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="venue_platform"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px]">Venue / Platform</FormLabel>
                <FormControl>
                  <div className="relative">
                    <MapPin className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      {...field}
                      className="h-8 pl-7 text-[10px] placeholder:text-[9px]"
                      placeholder="Venue or platform"
                      disabled={isViewOnly}
                    />
                  </div>
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3 rounded-md border border-border/50 p-3">
          <FormField
            control={form.control}
            name="date_mode"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-[10px]">Date/s conducted</FormLabel>
                <RadioGroup
                  className="flex gap-4"
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isViewOnly}
                >
                  <label className="flex items-center gap-1.5 text-[10px]">
                    <RadioGroupItem value="days" />
                    Inclusive dates
                  </label>
                  <label className="flex items-center gap-1.5 text-[10px]">
                    <RadioGroupItem value="hours" />
                    Within hours only
                  </label>
                </RadioGroup>
              </FormItem>
            )}
          />

          {dateMode === "days" ? (
            <FormField
              control={form.control}
              name="inclusive_dates"
              render={({ field }) => (
                <FormItem>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "h-8 w-full justify-start px-2 text-left text-[10px] font-normal",
                            (field.value || []).length === 0 && "text-muted-foreground"
                          )}
                          disabled={isViewOnly}
                        >
                          {(field.value || []).length > 0 && start && end
                            ? `${format(start, "MMM d, yyyy")} to ${format(end, "MMM d, yyyy")} (${(field.value || []).length} day/s)`
                            : "Select one or more dates"}
                          <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="multiple"
                        selected={field.value}
                        onSelect={(dates) => field.onChange(dates || [])}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="manual_hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px]">Total hours conducted</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Clock3 className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="number"
                        min={0}
                        max={24}
                        value={typeof field.value === "number" ? field.value : ""}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === "" ? null : Number(event.target.value)
                          )
                        }
                        disabled={isViewOnly}
                        className="h-8 pl-7 text-[10px] placeholder:text-[9px]"
                        placeholder="e.g. 6"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="training_category"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px]">Category of training</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={isViewOnly}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-[10px] data-[placeholder]:text-[9px]">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-[10px]">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="training_mode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px]">Mode/Method of training</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={isViewOnly}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-[10px] data-[placeholder]:text-[9px]">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {modeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-[10px]">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <FormLabel className="text-[10px]">Specify category</FormLabel>
                <FormControl>
                  <Input {...field} className="h-8 text-[10px]" disabled={isViewOnly} />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="sdg_goals"
          render={({ field }) => (
            <FormItem className="space-y-2 rounded-md border border-border/50 p-3">
              <FormLabel className="text-[10px]">SDG&apos;s</FormLabel>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {sdgOptions.map((goal) => (
                  <label
                    key={goal.id}
                    className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1.5"
                  >
                    <Checkbox
                      checked={(field.value || []).includes(goal.id)}
                      disabled={isViewOnly}
                      onCheckedChange={() =>
                        field.onChange(toggleArrayItem(field.value || [], goal.id))
                      }
                    />
                    <span className="text-[10px]">{goal.label}</span>
                  </label>
                ))}
              </div>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />
        <div className="space-y-3 rounded-md border border-border/50 p-3">
          <h3 className="text-[10px] font-semibold">Number of Organizing Committee</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              ["faculty_male", "Faculty Member (Male)"],
              ["faculty_female", "Faculty Member (Female)"],
              ["non_academic_male", "Non-Academic Personnel (Male)"],
              ["non_academic_female", "Non-Academic Personnel (Female)"],
              ["cvsu_students_male", "CvSU Students (Male)"],
              ["cvsu_students_female", "CvSU Students (Female)"],
              ["partner_agencies_male", "Partner Agency/ies (Male)"],
              ["partner_agencies_female", "Partner Agency/ies (Female)"],
            ].map(([name, label]) => (
              <FormField
                key={name}
                control={form.control}
                name={name as keyof OutputValues}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px]">{label}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={typeof field.value === "number" ? field.value : ""}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === "" ? undefined : Number(event.target.value)
                          )
                        }
                        disabled={isViewOnly}
                        className="h-8 text-[10px]"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-md border border-border/50 p-3">
          <h3 className="text-[10px] font-semibold">No. of Participants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="participants_male_total"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px]">Male (auto)</FormLabel>
                  <FormControl>
                    <Input
                      value={String(field.value ?? "")}
                      readOnly
                      className="h-8 text-[10px] bg-muted/30"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="participants_female_total"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px]">Female (auto)</FormLabel>
                  <FormControl>
                    <Input
                      value={String(field.value ?? "")}
                      readOnly
                      className="h-8 text-[10px] bg-muted/30"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="participants_prefer_not_say"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px]">Prefer not to say</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      value={typeof field.value === "number" ? field.value : ""}
                      onChange={(event) =>
                        field.onChange(event.target.value === "" ? undefined : Number(event.target.value))
                      }
                      disabled={isViewOnly}
                      className="h-8 text-[10px]"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="participants_overall_total"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px]">Total (auto)</FormLabel>
                  <FormControl>
                    <Input
                      value={String(field.value ?? "")}
                      readOnly
                      className="h-8 text-[10px] bg-muted/30"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-3 rounded-md border border-border/50 p-3">
          <h3 className="text-[10px] font-semibold">No. of Participants by Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              ["category_student", "Student"],
              ["category_farmer", "Farmer"],
              ["category_fisherfolk", "Fisherfolk"],
              ["category_ag_technical", "Ag Technical"],
              ["category_government_employee", "Government Employee"],
              ["category_private_employee", "Private Employee"],
              ["category_4ps", "4Ps"],
              ["category_others", "Others"],
            ].map(([name, label]) => (
              <FormField
                key={name}
                control={form.control}
                name={name as keyof OutputValues}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px]">{label}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={typeof field.value === "number" ? field.value : ""}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === "" ? undefined : Number(event.target.value)
                          )
                        }
                        disabled={isViewOnly}
                        className="h-8 text-[10px]"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}
          </div>
          <FormField
            control={form.control}
            name="category_total"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px]">Total (auto)</FormLabel>
                <FormControl>
                  <Input
                    value={String(field.value ?? "")}
                    readOnly
                    className="h-8 text-[10px] bg-muted/30"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {trainingCategory === "TVL" && (
          <div className="space-y-3 rounded-md border border-border/50 p-3">
            <h3 className="text-[9px] font-semibold">TVL-specific Participants</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="tvl_solo_parent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[9px]">No. solo parent</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={typeof field.value === "number" ? field.value : ""}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === "" ? undefined : Number(event.target.value)
                          )
                        }
                        disabled={isViewOnly}
                        className="h-7 text-[9px]"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tvl_4ps_members"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[9px]">No. 4Ps members</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={typeof field.value === "number" ? field.value : ""}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === "" ? undefined : Number(event.target.value)
                          )
                        }
                        disabled={isViewOnly}
                        className="h-7 text-[9px]"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tvl_disabilities_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[9px]">No. with disabilities</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={typeof field.value === "number" ? field.value : ""}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value === "" ? undefined : Number(event.target.value)
                          )
                        }
                        disabled={isViewOnly}
                        className="h-7 text-[9px]"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {disabilityFields.fields.length > 0 && (
              <div className="space-y-2 rounded-md border border-border/50 p-3">
                <p className="text-[9px] font-medium">
                  Disability details per participant ({disabilityFields.fields.length})
                </p>
                {disabilityFields.fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name={`tvl_disability_breakdown.${index}.disability_type`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px]">
                            Participant {index + 1} disability type
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={isViewOnly}
                          >
                            <FormControl>
                              <SelectTrigger className="h-7 text-[9px] data-[placeholder]:text-[8px]">
                                <SelectValue placeholder="Select disability type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {disabilityTypes.map((option) => (
                                <SelectItem key={option} value={option} className="text-[9px]">
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-[9px]" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`tvl_disability_breakdown.${index}.notes`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[9px]">Notes (optional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              className="h-7 text-[9px] placeholder:text-[8px]"
                              disabled={isViewOnly}
                              placeholder="e.g. assistive requirement"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>
            )}
            <FormField
              control={form.control}
              name="tvl_total_persons_trained"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[9px]">Total of Persons Trained (auto)</FormLabel>
                  <FormControl>
                    <Input
                      value={String(field.value ?? "")}
                      readOnly
                      className="h-7 text-[9px] bg-muted/30"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        )}
        <div className="space-y-3 rounded-md border border-border/50 p-3">
          <h3 className="text-[10px] font-semibold">Training Weight and Survey</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name="conducted_days_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px]">Number of days trained (auto)</FormLabel>
                  <FormControl>
                    <Input
                      value={String(field.value ?? "")}
                      readOnly
                      className="h-8 text-[10px] bg-muted/30"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="days_multiplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px]">Multiplier (auto)</FormLabel>
                  <FormControl>
                    <Input
                      value={Number(field.value || 0).toFixed(2)}
                      readOnly
                      className="h-8 text-[10px] bg-muted/30"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="weighted_days_trained"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px]">Weighted days (auto)</FormLabel>
                  <FormControl>
                    <Input
                      value={Number(field.value || 0).toFixed(2)}
                      readOnly
                      className="h-8 text-[10px] bg-muted/30"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="days_trained_per_weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px]">
                    Number of days trained per weight of training
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      value={typeof field.value === "number" ? field.value : ""}
                      onChange={(event) =>
                        field.onChange(event.target.value === "" ? undefined : Number(event.target.value))
                      }
                      disabled={isViewOnly}
                      className="h-8 text-[10px]"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="total_trainees_surveyed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px]">Total no. of trainees surveyed</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      value={typeof field.value === "number" ? field.value : ""}
                      onChange={(event) =>
                        field.onChange(event.target.value === "" ? undefined : Number(event.target.value))
                      }
                      disabled={isViewOnly}
                      className="h-8 text-[10px]"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-3 rounded-md border border-border/50 p-3">
          <h3 className="text-[10px] font-semibold">Client&apos;s Rating on the Training</h3>
          <FormField
            control={form.control}
            name="rating_relevance"
            render={({ field }) => (
              <FormItem>
                <RatingField
                  label="Relevance"
                  value={toNumber(field.value)}
                  onChange={field.onChange}
                  disabled={isViewOnly}
                />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rating_equality"
            render={({ field }) => (
              <FormItem>
                <RatingField
                  label="Equality"
                  value={toNumber(field.value)}
                  onChange={field.onChange}
                  disabled={isViewOnly}
                />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rating_timeliness"
            render={({ field }) => (
              <FormItem>
                <RatingField
                  label="Timeliness"
                  value={toNumber(field.value)}
                  onChange={field.onChange}
                  disabled={isViewOnly}
                />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="total_clients_requesting_trainings"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px]">
                  Total number of clients requesting trainings
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    value={typeof field.value === "number" ? field.value : ""}
                    onChange={(event) =>
                      field.onChange(event.target.value === "" ? undefined : Number(event.target.value))
                    }
                    disabled={isViewOnly}
                    className="h-8 text-[10px]"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="total_requests_responded_next_3_days"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px]">
                  Total requests responded in the next 3 days
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    value={typeof field.value === "number" ? field.value : ""}
                    onChange={(event) =>
                      field.onChange(event.target.value === "" ? undefined : Number(event.target.value))
                    }
                    disabled={isViewOnly}
                    className="h-8 text-[10px]"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3 rounded-md border border-border/50 p-3">
          <h3 className="text-[10px] font-semibold">Extended Expenses and Source of Fund</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="amount_charged_to_cvsu"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px]">
                    Amount charged to CvSU (campus/college/unit)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      value={typeof field.value === "number" ? field.value : ""}
                      onChange={(event) =>
                        field.onChange(event.target.value === "" ? undefined : Number(event.target.value))
                      }
                      disabled={isViewOnly}
                      className="h-8 text-[10px]"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount_charged_to_partner_agency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px]">
                    Amount charged to partner agency (PhP)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      value={typeof field.value === "number" ? field.value : ""}
                      onChange={(event) =>
                        field.onChange(event.target.value === "" ? undefined : Number(event.target.value))
                      }
                      disabled={isViewOnly}
                      className="h-8 text-[10px]"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="partner_agencies"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-[10px]">Number of Partner Agency/ies</FormLabel>
                <div className="rounded-md border border-border/50 p-2 space-y-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 w-full justify-start text-[10px]"
                        disabled={isViewOnly || existingPartnerAgencies.length === 0}
                      >
                        {existingPartnerAgencies.length === 0
                          ? "No partner agencies available"
                          : "Select partner agencies"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[24rem] max-h-72 overflow-y-auto">
                      <DropdownMenuLabel className="text-[10px]">Partner Agencies</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {existingPartnerAgencies.map((agency) => (
                        <DropdownMenuCheckboxItem
                          key={agency}
                          className="text-[10px]"
                          checked={(field.value || []).includes(agency)}
                          onCheckedChange={() =>
                            field.onChange(toggleArrayItem(field.value || [], agency))
                          }
                        >
                          {agency}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="flex flex-wrap gap-1">
                    {(field.value || []).length > 0 ? (
                      (field.value || []).map((agency) => (
                        <Badge
                          key={agency}
                          variant="secondary"
                          className="text-[10px] font-normal"
                        >
                          {agency}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-[10px] text-muted-foreground">No partner agency selected.</p>
                    )}
                  </div>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="thematic_area"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-[10px]">Thematic Area</FormLabel>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {thematicAreaOptions.map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1.5"
                    >
                      <Checkbox
                        checked={(field.value || []).includes(option)}
                        disabled={isViewOnly}
                        onCheckedChange={() =>
                          field.onChange(toggleArrayItem(field.value || [], option))
                        }
                      />
                      <span className="text-[10px]">{option}</span>
                    </label>
                  ))}
                </div>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="remarks"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px]">Remarks</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value || ""}
                  className="min-h-[80px] text-[10px] resize-none placeholder:text-[9px]"
                  disabled={isViewOnly}
                  placeholder="Comments"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="documents"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px]">Upload Documents</FormLabel>
              <FormControl>
                <FileUpload
                  value={field.value || []}
                  onChange={(docs) => form.setValue("documents", docs, { shouldDirty: true })}
                  disabled={isSubmitting || isViewOnly}
                  maxFiles={10}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {!isViewOnly && (
          <div className="flex flex-col items-end gap-2">
            {Object.keys(form.formState.errors).length > 0 && (
              <div className="text-right">
                <p className="text-[10px] text-destructive font-medium">
                  Please fix validation errors in the following fields:
                </p>
                <p className="text-[9px] text-destructive opacity-80">
                  {Object.keys(form.formState.errors)
                    .map((key) => key.replace(/_/g, " ").replace(/\./g, " "))
                    .join(", ")}
                </p>
              </div>
            )}
            <Button
              type="submit"
              className="h-8 text-xs bg-[#159E44] hover:bg-[#128A3B] text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : record?.id ? "Update Training" : "Create Training"}
            </Button>
          </div>
        )}
        </ScrollArea>
      </form>
    </Form>
  );
}

