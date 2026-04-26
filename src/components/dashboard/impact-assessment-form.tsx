"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type Control } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import {
  Activity,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  FileText,
  Save,
  ShieldCheck,
  UserRoundSearch,
} from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  createImpactAssessment,
  updateImpactAssessment,
  type ImpactAssessmentRecord,
} from "@/lib/actions/impact-assessment";
import { type Project } from "@/components/dashboard/projects-table";

const stepLabels = ["Needs Assessment Details", "Save and Review"];
const draftStorageKey = "cqer-impact-assessment-draft";

const formSchema = z.object({
  project_id: z.string().nullable(),
  activity_name: z.string().trim().min(1, "Project or training activity is required."),
  proponent: z.string().trim().min(1, "Proponent is required."),
  lead_evaluator: z.string().trim().min(1, "Lead evaluator is required."),
  date_of_assessment: z.date().nullable(),
  documents: z.array(z.object({
    url: z.string(),
    name: z.string(),
  })).default([]),
});

type InputValues = z.input<typeof formSchema>;
type OutputValues = z.output<typeof formSchema>;
type ImpactAssessmentControl = Control<InputValues, unknown, OutputValues>;

interface ImpactAssessmentFormProps {
  record?: ImpactAssessmentRecord | null;
  projects: Project[];
  onSuccess?: () => void;
  onClose?: () => void;
  isViewOnly?: boolean;
}

function buildDefaultValues(record?: ImpactAssessmentRecord | null): InputValues {
  return {
    project_id: record?.project_id || null,
    activity_name: record?.activity_name || "",
    proponent: record?.proponent || "",
    lead_evaluator: record?.lead_evaluator || "",
    date_of_assessment: record?.date_of_assessment ? new Date(record.date_of_assessment) : null,
    documents: record?.documents || [],
  };
}

