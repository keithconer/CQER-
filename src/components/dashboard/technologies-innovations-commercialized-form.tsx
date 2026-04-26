"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight, Cpu, FileUp, FlaskConical, Save } from "lucide-react";

import { FullscreenFormHeader } from "@/components/dashboard/fullscreen-form-header";
import { FileUpload } from "@/components/dashboard/file-upload";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  createTechnologyCommercialization,
  updateTechnologyCommercialization,
  type CreateTechnologyCommercializationPayload,
  type TechnologyCommercializationRecord,
} from "@/lib/actions/technologies-innovations-commercialized";
import { type Project } from "./projects-table";

const stepLabels = ["Technology Details", "Saving"];
const noProjectValue = "__none__";

const formSchema = z.object({
  technology_name: z.string().trim().min(1, "Name of the technology is required."),
  year_developed: z.date(),
  technology_generator: z.string().trim().min(1, "Technology generator is required."),
  related_project_id: z.string().nullable().default(null),
  status: z.enum([
    "deployed through various modalities",
    "commercialized",
    "with pre-commercialization activities",
  ]),
  documents: z.array(z.object({ url: z.string(), name: z.string() })).default([]),
});

type FormValues = z.infer<typeof formSchema>;

interface TechnologiesInnovationsCommercializedFormProps {
  initialData?: TechnologyCommercializationRecord;
  projects: Project[];
  onSuccess: (action: "created" | "updated") => void;
  onClose?: () => void;
  isViewOnly?: boolean;
}

function normalizeDateValue(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function buildDefaultValues(record?: TechnologyCommercializationRecord): FormValues {
  return {
    technology_name: record?.technology_name || "",
    year_developed: record?.year_developed ? normalizeDateValue(new Date(record.year_developed)) : normalizeDateValue(new Date()),
    technology_generator: record?.technology_generator || "",
    related_project_id: record?.related_project_id || null,
    status: record?.status || "commercialized",
    documents: record?.documents || [],
  };
}

export function TechnologiesInnovationsCommercializedForm({
  initialData,
  projects,
  onSuccess,
  onClose,
  isViewOnly = false,
}: TechnologiesInnovationsCommercializedFormProps) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const autoSubmitStartedRef = React.useRef(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: buildDefaultValues(initialData),
  });

  const selectedProjectId = useWatch({ control: form.control, name: "related_project_id" });
  const selectedProject = React.useMemo(() => projects.find((project) => project.id === selectedProjectId) || null, [projects, selectedProjectId]);

  const goNext = async () => {
    if (isViewOnly) {
      setCurrentStep((value) => Math.min(value + 1, stepLabels.length));
      return;
    }
    const valid = await form.trigger();
    if (!valid) return;
    setCurrentStep(2);
  };

  const goPrevious = () => setCurrentStep((value) => Math.max(value - 1, 1));

  const handleSubmit = React.useCallback(async (values: FormValues) => {
    const matchedProject = projects.find((project) => project.id === values.related_project_id) || null;
    const payload: CreateTechnologyCommercializationPayload = {
      technology_name: values.technology_name,
      year_developed: normalizeDateValue(values.year_developed).toISOString(),
      technology_generator: values.technology_generator,
      related_project_id: matchedProject?.id || null,
      related_project_title: matchedProject?.title || null,
      status: values.status,
      documents: values.documents,
    };

    setIsSubmitting(true);
    const result = initialData?.id
      ? await updateTechnologyCommercialization(initialData.id, payload)
      : await createTechnologyCommercialization(payload);
    setIsSubmitting(false);

    if (result?.error) {
      alert(result.error);
      setCurrentStep(1);
      autoSubmitStartedRef.current = false;
      return;
    }

    onSuccess(initialData?.id ? "updated" : "created");
  }, [initialData?.id, onSuccess, projects]);

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
        <FullscreenFormHeader
          title={initialData?.id ? (isViewOnly ? "Technologies / Innovations Commercialized Details" : "Update Technologies / Innovations Commercialized") : "Create Technologies / Innovations Commercialized"}
          currentStep={currentStep}
          totalSteps={stepLabels.length}
          labels={stepLabels}
          onClose={onClose}
          items={[
            { icon: Cpu, label: "Technology", value: form.watch("technology_name") || "Unassigned", minWidthClassName: "min-w-[210px]" },
            { icon: CalendarIcon, label: "Project", value: selectedProject?.title || initialData?.related_project_title || "Not part of a project", minWidthClassName: "min-w-[210px]" },
            { icon: FlaskConical, label: "Status", value: form.watch("status") || "N/A", minWidthClassName: "min-w-[130px]" },
          ]}
        />

        <div className="flex-1 overflow-y-auto bg-background px-4 py-4 sm:px-6 lg:px-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <Card className="rounded-3xl border-border/40 shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Cpu className="h-5 w-5 text-foreground" />
                    Technology Details
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Capture the technology details, project link, status, and supporting PDF document.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 xl:grid-cols-2">
                    <FormField control={form.control as any} name="technology_name" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Name of the Technology</FormLabel>
                        <FormControl><Input {...field} disabled={isViewOnly} className="h-10 rounded-xl text-sm" /></FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )} />
                    <FormField control={form.control as any} name="technology_generator" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Technology Generator</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <FlaskConical className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input {...field} disabled={isViewOnly} className="h-10 rounded-xl pl-10 text-sm" />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid gap-4 xl:grid-cols-2">
                    <FormField control={form.control as any} name="year_developed" render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-xs">Year Developed</FormLabel>
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
                        <FormLabel className="text-xs">Title of the Project if Part of a Project</FormLabel>
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
                  <FormField control={form.control as any} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange} disabled={isViewOnly}>
                        <FormControl>
                          <SelectTrigger className="h-10 rounded-xl text-sm">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="deployed through various modalities" className="text-sm">Deployed through various modalities</SelectItem>
                          <SelectItem value="commercialized" className="text-sm">Commercialized</SelectItem>
                          <SelectItem value="with pre-commercialization activities" className="text-sm">With pre-commercialization activities</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )} />

                  <Card className="rounded-2xl border-border/40 shadow-none">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <FileUp className="h-4 w-4 text-foreground" />
                        Uploading of Documents
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Upload PDF files to the private `cqer-technologies_pdf` bucket. Maximum 5MB per file.
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
                              bucket="cqer-technologies_pdf"
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

          {currentStep === 2 && (
            <div className="space-y-6">
              <Card className="rounded-3xl border-border/40 shadow-none">
                <CardHeader>
                  <CardTitle className="text-center text-lg">{isViewOnly ? "Technology Summary" : isSubmitting ? "Saving..." : "Preparing Save"}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center py-10">
                  <div className="mb-4 rounded-full bg-muted p-6">
                    <Save className={cn("h-10 w-10 text-foreground", !isViewOnly && "animate-pulse")} />
                  </div>
                  <p className="max-w-md text-center text-sm text-muted-foreground">
                    {isViewOnly ? "This record is displayed in the same step-based layout used for create and update." : "Please wait while the technologies / innovations commercialized record is automatically saved."}
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
