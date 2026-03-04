"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import {
  CalendarIcon,
  CheckCircle2,
  FileText,
  Globe,
  Handshake,
  Landmark,
  Mail,
  Plus,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { createProject, updateProject } from "@/lib/actions/projects";
import { DEPARTMENTS, getUnitsByDepartment } from "@/lib/departments";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileUpload } from "./file-upload";

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

const moaCategoryOptions = ["new", "existing", "processing"] as const;
const levelOptions = ["local", "regional", "national", "international"] as const;
const agencyCategoryOptions = ["government", "ngo", "private", "msme"] as const;
const natureOptions = ["internally", "externally"] as const;
const partnershipTypeOptions = ["MOA", "MOU", "LOA"] as const;

const inclusiveDateSchema = z.array(z.date()).min(1, "Select at least one date");

const partnerAgencySchema = z.object({
  agency_name: z.string().min(1),
  head_of_agency: z.string().min(1),
  email_or_number: z.string().min(1),
  level: z.enum(levelOptions),
  agency_category: z.enum(agencyCategoryOptions),
  nature_of_partnership: z.enum(natureOptions),
  approved_title: z.string().min(1),
  partnership_type: z.enum(partnershipTypeOptions),
  bor_approved_date: z.date().nullable(),
  duration_text: z.string().min(1),
  inclusive_dates: inclusiveDateSchema,
  amount_involved: z.coerce.number().min(0).nullable(),
  sdg_goals: z.array(z.string()).min(1),
  thematic_area: z.array(z.string()).min(1),
  extension_title: z.string().min(1),
});

const schema = z.object({
  entry_type: z.literal("project"),
  project_title: z.string().min(1),
  project_leader: z.string().min(1),
  co_project_leaders: z.array(z.object({ name: z.string().min(1) })).default([]),
  project_assistants: z.array(z.object({ name: z.string().min(1) })).default([]),
  moa_no: z.string().optional().refine((v) => !v || /^\d+$/.test(v), "Numbers only"),
  moa_category: z.enum(moaCategoryOptions),
  date_approved: z.date(),
  lead_units: z.array(z.string()).default([]),
  contact_person: z.string().min(1),
  contact_details: z.string().min(1),
  related_curricular_offerings: z.array(z.string()).default([]),
  partner_agencies: z.array(partnerAgencySchema).min(1),
  partner_agency_count: z.coerce.number().min(0),
  visibility_scope: z.enum(["public", "specific_units"]).default("public"),
  visible_units: z.array(z.string()).default([]),
  documents: z.array(z.object({ url: z.string(), name: z.string() })).default([]),
});

type FormValues = z.infer<typeof schema>;
type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

interface LooseProject {
  id?: string;
  title?: string | null;
  project_title?: string | null;
  project_no?: string | null;
  entry_type?: "project" | "project_proposal" | null;
  category?: string | null;
  moa_no?: string | null;
  moa_category?: string | null;
  date_approved?: string | null;
  lead_units?: string[] | null;
  contact_person?: string | null;
  contact_details?: string | null;
  proponents?: { name?: string | null }[] | null;
  co_project_leaders?: { name?: string | null }[] | null;
  project_assistants?: { name?: string | null }[] | null;
  related_curricular_offerings?: string[] | null;
  partner_agencies?: Array<Record<string, unknown>> | null;
  visibility_scope?: "public" | "specific_units" | null;
  visible_units?: string[] | null;
  documents?: { url: string; name: string }[] | null;
}

interface ProjectFormProps {
  onSuccess?: () => void;
  project?: LooseProject;
  isViewOnly?: boolean;
  currentUserType?: "super_admin" | "college_coordinator" | "unit_coordinator";
  currentDepartment?: string | null;
  currentUnit?: string | null;
  unitOptions?: string[];
}

const emptyAgency: FormValues["partner_agencies"][number] = {
  agency_name: "",
  head_of_agency: "",
  email_or_number: "",
  level: "local",
  agency_category: "government",
  nature_of_partnership: "externally",
  approved_title: "",
  partnership_type: "MOA",
  bor_approved_date: null,
  duration_text: "",
  inclusive_dates: [],
  amount_involved: null,
  sdg_goals: [],
  thematic_area: [],
  extension_title: "",
};

