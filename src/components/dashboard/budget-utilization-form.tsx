"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import * as z from "zod";
import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import {
  CalendarRange,
  ChevronLeft,
  FileSpreadsheet,
  PhilippinePeso,
  ReceiptText,
  Save,
  X,
} from "lucide-react";

import { DocumentPreview } from "@/components/dashboard/document-preview";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CurrencyInput } from "@/components/ui/currency-input";
import { createBudgetUtilization, updateBudgetUtilization, type BudgetUtilizationMonthEntry, type BudgetUtilizationRecord } from "@/lib/actions/budget-utilization";
import { type Project } from "@/components/dashboard/projects-table";
import { DEFAULT_DOCUMENT_ACCEPT, DOCUMENT_UPLOAD_GUIDANCE } from "@/lib/document-uploads";
import { getProjectBudgetSummaryByYear, getProjectBudgetSummaryTotal, getProjectOverallBudget } from "@/lib/project-budget";
import { formatPhpCurrency } from "@/lib/currency";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const categories = [
  { key: "food_and_beverage", label: "Food and Beverage" },
  { key: "travel", label: "Travel" },
  { key: "suppliers_and_materials", label: "Suppliers and Materials" },
  { key: "communication", label: "Communication" },
  { key: "other_mooe", label: "Other MOOE" },
] as const;

const nonNegativeNumber = z.coerce.number().min(0, "Value must be 0 or greater.");

const formSchema = z.object({
  project_id: z.string().trim().min(1, "Select a project."),
  project_title: z.string().trim().min(1, "Project title is required."),
  total_budget: nonNegativeNumber,
  coverage_start: z.string().trim().min(1, "Coverage start is required."),
  coverage_end: z.string().trim().min(1, "Coverage end is required."),
  monthly_breakdown: z.array(
    z.object({
      year: z.number(),
      month: z.number(),
      month_key: z.string(),
      month_label: z.string(),
      coverage_start: z.string(),
      coverage_end: z.string(),
      food_and_beverage: nonNegativeNumber,
      travel: nonNegativeNumber,
      suppliers_and_materials: nonNegativeNumber,
      communication: nonNegativeNumber,
      other_mooe: nonNegativeNumber,
      total: nonNegativeNumber,
    })
  ).min(1, "The selected project must have a valid start date and end date."),
  documents: z.array(z.object({
    url: z.string(),
    name: z.string(),
  })).default([]),
});

type FormValues = z.infer<typeof formSchema>;
type InputValues = z.input<typeof formSchema>;
type OutputValues = z.output<typeof formSchema>;
type BudgetUtilizationControl = Control<InputValues, unknown, OutputValues>;

interface BudgetUtilizationFormProps {
  record?: BudgetUtilizationRecord | null;
  projects: Project[];
  onSuccess?: () => void;
  onClose?: () => void;
  isViewOnly?: boolean;
}

function getProjectRegistrationData(project?: Project | null) {
  if (!project?.funding_data || typeof project.funding_data !== "object") return null;
  const registration = (project.funding_data as Record<string, unknown>).registration_data;
  return registration && typeof registration === "object"
    ? (registration as Record<string, unknown>)
    : null;
}

function getProjectDateRange(project?: Project | null) {
  if (!project) return null;
  const registration = getProjectRegistrationData(project);
  const registrationStart =
    typeof registration?.start_date === "string" ? new Date(registration.start_date) : null;
  const registrationEnd =
    typeof registration?.end_date === "string" ? new Date(registration.end_date) : null;
  const inclusiveDatesRaw = Array.isArray(registration?.inclusive_dates)
    ? registration?.inclusive_dates
    : [];
  const inclusiveDates = inclusiveDatesRaw
    .map((value) => new Date(String(value)))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((left, right) => left.getTime() - right.getTime());

  const start =
    registrationStart ||
    inclusiveDates[0] ||
    (project.start_date ? new Date(project.start_date) : null);
  const end =
    registrationEnd ||
    inclusiveDates[inclusiveDates.length - 1] ||
    (project.end_date ? new Date(project.end_date) : null);

  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  return start.getTime() <= end.getTime() ? { start, end } : { start: end, end: start };
}

function currency(value: number) {
  return formatPhpCurrency(value);
}

function toValidDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatOptionalDate(value: string | null | undefined, pattern: string) {
  const parsed = toValidDate(value);
  return parsed ? format(parsed, pattern) : null;
}

function normalizeDocuments(documents: BudgetUtilizationRecord["documents"] | null | undefined) {
  if (!Array.isArray(documents)) return [];

  return documents.filter(
    (document): document is { url: string; name: string } =>
      Boolean(document && typeof document.url === "string" && typeof document.name === "string")
  );
}

function normalizeMonthlyBreakdown(entries: BudgetUtilizationRecord["monthly_breakdown"] | null | undefined) {
  if (!Array.isArray(entries)) return [];

  return entries
    .filter((entry): entry is BudgetUtilizationMonthEntry => Boolean(entry && typeof entry === "object"))
    .map((entry) => ({
      year: Number(entry.year || 0),
      month: Number(entry.month || 0),
      month_key: typeof entry.month_key === "string" ? entry.month_key : "",
      month_label: typeof entry.month_label === "string" ? entry.month_label : "",
      coverage_start: typeof entry.coverage_start === "string" ? entry.coverage_start : "",
      coverage_end: typeof entry.coverage_end === "string" ? entry.coverage_end : "",
      food_and_beverage: Number(entry.food_and_beverage || 0),
      travel: Number(entry.travel || 0),
      suppliers_and_materials: Number(entry.suppliers_and_materials || 0),
      communication: Number(entry.communication || 0),
      other_mooe: Number(entry.other_mooe || 0),
      total: Number(entry.total || 0),
    }))
    .filter((entry) => entry.year > 0 && entry.month > 0);
}

function sumMonthEntry(entry?: Partial<BudgetUtilizationMonthEntry> | null) {
  return (
    Number(entry?.food_and_beverage || 0) +
    Number(entry?.travel || 0) +
    Number(entry?.suppliers_and_materials || 0) +
    Number(entry?.communication || 0) +
    Number(entry?.other_mooe || 0)
  );
}

function buildMonthlyBreakdown(
  project: Project | null | undefined,
  existing?: BudgetUtilizationMonthEntry[] | null
) {
  const range = getProjectDateRange(project);
  if (!range) return [];

  const existingMap = new Map((existing || []).map((entry) => [entry.month_key, entry]));
  const entries: BudgetUtilizationMonthEntry[] = [];
  let pointer = startOfMonth(range.start);
  const endMonth = startOfMonth(range.end);

  while (pointer.getTime() <= endMonth.getTime()) {
    const monthStart = pointer.getFullYear() === range.start.getFullYear() && pointer.getMonth() === range.start.getMonth()
      ? range.start
      : startOfMonth(pointer);
    const monthEnd = pointer.getFullYear() === range.end.getFullYear() && pointer.getMonth() === range.end.getMonth()
      ? range.end
      : endOfMonth(pointer);
    const monthKey = format(pointer, "yyyy-MM");
    const current = existingMap.get(monthKey);

    const foodAndBeverage = Number(current?.food_and_beverage || 0);
    const travel = Number(current?.travel || 0);
    const suppliersAndMaterials = Number(current?.suppliers_and_materials || 0);
    const communication = Number(current?.communication || 0);
    const otherMooe = Number(current?.other_mooe || 0);

    entries.push({
      year: pointer.getFullYear(),
      month: pointer.getMonth() + 1,
      month_key: monthKey,
      month_label: monthNames[pointer.getMonth()],
      coverage_start: monthStart.toISOString(),
      coverage_end: monthEnd.toISOString(),
      food_and_beverage: foodAndBeverage,
      travel,
      suppliers_and_materials: suppliersAndMaterials,
      communication,
      other_mooe: otherMooe,
      total: foodAndBeverage + travel + suppliersAndMaterials + communication + otherMooe,
    });

    pointer = addMonths(pointer, 1);
  }

  return entries;
}

function buildDefaultValues(record?: BudgetUtilizationRecord | null): FormValues {
  return {
    project_id: record?.project_id || "",
    project_title: record?.project_title || "",
    total_budget: Number(record?.total_budget || 0),
    coverage_start: record?.coverage_start || "",
    coverage_end: record?.coverage_end || "",
    monthly_breakdown: normalizeMonthlyBreakdown(record?.monthly_breakdown),
    documents: normalizeDocuments(record?.documents),
  };
}

