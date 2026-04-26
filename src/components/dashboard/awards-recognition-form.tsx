"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type Control } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import {
  Award,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  FileText,
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
  createAwardsRecognition,
  updateAwardsRecognition,
  type AwardsRecognitionRecord,
  type AwardLevel,
} from "@/lib/actions/awards-recognition";
import { type Project } from "@/components/dashboard/projects-table";

const stepLabels = ["Award Details", "Save and Review"];
const draftStorageKey = "cqer-awards-recognition-draft";
const levelOptions: { value: AwardLevel; label: string }[] = [
  { value: "local", label: "Local" },
  { value: "regional", label: "Regional" },
  { value: "national", label: "National" },
  { value: "international", label: "International" },
];

const formSchema = z.object({
  award_title: z.string().trim().min(1, "Award / recognition received is required."),
  donor_body: z.string().trim().min(1, "Donor / awarding body is required."),
  level: z.enum(["local", "regional", "national", "international"]),
  date_received: z.date().nullable(),
  event_title: z.string().trim().min(1, "Title of event or conference is required."),
  project_id: z.string().nullable(),
  project_title: z.string().nullable(),
  documents: z.array(z.object({
    url: z.string(),
    name: z.string(),
  })).default([]),
});

type InputValues = z.input<typeof formSchema>;
type OutputValues = z.output<typeof formSchema>;
type AwardsRecognitionControl = Control<InputValues, unknown, OutputValues>;

interface AwardsRecognitionFormProps {
  record?: AwardsRecognitionRecord | null;
  projects: Project[];
  onSuccess?: () => void;
  onClose?: () => void;
  isViewOnly?: boolean;
}

function buildDefaultValues(record?: AwardsRecognitionRecord | null): InputValues {
  return {
    award_title: record?.award_title || "",
    donor_body: record?.donor_body || "",
    level: record?.level || "local",
    date_received: record?.date_received ? new Date(record.date_received) : null,
    event_title: record?.event_title || "",
    project_id: record?.project_id || null,
    project_title: record?.project_title || null,
    documents: record?.documents || [],
  };
}

function getLevelLabel(level: AwardLevel) {
  return levelOptions.find((option) => option.value === level)?.label || level;
}

