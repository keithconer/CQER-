"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import {
  ArrowLeftRight,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileUp,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  UserRound,
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
import { cn } from "@/lib/utils";
import {
  createAdoptersWithEnterprise,
  updateAdoptersWithEnterprise,
  type AdopterCategory,
  type AdoptersWithEnterpriseRecord,
  type CreateAdoptersWithEnterprisePayload,
} from "@/lib/actions/adopters-with-enterprise";
import { type Project } from "./projects-table";

const stepLabels = ["Technology Transferred", "Adopter's Details", "Saving"];
const noProjectValue = "__none__";
const nonNegativeNumber = z.coerce.number().min(0, "Value must be 0 or greater.");

const adopterSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  address: z.string().trim().min(1, "Address is required."),
  contact_through: z.enum(["email", "phone", "both"]),
  email: z.string().trim().optional().or(z.literal("")),
  phone_number: z.string().trim().optional().or(z.literal("")),
  sex: z.enum(["male", "female"]),
  category: z.enum(["internal", "external"]),
  monthly_income_before_type: z.enum(["estimated", "exact"]),
  monthly_income_before_value: nonNegativeNumber,
  monthly_income_after_type: z.enum(["estimated", "exact"]),
  monthly_income_after_value: nonNegativeNumber,
  monthly_income_difference_type: z.enum(["estimated", "exact"]),
  monthly_income_difference_value: nonNegativeNumber,
}).superRefine((value, ctx) => {
  if ((value.contact_through === "email" || value.contact_through === "both") && !value.email) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["email"], message: "Email is required." });
  }
  if ((value.contact_through === "phone" || value.contact_through === "both") && !value.phone_number) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phone_number"], message: "Phone number is required." });
  }
});

const formSchema = z.object({
  technology_transferred: z.string().trim().min(1, "Technology/Process/System Transferred is required."),
  transfer_date: z.date(),
  related_project_id: z.string().nullable().default(null),
  adopters: z.array(adopterSchema).min(1, "Add at least one adopter."),
  documents: z.array(z.object({ url: z.string(), name: z.string() })).default([]),
});

type FormValues = z.infer<typeof formSchema>;

interface AdoptersWithEnterpriseFormProps {
  initialData?: AdoptersWithEnterpriseRecord;
  projects: Project[];
  onSuccess: (action: "created" | "updated") => void;
  onClose?: () => void;
  isViewOnly?: boolean;
}