function buildYearBudgetMap(project?: Project | null) {
  return new Map(
    getProjectBudgetSummaryByYear(project).map((entry) => [entry.year, Number(entry.total || 0)])
  );
}

function buildYearTotalMap(entries: BudgetUtilizationMonthEntry[] = []) {
  return entries.reduce((map, entry) => {
    map.set(entry.year, (map.get(entry.year) || 0) + sumMonthEntry(entry));
    return map;
  }, new Map<number, number>());
}

function mergeMonthlyBreakdowns(
  existingEntries: BudgetUtilizationMonthEntry[] = [],
  nextEntries: BudgetUtilizationMonthEntry[] = []
) {
  const nextMap = new Map(nextEntries.map((entry) => [entry.month_key, entry]));

  return existingEntries.map((entry) => {
    const nextEntry = nextMap.get(entry.month_key);
    const foodAndBeverage = Number(entry.food_and_beverage || 0) + Number(nextEntry?.food_and_beverage || 0);
    const travel = Number(entry.travel || 0) + Number(nextEntry?.travel || 0);
    const suppliersAndMaterials =
      Number(entry.suppliers_and_materials || 0) + Number(nextEntry?.suppliers_and_materials || 0);
    const communication = Number(entry.communication || 0) + Number(nextEntry?.communication || 0);
    const otherMooe = Number(entry.other_mooe || 0) + Number(nextEntry?.other_mooe || 0);

    return {
      ...entry,
      food_and_beverage: foodAndBeverage,
      travel,
      suppliers_and_materials: suppliersAndMaterials,
      communication,
      other_mooe: otherMooe,
      total: foodAndBeverage + travel + suppliersAndMaterials + communication + otherMooe,
    };
  });
}

function mergeDocuments(
  existingDocuments: { url: string; name: string }[] = [],
  nextDocuments: { url: string; name: string }[] = []
) {
  const documentMap = new Map<string, { url: string; name: string }>();

  [...existingDocuments, ...nextDocuments].forEach((document) => {
    if (!document?.url) return;
    documentMap.set(document.url, document);
  });

  return Array.from(documentMap.values());
}

