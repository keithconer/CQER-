"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  FileText,
  Handshake,
  MapPin,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createProject, updateProject } from "@/lib/actions/projects";
import { FileUpload } from "./file-upload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEPARTMENTS, getUnitsByDepartment } from "@/lib/departments";

const agendaOptions = [
  "Agri-Fisheries and Food Security",
  "Biodiversity and Environmental Conservation",
  "Smart Engineering, ICT, and Industrial Competitiveness",
  "Public Health and Welfare",
  "Societal Development and Equality",
];

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

const beneficiaryOptions = [
  "student",
  "farmer",
  "fisherfolk",
  "ag technician",
  "government employee",
  "private employee",
  "4PS",
  "others",
] as const;

const schema = z
  .object({
    entry_type: z.literal("project_proposal"),
    project_title: z.string().min(1, "Required"),
    agenda_classification: z.array(z.string()).min(1, "Select at least one"),
    project_leader: z.string().min(1, "Required"),
    co_project_leaders: z.array(z.object({ name: z.string().min(1) })).default([]),
    project_assistants: z.array(z.object({ name: z.string().min(1) })).default([]),
    department_label: z.string().min(1),
    collaborating_agency: z.string().min(1, "Required"),
    target_beneficiaries: z.array(z.string()).min(1, "Select at least one"),
    target_beneficiary_others: z.string().optional(),
    community_location: z.string().min(1, "Required"),
    target_budget: z
      .string()
      .trim()
      .min(1, "Required")
      .refine((value) => /^\d+(\.\d+)?$/.test(value), "Numbers only"),
    sdg_goals: z.array(z.string()).min(1, "Select at least one"),
    faculty_involved: z.array(z.object({ name: z.string().min(1) })).min(1, "Add at least one faculty"),
    proposal_department: z.string().min(1, "Required"),
    proposal_unit: z.string().optional(),
    visibility_scope: z.enum(["all_departments", "specific_departments", "public", "specific_units"]).default("public"),
    visible_departments: z.array(z.string()).default([]),
    documents: z.array(z.object({ url: z.string(), name: z.string() })).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.target_beneficiaries.includes("others") && !data.target_beneficiary_others?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["target_beneficiary_others"],
        message: "Please specify others",
      });
    }
  });

type FormValues = z.infer<typeof schema>;
type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

interface LooseProposal {
  id?: string;
  title?: string | null;
  project_title?: string | null;
  classification?: string[] | null;
  proponents?: { name?: string | null }[] | null;
  co_project_leaders?: { name?: string | null }[] | null;
  project_assistants?: { name?: string | null }[] | null;
  proposal_department?: string | null;
  proposal_unit?: string | null;
  collaborating_agencies?: string | null;
  target_beneficiaries?: string[] | null;
  target_beneficiary_others?: string | null;
  community_location?: string | null;
  budget_total?: number | null;
  sdg_goals?: string[] | null;
  faculty_involved?: { name?: string | null }[] | null;
  documents?: { url: string; name: string }[] | null;
}

interface ProjectProposalFormProps {
  onSuccess?: () => void;
  proposal?: LooseProposal;
  isViewOnly?: boolean;
  currentUserType?: "super_admin" | "college_coordinator" | "unit_coordinator";
  currentDepartment?: string | null;
  currentUnit?: string | null;
  unitOptions?: string[];
}

const emptyFaculty = { name: "" };

function normalizeStringArray(value: unknown): string[] {
  const normalizePieces = (items: string[]) =>
    items.map((item) => item.trim().replace(/^"+|"+$/g, "")).filter(Boolean);

  const parsePostgresArray = (rawValue: string): string[] | null => {
    if (!(rawValue.startsWith("{") && rawValue.endsWith("}"))) return null;
    const inner = rawValue.slice(1, -1);
    const matches = inner.match(/"([^"]*)"|([^,]+)/g);
    if (!matches) return [];
    return normalizePieces(
      matches.map((item) => {
        const trimmed = item.trim();
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1);
        return trimmed;
      })
    );
  };

  const parseSerializedArray = (rawValue: string): string[] | null => {
    const pgParsed = parsePostgresArray(rawValue);
    if (pgParsed) return pgParsed;

    try {
      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed)) {
        return normalizePieces(parsed.filter((item): item is string => typeof item === "string"));
      }
      if (typeof parsed === "string") return parseSerializedArray(parsed);
    } catch {
      // Not valid JSON array.
    }

    const csvTokens = rawValue.split(",").map((item) => item.trim()).filter(Boolean);
    const looksLikeChars = csvTokens.length > 8 && csvTokens.filter((item) => item.length <= 2).length / csvTokens.length > 0.6;
    if (looksLikeChars) {
      const rebuilt = csvTokens.join("");
      const reparsed = parseSerializedArray(rebuilt);
      if (reparsed) return reparsed;
      const cleaned = rebuilt.replace(/^\[+|]+$/g, "").replace(/^"+|"+$/g, "").trim();
      return cleaned ? [cleaned] : [];
    }

    return null;
  };

  if (Array.isArray(value)) {
    const arr = value.filter((item): item is string => typeof item === "string");
    if (arr.length === 1) {
      const parsedSingle = parseSerializedArray(arr[0].trim());
      if (parsedSingle) return parsedSingle;
    }
    const maybeChars = arr.length > 0 && arr.every((item) => item.length <= 2);
    if (maybeChars) {
      const rebuilt = arr.join("");
      const parsed = parseSerializedArray(rebuilt);
      if (parsed) return parsed;
    }
    return normalizePieces(arr);
  }
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return [];
    const parsed = parseSerializedArray(raw);
    if (parsed) return parsed;
    return normalizePieces(raw.split(","));
  }
  return [];
}