export function ImpactAssessmentForm({
  record,
  projects,
  onSuccess,
  onClose,
  isViewOnly = false,
}: ImpactAssessmentFormProps) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [saving, setSaving] = React.useState(false);
  const [autoSaveMessage, setAutoSaveMessage] = React.useState("");
  const lastAutoSavedPayloadRef = React.useRef("");

  const form = useForm<InputValues, unknown, OutputValues>({
    resolver: zodResolver(formSchema),
    defaultValues: buildDefaultValues(record),
  });
  const typedControl = form.control as ImpactAssessmentControl;
  const watchedValues = useWatch({ control: typedControl });

  React.useEffect(() => {
    if (record || isViewOnly || typeof window === "undefined") {
      form.reset(buildDefaultValues(record));
      return;
    }

    const savedDraft = window.localStorage.getItem(draftStorageKey);
    if (!savedDraft) {
      form.reset(buildDefaultValues(record));
      return;
    }

    try {
      const parsed = JSON.parse(savedDraft) as Record<string, unknown>;
      form.reset({
        project_id: typeof parsed.project_id === "string" ? parsed.project_id : null,
        activity_name: typeof parsed.activity_name === "string" ? parsed.activity_name : "",
        proponent: typeof parsed.proponent === "string" ? parsed.proponent : "",
        lead_evaluator: typeof parsed.lead_evaluator === "string" ? parsed.lead_evaluator : "",
        date_of_assessment: typeof parsed.date_of_assessment === "string" ? new Date(parsed.date_of_assessment) : null,
        documents: Array.isArray(parsed.documents)
          ? parsed.documents.filter((item): item is { url: string; name: string } =>
              Boolean(
                item &&
                typeof item === "object" &&
                typeof (item as { url?: unknown }).url === "string" &&
                typeof (item as { name?: unknown }).name === "string"
              )
            )
          : [],
      });
    } catch {
      form.reset(buildDefaultValues(record));
    }
  }, [record, form, isViewOnly]);

  React.useEffect(() => {
    if (record || isViewOnly || typeof window === "undefined") return;
    const payload = {
      ...watchedValues,
      date_of_assessment: watchedValues.date_of_assessment instanceof Date
        ? watchedValues.date_of_assessment.toISOString()
        : null,
    };
    window.localStorage.setItem(draftStorageKey, JSON.stringify(payload));
  }, [watchedValues, record, isViewOnly]);

  const selectedProjectId = useWatch({ control: typedControl, name: "project_id" });
  const selectedProject = React.useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );
  const isManualActivityEntry = !selectedProjectId;

  React.useEffect(() => {
    if (!selectedProject) return;
    const currentActivity = form.getValues("activity_name");
    if (!currentActivity || currentActivity.trim() === "") {
      form.setValue("activity_name", selectedProject.title, { shouldDirty: true });
    }
  }, [selectedProject, form]);

  const handleNext = async () => {
    const valid = await form.trigger(["project_id", "activity_name", "proponent", "lead_evaluator", "date_of_assessment", "documents"]);
    if (valid) setCurrentStep(2);
  };

  const handleSave = React.useCallback(async (values: OutputValues) => {
    setSaving(true);
    const payload = {
      project_id: values.project_id || null,
      activity_name: values.activity_name.trim(),
      proponent: values.proponent.trim(),
      lead_evaluator: values.lead_evaluator.trim(),
      date_of_assessment: values.date_of_assessment ? values.date_of_assessment.toISOString() : null,
      documents: values.documents || [],
    };

    const result = record?.id
      ? await updateImpactAssessment(record.id, payload)
      : await createImpactAssessment(payload);

    setSaving(false);

    if (result?.error) {
      alert(result.error);
      return;
    }

    if (!record && typeof window !== "undefined") {
      window.localStorage.removeItem(draftStorageKey);
    }

    onSuccess?.();
  }, [onSuccess, record]);

  React.useEffect(() => {
    if (isViewOnly || currentStep !== 2) return;

    const serializedPayload = JSON.stringify({
      project_id: watchedValues.project_id || null,
      activity_name: watchedValues.activity_name || "",
      proponent: watchedValues.proponent || "",
      lead_evaluator: watchedValues.lead_evaluator || "",
      date_of_assessment:
        watchedValues.date_of_assessment instanceof Date
          ? watchedValues.date_of_assessment.toISOString()
          : null,
      documents: watchedValues.documents || [],
    });

    if (serializedPayload === lastAutoSavedPayloadRef.current) return;

    setAutoSaveMessage("Auto-saving in a few seconds...");

    const timeout = window.setTimeout(() => {
      setAutoSaveMessage("Saving impact assessment...");
      void form.handleSubmit(async (values) => {
        const nextPayload = JSON.stringify({
          project_id: values.project_id || null,
          activity_name: values.activity_name.trim(),
          proponent: values.proponent.trim(),
          lead_evaluator: values.lead_evaluator.trim(),
          date_of_assessment: values.date_of_assessment ? values.date_of_assessment.toISOString() : null,
          documents: values.documents || [],
        });
        lastAutoSavedPayloadRef.current = nextPayload;
        await handleSave(values);
      })();
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [currentStep, form, handleSave, isViewOnly, watchedValues]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <FullscreenFormHeader
        title={isViewOnly ? "Impact / Assessment Details" : record ? "Edit Impact / Assessment" : "Create Assessment"}
        currentStep={currentStep}
        totalSteps={2}
        labels={stepLabels}
        onClose={onClose}
        items={[
          { icon: Activity, label: "Activity", value: selectedProject?.title || watchedValues.activity_name || "Manual entry", minWidthClassName: "min-w-[220px]" },
          { icon: FileText, label: "Proponent", value: watchedValues.proponent || "N/A", minWidthClassName: "min-w-[170px]" },
          { icon: UserRoundSearch, label: "Lead Evaluator", value: watchedValues.lead_evaluator || "N/A", minWidthClassName: "min-w-[180px]" },
        ]}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
          {currentStep === 1 ? (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5 text-[#159E44]" />
                  Needs Assessment Details
                </CardTitle>
                <CardDescription className="text-sm">
                  Link an existing project when available, or manually type the project or training activity name.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={typedControl}
                    name="project_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name of the Project or Training Activity</FormLabel>
                        <Select
                          value={field.value || "__manual__"}
                          onValueChange={(value) => field.onChange(value === "__manual__" ? null : value)}
                          disabled={isViewOnly}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl">
                              <SelectValue placeholder="Select an existing project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__manual__">Manual input</SelectItem>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isManualActivityEntry ? (
                    <FormField
                      control={typedControl}
                      name="activity_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project or Training Activity Name</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={isViewOnly} className="h-11 rounded-xl" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Selected Project</p>
                      <p className="mt-2 text-sm font-medium">{selectedProject?.title || "-"}</p>
                    </div>
                  )}

                  <FormField
                    control={typedControl}
                    name="proponent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Proponent of the Impact Assessment</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isViewOnly} className="h-11 rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={typedControl}
                    name="lead_evaluator"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name of Lead Evaluator</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isViewOnly} className="h-11 rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={typedControl}
                    name="date_of_assessment"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date of Assessment</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                className={cn(
                                  "h-11 rounded-xl justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                disabled={isViewOnly}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "MMMM d, yyyy") : "Pick a date"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={(date) => field.onChange(date || null)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Selected Source</p>
                    <div className="mt-2 flex items-start gap-2 text-sm font-medium">
                      <UserRoundSearch className="mt-0.5 h-4 w-4 text-[#159E44]" />
                      <span>{selectedProject?.title || "Manual activity entry"}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <FormField
                  control={typedControl}
                  name="documents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Upload Document</FormLabel>
                      <FormControl>
                        <FileUpload
                          value={field.value || []}
                          onChange={field.onChange}
                          disabled={isViewOnly}
                          bucket="cqer-needsass_pdf"
                          accept=".pdf"
                          maxSizeInMB={5}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-5 w-5 text-[#159E44]" />
                  Save and Review
                </CardTitle>
                <CardDescription className="text-sm">
                  Review the assessment details. This step saves automatically after a few seconds.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-2xl border border-[#159E44]/20 bg-[#159E44]/5 px-4 py-3 text-sm text-foreground">
                  {saving ? "Saving impact assessment..." : autoSaveMessage || "This step saves automatically after a few seconds."}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4 md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project or Training Activity</p>
                    <p className="mt-2 text-sm font-medium">{watchedValues.activity_name || "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proponent</p>
                    <p className="mt-2 text-sm font-medium">{watchedValues.proponent || "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lead Evaluator</p>
                    <p className="mt-2 text-sm font-medium">{watchedValues.lead_evaluator || "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date of Assessment</p>
                    <p className="mt-2 text-sm font-medium">
                      {watchedValues.date_of_assessment ? format(watchedValues.date_of_assessment, "MMMM d, yyyy") : "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Linked Project</p>
                    <p className="mt-2 text-sm font-medium">{selectedProject?.title || "Manual activity entry"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4 md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Uploaded Documents</p>
                    <div className="mt-2">
                      {(watchedValues.documents || []).length > 0 ? (
                        <div className="space-y-2">
                          {(watchedValues.documents || []).map((document, index) => (
                            <div key={`${document.url}-${index}`} className="flex items-center gap-2 text-sm">
                              <FileText className="h-4 w-4 text-[#159E44]" />
                              <span>{document.name}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm font-medium">No document uploaded</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </Form>

      <div className="flex items-center justify-between border-t px-6 py-4">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={currentStep === 1 ? onClose : () => setCurrentStep(1)}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          {currentStep === 1 ? "Close" : "Back"}
        </Button>

        {currentStep === 1 ? (
          <Button
            type="button"
            className="rounded-xl bg-[#159E44] text-white hover:bg-[#128A3B]"
            onClick={() => void handleNext()}
          >
            Continue
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          !isViewOnly ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Save className="h-4 w-4" />
              <span>{saving ? "Saving..." : "Auto-save enabled"}</span>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}