export function BudgetUtilizationForm({
  record,
  projects,
  onSuccess,
  onClose,
  isViewOnly = false,
}: BudgetUtilizationFormProps) {
  const isUpdateMode = !isViewOnly && Boolean(record?.id);
  const existingBreakdown = React.useMemo(
    () => normalizeMonthlyBreakdown(record?.monthly_breakdown),
    [record]
  );
  const existingDocuments = React.useMemo(() => normalizeDocuments(record?.documents), [record]);
  const existingUtilizedTotal = React.useMemo(
    () => existingBreakdown.reduce((sum, entry) => sum + sumMonthEntry(entry), 0),
    [existingBreakdown]
  );
  const form = useForm<InputValues, unknown, OutputValues>({
    resolver: zodResolver(formSchema),
    defaultValues: buildDefaultValues(record),
  });
  const typedControl = form.control as BudgetUtilizationControl;
  const breakdownArray = useFieldArray({ control: typedControl, name: "monthly_breakdown" });
  // Store a stable ref to breakdownArray.replace so we don't put the entire
  // breakdownArray object (which changes every render) into useEffect deps.
  const replaceBreakdownRef = React.useRef(breakdownArray.replace);
  React.useLayoutEffect(() => {
    replaceBreakdownRef.current = breakdownArray.replace;
  });

  const selectedProjectId = useWatch({ control: typedControl, name: "project_id" });
  const monthlyBreakdown = useWatch({
    control: typedControl,
    name: "monthly_breakdown",
    defaultValue: [],
  });
  const [saving, setSaving] = React.useState(false);

  const selectedProject = React.useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );
  const selectedProjectYearBudgets = React.useMemo(
    () => getProjectBudgetSummaryByYear(selectedProject),
    [selectedProject]
  );
  const selectedProjectYearBudgetMap = React.useMemo(
    () => buildYearBudgetMap(selectedProject),
    [selectedProject]
  );
  const allocatableBudgetTotal = React.useMemo(
    () => getProjectBudgetSummaryTotal(selectedProject),
    [selectedProject]
  );
  const overallProjectBudget = React.useMemo(
    () => getProjectOverallBudget(selectedProject),
    [selectedProject]
  );
  const savedYearTotals = React.useMemo(
    () => buildYearTotalMap(existingBreakdown),
    [existingBreakdown]
  );
  const storedTotalBudget = React.useMemo(
    () => (record ? Number(record.total_budget || 0) : allocatableBudgetTotal),
    [record, allocatableBudgetTotal]
  );

  React.useEffect(() => {
    if (!selectedProject) return;

    const range = getProjectDateRange(selectedProject);
    if (!range) return;

    // In view-only mode: populate with existing saved values.
    // In create/update mode: always start with zero-filled fields so the user
    // only enters newly incurred expenses this session.
    const nextEntries = buildMonthlyBreakdown(
      selectedProject,
      isViewOnly ? existingBreakdown : undefined
    );

    form.setValue("project_title", record?.project_title || selectedProject.title, { shouldDirty: false });
    form.setValue("total_budget", storedTotalBudget, { shouldDirty: false });
    form.setValue("coverage_start", record?.coverage_start || range.start.toISOString(), { shouldDirty: false });
    form.setValue("coverage_end", record?.coverage_end || range.end.toISOString(), { shouldDirty: false });
    form.setValue("documents", isViewOnly ? existingDocuments : [], { shouldDirty: false });
    // Use the stable ref so this effect doesn't re-run when breakdownArray changes.
    replaceBreakdownRef.current(nextEntries);
  }, [
    existingBreakdown,
    existingDocuments,
    form,
    isViewOnly,
    record,
    selectedProject,
    storedTotalBudget,
  ]);

  React.useEffect(() => {
    monthlyBreakdown.forEach((entry, index) => {
      const total =
        Number(entry.food_and_beverage || 0) +
        Number(entry.travel || 0) +
        Number(entry.suppliers_and_materials || 0) +
        Number(entry.communication || 0) +
        Number(entry.other_mooe || 0);

      if (total !== Number(entry.total || 0)) {
        form.setValue(`monthly_breakdown.${index}.total`, total, { shouldDirty: false });
      }
    });
  }, [monthlyBreakdown, form]);

  const groupedYears = React.useMemo(() => {
    const map = new Map<number, typeof monthlyBreakdown>();
    monthlyBreakdown.forEach((entry) => {
      const current = map.get(entry.year) || [];
      current.push(entry);
      map.set(entry.year, current);
    });
    return Array.from(map.entries()).sort((left, right) => left[0] - right[0]);
  }, [monthlyBreakdown]);

  const pendingUtilizedTotal = React.useMemo(
    () => monthlyBreakdown.reduce((sum, entry) => sum + Number(entry.total || 0), 0),
    [monthlyBreakdown]
  );
  const totalBudget = Number(useWatch({ control: typedControl, name: "total_budget" }) || 0);
  const availableBudget = Math.max(totalBudget - (isViewOnly ? pendingUtilizedTotal : existingUtilizedTotal), 0);
  const remainingBudgetAfterSave = Math.max(
    totalBudget - existingUtilizedTotal - (isViewOnly ? 0 : pendingUtilizedTotal),
    0
  );
  const coverageStart = useWatch({ control: typedControl, name: "coverage_start" });
  const coverageEnd = useWatch({ control: typedControl, name: "coverage_end" });

  const handleSubmit = async (values: FormValues) => {
    const yearBudgetMap = buildYearBudgetMap(selectedProject);
    const yearTotals = buildYearTotalMap(values.monthly_breakdown);
    const currentEntryAllocated = values.monthly_breakdown.reduce(
      (sum, entry) => sum + Number(entry.total || 0),
      0
    );

    if (currentEntryAllocated <= 0) {
      alert("Enter at least one utilized amount before saving this budget utilization.");
      return;
    }

    if (currentEntryAllocated > availableBudget) {
      alert(
        `This utilization exceeds the remaining budget. You can only save up to ${currency(availableBudget)} right now.`
      );
      return;
    }

    const yearOverBudget = Array.from(yearTotals.entries()).find(([year, total]) => {
      const yearBudget = Number(yearBudgetMap.get(year) || 0);
      const savedTotal = Number(savedYearTotals.get(year) || 0);
      return savedTotal + total > yearBudget;
    });

    if (yearOverBudget) {
      const [year, total] = yearOverBudget;
      const yearBudget = Number(yearBudgetMap.get(year) || 0);
      const savedTotal = Number(savedYearTotals.get(year) || 0);
      alert(
        `Year ${year} exceeds its budget summary. This entry brings the total to ${currency(savedTotal + total)} but only ${currency(yearBudget)} is available.`
      );
      return;
    }

    setSaving(true);
    const mergedBreakdown = isUpdateMode
      ? mergeMonthlyBreakdowns(existingBreakdown, values.monthly_breakdown)
      : values.monthly_breakdown.map((entry) => ({
          ...entry,
          total: sumMonthEntry(entry),
        }));
    const payload = {
      project_id: values.project_id,
      project_title: values.project_title,
      total_budget: Number(values.total_budget || 0),
      utilized_total: existingUtilizedTotal + currentEntryAllocated,
      coverage_start: values.coverage_start,
      coverage_end: values.coverage_end,
      monthly_breakdown: mergedBreakdown,
      documents: isUpdateMode ? mergeDocuments(existingDocuments, values.documents) : values.documents,
    };

    const result = record?.id
      ? await updateBudgetUtilization(record.id, payload)
      : await createBudgetUtilization(payload);

    setSaving(false);

    if (result?.error) {
      alert(result.error);
      return;
    }

    onSuccess?.();
  };

  return (
    <div className="flex max-h-[90vh] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h2 className="text-xl font-semibold">
            {isViewOnly
              ? "Budget Utilization Details"
              : isUpdateMode
                ? "Update Budget Utilization"
                : "Utilize Budget"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isViewOnly
              ? "Review the saved monthly utilization and supporting documents for this project."
              : isUpdateMode
                ? "Log newly utilized amounts only. Earlier utilization stays deducted and the monthly inputs start fresh for this update."
                : "Log actual expenses by month. You can save partial utilization now and come back later to add more."}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ReceiptText className="h-5 w-5 text-[#159E44]" />
                  Budget Utilization
                </CardTitle>
                <CardDescription className="text-sm">
                  {isViewOnly
                    ? "Review the cumulative monthly utilization saved for this project."
                    : isUpdateMode
                    ? "Add the latest expense allocation for this project. New amounts will be added to the saved utilization totals."
                    : "Select a registered project and allocate only the budget amounts that have actually been utilized so far."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={typedControl}
                    name="project_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title of the Project</FormLabel>
                        {isViewOnly || isUpdateMode ? (
                          <FormControl>
                            <Input
                              value={record?.project_title || selectedProject?.title || ""}
                              readOnly
                              className="h-11 rounded-xl"
                            />
                          </FormControl>
                        ) : (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="h-11 rounded-xl">
                                <SelectValue placeholder="Select a project" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {projects.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  {project.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={typedControl}
                    name="total_budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Budget Summary Total</FormLabel>
                        <FormControl>
                          <Input
                            value={currency(Number(field.value || 0))}
                            readOnly
                            className="h-11 rounded-xl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <CalendarRange className="h-3.5 w-3.5" />
                      Project Date Coverage
                    </Label>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {(() => {
                        const formattedStart = formatOptionalDate(coverageStart, "MMMM d, yyyy");
                        const formattedEnd = formatOptionalDate(coverageEnd, "MMMM d, yyyy");
                        return formattedStart && formattedEnd
                          ? `${formattedStart} - ${formattedEnd}`
                          : "Select a project to load the coverage dates.";
                      })()}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <PhilippinePeso className="h-3.5 w-3.5" />
                      Overall Project Budget
                    </Label>
                    <p className="mt-2 text-sm font-medium text-foreground">{currency(overallProjectBudget)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <PhilippinePeso className="h-3.5 w-3.5" />
                      Budget Summary Total
                    </Label>
                    <p className="mt-2 text-sm font-medium text-foreground">{currency(totalBudget)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      {isViewOnly ? "Utilized by Month" : "Previously Utilized"}
                    </Label>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {currency(isViewOnly ? pendingUtilizedTotal : existingUtilizedTotal)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      {isViewOnly ? "Remaining Balance" : "This Entry"}
                    </Label>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {currency(isViewOnly ? availableBudget : pendingUtilizedTotal)}
                    </p>
                  </div>
                  {!isViewOnly && (
                    <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                      <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        Available to Utilize Now
                      </Label>
                      <p className="mt-2 text-sm font-medium text-foreground">{currency(availableBudget)}</p>
                    </div>
                  )}
                  {!isViewOnly && (
                    <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                      <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        Remaining After Save
                      </Label>
                      <p className="mt-2 text-sm font-medium text-foreground">{currency(remainingBudgetAfterSave)}</p>
                    </div>
                  )}
                </div>

                {!isViewOnly && totalBudget > 0 ? (
                  <div className="rounded-2xl border border-border/60 bg-muted/10 px-4 py-3 text-xs text-muted-foreground">
                    Save only the expenses already utilized. Any untouched months or years can remain at zero until you need to log another update.
                  </div>
                ) : null}

                <Separator />

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold">Monthly Budget Summary</h3>
                    <p className="text-xs text-muted-foreground">
                      Only the months included in the selected project date range are shown below.
                    </p>
                  </div>

                  {groupedYears.length > 0 ? (
                    groupedYears.map(([year, entries]) => (
                      <div key={year} className="space-y-4 rounded-2xl border border-border/60 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <h4 className="text-base font-semibold">Year {year}</h4>
                            <p className="text-xs text-muted-foreground">
                              Coverage for this year is based on the project start and end dates.
                            </p>
                          </div>
                            <div className="grid gap-2 sm:grid-cols-3">
                              <div className="rounded-xl border border-border/60 bg-muted/10 px-3 py-2">
                                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Year Budget</p>
                                <p className="text-sm font-semibold text-foreground">{currency(Number(selectedProjectYearBudgetMap.get(year) || 0))}</p>
                              </div>
                              <div className="rounded-xl border border-border/60 bg-muted/10 px-3 py-2">
                                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                  {isViewOnly ? "Utilized" : "Previously Utilized"}
                                </p>
                                <p className="text-sm font-semibold text-foreground">
                                  {currency(
                                    isViewOnly
                                      ? entries.reduce((sum, entry) => sum + Number(entry.total || 0), 0)
                                      : Number(savedYearTotals.get(year) || 0)
                                  )}
                                </p>
                              </div>
                              <div className="rounded-xl border border-border/60 bg-muted/10 px-3 py-2">
                                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                  {isViewOnly ? "Remaining" : "This Entry"}
                                </p>
                                <p className="text-sm font-semibold text-foreground">
                                  {currency(
                                    isViewOnly
                                      ? Math.max(
                                          Number(selectedProjectYearBudgetMap.get(year) || 0) -
                                            entries.reduce((sum, entry) => sum + Number(entry.total || 0), 0),
                                          0
                                        )
                                      : entries.reduce((sum, entry) => sum + Number(entry.total || 0), 0)
                                  )}
                                </p>
                              </div>
                              {!isViewOnly && (
                                <div className="rounded-xl border border-border/60 bg-muted/10 px-3 py-2">
                                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Remaining After Save</p>
                                  <p className="text-sm font-semibold text-foreground">
                                    {currency(
                                      Math.max(
                                        Number(selectedProjectYearBudgetMap.get(year) || 0) -
                                          Number(savedYearTotals.get(year) || 0) -
                                          entries.reduce((sum, entry) => sum + Number(entry.total || 0), 0),
                                        0
                                      )
                                    )}
                                  </p>
                                </div>
                              )}
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-border/60">
                          <table className="min-w-[960px] w-full text-sm">
                            <thead className="bg-muted/30">
                              <tr>
                                <th className="px-3 py-3 text-left font-semibold">Category</th>
                                {entries.map((entry) => (
                                  <th key={entry.month_key} className="px-2 py-3 text-center font-semibold">
                                    <div>{entry.month_label}</div>
                                    <div className="text-[10px] font-normal text-muted-foreground">
                                      {(() => {
                                        const formattedStart = formatOptionalDate(entry.coverage_start, "MMM d");
                                        const formattedEnd = formatOptionalDate(entry.coverage_end, "MMM d, yyyy");
                                        return formattedStart && formattedEnd
                                          ? `${formattedStart} - ${formattedEnd}`
                                          : "Coverage unavailable";
                                      })()}
                                    </div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {categories.map((category) => (
                                <tr key={category.key} className="border-t">
                                  <td className="px-3 py-3 font-medium">{category.label}</td>
                                  {entries.map((entry) => {
                                    const index = monthlyBreakdown.findIndex((item) => item.month_key === entry.month_key);
                                    const fieldName = `monthly_breakdown.${index}.${category.key}` as const;
                                    return (
                                      <td key={`${entry.month_key}-${category.key}`} className="px-2 py-2">
                                        <FormField
                                          control={typedControl}
                                          name={fieldName}
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormControl>
                                                <CurrencyInput
                                                  name={field.name}
                                                  onBlur={field.onBlur}
                                                  ref={field.ref}
                                                  value={
                                                    typeof field.value === "number" ||
                                                    typeof field.value === "string"
                                                      ? field.value
                                                      : 0
                                                  }
                                                  onValueChange={(value) =>
                                                    field.onChange(value === "" ? 0 : Number(value))
                                                  }
                                                  placeholder="Enter amount"
                                                  disabled={
                                                    isViewOnly ||
                                                    (Number(selectedProjectYearBudgetMap.get(entry.year) || 0) <= 0) ||
                                                    (
                                                      Math.max(
                                                        Number(selectedProjectYearBudgetMap.get(entry.year) || 0) -
                                                          Number(savedYearTotals.get(entry.year) || 0) -
                                                          entries.reduce((sum, item) => sum + Number(item.total || 0), 0),
                                                        0
                                                      ) <= 0 &&
                                                      !field.value
                                                    )
                                                  }
                                                  hideZeroWhenEmpty
                                                  className="h-10 rounded-xl text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                              <tr className="border-t bg-muted/10">
                                <td className="px-3 py-3 font-semibold">Total per Month</td>
                                {entries.map((entry) => (
                                  <td key={`${entry.month_key}-total`} className="px-2 py-3 text-center font-semibold text-[#159E44]">
                                    {currency(Number(entry.total || 0))}
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
                      {selectedProject && selectedProjectYearBudgets.length === 0
                        ? "This project does not have a yearly budget summary yet. Complete the project registration budget summary first."
                        : "Select a project with a valid start date, end date, and yearly budget summary to generate the monthly utilization fields."}
                    </div>
                  )}
                </div>

                <Separator />

                {!isViewOnly && isUpdateMode && existingDocuments.length > 0 ? (
                  <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <div>
                      <h3 className="text-sm font-semibold">Previously Uploaded Documents</h3>
                      <p className="text-xs text-muted-foreground">
                        These files are already attached to the saved utilization record. Any new upload below will be added to them.
                      </p>
                    </div>
                    <DocumentPreview documents={existingDocuments} bucket="cqer-budgetutil_pdf" />
                  </div>
                ) : null}

                <FormField
                  control={typedControl}
                  name="documents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Upload Documents</FormLabel>
                      <FormControl>
                        <FileUpload
                          value={field.value || []}
                          onChange={field.onChange}
                          disabled={isViewOnly}
                          bucket="cqer-budgetutil_pdf"
                          accept={DEFAULT_DOCUMENT_ACCEPT}
                          maxSizeInMB={5}
                          guidance={DOCUMENT_UPLOAD_GUIDANCE.budgetUtilization}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </form>
      </Form>

      <div className="flex items-center justify-between border-t px-6 py-4">
        <Button type="button" variant="outline" className="rounded-xl" onClick={onClose}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Close
        </Button>
        {!isViewOnly && (
          <Button
            type="button"
            className="rounded-xl bg-[#159E44] text-white hover:bg-[#128A3B]"
            disabled={saving || totalBudget <= 0 || (isUpdateMode && availableBudget <= 0)}
            onClick={form.handleSubmit(handleSubmit)}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving
              ? "Saving..."
              : isUpdateMode
                ? "Update Budget Utilization"
                : "Save Budget Utilization"}
          </Button>
        )}
      </div>
    </div>
  );
}
