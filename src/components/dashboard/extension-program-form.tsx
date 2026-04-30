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
  Megaphone,
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  createExtensionProgram,
  updateExtensionProgram,
  type ExtensionProgramRecord,
} from "@/lib/actions/extension-program";
import { type Project } from "@/components/dashboard/projects-table";
import { DEFAULT_DOCUMENT_ACCEPT, DOCUMENT_UPLOAD_GUIDANCE } from "@/lib/document-uploads";

const stepLabels = ["Extension Details", "Save and Review"];
const draftStorageKey = "cqer-extension-program-draft";

const formSchema = z.object({
  project_id: z.string().nullable(),
  project_title: z.string().nullable(),
  activity_title: z.string().trim().min(1, "Title of the activity is required."),
  media_channels: z.string().trim().min(1, "Media details are required."),
  date_featured: z.date().nullable(),
  remarks: z.string().trim().min(1, "Remarks are required."),
  documents: z.array(z.object({
    url: z.string(),
    name: z.string(),
  })).default([]),
});

type InputValues = z.input<typeof formSchema>;
type OutputValues = z.output<typeof formSchema>;
type ExtensionProgramControl = Control<InputValues, unknown, OutputValues>;

interface ExtensionProgramFormProps {
  record?: ExtensionProgramRecord | null;
  projects: Project[];
  onSuccess?: () => void;
  onClose?: () => void;
  isViewOnly?: boolean;
}

function buildDefaultValues(record?: ExtensionProgramRecord | null): InputValues {
  return {
    project_id: record?.project_id || null,
    project_title: record?.project_title || null,
    activity_title: record?.activity_title || "",
    media_channels: record?.media_channels || "",
    date_featured: record?.date_featured ? new Date(record.date_featured) : null,
    remarks: record?.remarks || "",
    documents: record?.documents || [],
  };
}

