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
  ClipboardList,
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
  createOtherActivity,
  updateOtherActivity,
  type OtherActivityRecord,
  type OtherActivityCategory,
  type OtherActivityFundSource,
} from "@/lib/actions/other-activities";

const stepLabels = ["Overview and Details", "Save and Review"];
const draftStorageKey = "cqer-other-activities-draft";
const categoryOptions: OtherActivityCategory[] = [
  "Meeting",
  "Workshop",
  "Planning",
  "Capacity Building for Extensionists",
  "Community Outreach Activity",
];
const fundSourceOptions: OtherActivityFundSource[] = [
  "GAA",
  "Income",
  "External Project Fund",
  "Donation",
  "Others",
];

const formSchema = z.object({
  activity_date: z.date().nullable(),
  activity_title: z.string().trim().min(1, "Title of activity conducted is required."),
  category: z.enum([
    "Meeting",
    "Workshop",
    "Planning",
    "Capacity Building for Extensionists",
    "Community Outreach Activity",
  ]),
  purpose: z.string().trim().min(1, "Purpose is required."),
  participants: z.string().trim().min(1, "Participants is required."),
  budget_involved: z.coerce.number().min(0, "Budget involved must be 0 or greater."),
  source_of_fund: z.enum(["GAA", "Income", "External Project Fund", "Donation", "Others"]),
  source_of_fund_other: z.string().nullable(),
  remarks: z.string().trim().min(1, "Remarks are required."),
  documents: z.array(z.object({
    url: z.string(),
    name: z.string(),
  })).default([]),
}).superRefine((values, ctx) => {
  if (values.source_of_fund === "Others" && !(values.source_of_fund_other || "").trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["source_of_fund_other"],
      message: "Please specify the other source of fund.",
    });
  }
});

type InputValues = z.input<typeof formSchema>;
type OutputValues = z.output<typeof formSchema>;
type OtherActivitiesControl = Control<InputValues, unknown, OutputValues>;

interface OtherActivitiesFormProps {
  record?: OtherActivityRecord | null;
  onSuccess?: () => void;
  onClose?: () => void;
  isViewOnly?: boolean;
}

function buildDefaultValues(record?: OtherActivityRecord | null): InputValues {
  return {
    activity_date: record?.activity_date ? new Date(record.activity_date) : null,
    activity_title: record?.activity_title || "",
    category: record?.category || "Meeting",
    purpose: record?.purpose || "",
    participants: record?.participants || "",
    budget_involved: Number(record?.budget_involved || 0),
    source_of_fund: record?.source_of_fund || "GAA",
    source_of_fund_other: record?.source_of_fund_other || null,
    remarks: record?.remarks || "",
    documents: record?.documents || [],
  };
}