export function AwardsRecognitionForm({
  record,
  projects,
  onSuccess,
  onClose,
  isViewOnly = false,
}: AwardsRecognitionFormProps) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [saving, setSaving] = React.useState(false);
  const [autoSaveMessage, setAutoSaveMessage] = React.useState("");
  const lastAutoSavedPayloadRef = React.useRef("");

  const form = useForm<InputValues, unknown, OutputValues>({
    resolver: zodResolver(formSchema),
    defaultValues: buildDefaultValues(record),
  });
  const typedControl = form.control as AwardsRecognitionControl;
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
        award_title: typeof parsed.award_title === "string" ? parsed.award_title : "",
        donor_body: typeof parsed.donor_body === "string" ? parsed.donor_body : "",
        level:
          parsed.level === "regional" ||
          parsed.level === "national" ||
          parsed.level === "international"
            ? parsed.level
            : "local",
        date_received: typeof parsed.date_received === "string" ? new Date(parsed.date_received) : null,
        event_title: typeof parsed.event_title === "string" ? parsed.event_title : "",
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
      date_received: watchedValues.date_received instanceof Date
        ? watchedValues.date_received.toISOString()
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
    const valid = await form.trigger([
      "award_title",
      "donor_body",
      "level",
      "date_received",
      "event_title",
      "project_id",
      "project_title",
      "documents",
    ]);
    if (valid) setCurrentStep(2);
  };

  const handleSave = React.useCallback(async (values: OutputValues) => {
    setSaving(true);
    const payload = {
      award_title: values.award_title.trim(),
      donor_body: values.donor_body.trim(),
      level: values.level,
      date_received: values.date_received ? values.date_received.toISOString() : null,
      event_title: values.event_title.trim(),
      project_id: values.project_id || null,
      project_title: values.project_title || null,
      documents: values.documents || [],
    };

    const result = record?.id
      ? await updateAwardsRecognition(record.id, payload)
      : await createAwardsRecognition(payload);

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
      award_title: watchedValues.award_title || "",
      donor_body: watchedValues.donor_body || "",
      level: watchedValues.level || "local",
      date_received: watchedValues.date_received instanceof Date ? watchedValues.date_received.toISOString() : null,
      event_title: watchedValues.event_title || "",
      project_id: watchedValues.project_id || null,
      project_title: watchedValues.project_title || null,
      documents: watchedValues.documents || [],
    });

    if (serializedPayload === lastAutoSavedPayloadRef.current) return;

    setAutoSaveMessage("Auto-saving in a few seconds...");

    const timeout = window.setTimeout(() => {
      setAutoSaveMessage("Saving award record...");
      void form.handleSubmit(async (values) => {
        const nextPayload = JSON.stringify({
          award_title: values.award_title.trim(),
          donor_body: values.donor_body.trim(),
          level: values.level,
          date_received: values.date_received ? values.date_received.toISOString() : null,
          event_title: values.event_title.trim(),
          project_id: values.project_id || null,
          project_title: values.project_title || null,
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
        title={isViewOnly ? "Awards and Recognition Details" : record ? "Edit Awards and Recognition" : "Manage Extension"}
        currentStep={currentStep}
        totalSteps={2}
        labels={stepLabels}
        onClose={onClose}
        items={[
          { icon: Award, label: "Award", value: watchedValues.award_title || "Unassigned", minWidthClassName: "min-w-[210px]" },
          { icon: ShieldCheck, label: "Level", value: getLevelLabel(watchedValues.level || "local"), minWidthClassName: "min-w-[140px]" },
          { icon: FileText, label: "Linked Project", value: selectedProject?.title || watchedValues.project_title || "N/A", minWidthClassName: "min-w-[200px]" },
        ]}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
          {currentStep === 1 ? (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Award className="h-5 w-5 text-[#159E44]" />
                  Award Details
                </CardTitle>
                <CardDescription className="text-sm">
                  Capture the award details, awarding body, level, event, linked project, and supporting documents.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={typedControl}
                    name="award_title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Award / Recognition Received</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isViewOnly} className="h-11 rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={typedControl}
                    name="donor_body"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Donor / Awarding Body</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isViewOnly} className="h-11 rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={typedControl}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Level</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange} disabled={isViewOnly}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl">
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {levelOptions.map((option) => (
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
                    name="date_received"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date Received</FormLabel>
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
                    name="event_title"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Title of Event or Conference</FormLabel>
                        <FormControl>
                          <Textarea {...field} disabled={isViewOnly} className="min-h-28 rounded-2xl text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={typedControl}
                    name="project_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name of the Project</FormLabel>
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
                          bucket="cqer-awards_pdf"
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
                  Review the award details. This step saves automatically after a few seconds.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-2xl border border-[#159E44]/20 bg-[#159E44]/5 px-4 py-3 text-sm text-foreground">
                  {saving ? "Saving award record..." : autoSaveMessage || "This step saves automatically after a few seconds."}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Award / Recognition Received</p>
                    <p className="mt-2 text-sm font-medium">{watchedValues.award_title || "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Donor / Awarding Body</p>
                    <p className="mt-2 text-sm font-medium">{watchedValues.donor_body || "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Level</p>
                    <p className="mt-2 text-sm font-medium">{getLevelLabel(watchedValues.level || "local")}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date Received</p>
                    <p className="mt-2 text-sm font-medium">
                      {watchedValues.date_received ? format(watchedValues.date_received, "MMMM d, yyyy") : "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4 md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Title of Event or Conference</p>
                    <p className="mt-2 text-sm font-medium whitespace-pre-wrap">{watchedValues.event_title || "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4 md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Linked Project</p>
                    <p className="mt-2 text-sm font-medium">{watchedValues.project_title || "N/A"}</p>
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