export function ExtensionProgramForm({
  record,
  projects,
  onSuccess,
  onClose,
  isViewOnly = false,
}: ExtensionProgramFormProps) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [saving, setSaving] = React.useState(false);
  const [autoSaveMessage, setAutoSaveMessage] = React.useState("");
  const lastAutoSavedPayloadRef = React.useRef("");

  const form = useForm<InputValues, unknown, OutputValues>({
    resolver: zodResolver(formSchema),
    defaultValues: buildDefaultValues(record),
  });
  const typedControl = form.control as ExtensionProgramControl;
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
        project_title: typeof parsed.project_title === "string" ? parsed.project_title : null,
        activity_title: typeof parsed.activity_title === "string" ? parsed.activity_title : "",
        media_channels: typeof parsed.media_channels === "string" ? parsed.media_channels : "",
        date_featured: typeof parsed.date_featured === "string" ? new Date(parsed.date_featured) : null,
        remarks: typeof parsed.remarks === "string" ? parsed.remarks : "",
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
      date_featured: watchedValues.date_featured instanceof Date
        ? watchedValues.date_featured.toISOString()
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
    const valid = await form.trigger(["project_id", "project_title", "activity_title", "media_channels", "date_featured", "remarks", "documents"]);
    if (valid) setCurrentStep(2);
  };

  const handleSave = React.useCallback(async (values: OutputValues) => {
    setSaving(true);
    const payload = {
      project_id: values.project_id || null,
      project_title: values.project_title || null,
      activity_title: values.activity_title.trim(),
      media_channels: values.media_channels.trim(),
      date_featured: values.date_featured ? values.date_featured.toISOString() : null,
      remarks: values.remarks.trim(),
      documents: values.documents || [],
    };

    const result = record?.id
      ? await updateExtensionProgram(record.id, payload)
      : await createExtensionProgram(payload);

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
      project_title: watchedValues.project_title || null,
      activity_title: watchedValues.activity_title || "",
      media_channels: watchedValues.media_channels || "",
      date_featured: watchedValues.date_featured instanceof Date ? watchedValues.date_featured.toISOString() : null,
      remarks: watchedValues.remarks || "",
      documents: watchedValues.documents || [],
    });

    if (serializedPayload === lastAutoSavedPayloadRef.current) return;

    setAutoSaveMessage("Auto-saving in a few seconds...");

    const timeout = window.setTimeout(() => {
      setAutoSaveMessage("Saving extension record...");
      void form.handleSubmit(async (values) => {
        const nextPayload = JSON.stringify({
          project_id: values.project_id || null,
          project_title: values.project_title || null,
          activity_title: values.activity_title.trim(),
          media_channels: values.media_channels.trim(),
          date_featured: values.date_featured ? values.date_featured.toISOString() : null,
          remarks: values.remarks.trim(),
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
        title={isViewOnly ? "Extension Program Details" : record ? "Edit Extension Program" : "Manage Extension"}
        currentStep={currentStep}
        totalSteps={2}
        labels={stepLabels}
        onClose={onClose}
        items={[
          { icon: Megaphone, label: "Activity", value: watchedValues.activity_title || "Unassigned", minWidthClassName: "min-w-[210px]" },
          { icon: FileText, label: "Linked Project", value: selectedProject?.title || watchedValues.project_title || "N/A", minWidthClassName: "min-w-[210px]" },
          { icon: CalendarIcon, label: "Date Featured", value: watchedValues.date_featured ? format(watchedValues.date_featured, "MMM d, yyyy") : "Not set", minWidthClassName: "min-w-[150px]" },
        ]}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
          {currentStep === 1 ? (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Megaphone className="h-5 w-5 text-[#159E44]" />
                  Extension Details
                </CardTitle>
                <CardDescription className="text-sm">
                  Capture the extension activity details, media coverage, featured date, remarks, and supporting documents.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={typedControl}
                    name="project_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title of the Project if Involved</FormLabel>
                        <Select
                          value={field.value || "__na__"}
                          onValueChange={(value) => field.onChange(value === "__na__" ? null : value)}
                          disabled={isViewOnly}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl">
                              <SelectValue placeholder="Select a project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__na__">N/A</SelectItem>
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
                    <p className="mt-2 text-sm font-medium">{selectedProject?.title || "N/A"}</p>
                  </div>

                  <FormField
                    control={typedControl}
                    name="activity_title"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Title of the Activity</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isViewOnly} className="h-11 rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={typedControl}
                    name="media_channels"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Name of Print, Radio, Online Media, Where Extension PPA Was Featured</FormLabel>
                        <FormControl>
                          <Textarea {...field} disabled={isViewOnly} className="min-h-28 rounded-2xl text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={typedControl}
                    name="date_featured"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date Featured</FormLabel>
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
                    name="remarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remarks</FormLabel>
                        <FormControl>
                          <Textarea {...field} disabled={isViewOnly} className="min-h-28 rounded-2xl text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                          bucket="cqer-extensionprog_pdf"
                          accept={DEFAULT_DOCUMENT_ACCEPT}
                          maxSizeInMB={5}
                          guidance={DOCUMENT_UPLOAD_GUIDANCE.extensionPpa}
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
                  Review the extension details. This step saves automatically after a few seconds.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-2xl border border-[#159E44]/20 bg-[#159E44]/5 px-4 py-3 text-sm text-foreground">
                  {saving ? "Saving extension record..." : autoSaveMessage || "This step saves automatically after a few seconds."}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Linked Project</p>
                    <p className="mt-2 text-sm font-medium">{watchedValues.project_title || "N/A"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date Featured</p>
                    <p className="mt-2 text-sm font-medium">
                      {watchedValues.date_featured ? format(watchedValues.date_featured, "MMMM d, yyyy") : "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4 md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity Title</p>
                    <p className="mt-2 text-sm font-medium">{watchedValues.activity_title || "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4 md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Media Coverage</p>
                    <p className="mt-2 text-sm font-medium whitespace-pre-wrap">{watchedValues.media_channels || "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4 md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Remarks</p>
                    <p className="mt-2 text-sm font-medium whitespace-pre-wrap">{watchedValues.remarks || "-"}</p>
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
