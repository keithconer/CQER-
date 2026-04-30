"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type Control } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  FileText,
  Landmark,
  Save,
  ShieldCheck,
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
  createOrdinanceResolution,
  updateOrdinanceResolution,
  type OrdinanceResolutionRecord,
  type OrdinanceResolutionStatus,
} from "@/lib/actions/ordinance-resolution";
import { type Project } from "@/components/dashboard/projects-table";
import { DEFAULT_DOCUMENT_ACCEPT, DOCUMENT_UPLOAD_GUIDANCE } from "@/lib/document-uploads";

const stepLabels = ["Ordinance Details", "Save and Review"];
const statusOptions: { value: OrdinanceResolutionStatus; label: string }[] = [
  { value: "submitted", label: "Submitted" },
  { value: "endorsed", label: "Endorsed" },
  { value: "approved", label: "Approved" },
];
const draftStorageKey = "cqer-ordinance-resolution-draft";

const formSchema = z.object({
  name: z.string().trim().min(1, "Name of the ordinance or resolution is required."),
  implementing_agency: z.string().trim().min(1, "Implementing agency is required."),
  status: z.enum(["submitted", "endorsed", "approved"]),
  date_of_approval: z.date().nullable(),
  project_id: z.string().nullable(),
  project_title: z.string().nullable(),
  documents: z.array(z.object({
    url: z.string(),
    name: z.string(),
  })).default([]),
}).superRefine((values, ctx) => {
  if (values.status === "approved" && !values.date_of_approval) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["date_of_approval"],
      message: "Date of approval is required when status is approved.",
    });
  }
});

type InputValues = z.input<typeof formSchema>;
type OutputValues = z.output<typeof formSchema>;
type OrdinanceControl = Control<InputValues, unknown, OutputValues>;

interface OrdinanceResolutionFormProps {
  record?: OrdinanceResolutionRecord | null;
  projects: Project[];
  onSuccess?: () => void;
  onClose?: () => void;
  isViewOnly?: boolean;
}

function buildDefaultValues(record?: OrdinanceResolutionRecord | null): InputValues {
  return {
    name: record?.name || "",
    implementing_agency: record?.implementing_agency || "",
    status: record?.status || "submitted",
    date_of_approval: record?.date_of_approval ? new Date(record.date_of_approval) : null,
    project_id: record?.project_id || null,
    project_title: record?.project_title || null,
    documents: record?.documents || [],
  };
}

function getStatusLabel(status: OrdinanceResolutionStatus) {
  return statusOptions.find((option) => option.value === status)?.label || status;
}