function normalizeDateValue(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getProjectCategory(project: Project): AdopterCategory {
  return (project.funding_source || "").toLowerCase().includes("external") ? "external" : "internal";
}

function buildDefaultValues(record?: AdoptersWithEnterpriseRecord): FormValues {
  return {
    technology_transferred: record?.technology_transferred || "",
    transfer_date: record?.transfer_date ? normalizeDateValue(new Date(record.transfer_date)) : normalizeDateValue(new Date()),
    related_project_id: record?.related_project_id || null,
    adopters: record?.adopters?.length
      ? record.adopters
      : [{
          name: "",
          address: "",
          contact_through: "email",
          email: "",
          phone_number: "",
          sex: "male",
          category: "internal",
          monthly_income_before_type: "estimated",
          monthly_income_before_value: 0,
          monthly_income_after_type: "estimated",
          monthly_income_after_value: 0,
          monthly_income_difference_type: "estimated",
          monthly_income_difference_value: 0,
        }],
    documents: record?.documents || [],
  };
}

export function AdoptersWithEnterpriseForm({
  initialData,
  projects,
  onSuccess,
  onClose,
  isViewOnly = false,
}: AdoptersWithEnterpriseFormProps) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const autoSubmitStartedRef = React.useRef(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: buildDefaultValues(initialData),
  });

  const adoptersArray = useFieldArray({ control: form.control, name: "adopters" });
  const selectedProjectId = useWatch({ control: form.control, name: "related_project_id" });
  const adopters = useWatch({ control: form.control, name: "adopters" });
  const selectedProject = React.useMemo(() => projects.find((project) => project.id === selectedProjectId) || null, [projects, selectedProjectId]);

  React.useEffect(() => {
    if (!selectedProject || isViewOnly) return;
    const nextCategory = getProjectCategory(selectedProject);
    adopters.forEach((_, index) => {
      form.setValue(`adopters.${index}.category`, nextCategory, { shouldDirty: true });
    });
  }, [adopters, form, isViewOnly, selectedProject]);

  const validateStep = async () => {
    if (currentStep === 1) return form.trigger(["technology_transferred", "transfer_date", "related_project_id"]);
    if (currentStep === 2) return form.trigger(["adopters", "documents"]);
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
    const payload: CreateAdoptersWithEnterprisePayload = {
      technology_transferred: values.technology_transferred,
      transfer_date: normalizeDateValue(values.transfer_date).toISOString(),
      related_project_id: matchedProject?.id || null,
      related_project_title: matchedProject?.title || null,
      adopters: values.adopters.map((adopter) => ({
        ...adopter,
        category: matchedProject ? getProjectCategory(matchedProject) : adopter.category,
        email: adopter.contact_through === "phone" ? "" : adopter.email || "",
        phone_number: adopter.contact_through === "email" ? "" : adopter.phone_number || "",
      })),
      documents: values.documents,
    };

    setIsSubmitting(true);
    const result = initialData?.id
      ? await updateAdoptersWithEnterprise(initialData.id, payload)
      : await createAdoptersWithEnterprise(payload);
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

  return (
    <Form {...form}>
      <form onSubmit={(event) => event.preventDefault()} className="flex h-full min-h-0 flex-col bg-background">
        <div className="border-b border-border/40 bg-background px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex w-full items-start justify-between gap-4">
            <h1 className="text-xl font-bold text-foreground">
              {initialData?.id ? (isViewOnly ? "Adopters with Enterprise Details" : "Update Adopters with Enterprise") : "Create Adopters with Enterprise"}
            </h1>
            {onClose && (
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Technology Transferred</p>
              <p className="truncate text-xs font-medium text-foreground">{form.watch("technology_transferred") || "Unassigned"}</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Project</p>
              <p className="truncate text-xs font-medium text-foreground">{selectedProject?.title || initialData?.related_project_title || "Not part of a project"}</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Adopters</p>
              <p className="truncate text-xs font-medium text-foreground">{adopters.length}</p>
            </div>
          </div>
          <div className="mt-4 w-full">
            <StepIndicator currentStep={currentStep} totalSteps={stepLabels.length} labels={stepLabels} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-background px-4 py-5 sm:px-6 lg:px-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <Card className="rounded-3xl border-border/40 shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ArrowLeftRight className="h-5 w-5 text-foreground" />
                    Technology Transferred Section
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Capture the technology transfer details and project link.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField control={form.control as any} name="technology_transferred" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Technology/Process/System Transferred</FormLabel>
                      <FormControl><Input {...field} disabled={isViewOnly} className="h-10 rounded-xl text-sm" /></FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )} />
                  <div className="grid gap-4 xl:grid-cols-2">
                    <FormField control={form.control as any} name="transfer_date" render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-xs">Date of Transfer</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className={cn("h-10 justify-between rounded-xl text-sm font-normal", !field.value && "text-muted-foreground")} disabled={isViewOnly}>
                                {field.value ? format(field.value, "PPP") : "Pick a date"}
                                <CalendarIcon className="h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={(date) => date && field.onChange(normalizeDateValue(date))} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )} />
                    <FormField control={form.control as any} name="related_project_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Title of the Project if Part of the Project</FormLabel>
                        <Select value={field.value || noProjectValue} onValueChange={(value) => field.onChange(value === noProjectValue ? null : value)} disabled={isViewOnly}>
                          <FormControl>
                            <SelectTrigger className="h-10 rounded-xl text-sm">
                              <SelectValue placeholder="Select a project or choose not part of a project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={noProjectValue} className="text-sm">Not part of a project</SelectItem>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id} className="text-sm">{project.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <UserRound className="h-5 w-5 text-foreground" />
                      Adopter&apos;s Details Section
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Add adopters, contact details, category, income details, and the supporting PDF document.
                    </CardDescription>
                  </div>
                  {!isViewOnly && (
                    <Button type="button" className="rounded-xl bg-[#159E44] text-white hover:bg-[#128A3B]" onClick={() => adoptersArray.append({
                      name: "",
                      address: "",
                      contact_through: "email",
                      email: "",
                      phone_number: "",
                      sex: "male",
                      category: selectedProject ? getProjectCategory(selectedProject) : "internal",
                      monthly_income_before_type: "estimated",
                      monthly_income_before_value: 0,
                      monthly_income_after_type: "estimated",
                      monthly_income_after_value: 0,
                      monthly_income_difference_type: "estimated",
                      monthly_income_difference_value: 0,
                    })}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Adopter
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  {adoptersArray.fields.map((fieldItem, index) => {
                    const adopter = adopters[index];
                    const lockCategory = Boolean(selectedProject);
                    return (
                      <div key={fieldItem.id} className="space-y-4 rounded-2xl border border-border/40 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">Adopter {index + 1}</p>
                          {!isViewOnly && adoptersArray.fields.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive" onClick={() => adoptersArray.remove(index)}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="grid gap-4 xl:grid-cols-2">
                          <FormField control={form.control as any} name={`adopters.${index}.name`} render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Name</FormLabel>
                              <FormControl><Input {...field} disabled={isViewOnly} className="h-10 rounded-xl text-sm" /></FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )} />
                          <FormField control={form.control as any} name={`adopters.${index}.address`} render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Address</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                  <Input {...field} disabled={isViewOnly} className="h-10 rounded-xl pl-10 text-sm" />
                                </div>
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )} />
                        </div>
                        <div className="grid gap-4 xl:grid-cols-2">
                          <FormField control={form.control as any} name={`adopters.${index}.contact_through`} render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Contact Through</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange} disabled={isViewOnly}>
                                <FormControl>
                                  <SelectTrigger className="h-10 rounded-xl text-sm">
                                    <SelectValue placeholder="Select contact method" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="email" className="text-sm">Email</SelectItem>
                                  <SelectItem value="phone" className="text-sm">Phone No.</SelectItem>
                                  <SelectItem value="both" className="text-sm">Both</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )} />
                          <FormField control={form.control as any} name={`adopters.${index}.category`} render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Category</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange} disabled={isViewOnly || lockCategory}>
                                <FormControl>
                                  <SelectTrigger className={cn("h-10 rounded-xl text-sm", lockCategory ? "bg-muted/30" : "")}>
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="internal" className="text-sm">Internal</SelectItem>
                                  <SelectItem value="external" className="text-sm">External</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                {lockCategory ? "Category is auto-filled from the selected project." : "Select category manually when not linked to a project."}
                              </p>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )} />
                        </div>

                        <FormField control={form.control as any} name={`adopters.${index}.sex`} render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Sex</FormLabel>
                            <div className="flex gap-4 rounded-xl border border-border/40 px-4 py-3">
                              <label className="flex items-center gap-2 text-sm">
                                <Checkbox checked={field.value === "male"} onCheckedChange={() => field.onChange("male")} disabled={isViewOnly} />
                                Male
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <Checkbox checked={field.value === "female"} onCheckedChange={() => field.onChange("female")} disabled={isViewOnly} />
                                Female
                              </label>
                            </div>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )} />

                        <div className="grid gap-4 xl:grid-cols-2">
                          {(adopter?.contact_through === "email" || adopter?.contact_through === "both") && (
                            <FormField control={form.control as any} name={`adopters.${index}.email`} render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Email</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input {...field} disabled={isViewOnly} className="h-10 rounded-xl pl-10 text-sm" />
                                  </div>
                                </FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )} />
                          )}
                          {(adopter?.contact_through === "phone" || adopter?.contact_through === "both") && (
                            <FormField control={form.control as any} name={`adopters.${index}.phone_number`} render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Phone No.</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input {...field} disabled={isViewOnly} className="h-10 rounded-xl pl-10 text-sm" />
                                  </div>
                                </FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )} />
                          )}
                        </div>

                        {(["before", "after", "difference"] as const).map((key) => {
                          const labelMap = {
                            before: "Monthly Income Before the Transfer",
                            after: "Monthly Income After Adopting",
                            difference: "Difference in Monthly Income",
                          };
                          const typeName = `adopters.${index}.monthly_income_${key}_type` as const;
                          const valueName = `adopters.${index}.monthly_income_${key}_value` as const;
                          return (
                            <div key={key} className="grid gap-4 xl:grid-cols-2">
                              <FormField control={form.control as any} name={typeName} render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">{labelMap[key]}</FormLabel>
                                  <Select value={field.value} onValueChange={field.onChange} disabled={isViewOnly}>
                                    <FormControl>
                                      <SelectTrigger className="h-10 rounded-xl text-sm">
                                        <SelectValue placeholder="Select type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="estimated" className="text-sm">Estimated</SelectItem>
                                      <SelectItem value="exact" className="text-sm">Exact</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )} />
                              <FormField control={form.control as any} name={valueName} render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">{labelMap[key]} Value</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <CircleDollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                      <Input type="number" min="0" {...field} onFocus={(event) => event.currentTarget.select()} disabled={isViewOnly} className="h-10 rounded-xl pl-10 text-sm" />
                                    </div>
                                  </FormControl>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )} />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  <Card className="rounded-2xl border-border/40 shadow-none">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <FileUp className="h-4 w-4 text-foreground" />
                        Uploading of Documents
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Upload PDF files to the private `cqer-adopters_pdf` bucket. Maximum 5MB per file.
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
                              bucket="cqer-adopters_pdf"
                              accept=".pdf"
                              maxSizeInMB={5}
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
                  <CardTitle className="text-center text-lg">{isViewOnly ? "Adopters with Enterprise Summary" : isSubmitting ? "Saving..." : "Preparing Save"}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center py-10">
                  <div className="mb-4 rounded-full bg-muted p-6">
                    <Save className={cn("h-10 w-10 text-foreground", !isViewOnly && "animate-pulse")} />
                  </div>
                  <p className="max-w-md text-center text-sm text-muted-foreground">
                    {isViewOnly ? "This record is displayed in the same step-based layout used for create and update." : "Please wait while the adopters with enterprise record is automatically saved."}
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
