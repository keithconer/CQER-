"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { BookText, ChevronLeft, ChevronRight, FileUp, Megaphone, Save, Users } from "lucide-react";

import { FullscreenFormHeader } from "@/components/dashboard/fullscreen-form-header";
import { FileUpload } from "@/components/dashboard/file-upload";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Project } from "./projects-table";
import { THEMATIC_AREA_OPTIONS } from "@/lib/thematic-area";
import {
  createIecMaterial,
  updateIecMaterial,
  type CreateIecMaterialPayload,
  type IecMaterialRecord,
} from "@/lib/actions/iec-materials";
import { cn } from "@/lib/utils";
import { DEFAULT_DOCUMENT_ACCEPT, DOCUMENT_UPLOAD_GUIDANCE } from "@/lib/document-uploads";

const stepLabels = ["IEC Material Details", "Recipients Details", "Saving"];
const noProjectValue = "__none__";
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
] as const;

const nonNegativeNumber = z.coerce.number().min(0, "Value must be 0 or greater.");

const formSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  format: z.enum(["video", "brochure", "pamphlet", "e-formats"]),
  related_project_id: z.string().nullable().default(null),
  sdg_goals: z.array(z.string()).min(1, "Select at least one SDG."),
  thematic_area: z.array(z.string()).min(1, "Select at least one thematic area."),
  male_count: nonNegativeNumber.default(0),
  female_count: nonNegativeNumber.default(0),
  student_count: nonNegativeNumber.default(0),
  farmer_count: nonNegativeNumber.default(0),
  fisherfolk_count: nonNegativeNumber.default(0),
  ag_technician_count: nonNegativeNumber.default(0),
  government_employee_count: nonNegativeNumber.default(0),
  private_employee_count: nonNegativeNumber.default(0),
  include_others: z.boolean().default(false),
  others_label: z.string().trim().optional().or(z.literal("")),
  others_count: nonNegativeNumber.default(0),
  documents: z.array(z.object({ url: z.string(), name: z.string() })).default([]),
}).superRefine((values, ctx) => {
  if (values.include_others && !values.others_label) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["others_label"],
      message: "Please specify the other category.",
    });
  }
});

type FormValues = z.infer<typeof formSchema>;

interface IecMaterialsFormProps {
  initialData?: IecMaterialRecord;
  projects: Project[];
  onSuccess: (action: "created" | "updated") => void;
  onClose?: () => void;
  isViewOnly?: boolean;
}

function toggleArrayItem(values: string[], item: string) {
  return values.includes(item) ? values.filter((value) => value !== item) : [...values, item];
}

function buildDefaultValues(record?: IecMaterialRecord): FormValues {
  return {
    title: record?.title || "",
    format: record?.format || "video",
    related_project_id: record?.related_project_id || null,
    sdg_goals: record?.sdg_goals || [],
    thematic_area: record?.thematic_area || [],
    male_count: record?.male_count || 0,
    female_count: record?.female_count || 0,
    student_count: record?.student_count || 0,
    farmer_count: record?.farmer_count || 0,
    fisherfolk_count: record?.fisherfolk_count || 0,
    ag_technician_count: record?.ag_technician_count || 0,
    government_employee_count: record?.government_employee_count || 0,
    private_employee_count: record?.private_employee_count || 0,
    include_others: Boolean(record?.others_label),
    others_label: record?.others_label || "",
    others_count: record?.others_count || 0,
    documents: record?.documents || [],
  };
}