export function OrdinanceResolutionForm({
  record,
  projects,
  onSuccess,
  onClose,
  isViewOnly = false,
}: OrdinanceResolutionFormProps) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [saving, setSaving] = React.useState(false);
  const [autoSaveMessage, setAutoSaveMessage] = React.useState<string>("");
  const form = useForm<InputValues, unknown, OutputValues>({
    resolver: zodResolver(formSchema),
    defaultValues: buildDefaultValues(record),
  });
  const typedControl = form.control as OrdinanceControl;
  const watchedValues = useWatch({ control: typedControl });
  const lastAutoSavedPayloadRef = React.useRef<string>("");

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
        name: typeof parsed.name === "string" ? parsed.name : "",
        implementing_agency: typeof parsed.implementing_agency === "string" ? parsed.implementing_agency : "",
        status: parsed.status === "endorsed" || parsed.status === "approved" ? parsed.status : "submitted",
        date_of_approval: typeof parsed.date_of_approval === "string" ? new Date(parsed.date_of_approval) : null,
        project_id: typeof parsed.project_id === "string" ? parsed.project_id : null,
        project_title: typeof parsed.project_title === "string" ? parsed.project_title : null,
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
      date_of_approval: watchedValues.date_of_approval instanceof Date
        ? watchedValues.date_of_approval.toISOString()
        : null,
    };
    window.localStorage.setItem(draftStorageKey, JSON.stringify(payload));
  }, [watchedValues, record, isViewOnly]);

  const selectedProjectId = useWatch({ control: typedControl, name: "project_id" });
  const selectedProject = React.useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  React.useEffect(() => {
    if (!selectedProjectId) {
      form.setValue("project_title", null, { shouldDirty: true });
      return;
    }
    form.setValue("project_title", selectedProject?.title || null, { shouldDirty: true });
  }, [selectedProjectId, selectedProject, form]);

  const handleNext = async () => {
    const valid = await form.trigger(["name", "implementing_agency", "status", "date_of_approval", "project_id", "project_title", "documents"]);
    if (valid) setCurrentStep(2);
  };

  const handleSave = React.useCallback(async (values: OutputValues) => {
    setSaving(true);
    const payload = {
      name: values.name.trim(),
      implementing_agency: values.implementing_agency.trim(),
      status: values.status,
      date_of_approval: values.date_of_approval ? values.date_of_approval.toISOString() : null,
      project_id: values.project_id || null,
      project_title: values.project_title || null,
      documents: values.documents || [],
    };

    const result = record?.id
      ? await updateOrdinanceResolution(record.id, payload)
      : await createOrdinanceResolution(payload);

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
      name: watchedValues.name || "",
      implementing_agency: watchedValues.implementing_agency || "",
      status: watchedValues.status || "submitted",
      date_of_approval:
        watchedValues.date_of_approval instanceof Date
          ? watchedValues.date_of_approval.toISOString()
          : null,
      project_id: watchedValues.project_id || null,
      project_title: watchedValues.project_title || null,
      documents: watchedValues.documents || [],
    });

    if (serializedPayload === lastAutoSavedPayloadRef.current) {
      return;
    }

    setAutoSaveMessage("Auto-saving in a few seconds...");

    const timeout = window.setTimeout(() => {
      setAutoSaveMessage("Saving ordinance / resolution...");
      void form.handleSubmit(async (values) => {
        const nextPayload = JSON.stringify({
          name: values.name.trim(),
          implementing_agency: values.implementing_agency.trim(),
          status: values.status,
          date_of_approval: values.date_of_approval ? values.date_of_approval.toISOString() : null,
          project_id: values.project_id || null,
          project_title: values.project_title || null,
          documents: values.documents || [],
        });
        lastAutoSavedPayloadRef.current = nextPayload;
        await handleSave(values);
      })();
    }, 2500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [currentStep, form, handleSave, isViewOnly, watchedValues]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <FullscreenFormHeader
        title={isViewOnly ? "Ordinance / Resolution Details" : record ? "Edit Ordinance / Resolution" : "Create Ordinance"}
        currentStep={currentStep}
        totalSteps={2}
        labels={stepLabels}
        onClose={onClose}
        items={[
          { icon: Landmark, label: "Ordinance", value: watchedValues.name || "Unassigned", minWidthClassName: "min-w-[220px]" },
          { icon: ShieldCheck, label: "Status", value: getStatusLabel(watchedValues.status || "submitted"), minWidthClassName: "min-w-[140px]" },
          { icon: FileText, label: "Agency", value: watchedValues.implementing_agency || "N/A", minWidthClassName: "min-w-[180px]" },
        ]}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
          {currentStep === 1 ? (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Landmark className="h-5 w-5 text-[#159E44]" />
                  Ordinance Details
                </CardTitle>
                <CardDescription className="text-sm">
                  Enter the ordinance or resolution details, link a project if needed, and upload supporting documents.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={typedControl}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Name of the Ordinance or Resolution</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isViewOnly} className="h-11 rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={typedControl}
                    name="implementing_agency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Implementing Agency</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isViewOnly} className="h-11 rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={typedControl}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange} disabled={isViewOnly}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {statusOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={typedControl}
                    name="date_of_approval"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date of Approval</FormLabel>
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

                  <FormField
                    control={typedControl}
                    name="project_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name of the Project if Part of the Project</FormLabel>
                        <Select
                          value={field.value || "__none__"}
                          onValueChange={(value) => field.onChange(value === "__none__" ? null : value)}
                          disabled={isViewOnly}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl">
                              <SelectValue placeholder="Select a project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">Not linked to a project</SelectItem>
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

                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Linked Project</p>
                    <p className="mt-2 text-sm font-medium">
                      {selectedProject?.title || "No linked project selected"}
                    </p>
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
                          bucket="cqer-ordinance_pdf"
                          accept={DEFAULT_DOCUMENT_ACCEPT}
                          maxSizeInMB={5}
                          guidance={DOCUMENT_UPLOAD_GUIDANCE.ordinance}
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
                  Review the entered details before saving. Draft values are auto-saved while you are creating a new record.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-2xl border border-[#159E44]/20 bg-[#159E44]/5 px-4 py-3 text-sm text-foreground">
                  {saving ? "Saving ordinance / resolution..." : autoSaveMessage || "This step saves automatically after a few seconds."}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</p>
                    <p className="mt-2 text-sm font-medium">{watchedValues.name || "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Implementing Agency</p>
                    <p className="mt-2 text-sm font-medium">{watchedValues.implementing_agency || "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                    <p className="mt-2 text-sm font-medium">{getStatusLabel(watchedValues.status || "submitted")}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date of Approval</p>
                    <p className="mt-2 text-sm font-medium">
                      {watchedValues.date_of_approval ? format(watchedValues.date_of_approval, "MMMM d, yyyy") : "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4 md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project Link</p>
                    <p className="mt-2 text-sm font-medium">{watchedValues.project_title || "Not linked to a project"}</p>
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