export function OtherActivitiesForm({
  record,
  onSuccess,
  onClose,
  isViewOnly = false,
}: OtherActivitiesFormProps) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [saving, setSaving] = React.useState(false);
  const [autoSaveMessage, setAutoSaveMessage] = React.useState("");
  const lastAutoSavedPayloadRef = React.useRef("");

  const form = useForm<InputValues, unknown, OutputValues>({
    resolver: zodResolver(formSchema),
    defaultValues: buildDefaultValues(record),
  });
  const typedControl = form.control as OtherActivitiesControl;
  const watchedValues = useWatch({ control: typedControl });
  const sourceOfFund = useWatch({ control: typedControl, name: "source_of_fund" });

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
        activity_date: typeof parsed.activity_date === "string" ? new Date(parsed.activity_date) : null,
        activity_title: typeof parsed.activity_title === "string" ? parsed.activity_title : "",
        category:
          parsed.category === "Workshop" ||
          parsed.category === "Planning" ||
          parsed.category === "Capacity Building for Extensionists" ||
          parsed.category === "Community Outreach Activity"
            ? parsed.category
            : "Meeting",
        purpose: typeof parsed.purpose === "string" ? parsed.purpose : "",
        participants: typeof parsed.participants === "string" ? parsed.participants : "",
        budget_involved: typeof parsed.budget_involved === "number" ? parsed.budget_involved : 0,
        source_of_fund:
          parsed.source_of_fund === "Income" ||
          parsed.source_of_fund === "External Project Fund" ||
          parsed.source_of_fund === "Donation" ||
          parsed.source_of_fund === "Others"
            ? parsed.source_of_fund
            : "GAA",
        source_of_fund_other: typeof parsed.source_of_fund_other === "string" ? parsed.source_of_fund_other : null,
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
      activity_date: watchedValues.activity_date instanceof Date
        ? watchedValues.activity_date.toISOString()
        : null,
    };
    window.localStorage.setItem(draftStorageKey, JSON.stringify(payload));
  }, [watchedValues, record, isViewOnly]);

  const handleNext = async () => {
    const valid = await form.trigger([
      "activity_date",
      "activity_title",
      "category",
      "purpose",
      "participants",
      "budget_involved",
      "source_of_fund",
      "source_of_fund_other",
      "remarks",
      "documents",
    ]);
    if (valid) setCurrentStep(2);
  };

  const handleSave = React.useCallback(async (values: OutputValues) => {
    setSaving(true);
    const payload = {
      activity_date: values.activity_date ? values.activity_date.toISOString() : null,
      activity_title: values.activity_title.trim(),
      category: values.category,
      purpose: values.purpose.trim(),
      participants: values.participants.trim(),
      budget_involved: Number(values.budget_involved || 0),
      source_of_fund: values.source_of_fund,
      source_of_fund_other: values.source_of_fund === "Others" ? (values.source_of_fund_other || "").trim() : null,
      remarks: values.remarks.trim(),
      documents: values.documents || [],
    };

    const result = record?.id
      ? await updateOtherActivity(record.id, payload)
      : await createOtherActivity(payload);

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
      activity_date: watchedValues.activity_date instanceof Date ? watchedValues.activity_date.toISOString() : null,
      activity_title: watchedValues.activity_title || "",
      category: watchedValues.category || "Meeting",
      purpose: watchedValues.purpose || "",
      participants: watchedValues.participants || "",
      budget_involved: Number(watchedValues.budget_involved || 0),
      source_of_fund: watchedValues.source_of_fund || "GAA",
      source_of_fund_other: watchedValues.source_of_fund_other || null,
      remarks: watchedValues.remarks || "",
      documents: watchedValues.documents || [],
    });

    if (serializedPayload === lastAutoSavedPayloadRef.current) return;

    setAutoSaveMessage("Auto-saving in a few seconds...");

    const timeout = window.setTimeout(() => {
      setAutoSaveMessage("Saving other activity...");
      void form.handleSubmit(async (values) => {
        const nextPayload = JSON.stringify({
          activity_date: values.activity_date ? values.activity_date.toISOString() : null,
          activity_title: values.activity_title.trim(),
          category: values.category,
          purpose: values.purpose.trim(),
          participants: values.participants.trim(),
          budget_involved: Number(values.budget_involved || 0),
          source_of_fund: values.source_of_fund,
          source_of_fund_other: values.source_of_fund === "Others" ? (values.source_of_fund_other || "").trim() : null,
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
        title={isViewOnly ? "Other Activities Details" : record ? "Edit Other Activities" : "Manage Other Activities"}
        currentStep={currentStep}
        totalSteps={2}
        labels={stepLabels}
        onClose={onClose}
        items={[
          { icon: ClipboardList, label: "Activity", value: watchedValues.activity_title || "Unassigned", minWidthClassName: "min-w-[210px]" },
          { icon: ShieldCheck, label: "Category", value: watchedValues.category || "N/A", minWidthClassName: "min-w-[140px]" },
          { icon: FileText, label: "Participants", value: watchedValues.participants || "N/A", minWidthClassName: "min-w-[170px]" },
        ]}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
          {currentStep === 1 ? (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ClipboardList className="h-5 w-5 text-[#159E44]" />
                  Overview and Details
                </CardTitle>
                <CardDescription className="text-sm">
                  Capture the activity overview, category, participants, budget, fund source, remarks, and supporting documents.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={typedControl}
                    name="activity_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
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
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange} disabled={isViewOnly}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categoryOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
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
                    name="activity_title"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Title of Activity Conducted</FormLabel>
                        <FormControl>
                          <Textarea {...field} disabled={isViewOnly} className="min-h-24 rounded-2xl text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={typedControl}
                    name="purpose"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purpose</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isViewOnly} className="h-11 rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={typedControl}
                    name="participants"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Participants</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isViewOnly} className="h-11 rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={typedControl}
                    name="budget_involved"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Budget Involved</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            name={field.name}
                            onBlur={field.onBlur}
                            ref={field.ref}
                            value={Number(field.value ?? 0)}
                            onChange={(event) => field.onChange(event.target.value)}
                            disabled={isViewOnly}
                            className="h-11 rounded-xl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={typedControl}
                    name="source_of_fund"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source of Fund</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange} disabled={isViewOnly}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl">
                              <SelectValue placeholder="Select source of fund" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {fundSourceOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {sourceOfFund === "Others" && (
                    <FormField
                      control={typedControl}
                      name="source_of_fund_other"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specify Other Source of Fund</FormLabel>
                          <FormControl>
                            <Input
                              value={field.value || ""}
                              onChange={field.onChange}
                              disabled={isViewOnly}
                              className="h-11 rounded-xl"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={typedControl}
                    name="remarks"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
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
                          bucket="cqer-otheract_pdf"
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
                  Review the activity details. This step saves automatically after a few seconds.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-2xl border border-[#159E44]/20 bg-[#159E44]/5 px-4 py-3 text-sm text-foreground">
                  {saving ? "Saving other activity..." : autoSaveMessage || "This step saves automatically after a few seconds."}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</p>
                    <p className="mt-2 text-sm font-medium">
                      {watchedValues.activity_date ? format(watchedValues.activity_date, "MMMM d, yyyy") : "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</p>
                    <p className="mt-2 text-sm font-medium">{watchedValues.category || "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4 md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Title of Activity Conducted</p>
                    <p className="mt-2 text-sm font-medium whitespace-pre-wrap">{watchedValues.activity_title || "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Purpose</p>
                    <p className="mt-2 text-sm font-medium">{watchedValues.purpose || "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Participants</p>
                    <p className="mt-2 text-sm font-medium">{watchedValues.participants || "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Budget Involved</p>
                    <p className="mt-2 text-sm font-medium">{Number(watchedValues.budget_involved || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Source of Fund</p>
                    <p className="mt-2 text-sm font-medium">
                      {watchedValues.source_of_fund === "Others"
                        ? `Others: ${watchedValues.source_of_fund_other || "-"}`
                        : watchedValues.source_of_fund || "-"}
                    </p>
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