function sortDates(values: Date[]) {
  return [...values].sort((a, b) => a.getTime() - b.getTime());
}

function toDateArray(value: unknown): Date[] {
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === "string") {
      return (value as string[])
        .map((item) => new Date(item))
        .filter((date) => !Number.isNaN(date.getTime()));
    }
    if (value.length > 0 && typeof value[0] === "object") {
      const first = value[0] as { start_date?: unknown; end_date?: unknown };
      const start = typeof first?.start_date === "string" ? new Date(first.start_date) : null;
      const end = typeof first?.end_date === "string" ? new Date(first.end_date) : null;
      const dates: Date[] = [];
      if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        const d = new Date(start);
        while (d <= end) {
          dates.push(new Date(d));
          d.setDate(d.getDate() + 1);
        }
      }
      return dates;
    }
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const range = value as { start_date?: unknown; end_date?: unknown };
    const start = typeof range.start_date === "string" ? new Date(range.start_date) : null;
    const end = typeof range.end_date === "string" ? new Date(range.end_date) : null;
    const dates: Date[] = [];
    if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const d = new Date(start);
      while (d <= end) {
        dates.push(new Date(d));
        d.setDate(d.getDate() + 1);
      }
    }
    return dates;
  }
  return [];
}

const isMoaCategory = (value: string): value is FormValues["moa_category"] =>
  value === "new" || value === "existing" || value === "processing";
function DatePickerField({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
}: {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("h-8 w-full justify-start px-2 text-left text-[10px] font-normal", !value && "text-muted-foreground")}
          disabled={disabled}
        >
          {value ? format(value, "PPP") : placeholder}
          <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value || undefined} onSelect={(d) => onChange(d || null)} initialFocus />
      </PopoverContent>
    </Popover>
  );
}

function buildPayload(values: FormValues) {
  const firstAgency = values.partner_agencies[0];
  const sdgs = Array.from(new Set(values.partner_agencies.flatMap((a) => a.sdg_goals || [])));
  const firstAgencyDates = sortDates(firstAgency?.inclusive_dates || []);
  const firstStart = firstAgencyDates[0];
  const firstEnd = firstAgencyDates[firstAgencyDates.length - 1];
  const thematicAreas = Array.from(
    new Set(values.partner_agencies.flatMap((agency) => agency.thematic_area || []))
  );
  const budgetRequirements = values.partner_agencies
    .filter((agency) => Number(agency.amount_involved || 0) > 0)
    .map((agency) => ({ name: agency.agency_name, amount: Number(agency.amount_involved || 0) }));

  const payload: Record<string, unknown> = {
    entry_type: "project",
    title: values.project_title,
    project_title: values.project_title,
    classification: thematicAreas,
    sdg_goals: sdgs,
    academic_program: values.related_curricular_offerings[0] || "N/A",
    major: "",
    proponents: [{ name: values.project_leader }],
    co_project_leaders: values.co_project_leaders,
    project_assistants: values.project_assistants,
    college: "CEIT",
    collaborating_agencies: values.partner_agencies.map((a) => a.agency_name).join(", "),
    target_beneficiaries: [],
    community_location: "",
    category: values.moa_category,
    funding_source: firstAgency?.nature_of_partnership === "internally" ? "internally funded" : "externally funded",
    start_date: firstStart || values.date_approved,
    end_date: firstEnd || values.date_approved,
    budget_requirements: budgetRequirements,
    budget_total: budgetRequirements.reduce((sum, item) => sum + item.amount, 0),
    gad_score: 0,
    moa_no: values.moa_no,
    moa_category: values.moa_category,
    date_approved: values.date_approved,
    lead_units: values.lead_units,
    contact_person: values.contact_person,
    contact_details: values.contact_details,
    related_curricular_offerings: values.related_curricular_offerings,
    partner_agencies: values.partner_agencies,
    partner_agency_count: values.partner_agency_count,
    visibility_scope: values.visibility_scope,
    visible_units: values.visible_units,
    documents: values.documents,
  };
  return payload;
}

