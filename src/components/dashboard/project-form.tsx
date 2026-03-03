"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import {
  Building2,
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
  "Goal 1", "Goal 2", "Goal 3", "Goal 4", "Goal 5", "Goal 6", "Goal 7", "Goal 8", "Goal 9",
  "Goal 10", "Goal 11", "Goal 12", "Goal 13", "Goal 14", "Goal 15", "Goal 16", "Goal 17",
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

const inclusiveDateSchema = z.object({
  start_date: z.date(),
  end_date: z.date(),
}).refine((v) => v.end_date >= v.start_date, {
  path: ["end_date"],
  message: "End date must be after start date",
});

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
  inclusive_dates: z.array(inclusiveDateSchema).min(1),
  amount_involved: z.coerce.number().min(0).nullable(),
  sdg_goals: z.array(z.string()).min(1),
  thematic_area: z.string().min(1),
  extension_title: z.string().min(1),
  date_conducted: z.date(),
  extension_activities: z.string().min(1),
  remarks: z.string().optional(),
});

const schema = z.object({
  entry_type: z.enum(["project", "program"]),
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
  entry_type?: "project" | "program" | null;
  category?: string | null;
  moa_no?: string | null;
  moa_category?: string | null;
  date_approved?: string | null;
  lead_units?: string[] | null;
  contact_person?: string | null;
  contact_details?: string | null;
  proponents?: { name?: string | null }[] | null;
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
  mode?: "project" | "program";
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
  inclusive_dates: [{ start_date: new Date(), end_date: new Date() }],
  amount_involved: null,
  sdg_goals: [],
  thematic_area: "",
  extension_title: "",
  date_conducted: new Date(),
  extension_activities: "",
  remarks: "",
};

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
          className={cn("h-8 w-full justify-start px-2 text-left text-xs font-normal", !value && "text-muted-foreground")}
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

function buildPayload(values: FormValues, mode: "project" | "program") {
  const firstAgency = values.partner_agencies[0];
  const sdgs = Array.from(new Set(values.partner_agencies.flatMap((a) => a.sdg_goals || [])));
  const firstRange = firstAgency?.inclusive_dates?.[0];
  const budgetRequirements = values.partner_agencies
    .filter((agency) => Number(agency.amount_involved || 0) > 0)
    .map((agency) => ({ name: agency.agency_name, amount: Number(agency.amount_involved || 0) }));

  return {
    ...values,
    entry_type: mode,
    title: firstAgency?.extension_title || `${mode === "program" ? "Program" : "Project"} Registration`,
    classification: firstAgency?.thematic_area ? [firstAgency.thematic_area] : [],
    sdg_goals: sdgs,
    academic_program: values.related_curricular_offerings[0] || "N/A",
    major: "",
    proponents: [{ name: values.contact_person }],
    co_project_leaders: [],
    college: "CEIT",
    collaborating_agencies: values.partner_agencies.map((a) => a.agency_name).join(", "),
    target_beneficiaries: [],
    community_location: "",
    category: values.moa_category,
    funding_source: firstAgency?.nature_of_partnership === "internally" ? "internally funded" : "externally funded",
    start_date: firstRange?.start_date || values.date_approved,
    end_date: firstRange?.end_date || values.date_approved,
    budget_requirements: budgetRequirements,
    budget_total: budgetRequirements.reduce((sum, item) => sum + item.amount, 0),
    gad_score: 0,
  };
}

export function ProjectForm({
  onSuccess,
  project,
  isViewOnly,
  mode = "project",
  currentUserType,
  currentDepartment,
  currentUnit,
  unitOptions = [],
}: ProjectFormProps) {
  const resolvedMode = (project?.entry_type as "project" | "program" | undefined) || mode;
  const recordLabel = resolvedMode === "program" ? "Program" : "Project";
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
      entry_type: resolvedMode,
      moa_no: project?.moa_no || "",
      moa_category: initialMoaCategory,
      date_approved: project?.date_approved ? new Date(project.date_approved) : new Date(),
      lead_units: project?.lead_units || (currentUserType === "unit_coordinator" && currentDepartment ? [currentDepartment] : []),
      contact_person: project?.contact_person || (project?.proponents?.[0]?.name || ""),
      contact_details: project?.contact_details || "",
      related_curricular_offerings: project?.related_curricular_offerings || [],
      partner_agencies: Array.isArray(project?.partner_agencies) && project.partner_agencies.length > 0
        ? project.partner_agencies.map((agency) => ({
              ...emptyAgency,
              ...agency,
              bor_approved_date: typeof agency?.bor_approved_date === "string" ? new Date(agency.bor_approved_date) : null,
              date_conducted: typeof agency?.date_conducted === "string" ? new Date(agency.date_conducted) : new Date(),
              inclusive_dates: Array.isArray(agency?.inclusive_dates) && agency.inclusive_dates.length > 0
                ? agency.inclusive_dates.map((range) => ({
                    start_date: typeof range?.start_date === "string" ? new Date(range.start_date) : new Date(),
                    end_date: typeof range?.end_date === "string" ? new Date(range.end_date) : new Date(),
                  }))
                : [{ start_date: new Date(), end_date: new Date() }],
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
      const payload = buildPayload(values, resolvedMode);
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
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <FormField control={form.control} name="moa_no" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">MOA No. (Optional)</FormLabel>
                  <FormControl><Input {...field} placeholder="Numbers only" className="h-8 text-xs placeholder:text-[10px]" disabled={isViewOnly} /></FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )} />
              <FormField control={form.control} name="moa_category" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Category of MOA</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isViewOnly}>
                    <FormControl><SelectTrigger className="h-8 text-xs capitalize"><FileText className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                    <SelectContent>{moaCategoryOptions.map((option) => <SelectItem key={option} value={option} className="text-xs capitalize">{option}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )} />
              <FormField control={form.control} name="date_approved" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Date approved</FormLabel>
                  <FormControl><DatePickerField value={field.value} onChange={(d) => d && field.onChange(d)} disabled={isViewOnly} /></FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )} />
            </div>

            {(currentUserType === "college_coordinator" || currentUserType === "unit_coordinator") && (
              <FormField control={form.control} name="lead_units" render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-xs">Lead unit</FormLabel>
                  {currentUserType === "unit_coordinator" ? (
                    <FormControl><Input value={currentDepartment || (field.value || []).join(", ")} readOnly disabled className="h-8 text-xs bg-muted/20" /></FormControl>
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
                  <FormLabel className="text-xs">Contact person</FormLabel>
                  <FormControl><Input {...field} className="h-8 text-xs placeholder:text-[10px]" placeholder="Full name" disabled={isViewOnly} /></FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )} />
              <FormField control={form.control} name="contact_details" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Number / Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input {...field} className="h-8 pl-7 text-xs placeholder:text-[10px]" placeholder="Contact details" disabled={isViewOnly} />
                    </div>
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )} />
            </div>

            {(currentUserType === "college_coordinator" || currentUserType === "unit_coordinator") && (
              <FormField control={form.control} name="related_curricular_offerings" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Related curricular offering</FormLabel>
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
                <FormLabel className="text-xs">No. of partner agencies (signatory/ies)</FormLabel>
                <FormControl><Input value={String(field.value || 0)} readOnly disabled className="h-8 text-xs bg-muted/20" /></FormControl>
              </FormItem>
            )} />

            <div className="space-y-3 rounded-md border border-border/50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold">Partner Agency/ies</h3>
                  <p className="text-[10px] text-muted-foreground">Fill one or more partner records.</p>
                </div>
                {!isViewOnly && (
                  <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => append({ ...emptyAgency })}>
                    <Plus className="mr-1 h-3 w-3" /> Add agency
                  </Button>
                )}
              </div>

              {partnerFields.map((partnerField, index) => {
                const ranges = form.watch(`partner_agencies.${index}.inclusive_dates`) || [];
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
                        <FormItem><FormLabel className="text-xs">Name of agency</FormLabel><FormControl><Input {...field} className="h-8 text-xs placeholder:text-[10px]" disabled={isViewOnly} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`partner_agencies.${index}.head_of_agency`} render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">Head of agency</FormLabel><FormControl><Input {...field} className="h-8 text-xs placeholder:text-[10px]" disabled={isViewOnly} /></FormControl></FormItem>
                      )} />
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                      <FormField control={form.control} name={`partner_agencies.${index}.email_or_number`} render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">Email / Number</FormLabel><FormControl><Input {...field} className="h-8 text-xs" disabled={isViewOnly} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`partner_agencies.${index}.level`} render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">Level</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={isViewOnly}><FormControl><SelectTrigger className="h-8 text-xs"><Globe className="mr-1 h-3.5 w-3.5" /><SelectValue /></SelectTrigger></FormControl><SelectContent>{levelOptions.map((v) => <SelectItem key={v} value={v} className="text-xs capitalize">{v}</SelectItem>)}</SelectContent></Select></FormItem>
                      )} />
                      <FormField control={form.control} name={`partner_agencies.${index}.agency_category`} render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">Category of agency</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={isViewOnly}><FormControl><SelectTrigger className="h-8 text-xs"><Landmark className="mr-1 h-3.5 w-3.5" /><SelectValue /></SelectTrigger></FormControl><SelectContent>{agencyCategoryOptions.map((v) => <SelectItem key={v} value={v} className="text-xs uppercase">{v}</SelectItem>)}</SelectContent></Select></FormItem>
                      )} />
                      <FormField control={form.control} name={`partner_agencies.${index}.nature_of_partnership`} render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">Nature</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={isViewOnly}><FormControl><SelectTrigger className="h-8 text-xs"><Handshake className="mr-1 h-3.5 w-3.5" /><SelectValue /></SelectTrigger></FormControl><SelectContent>{natureOptions.map((v) => <SelectItem key={v} value={v} className="text-xs capitalize">{v}</SelectItem>)}</SelectContent></Select></FormItem>
                      )} />
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <FormField control={form.control} name={`partner_agencies.${index}.approved_title`} render={({ field }) => (
                        <FormItem className="md:col-span-2"><FormLabel className="text-xs">Title of approved extension/program/project/activity</FormLabel><FormControl><Textarea {...field} className="min-h-[56px] text-xs" disabled={isViewOnly} /></FormControl></FormItem>
                      )} />
                      <div className="space-y-3">
                        <FormField control={form.control} name={`partner_agencies.${index}.partnership_type`} render={({ field }) => (
                          <FormItem><FormLabel className="text-xs">Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={isViewOnly}><FormControl><SelectTrigger className="h-8 text-xs"><FileText className="mr-1 h-3.5 w-3.5" /><SelectValue /></SelectTrigger></FormControl><SelectContent>{partnershipTypeOptions.map((v) => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}</SelectContent></Select></FormItem>
                        )} />
                        <FormField control={form.control} name={`partner_agencies.${index}.bor_approved_date`} render={({ field }) => (
                          <FormItem><FormLabel className="text-xs">BOR Approved Date</FormLabel><DatePickerField value={field.value || null} onChange={(d) => field.onChange(d)} disabled={isViewOnly} /></FormItem>
                        )} />
                      </div>
                    </div>

                    <FormField control={form.control} name={`partner_agencies.${index}.duration_text`} render={({ field }) => (
                      <FormItem><FormLabel className="text-xs">Duration (years / months)</FormLabel><FormControl><Input {...field} className="h-8 text-xs placeholder:text-[10px]" placeholder="e.g. 2 years" disabled={isViewOnly} /></FormControl></FormItem>
                    )} />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-xs">Inclusive dates</FormLabel>
                        {!isViewOnly && <Button type="button" variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => form.setValue(`partner_agencies.${index}.inclusive_dates`, [...ranges, { start_date: new Date(), end_date: new Date() }], { shouldDirty: true })}><Plus className="mr-1 h-3 w-3" />Add range</Button>}
                      </div>
                      {ranges.map((_, rIndex) => (
                        <div key={rIndex} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
                          <FormField control={form.control} name={`partner_agencies.${index}.inclusive_dates.${rIndex}.start_date`} render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px]">Start</FormLabel><DatePickerField value={field.value} onChange={(d) => d && field.onChange(d)} disabled={isViewOnly} /></FormItem>
                          )} />
                          <FormField control={form.control} name={`partner_agencies.${index}.inclusive_dates.${rIndex}.end_date`} render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px]">End</FormLabel><DatePickerField value={field.value} onChange={(d) => d && field.onChange(d)} disabled={isViewOnly} /></FormItem>
                          )} />
                          {!isViewOnly && ranges.length > 1 && <Button type="button" variant="ghost" size="icon" className="mt-5 h-8 w-8 text-destructive" onClick={() => form.setValue(`partner_agencies.${index}.inclusive_dates`, ranges.filter((__, i) => i !== rIndex), { shouldDirty: true })}><Trash2 className="h-3.5 w-3.5" /></Button>}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <FormField control={form.control} name={`partner_agencies.${index}.amount_involved`} render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">Amount involved</FormLabel><FormControl><Input type="number" value={typeof field.value === "number" ? field.value : ""} onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))} className="h-8 text-xs" disabled={isViewOnly} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name={`partner_agencies.${index}.thematic_area`} render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">Thematic area</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={isViewOnly}><FormControl><SelectTrigger className="h-8 text-xs"><Building2 className="mr-1 h-3.5 w-3.5" /><SelectValue /></SelectTrigger></FormControl><SelectContent>{thematicAreaOptions.map((v) => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}</SelectContent></Select></FormItem>
                      )} />
                      <FormField control={form.control} name={`partner_agencies.${index}.date_conducted`} render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">Date conducted</FormLabel><DatePickerField value={field.value} onChange={(d) => d && field.onChange(d)} disabled={isViewOnly} /></FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name={`partner_agencies.${index}.sdg_goals`} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">SDGs</FormLabel>
                        <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
                          {sdgOptions.map((goal) => (
                            <label key={goal} className="flex items-center gap-1 rounded-md border border-border/50 px-2 py-1">
                              <Checkbox checked={(field.value || []).includes(goal)} disabled={isViewOnly} onCheckedChange={() => field.onChange(toggleArrayItem(field.value || [], goal))} />
                              <span className="text-[10px]">{goal}</span>
                            </label>
                          ))}
                        </div>
                      </FormItem>
                    )} />

                    <FormField control={form.control} name={`partner_agencies.${index}.extension_title`} render={({ field }) => (
                      <FormItem><FormLabel className="text-xs">Title of extension program / project</FormLabel><FormControl><Input {...field} className="h-8 text-xs" disabled={isViewOnly} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name={`partner_agencies.${index}.extension_activities`} render={({ field }) => (
                      <FormItem><FormLabel className="text-xs">Extension activities conducted within the period</FormLabel><FormControl><Textarea {...field} className="min-h-[60px] text-xs" disabled={isViewOnly} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name={`partner_agencies.${index}.remarks`} render={({ field }) => (
                      <FormItem><FormLabel className="text-xs">Remarks</FormLabel><FormControl><Textarea {...field} value={typeof field.value === "string" ? field.value : ""} className="min-h-[56px] text-xs" disabled={isViewOnly} /></FormControl></FormItem>
                    )} />
                  </div>
                );
              })}
            </div>

            {isCollegeCoordinator && (
              <FormField control={form.control} name="visibility_scope" render={({ field }) => (
                <FormItem className="space-y-2 rounded-md border border-border/50 p-3">
                  <FormLabel className="text-xs">Visibility</FormLabel>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs"><Checkbox checked={field.value === "public"} disabled={isViewOnly} onCheckedChange={(c) => c && field.onChange("public")} /> Public</label>
                    <label className="flex items-center gap-2 text-xs"><Checkbox checked={field.value === "specific_units"} disabled={isViewOnly} onCheckedChange={(c) => c && field.onChange("specific_units")} /> Specific units</label>
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
                <FormLabel className="text-xs">Upload documents</FormLabel>
                <FormDescription className="text-[10px]">Attach supporting files.</FormDescription>
                <FormControl><FileUpload value={field.value || []} onChange={field.onChange} disabled={isViewOnly || isSubmitting} maxFiles={10} /></FormControl>
              </FormItem>
            )} />

            {!isViewOnly && <div className="flex justify-end"><Button type="submit" className="h-8 text-xs bg-[#159E44] hover:bg-[#128A3B]" disabled={isSubmitting}>{isSubmitting ? "Submitting..." : project?.id ? `Update ${recordLabel}` : `Submit ${recordLabel} Registration`}</Button></div>}
          </div>
        </ScrollArea>
      </form>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader className="flex flex-col items-center justify-center pt-4">
            <div className="rounded-full bg-[#159E44]/10 p-3 mb-4"><CheckCircle2 className="h-10 w-10 text-[#159E44]" /></div>
            <DialogTitle className="text-lg font-semibold text-center">{project?.id ? `${recordLabel} Updated!` : `${recordLabel} Registered!`}</DialogTitle>
            <DialogDescription className="text-xs text-center">{project?.id ? `The ${recordLabel.toLowerCase()} registration has been updated.` : `The ${recordLabel.toLowerCase()} registration has been submitted.`}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center"><Button type="button" className="bg-[#159E44] hover:bg-[#128A3B] px-8 h-9 text-xs" onClick={handleSuccessClose}>Continue</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