function toggleArrayItem(arr: string[], value: string) {
  return arr.includes(value) ? arr.filter((entry) => entry !== value) : [...arr, value];
}

function proposalVisibilityScope(proposal: LooseProposal) {
  const raw = (proposal as Record<string, unknown>).visibility_scope;
  return raw === "specific_departments" || raw === "all_departments" ? raw : "all_departments";
}

export function ProjectProposalForm({
  onSuccess,
  proposal,
  isViewOnly,
  currentUserType,
  currentDepartment,
  currentUnit,
  unitOptions = [],
}: ProjectProposalFormProps) {
  const departmentLabel = `${currentDepartment || "N/A"}${currentUnit ? ` / ${currentUnit}` : ""}`;
  const isSuperAdmin = currentUserType === "super_admin";
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      entry_type: "project_proposal",
      project_title: proposal?.project_title || proposal?.title || "",
      agenda_classification: normalizeStringArray(proposal?.classification),
      project_leader: proposal?.proponents?.[0]?.name || "",
      co_project_leaders: Array.isArray(proposal?.co_project_leaders)
        ? proposal.co_project_leaders.map((item) => ({ name: item?.name || "" }))
        : [],
      project_assistants: Array.isArray(proposal?.project_assistants)
        ? proposal.project_assistants.map((item) => ({ name: item?.name || "" }))
        : [],
      department_label:
        `${proposal?.proposal_department || currentDepartment || "N/A"}${proposal?.proposal_unit || currentUnit ? ` / ${proposal?.proposal_unit || currentUnit}` : ""}`,
      collaborating_agency: proposal?.collaborating_agencies || "",
      target_beneficiaries: normalizeStringArray(proposal?.target_beneficiaries),
      target_beneficiary_others: proposal?.target_beneficiary_others || "",
      community_location: proposal?.community_location || "",
      target_budget: proposal?.budget_total != null ? String(proposal.budget_total) : "",
      sdg_goals: normalizeStringArray(proposal?.sdg_goals),
      faculty_involved: Array.isArray(proposal?.faculty_involved) && proposal.faculty_involved.length > 0
        ? proposal.faculty_involved.map((item) => ({ name: item?.name || "" }))
        : [emptyFaculty],
      proposal_department: proposal?.proposal_department || currentDepartment || "",
      proposal_unit: proposal?.proposal_unit || currentUnit || "",
      visibility_scope: proposal && isSuperAdmin
        ? proposalVisibilityScope(proposal)
        : isSuperAdmin
          ? "all_departments"
          : "public",
      visible_departments: proposal && isSuperAdmin
        ? normalizeStringArray((proposal as Record<string, unknown>).visible_departments)
        : isSuperAdmin
          ? [...DEPARTMENTS]
          : currentDepartment ? [currentDepartment] : [],
      documents: proposal?.documents || [],
    },
  });

  const [showSuccess, setShowSuccess] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { fields: coLeaderFields, append: appendCoLeader, remove: removeCoLeader } = useFieldArray({
    control: form.control,
    name: "co_project_leaders",
  });
  const { fields: assistantFields, append: appendAssistant, remove: removeAssistant } = useFieldArray({
    control: form.control,
    name: "project_assistants",
  });
  const { fields: facultyFields, append: appendFaculty, remove: removeFaculty } = useFieldArray({
    control: form.control,
    name: "faculty_involved",
  });

  const selectedBeneficiaries = form.watch("target_beneficiaries");
  const watchedDepartment = form.watch("proposal_department");
  const watchedVisibilityScope = form.watch("visibility_scope");
  const availableUnits = React.useMemo(
    () =>
      isSuperAdmin
        ? (watchedDepartment ? getUnitsByDepartment(watchedDepartment) : unitOptions)
        : getUnitsByDepartment(watchedDepartment || currentDepartment),
    [currentDepartment, isSuperAdmin, unitOptions, watchedDepartment]
  );

  React.useEffect(() => {
    if (!isSuperAdmin) return;
    const nextUnit = form.getValues("proposal_unit");
    if (nextUnit && !availableUnits.includes(nextUnit)) {
      form.setValue("proposal_unit", "", { shouldValidate: true });
    }
  }, [availableUnits, form, isSuperAdmin]);

  React.useEffect(() => {
    if (!isSuperAdmin) return;
    if (
      watchedVisibilityScope === "all_departments" &&
      (form.getValues("visible_departments") || []).length !== DEPARTMENTS.length
    ) {
      form.setValue("visible_departments", [...DEPARTMENTS], { shouldValidate: true });
    }
  }, [form, isSuperAdmin, watchedVisibilityScope]);

  async function onSubmit(values: FormValues) {
    if (isViewOnly) return;
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        entry_type: "project_proposal",
        title: values.project_title,
        project_title: values.project_title,
        classification: values.agenda_classification,
        proponents: [{ name: values.project_leader }],
        co_project_leaders: values.co_project_leaders,
        project_assistants: values.project_assistants,
        proposal_department: values.proposal_department || currentDepartment || null,
        proposal_unit: values.proposal_unit || currentUnit || null,
        lead_units: values.proposal_department ? [values.proposal_department] : currentDepartment ? [currentDepartment] : [],
        related_curricular_offerings: values.proposal_unit ? [values.proposal_unit] : currentUnit ? [currentUnit] : [],
        collaborating_agencies: values.collaborating_agency,
        target_beneficiaries: values.target_beneficiaries,
        target_beneficiary_others: values.target_beneficiary_others?.trim() || null,
        community_location: values.community_location,
        budget_total: Number(values.target_budget),
        sdg_goals: values.sdg_goals,
        faculty_involved: values.faculty_involved,
        academic_program: "N/A",
        budget_requirements: [],
        visibility_scope: isSuperAdmin ? values.visibility_scope : "public",
        visible_departments: isSuperAdmin ? values.visible_departments : currentDepartment ? [currentDepartment] : [],
        documents: values.documents,
      };

      const result = proposal?.id ? await updateProject(proposal.id, payload) : await createProject(payload);
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

  const handleSuccessClose = () => {
    setShowSuccess(false);
    onSuccess?.();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <ScrollArea className="h-[72vh] pr-4">
          <div className="space-y-4 pb-3">
            <FormField
              control={form.control}
              name="project_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px]">Project Title</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <FileText className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        {...field}
                        className="h-8 pl-7 text-[10px] placeholder:text-[10px]"
                        placeholder="Enter project title"
                        disabled={isViewOnly}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="agenda_classification"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] leading-none">University Extension Agenda Classification</FormLabel>
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {agendaOptions.map((option) => (
                      <label key={option} className="flex items-start gap-2 rounded-md border border-border/50 px-2 py-1.5">
                        <Checkbox
                          checked={(field.value || []).includes(option)}
                          disabled={isViewOnly}
                          onCheckedChange={() => field.onChange(toggleArrayItem(field.value || [], option))}
                        />
                        <span className="text-[10px] leading-snug">{option}</span>
                      </label>
                    ))}
                  </div>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <div className="space-y-3 rounded-md border border-border/50 p-3">
              <h3 className="text-[10px] font-semibold">Proponents</h3>
              <FormField
                control={form.control}
                name="project_leader"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px]">Project leader</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-8 text-[10px] placeholder:text-[10px]" placeholder="Full name" disabled={isViewOnly} />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
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
                  <p className="text-[10px] text-muted-foreground">No co-project leader added.</p>
                ) : (
                  coLeaderFields.map((leader, idx) => (
                    <div key={leader.id} className="flex items-center gap-2">
                      <FormField
                        control={form.control}
                        name={`co_project_leaders.${idx}.name`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input {...field} className="h-8 text-[10px] placeholder:text-[10px]" placeholder="Full name" disabled={isViewOnly} />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
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
                      <FormField
                        control={form.control}
                        name={`project_assistants.${idx}.name`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input {...field} className="h-8 text-[10px] placeholder:text-[10px]" placeholder="Full name" disabled={isViewOnly} />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
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

            {isSuperAdmin ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="proposal_department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px]">Department</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange} disabled={isViewOnly}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-[10px]">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DEPARTMENTS.map((departmentName) => (
                            <SelectItem key={departmentName} value={departmentName} className="text-[10px]">
                              {departmentName}
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
                  name="proposal_unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px]">Unit</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange} disabled={isViewOnly || availableUnits.length === 0}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-[10px]">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableUnits.map((unitName) => (
                            <SelectItem key={unitName} value={unitName} className="text-[10px]">
                              {unitName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <FormField
                control={form.control}
                name="department_label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px]">Department</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Building2 className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          value={field.value || departmentLabel}
                          readOnly
                          disabled
                          className="h-8 pl-7 text-[10px] bg-muted/20"
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {isSuperAdmin && (
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

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <FormField
                control={form.control}
                name="collaborating_agency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px]">Collaborating Agency</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Handshake className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input {...field} className="h-8 pl-7 text-[10px] placeholder:text-[10px]" disabled={isViewOnly} />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="community_location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px]">Community Location</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input {...field} className="h-8 pl-7 text-[10px] placeholder:text-[10px]" disabled={isViewOnly} />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <FormField
                control={form.control}
                name="target_beneficiaries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px]">Target Beneficiary</FormLabel>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 w-full justify-between text-[10px] font-normal"
                          disabled={isViewOnly}
                        >
                          <span className="flex items-center gap-1 truncate">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            {field.value.length > 0 ? field.value.join(", ") : "Select target beneficiary"}
                          </span>
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-64">
                        <DropdownMenuLabel className="text-[10px]">Select one or more</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {beneficiaryOptions.map((option) => (
                          <DropdownMenuCheckboxItem
                            key={option}
                            className="text-[10px] capitalize"
                            checked={field.value.includes(option)}
                            onCheckedChange={() => field.onChange(toggleArrayItem(field.value || [], option))}
                          >
                            {option}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="target_budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px]">Target Budget</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={typeof field.value === "string" ? field.value : ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder="₱ Enter amount"
                        className="h-8 text-[10px] placeholder:text-[10px] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        disabled={isViewOnly}
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            </div>

            {selectedBeneficiaries.includes("others") && (
              <FormField
                control={form.control}
                name="target_beneficiary_others"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px]">Others (specify)</FormLabel>
                    <FormControl>
                      <Textarea {...field} className="min-h-[56px] text-[10px]" disabled={isViewOnly} />
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
                <FormItem>
                  <FormLabel className="text-[10px]">SDG</FormLabel>
                  <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
                    {sdgOptions.map((goal) => (
                      <label key={goal.id} className="flex items-center gap-1 rounded-md border border-border/50 px-2 py-1">
                        <Checkbox
                          checked={(field.value || []).includes(goal.id)}
                          disabled={isViewOnly}
                          onCheckedChange={() => field.onChange(toggleArrayItem(field.value || [], goal.id))}
                        />
                        <span className="text-[10px]">{goal.label}</span>
                      </label>
                    ))}
                  </div>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <div className="space-y-2 rounded-md border border-border/50 p-3">
              <div className="flex items-center justify-between">
                <FormLabel className="text-[10px]">Faculty Involved</FormLabel>
                {!isViewOnly && (
                  <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => appendFaculty({ name: "" })}>
                    <Plus className="mr-1 h-3 w-3" /> Add
                  </Button>
                )}
              </div>
              {facultyFields.map((member, idx) => (
                <div key={member.id} className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name={`faculty_involved.${idx}.name`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input {...field} className="h-8 text-[10px] placeholder:text-[10px]" placeholder="Full name" disabled={isViewOnly} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  {!isViewOnly && facultyFields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFaculty(idx)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <FormField
              control={form.control}
              name="documents"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px]">Upload documents</FormLabel>
                  <FormControl>
                    <FileUpload value={field.value || []} onChange={(docs) => form.setValue("documents", docs, { shouldDirty: true })} disabled={isViewOnly || isSubmitting} maxFiles={10} />
                  </FormControl>
                </FormItem>
              )}
            />

            {!isViewOnly && (
              <div className="flex justify-end">
                <Button type="submit" className="h-8 text-[10px] bg-[#159E44] hover:bg-[#128A3B]" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : proposal?.id ? "Update Project Proposal" : "Submit Project Proposal"}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </form>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader className="flex flex-col items-center justify-center pt-4">
            <div className="rounded-full bg-[#159E44]/10 p-3 mb-4"><CheckCircle2 className="h-10 w-10 text-[#159E44]" /></div>
            <DialogTitle className="text-lg font-semibold text-center">Project Proposal Submitted</DialogTitle>
            <DialogDescription className="text-[10px] text-center">The project proposal record has been saved.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button type="button" className="bg-[#159E44] hover:bg-[#128A3B] px-8 h-9 text-[10px]" onClick={handleSuccessClose}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
