"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import {
  BriefcaseBusiness,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Save,
  Tag,
  X,
} from "lucide-react";

import { StepIndicator } from "@/components/step-indicator";
import { FileUpload } from "@/components/dashboard/file-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import {
  createConsultancyExtension,
  updateConsultancyExtension,
  type ConsultancyCategory,
  type ConsultancyExtension,
  type ConsultancyPayload,
} from "@/lib/actions/consultancy-extension";
import { type Project } from "./projects-table";

const stepLabels = ["Consultancy Details", "Saving"];
const noProjectValue = "__none__";

const formSchema = z.object({
  title_of_consultancy: z.string().trim().min(1, "Title of consultancy is required."),
  base_agency_institute: z.string().trim().min(1, "Base agency / institute is required."),
  nature_of_consultancy: z.string().trim().min(1, "Nature of consultancy is required."),
  related_project_id: z.string().nullable().default(null),
  category: z.enum(["Internally", "Externally"]),
  status: z.enum(["On-going", "Completed"]),
  documents: z
    .array(
      z.object({
        url: z.string(),
        name: z.string(),
      })
    )
    .default([]),
});

type FormValues = z.infer<typeof formSchema>;

interface ConsultancyExtensionFormProps {
  initialData?: ConsultancyExtension;
  assignedProjects: Project[];
  onSuccess: (action: "created" | "updated") => void;
  onClose?: () => void;
  isViewOnly?: boolean;
}

function getProjectCategory(project: Project): ConsultancyCategory {
  const fundingSource = (project.funding_source || "").toLowerCase();
  return fundingSource.includes("external") ? "Externally" : "Internally";
}

function buildDefaultValues(initialData?: ConsultancyExtension): FormValues {
  return {
    title_of_consultancy: initialData?.title_of_consultancy || "",
    base_agency_institute: initialData?.base_agency_institute || "",
    nature_of_consultancy: initialData?.nature_of_consultancy || "",
    related_project_id: initialData?.related_project_id || null,
    category: initialData?.category || "Internally",
    status: initialData?.status || "On-going",
    documents: initialData?.documents || [],
  };
}