export function ProjectForm({
  onSuccess,
  project,
  isViewOnly,
  currentUserType,
  currentDepartment,
  currentUnit,
  unitOptions = [],
}: ProjectFormProps) {
  const recordLabel = "Project";
  const isCollegeCoordinator = currentUserType === "college_coordinator";

  const relatedOptions = React.useMemo(() => {
    if (currentUserType === "college_coordinator") return unitOptions;
    if (currentUserType === "unit_coordinator" && currentDepartment) {
      const units = getUnitsByDepartment(currentDepartment);
      return units.length > 0 ? units : currentUnit ? [currentUnit] : [];
    }
    return [] as string[];
  }, [currentUserType, unitOptions, currentDepartment, currentUnit]);

  const categoryCandidate = project?.category === "on process" ? "processing" : project?.category;
  const moaCandidate = typeof project?.moa_category === "string" ? project.moa_category : "";
  const categoryCandidateText = typeof categoryCandidate === "string" ? categoryCandidate : "";
  const initialMoaCategory: FormValues["moa_category"] = isMoaCategory(moaCandidate)
    ? moaCandidate
    : isMoaCategory(categoryCandidateText)
      ? categoryCandidateText
      : "new";
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      entry_type: "project",
      project_title: project?.project_title || project?.title || "",
      project_leader: project?.proponents?.[0]?.name || "",
      co_project_leaders: Array.isArray(project?.co_project_leaders)
        ? project.co_project_leaders.map((item) => ({ name: item?.name || "" }))
        : [],
      project_assistants: Array.isArray(project?.project_assistants)
        ? project.project_assistants.map((item) => ({ name: item?.name || "" }))
        : [],
      moa_no: project?.moa_no || "",
      moa_category: initialMoaCategory,
      date_approved: project?.date_approved ? new Date(project.date_approved) : new Date(),
      lead_units: project?.lead_units || (currentUserType === "unit_coordinator" && currentDepartment ? [currentDepartment] : []),
      contact_person: project?.contact_person || "",
      contact_details: project?.contact_details || "",
      related_curricular_offerings: project?.related_curricular_offerings || [],
      partner_agencies: Array.isArray(project?.partner_agencies) && project.partner_agencies.length > 0
        ? project.partner_agencies.map((agency) => ({
              ...emptyAgency,
              ...agency,
              bor_approved_date: typeof agency?.bor_approved_date === "string" ? new Date(agency.bor_approved_date) : null,
              inclusive_dates: toDateArray(agency?.inclusive_dates),
              thematic_area: Array.isArray(agency?.thematic_area)
                ? agency.thematic_area.filter((item): item is string => typeof item === "string")
                : typeof agency?.thematic_area === "string"
                  ? [agency.thematic_area]
                  : [],
            }))
        : [emptyAgency],
      partner_agency_count: Array.isArray(project?.partner_agencies) ? project.partner_agencies.length : 1,
      visibility_scope: project?.visibility_scope || (currentUserType === "unit_coordinator" ? "specific_units" : "public"),
      visible_units: project?.visible_units || (currentUserType === "unit_coordinator" && currentUnit ? [currentUnit] : []),
      documents: project?.documents || [],
    },
  });

  const [showSuccess, setShowSuccess] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { fields: partnerFields, append, remove } = useFieldArray({
    control: form.control,
    name: "partner_agencies",
  });
  const {
    fields: coLeaderFields,
    append: appendCoLeader,
    remove: removeCoLeader,
  } = useFieldArray({
    control: form.control,
    name: "co_project_leaders",
  });
  const {
    fields: assistantFields,
    append: appendAssistant,
    remove: removeAssistant,
  } = useFieldArray({
    control: form.control,
    name: "project_assistants",
  });

  const partners = useWatch({ control: form.control, name: "partner_agencies" });
  const visibilityScope = form.watch("visibility_scope");

  React.useEffect(() => {
    form.setValue("partner_agency_count", partners?.length || 0, { shouldDirty: false, shouldValidate: true });
  }, [partners, form]);

  React.useEffect(() => {
    if (currentUserType === "unit_coordinator") {
      form.setValue("visibility_scope", "specific_units", { shouldValidate: true });
      form.setValue("visible_units", currentUnit ? [currentUnit] : [], { shouldValidate: true });
      form.setValue("lead_units", currentDepartment ? [currentDepartment] : [], { shouldValidate: true });
    }
  }, [currentUserType, currentUnit, currentDepartment, form]);

  async function onSubmit(values: FormOutput) {
    if (isViewOnly) return;
    setIsSubmitting(true);
    try {
      const payload = buildPayload(values);
      const result = project?.id ? await updateProject(project.id, payload) : await createProject(payload);
      if (result.error) {
        alert(`Error: ${result.error}`);
        return;
      }
      setShowSuccess(true);
    } catch {
      alert("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  const toggleArrayItem = (arr: string[], value: string) =>
    arr.includes(value) ? arr.filter((entry) => entry !== value) : [...arr, value];

  const handleSuccessClose = () => {
    setShowSuccess(false);
    onSuccess?.();
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <ScrollArea className="h-[72vh] pr-4">
          <div className="space-y-5 pb-3">
            <FormField control={form.control} name="project_title" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px]">Project Title</FormLabel>
                <FormControl>
                  <div className="relative">
                    <FileText className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input {...field} className="h-8 pl-7 text-[10px] placeholder:text-[10px]" placeholder="Enter project title" disabled={isViewOnly} />
                  </div>
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )} />

            <div className="space-y-3 rounded-md border border-border/50 p-3">
              <h3 className="text-[10px] font-semibold">Proponents</h3>
              <FormField control={form.control} name="project_leader" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px]">Project leader</FormLabel>
                  <FormControl><Input {...field} className="h-8 text-[10px] placeholder:text-[10px]" placeholder="Full name" disabled={isViewOnly} /></FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )} />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-[10px]">Co-project leader</FormLabel>
                  {!isViewOnly && (
                    <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => appendCoLeader({ name: "" })}>
                      <Plus className="mr-1 h-3 w-3" /> Add
                    </Button>
                  )}
                </div>
                {coLeaderFields.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">No co-project leaders added.</p>
                ) : (
                  coLeaderFields.map((leader, idx) => (
                    <div key={leader.id} className="flex items-center gap-2">
                      <FormField control={form.control} name={`co_project_leaders.${idx}.name`} render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl><Input {...field} className="h-8 text-[10px] placeholder:text-[10px]" placeholder="Full name" disabled={isViewOnly} /></FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )} />
                      {!isViewOnly && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeCoLeader(idx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-[10px]">Project assistant</FormLabel>
                  {!isViewOnly && (
                    <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => appendAssistant({ name: "" })}>
                      <Plus className="mr-1 h-3 w-3" /> Add
                    </Button>
                  )}
                </div>
                {assistantFields.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">No project assistant added.</p>
                ) : (
                  assistantFields.map((assistant, idx) => (
                    <div key={assistant.id} className="flex items-center gap-2">
                      <FormField control={form.control} name={`project_assistants.${idx}.name`} render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl><Input {...field} className="h-8 text-[10px] placeholder:text-[10px]" placeholder="Full name" disabled={isViewOnly} /></FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )} />
                      {!isViewOnly && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeAssistant(idx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <FormField control={form.control} name="moa_no" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px]">MOA No. (Optional)</FormLabel>
                  <FormControl><Input {...field} placeholder="Numbers only" className="h-8 text-[10px] placeholder:text-[10px]" disabled={isViewOnly} /></FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )} />
              <FormField control={form.control} name="moa_category" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px]">Category of MOA</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isViewOnly}>
                    <FormControl><SelectTrigger className="h-8 text-[10px] capitalize"><FileText className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                    <SelectContent>{moaCategoryOptions.map((option) => <SelectItem key={option} value={option} className="text-[10px] capitalize">{option}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )} />
              <FormField control={form.control} name="date_approved" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px]">MOA Date Approved</FormLabel>
                  <FormControl><DatePickerField value={field.value} onChange={(d) => d && field.onChange(d)} disabled={isViewOnly} /></FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )} />
            </div>

            {(currentUserType === "college_coordinator" || currentUserType === "unit_coordinator") && (
              <FormField control={form.control} name="lead_units" render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-[10px]">Lead unit</FormLabel>
                  {currentUserType === "unit_coordinator" ? (
                    <FormControl><Input value={currentDepartment || (field.value || []).join(", ")} readOnly disabled className="h-8 text-[10px] bg-muted/20" /></FormControl>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {DEPARTMENTS.map((option) => (
                        <label key={option} className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1.5">
                          <Checkbox
                            checked={(field.value || []).includes(option)}
                            disabled={isViewOnly}
                            onCheckedChange={() => field.onChange(toggleArrayItem(field.value || [], option))}
                          />
                          <span className="text-[10px]">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </FormItem>
              )} />
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <FormField control={form.control} name="contact_person" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px]">Contact person</FormLabel>
                  <FormControl><Input {...field} className="h-8 text-[10px] placeholder:text-[10px]" placeholder="Full name" disabled={isViewOnly} /></FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )} />
              <FormField control={form.control} name="contact_details" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px]">Number / Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input {...field} className="h-8 pl-7 text-[10px] placeholder:text-[10px]" placeholder="Contact details" disabled={isViewOnly} />
                    </div>
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )} />
            </div>

            {(currentUserType === "college_coordinator" || currentUserType === "unit_coordinator") && (
              <FormField control={form.control} name="related_curricular_offerings" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px]">Related curricular offering</FormLabel>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {relatedOptions.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground">No options available</p>
                    ) : relatedOptions.map((option) => (
                      <label key={option} className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1.5">
                        <Checkbox
                          checked={(field.value || []).includes(option)}
                          disabled={isViewOnly}
                          onCheckedChange={() => field.onChange(toggleArrayItem(field.value || [], option))}
                        />
                        <span className="text-[10px]">{option}</span>
                      </label>
                    ))}
                  </div>
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="partner_agency_count" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px]">No. of partner agencies (signatory/ies)</FormLabel>
                <FormControl><Input value={String(field.value || 0)} readOnly disabled className="h-8 text-[10px] bg-muted/20" /></FormControl>
              </FormItem>
            )} />

            <div className="space-y-3 rounded-md border border-border/50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[10px] font-semibold">Partner Agency/ies</h3>
                  <p className="text-[10px] text-muted-foreground">Fill one or more partner records.</p>
                </div>
                {!isViewOnly && (
                  <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => append({ ...emptyAgency })}>
                    <Plus className="mr-1 h-3 w-3" /> Add agency
                  </Button>
                )}
              </div>

              {partnerFields.map((partnerField, index) => {
                return (
                  <div key={partnerField.id} className="space-y-3 rounded-md border border-border/50 bg-muted/10 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-medium text-muted-foreground">Agency #{index + 1}</p>
                      {!isViewOnly && partnerFields.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(index)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <FormField control={form.control} name={`partner_agencies.${index}.agency_name`} render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px]">Name of agency</FormLabel><FormControl><Input {...field} className="h-8 text-[10px] placeholder:text-[10px]" disabled={isViewOnly} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`partner_agencies.${index}.head_of_agency`} render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px]">Head of agency</FormLabel><FormControl><Input {...field} className="h-8 text-[10px] placeholder:text-[10px]" disabled={isViewOnly} /></FormControl></FormItem>
                      )} />
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                      <FormField control={form.control} name={`partner_agencies.${index}.email_or_number`} render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px]">Email / Number</FormLabel><FormControl><Input {...field} className="h-8 text-[10px]" disabled={isViewOnly} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`partner_agencies.${index}.level`} render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px]">Level</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={isViewOnly}><FormControl><SelectTrigger className="h-8 text-[10px]"><Globe className="mr-1 h-3.5 w-3.5" /><SelectValue /></SelectTrigger></FormControl><SelectContent>{levelOptions.map((v) => <SelectItem key={v} value={v} className="text-[10px] capitalize">{v}</SelectItem>)}</SelectContent></Select></FormItem>
                      )} />
                      <FormField control={form.control} name={`partner_agencies.${index}.agency_category`} render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px]">Category of agency</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={isViewOnly}><FormControl><SelectTrigger className="h-8 text-[10px]"><Landmark className="mr-1 h-3.5 w-3.5" /><SelectValue /></SelectTrigger></FormControl><SelectContent>{agencyCategoryOptions.map((v) => <SelectItem key={v} value={v} className="text-[10px] uppercase">{v}</SelectItem>)}</SelectContent></Select></FormItem>
                      )} />
                      <FormField control={form.control} name={`partner_agencies.${index}.nature_of_partnership`} render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px]">Nature</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={isViewOnly}><FormControl><SelectTrigger className="h-8 text-[10px]"><Handshake className="mr-1 h-3.5 w-3.5" /><SelectValue /></SelectTrigger></FormControl><SelectContent>{natureOptions.map((v) => <SelectItem key={v} value={v} className="text-[10px] capitalize">{v}</SelectItem>)}</SelectContent></Select></FormItem>
                      )} />
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <FormField control={form.control} name={`partner_agencies.${index}.approved_title`} render={({ field }) => (
                        <FormItem className="md:col-span-2"><FormLabel className="text-[10px]">Title of approved extension/project</FormLabel><FormControl><Textarea {...field} className="min-h-[56px] text-[10px]" disabled={isViewOnly} /></FormControl></FormItem>
                      )} />
                      <div className="space-y-3">
                        <FormField control={form.control} name={`partner_agencies.${index}.partnership_type`} render={({ field }) => (
                          <FormItem><FormLabel className="text-[10px]">Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={isViewOnly}><FormControl><SelectTrigger className="h-8 text-[10px]"><FileText className="mr-1 h-3.5 w-3.5" /><SelectValue /></SelectTrigger></FormControl><SelectContent>{partnershipTypeOptions.map((v) => <SelectItem key={v} value={v} className="text-[10px]">{v}</SelectItem>)}</SelectContent></Select></FormItem>
                        )} />
                        <FormField control={form.control} name={`partner_agencies.${index}.bor_approved_date`} render={({ field }) => (
                          <FormItem><FormLabel className="text-[10px]">Board of Regents Approved Date</FormLabel><DatePickerField value={field.value || null} onChange={(d) => field.onChange(d)} disabled={isViewOnly} /></FormItem>
                        )} />
                      </div>
                    </div>

                    <FormField control={form.control} name={`partner_agencies.${index}.duration_text`} render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px]">Duration (years / months)</FormLabel><FormControl><Input {...field} className="h-8 text-[10px] placeholder:text-[10px]" placeholder="e.g. 2 years" disabled={isViewOnly} /></FormControl></FormItem>
                    )} />

                    <div className="space-y-2">
                      <FormLabel className="text-[10px]">Inclusive dates</FormLabel>
                      <FormField control={form.control} name={`partner_agencies.${index}.inclusive_dates`} render={({ field }) => {
                        const selectedDates = sortDates((field.value || []) as Date[]);
                        const start = selectedDates[0];
                        const end = selectedDates[selectedDates.length - 1];
                        return (
                          <FormItem>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn("h-8 w-full justify-start px-2 text-left text-[10px] font-normal", selectedDates.length === 0 && "text-muted-foreground")}
                                    disabled={isViewOnly}
                                  >
                                    {selectedDates.length > 0
                                      ? `${format(start, "MMM d, yyyy")} to ${format(end, "MMM d, yyyy")}`
                                      : "Select one or more dates"}
                                    <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="multiple"
                                  selected={selectedDates}
                                  onSelect={(dates) => field.onChange(dates || [])}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            {selectedDates.length > 0 && (
                              <p className="text-[10px] text-muted-foreground">
                                Start: {format(start, "MMM d, yyyy")} | End: {format(end, "MMM d, yyyy")} | Selected days: {selectedDates.length}
                              </p>
                            )}
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        );
                      }} />
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <FormField control={form.control} name={`partner_agencies.${index}.amount_involved`} render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px]">Amount involved</FormLabel><FormControl><Input type="number" value={typeof field.value === "number" ? field.value : ""} onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))} className="h-8 text-[10px]" disabled={isViewOnly} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`partner_agencies.${index}.thematic_area`} render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px]">Thematic area</FormLabel>
                          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                            {thematicAreaOptions.map((option) => (
                              <label key={option} className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1.5">
                                <Checkbox
                                  checked={(field.value || []).includes(option)}
                                  disabled={isViewOnly}
                                  onCheckedChange={() => field.onChange(toggleArrayItem(field.value || [], option))}
                                />
                                <span className="text-[10px]">{option}</span>
                              </label>
                            ))}
                          </div>
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name={`partner_agencies.${index}.sdg_goals`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px]">SDGs</FormLabel>
                        <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
                          {sdgOptions.map((goal) => (
                            <label key={goal.id} className="flex items-center gap-1 rounded-md border border-border/50 px-2 py-1">
                              <Checkbox checked={(field.value || []).includes(goal.id)} disabled={isViewOnly} onCheckedChange={() => field.onChange(toggleArrayItem(field.value || [], goal.id))} />
                              <span className="text-[10px]">{goal.label}</span>
                            </label>
                          ))}
                        </div>
                      </FormItem>
                    )} />

                    <FormField control={form.control} name={`partner_agencies.${index}.extension_title`} render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px]">Title of extension program / project</FormLabel><FormControl><Input {...field} className="h-8 text-[10px]" disabled={isViewOnly} /></FormControl></FormItem>
                    )} />
                  </div>
                );
              })}
            </div>

            {isCollegeCoordinator && (
              <FormField control={form.control} name="visibility_scope" render={({ field }) => (
                <FormItem className="space-y-2 rounded-md border border-border/50 p-3">
                  <FormLabel className="text-[10px]">Visibility</FormLabel>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-[10px]"><Checkbox checked={field.value === "public"} disabled={isViewOnly} onCheckedChange={(c) => c && field.onChange("public")} /> Public</label>
                    <label className="flex items-center gap-2 text-[10px]"><Checkbox checked={field.value === "specific_units"} disabled={isViewOnly} onCheckedChange={(c) => c && field.onChange("specific_units")} /> Specific units</label>
                  </div>
                  {visibilityScope === "specific_units" && (
                    <FormField control={form.control} name="visible_units" render={({ field: visField }) => (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {unitOptions.map((unitName) => (
                          <label key={unitName} className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1.5">
                            <Checkbox checked={(visField.value || []).includes(unitName)} disabled={isViewOnly} onCheckedChange={() => visField.onChange(toggleArrayItem(visField.value || [], unitName))} />
                            <span className="text-[10px]">{unitName}</span>
                          </label>
                        ))}
                      </div>
                    )} />
                  )}
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="documents" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px]">Upload documents</FormLabel>
                <FormDescription className="text-[10px]">Attach supporting files.</FormDescription>
                <FormControl><FileUpload value={field.value || []} onChange={field.onChange} disabled={isViewOnly || isSubmitting} maxFiles={10} /></FormControl>
              </FormItem>
            )} />

            {!isViewOnly && <div className="flex justify-end"><Button type="submit" className="h-8 text-[10px] bg-[#159E44] hover:bg-[#128A3B]" disabled={isSubmitting}>{isSubmitting ? "Submitting..." : project?.id ? `Update ${recordLabel}` : `Submit ${recordLabel} Registration`}</Button></div>}
          </div>
        </ScrollArea>
      </form>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader className="flex flex-col items-center justify-center pt-4">
            <div className="rounded-full bg-[#159E44]/10 p-3 mb-4"><CheckCircle2 className="h-10 w-10 text-[#159E44]" /></div>
            <DialogTitle className="text-lg font-semibold text-center">{project?.id ? `${recordLabel} Updated!` : `${recordLabel} Registered!`}</DialogTitle>
            <DialogDescription className="text-[10px] text-center">{project?.id ? `The ${recordLabel.toLowerCase()} registration has been updated.` : `The ${recordLabel.toLowerCase()} registration has been submitted.`}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center"><Button type="button" className="bg-[#159E44] hover:bg-[#128A3B] px-8 h-9 text-[10px]" onClick={handleSuccessClose}>Continue</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