export function IecMaterialsForm({
  initialData,
  projects,
  onSuccess,
  onClose,
  isViewOnly = false,
}: IecMaterialsFormProps) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const autoSubmitStartedRef = React.useRef(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: buildDefaultValues(initialData),
  });

  const selectedProjectId = useWatch({ control: form.control, name: "related_project_id" });
  const includeOthers = useWatch({ control: form.control, name: "include_others" });
  const maleCount = Number(useWatch({ control: form.control, name: "male_count" }) || 0);
  const femaleCount = Number(useWatch({ control: form.control, name: "female_count" }) || 0);
  const studentCount = Number(useWatch({ control: form.control, name: "student_count" }) || 0);
  const farmerCount = Number(useWatch({ control: form.control, name: "farmer_count" }) || 0);
  const fisherfolkCount = Number(useWatch({ control: form.control, name: "fisherfolk_count" }) || 0);
  const agTechnicianCount = Number(useWatch({ control: form.control, name: "ag_technician_count" }) || 0);
  const governmentEmployeeCount = Number(useWatch({ control: form.control, name: "government_employee_count" }) || 0);
  const privateEmployeeCount = Number(useWatch({ control: form.control, name: "private_employee_count" }) || 0);
  const othersCount = Number(useWatch({ control: form.control, name: "others_count" }) || 0);

  const selectedProject = React.useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const sexTotal = maleCount + femaleCount;
  const categoryTotal =
    studentCount +
    farmerCount +
    fisherfolkCount +
    agTechnicianCount +
    governmentEmployeeCount +
    privateEmployeeCount +
    (includeOthers ? othersCount : 0);
  const grandTotal = Math.max(sexTotal, categoryTotal);

  const validateStep = async () => {
    if (currentStep === 1) {
      return form.trigger(["title", "format", "related_project_id", "sdg_goals", "thematic_area"]);
    }
    if (currentStep === 2) {
      return form.trigger([
        "male_count",
        "female_count",
        "student_count",
        "farmer_count",
        "fisherfolk_count",
        "ag_technician_count",
        "government_employee_count",
        "private_employee_count",
        "include_others",
        "others_label",
        "others_count",
        "documents",
      ]);
    }
    return true;
  };

  const goNext = async () => {
    if (isViewOnly) {
      setCurrentStep((value) => Math.min(value + 1, stepLabels.length));
      return;
    }
    const valid = await validateStep();
    if (!valid) return;
    setCurrentStep((value) => Math.min(value + 1, stepLabels.length));
  };

  const goPrevious = () => setCurrentStep((value) => Math.max(value - 1, 1));

  const handleSubmit = React.useCallback(async (values: FormValues) => {
    const matchedProject = projects.find((project) => project.id === values.related_project_id) || null;
    const payload: CreateIecMaterialPayload = {
      title: values.title,
      format: values.format,
      related_project_id: matchedProject?.id || null,
      related_project_title: matchedProject?.title || null,
      sdg_goals: values.sdg_goals,
      thematic_area: values.thematic_area,
      male_count: values.male_count,
      female_count: values.female_count,
      student_count: values.student_count,
      farmer_count: values.farmer_count,
      fisherfolk_count: values.fisherfolk_count,
      ag_technician_count: values.ag_technician_count,
      government_employee_count: values.government_employee_count,
      private_employee_count: values.private_employee_count,
      others_label: values.include_others ? values.others_label || null : null,
      others_count: values.include_others ? values.others_count : 0,
      documents: values.documents,
    };

    setIsSubmitting(true);
    const result = initialData?.id
      ? await updateIecMaterial(initialData.id, payload)
      : await createIecMaterial(payload);
    setIsSubmitting(false);

    if (result?.error) {
      alert(result.error);
      setCurrentStep(2);
      autoSubmitStartedRef.current = false;
      return;
    }

    onSuccess(initialData?.id ? "updated" : "created");
  }, [initialData?.id, onSuccess, projects]);

  React.useEffect(() => {
    autoSubmitStartedRef.current = false;
  }, [initialData?.id]);

  React.useEffect(() => {
    if (currentStep !== 3 || isViewOnly || autoSubmitStartedRef.current) return;
    autoSubmitStartedRef.current = true;
    const timeout = window.setTimeout(() => {
      void form.handleSubmit(handleSubmit as any)();
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [currentStep, form, handleSubmit, isViewOnly]);

  React.useEffect(() => {
    if (includeOthers) return;
    form.setValue("others_label", "", { shouldDirty: true });
    form.setValue("others_count", 0, { shouldDirty: true });
  }, [form, includeOthers]);

  return (
    <Form {...form}>
      <form onSubmit={(event) => event.preventDefault()} className="flex h-full min-h-0 flex-col bg-background">
        <FullscreenFormHeader
          title={initialData?.id ? (isViewOnly ? "IEC Materials Details" : "Update IEC Materials") : "Create IEC Materials"}
          currentStep={currentStep}
          totalSteps={stepLabels.length}
          labels={stepLabels}
          onClose={onClose}
          items={[
            { icon: BookText, label: "Title", value: form.watch("title") || "Unassigned", minWidthClassName: "min-w-[210px]" },
            { icon: Megaphone, label: "Project", value: selectedProject?.title || initialData?.related_project_title || "Not linked to a project", minWidthClassName: "min-w-[210px]" },
            { icon: Users, label: "Grand Total", value: grandTotal, minWidthClassName: "min-w-[120px]" },
          ]}
        />

        <div className="flex-1 overflow-y-auto bg-background px-4 py-4 sm:px-6 lg:px-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <Card className="rounded-3xl border-border/40 shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Megaphone className="h-5 w-5 text-foreground" />
                    IEC Material Details
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Capture the IEC material basics, linked project, SDGs, and thematic areas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 xl:grid-cols-2">
                    <FormField control={form.control as any} name="title" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Title</FormLabel>
                        <FormControl><Input {...field} disabled={isViewOnly} className="h-10 rounded-xl text-sm" /></FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )} />
                    <FormField control={form.control as any} name="format" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Format</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange} disabled={isViewOnly}>
                          <FormControl>
                            <SelectTrigger className="h-10 rounded-xl text-sm">
                              <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="video" className="text-sm">Video</SelectItem>
                            <SelectItem value="brochure" className="text-sm">Brochure</SelectItem>
                            <SelectItem value="pamphlet" className="text-sm">Pamphlet</SelectItem>
                            <SelectItem value="e-formats" className="text-sm">E-formats</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control as any} name="related_project_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Title of the Project Involved</FormLabel>
                      <Select value={field.value || noProjectValue} onValueChange={(value) => field.onChange(value === noProjectValue ? null : value)} disabled={isViewOnly}>
                        <FormControl>
                          <SelectTrigger className="h-10 rounded-xl text-sm">
                            <SelectValue placeholder="Select a project or choose none" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={noProjectValue} className="text-sm">Not linked to a project</SelectItem>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id} className="text-sm">{project.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )} />

                  <div className="grid gap-6 xl:grid-cols-2">
                    <FormField control={form.control as any} name="sdg_goals" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">SDG</FormLabel>
                        <div className="grid gap-3 rounded-2xl border border-border/40 p-4 md:grid-cols-2">
                          {sdgOptions.map((goal) => (
                            <label key={goal.id} className="flex items-start gap-2 text-sm">
                              <Checkbox
                                checked={(field.value || []).includes(goal.id)}
                                disabled={isViewOnly}
                                onCheckedChange={() => field.onChange(toggleArrayItem(field.value || [], goal.id))}
                              />
                              <span>{goal.label}</span>
                            </label>
                          ))}
                        </div>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )} />

                    <FormField control={form.control as any} name="thematic_area" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Thematic Area</FormLabel>
                        <div className="grid gap-3 rounded-2xl border border-border/40 p-4">
                          {THEMATIC_AREA_OPTIONS.map((option) => (
                            <label key={option.code} className="flex items-start gap-2 text-sm">
                              <Checkbox
                                checked={(field.value || []).includes(option.value)}
                                disabled={isViewOnly}
                                onCheckedChange={() => field.onChange(toggleArrayItem(field.value || [], option.value))}
                              />
                              <span>{option.label}</span>
                            </label>
                          ))}
                        </div>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <Card className="rounded-3xl border-border/40 shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-5 w-5 text-foreground" />
                    Recipients Details
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Encode the recipient breakdown, totals, and supporting PDF or Excel document.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 xl:grid-cols-2">
                    <Card className="rounded-2xl border-border/40 shadow-none">
                      <CardHeader>
                        <CardTitle className="text-sm">Sex</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 xl:grid-cols-2">
                          <FormField control={form.control as any} name="male_count" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Male</FormLabel>
                              <FormControl><Input type="number" min="0" {...field} onFocus={(event) => event.currentTarget.select()} disabled={isViewOnly} className="h-10 rounded-xl text-sm" /></FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )} />
                          <FormField control={form.control as any} name="female_count" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Female</FormLabel>
                              <FormControl><Input type="number" min="0" {...field} onFocus={(event) => event.currentTarget.select()} disabled={isViewOnly} className="h-10 rounded-xl text-sm" /></FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )} />
                        </div>
                        <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Total Sex</p>
                          <p className="text-sm font-semibold text-foreground">{sexTotal}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-border/40 shadow-none">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <BookText className="h-4 w-4 text-foreground" />
                          Category
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 xl:grid-cols-2">
                          <FormField control={form.control as any} name="student_count" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Student</FormLabel>
                              <FormControl><Input type="number" min="0" {...field} onFocus={(event) => event.currentTarget.select()} disabled={isViewOnly} className="h-10 rounded-xl text-sm" /></FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )} />
                          <FormField control={form.control as any} name="farmer_count" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Farmer</FormLabel>
                              <FormControl><Input type="number" min="0" {...field} onFocus={(event) => event.currentTarget.select()} disabled={isViewOnly} className="h-10 rounded-xl text-sm" /></FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )} />
                          <FormField control={form.control as any} name="fisherfolk_count" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Fisherfolk</FormLabel>
                              <FormControl><Input type="number" min="0" {...field} onFocus={(event) => event.currentTarget.select()} disabled={isViewOnly} className="h-10 rounded-xl text-sm" /></FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )} />
                          <FormField control={form.control as any} name="ag_technician_count" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Ag Technician</FormLabel>
                              <FormControl><Input type="number" min="0" {...field} onFocus={(event) => event.currentTarget.select()} disabled={isViewOnly} className="h-10 rounded-xl text-sm" /></FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )} />
                          <FormField control={form.control as any} name="government_employee_count" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Government Employee</FormLabel>
                              <FormControl><Input type="number" min="0" {...field} onFocus={(event) => event.currentTarget.select()} disabled={isViewOnly} className="h-10 rounded-xl text-sm" /></FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )} />
                          <FormField control={form.control as any} name="private_employee_count" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Private Employee</FormLabel>
                              <FormControl><Input type="number" min="0" {...field} onFocus={(event) => event.currentTarget.select()} disabled={isViewOnly} className="h-10 rounded-xl text-sm" /></FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )} />
                        </div>

                        <FormField control={form.control as any} name="include_others" render={({ field }) => (
                          <FormItem className="rounded-xl border border-border/40 px-4 py-3">
                            <label className="flex items-center gap-2 text-sm">
                              <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} disabled={isViewOnly} />
                              Others
                            </label>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )} />
                        {includeOthers && (
                          <div className="grid gap-4 xl:grid-cols-2">
                            <FormField control={form.control as any} name="others_label" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Please Specify</FormLabel>
                                <FormControl><Input {...field} disabled={isViewOnly} className="h-10 rounded-xl text-sm" /></FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )} />
                            <FormField control={form.control as any} name="others_count" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Others Count</FormLabel>
                                <FormControl><Input type="number" min="0" {...field} onFocus={(event) => event.currentTarget.select()} disabled={isViewOnly} className="h-10 rounded-xl text-sm" /></FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )} />
                          </div>
                        )}

                        <div className="grid gap-3 xl:grid-cols-2">
                          <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-3">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Total Category</p>
                            <p className="text-sm font-semibold text-foreground">{categoryTotal}</p>
                          </div>
                          <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-3">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Grand Total</p>
                            <p className="text-sm font-semibold text-foreground">{grandTotal}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="rounded-2xl border-border/40 shadow-none">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <FileUp className="h-4 w-4 text-foreground" />
                        Uploading of Documents
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Upload IEC supporting files as PDF or Excel. Supabase remains the main storage and Cloudinary is used as secure backup when required.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormField control={form.control as any} name="documents" render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <FileUpload
                              value={field.value ?? []}
                              onChange={field.onChange}
                              disabled={isViewOnly}
                              bucket="cqer-iecmat_pdf"
                              accept={DEFAULT_DOCUMENT_ACCEPT}
                              maxSizeInMB={5}
                              guidance={DOCUMENT_UPLOAD_GUIDANCE.iec}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )} />
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
                  <CardTitle className="text-center text-lg">{isViewOnly ? "IEC Materials Summary" : isSubmitting ? "Saving..." : "Preparing Save"}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center py-10">
                  <div className="mb-4 rounded-full bg-muted p-6">
                    <Save className={cn("h-10 w-10 text-foreground", !isViewOnly && "animate-pulse")} />
                  </div>
                  <p className="max-w-md text-center text-sm text-muted-foreground">
                    {isViewOnly ? "This record is displayed in the same step-based layout used for create and update." : "Please wait while the IEC materials record is automatically saved."}
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
              {currentStep < stepLabels.length && (
                <Button type="button" className="rounded-xl" onClick={goNext} disabled={isSubmitting}>
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