export function ConsultancyExtensionForm({
  initialData,
  assignedProjects,
  onSuccess,
  onClose,
  isViewOnly = false,
}: ConsultancyExtensionFormProps) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const autoSubmitStartedRef = React.useRef(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: buildDefaultValues(initialData),
  });

  const selectedProjectId = useWatch({
    control: form.control,
    name: "related_project_id",
  });

  const selectedProject = React.useMemo(
    () => assignedProjects.find((project) => project.id === selectedProjectId) || null,
    [assignedProjects, selectedProjectId]
  );

  React.useEffect(() => {
    if (!selectedProject || isViewOnly) return;
    form.setValue("category", getProjectCategory(selectedProject), { shouldDirty: true });
  }, [form, isViewOnly, selectedProject]);

  const handleNext = async () => {
    if (isViewOnly) {
      setCurrentStep((step) => Math.min(step + 1, stepLabels.length));
      return;
    }

    const valid = await form.trigger();
    if (!valid) return;
    setCurrentStep(2);
  };

  const handlePrevious = () => {
    setCurrentStep((step) => Math.max(step - 1, 1));
  };

  const handleSubmit = React.useCallback(
    async (values: FormValues) => {
      const matchedProject =
        assignedProjects.find((project) => project.id === values.related_project_id) || null;

      const payload: ConsultancyPayload = {
        title_of_consultancy: values.title_of_consultancy,
        base_agency_institute: values.base_agency_institute,
        nature_of_consultancy: values.nature_of_consultancy,
        related_project_id: matchedProject?.id || null,
        related_project_title: matchedProject?.title || null,
        category: matchedProject ? getProjectCategory(matchedProject) : values.category,
        status: values.status,
        documents: values.documents,
      };

      setIsSubmitting(true);
      const result = initialData?.id
        ? await updateConsultancyExtension(initialData.id, payload)
        : await createConsultancyExtension(payload);
      setIsSubmitting(false);

      if (result?.error) {
        alert(result.error);
        setCurrentStep(1);
        autoSubmitStartedRef.current = false;
        return;
      }

      onSuccess(initialData?.id ? "updated" : "created");
    },
    [assignedProjects, initialData?.id, onSuccess]
  );

  React.useEffect(() => {
    autoSubmitStartedRef.current = false;
  }, [initialData?.id]);

  React.useEffect(() => {
    if (currentStep !== 2 || isViewOnly || autoSubmitStartedRef.current) return;
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
              {initialData?.id
                ? isViewOnly
                  ? "Consultancy Details"
                  : "Update Consultancy"
                : "Create Consultancy"}
            </h1>
            {onClose && (
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Project Link</p>
              <p className="truncate text-xs font-medium text-foreground">
                {selectedProject?.title || initialData?.related_project_title || "Not part of a project"}
              </p>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Category</p>
              <p className="truncate text-xs font-medium text-foreground">{form.watch("category")}</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">Status</p>
              <p className="truncate text-xs font-medium text-foreground">{form.watch("status")}</p>
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
                    <BriefcaseBusiness className="h-5 w-5 text-foreground" />
                    Consultancy Details
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Add the consultancy record details using the same structured workflow as the other project leader pages.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 xl:grid-cols-2">
                    <FormField
                      control={form.control as any}
                      name="title_of_consultancy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Title of Consultancy</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input {...field} disabled={isViewOnly} className="h-10 rounded-xl pl-10 text-sm" />
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control as any}
                      name="base_agency_institute"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Base Agency / Institute</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input {...field} disabled={isViewOnly} className="h-10 rounded-xl pl-10 text-sm" />
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control as any}
                    name="nature_of_consultancy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Nature of Consultancy</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isViewOnly} className="h-10 rounded-xl text-sm" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 xl:grid-cols-2">
                    <FormField
                      control={form.control as any}
                      name="related_project_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Name of the Project if Part of the Project</FormLabel>
                          <Select
                            value={field.value || noProjectValue}
                            onValueChange={(value) => field.onChange(value === noProjectValue ? null : value)}
                            disabled={isViewOnly}
                          >
                            <FormControl>
                              <SelectTrigger className="h-10 rounded-xl text-sm">
                                <SelectValue placeholder="Select a project or choose not part of a project" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={noProjectValue} className="text-sm">
                                Not part of a project
                              </SelectItem>
                              {assignedProjects.map((project) => (
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

                    <FormField
                      control={form.control as any}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Category</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={isViewOnly || Boolean(selectedProject)}
                          >
                            <FormControl>
                              <SelectTrigger className={cn("h-10 rounded-xl text-sm", selectedProject ? "bg-muted/30" : "")}>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Internally" className="text-sm">Internally</SelectItem>
                              <SelectItem value="Externally" className="text-sm">Externally</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            {selectedProject
                              ? "Category is auto-filled from the selected project."
                              : "Choose the category manually when the consultancy is not linked to a project."}
                          </p>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                      control={form.control as any}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Status</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange} disabled={isViewOnly}>
                          <FormControl>
                            <SelectTrigger className="h-10 rounded-xl text-sm">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="On-going" className="text-sm">On-going</SelectItem>
                            <SelectItem value="Completed" className="text-sm">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <Card className="rounded-2xl border-border/40 shadow-none">
                    <CardHeader>
                      <CardTitle className="text-sm">Uploading of Documents</CardTitle>
                      <CardDescription className="text-xs">
                        Upload PDF files to the private `cqer-consultancy_pdf` bucket. Maximum 5MB per file.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control as any}
                        name="documents"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <FileUpload
                                value={field.value ?? []}
                                onChange={field.onChange}
                                disabled={isViewOnly}
                                bucket="cqer-consultancy_pdf"
                                accept=".pdf"
                                maxSizeInMB={5}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {selectedProject && (
                    <div className="rounded-2xl border border-border/40 bg-muted/10 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Tag className="h-4 w-4" />
                        Auto-linked project
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {selectedProject.title} is selected, so the category was set to {getProjectCategory(selectedProject)} automatically.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <Card className="rounded-3xl border-border/40 shadow-none">
                <CardHeader>
                  <CardTitle className="text-center text-lg">{isViewOnly ? "Consultancy Summary" : isSubmitting ? "Saving..." : "Preparing Save"}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center py-10">
                  <div className="mb-4 rounded-full bg-muted p-6">
                    <Save className={cn("h-10 w-10 text-foreground", !isViewOnly && "animate-pulse")} />
                  </div>
                  <p className="max-w-md text-center text-sm text-muted-foreground">
                    {isViewOnly
                      ? "This consultancy record is displayed in the same two-step layout used for create and update."
                      : "Please wait while the consultancy record is automatically saved."}
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
                <Button type="button" variant="outline" className="rounded-xl" onClick={handlePrevious}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
              )}
              {currentStep < stepLabels.length && (
                <Button type="button" className="rounded-xl" onClick={handleNext} disabled={isSubmitting}>
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
