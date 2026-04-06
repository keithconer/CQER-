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
import { createBudgetUtilization, updateBudgetUtilization, type BudgetUtilizationMonthEntry, type BudgetUtilizationRecord } from "@/lib/actions/budget-utilization";
import { type Project } from "@/components/dashboard/projects-table";

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
  ).min(1, "The selected project must have inclusive dates."),
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
  const inclusiveDatesRaw = Array.isArray(registration?.inclusive_dates)
    ? registration?.inclusive_dates
    : [];
  const inclusiveDates = inclusiveDatesRaw
    .map((value) => new Date(String(value)))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((left, right) => left.getTime() - right.getTime());

  const start = inclusiveDates[0] || (project.start_date ? new Date(project.start_date) : null);
  const end =
    inclusiveDates[inclusiveDates.length - 1] || (project.end_date ? new Date(project.end_date) : null);

  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  return start.getTime() <= end.getTime() ? { start, end } : { start: end, end: start };
}

function currency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
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
    monthly_breakdown: record?.monthly_breakdown || [],
    documents: record?.documents || [],
  };
}

export function BudgetUtilizationForm({
  record,
  projects,
  onSuccess,
  onClose,
  isViewOnly = false,
}: BudgetUtilizationFormProps) {
  const form = useForm<InputValues, unknown, OutputValues>({
    resolver: zodResolver(formSchema),
    defaultValues: buildDefaultValues(record),
  });
  const typedControl = form.control as BudgetUtilizationControl;
  const breakdownArray = useFieldArray({ control: typedControl, name: "monthly_breakdown" });
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

  React.useEffect(() => {
    if (!selectedProject) return;

    const range = getProjectDateRange(selectedProject);
    if (!range) return;

    const nextEntries = buildMonthlyBreakdown(
      selectedProject,
      (form.getValues("monthly_breakdown") as BudgetUtilizationMonthEntry[] | undefined) || []
    );

    form.setValue("project_title", selectedProject.title, { shouldDirty: true });
    form.setValue("total_budget", Number(selectedProject.budget_total || 0), { shouldDirty: true });
    form.setValue("coverage_start", range.start.toISOString(), { shouldDirty: true });
    form.setValue("coverage_end", range.end.toISOString(), { shouldDirty: true });
    breakdownArray.replace(nextEntries);
  }, [selectedProject, form, breakdownArray]);

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

  const utilizedTotal = React.useMemo(
    () => monthlyBreakdown.reduce((sum, entry) => sum + Number(entry.total || 0), 0),
    [monthlyBreakdown]
  );
  const totalBudget = Number(useWatch({ control: typedControl, name: "total_budget" }) || 0);
  const remainingBudget = Math.max(totalBudget - utilizedTotal, 0);
  const coverageStart = useWatch({ control: typedControl, name: "coverage_start" });
  const coverageEnd = useWatch({ control: typedControl, name: "coverage_end" });

  const handleSubmit = async (values: FormValues) => {
    setSaving(true);
    const payload = {
      project_id: values.project_id,
      project_title: values.project_title,
      total_budget: Number(values.total_budget || 0),
      utilized_total: values.monthly_breakdown.reduce((sum, entry) => sum + Number(entry.total || 0), 0),
      coverage_start: values.coverage_start,
      coverage_end: values.coverage_end,
      monthly_breakdown: values.monthly_breakdown.map((entry) => ({
        ...entry,
        total:
          Number(entry.food_and_beverage || 0) +
          Number(entry.travel || 0) +
          Number(entry.suppliers_and_materials || 0) +
          Number(entry.communication || 0) +
          Number(entry.other_mooe || 0),
      })),
      documents: values.documents,
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
            {isViewOnly ? "Budget Utilization Details" : record ? "Edit Budget Utilization" : "Utilize Budget"}
          </h2>
          <p className="text-sm text-muted-foreground">
            The monthly fields are generated from the project overview inclusive dates.
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
                  Select a registered project and record the actual monthly spending by category.
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
                        <Select
                          disabled={isViewOnly}
                          value={field.value}
                          onValueChange={field.onChange}
                        >
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={typedControl}
                    name="total_budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total of the Budget</FormLabel>
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

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <CalendarRange className="h-3.5 w-3.5" />
                      Project Overview Inclusive Dates
                    </Label>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {coverageStart && coverageEnd
                        ? `${format(new Date(coverageStart), "MMMM d, yyyy")} - ${format(new Date(coverageEnd), "MMMM d, yyyy")}`
                        : "Select a project to load the coverage dates."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <PhilippinePeso className="h-3.5 w-3.5" />
                      Amount Utilized
                    </Label>
                    <p className="mt-2 text-sm font-medium text-foreground">{currency(utilizedTotal)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                    <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      Remaining Budget
                    </Label>
                    <p className="mt-2 text-sm font-medium text-foreground">{currency(remainingBudget)}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold">Monthly Budget Summary</h3>
                    <p className="text-xs text-muted-foreground">
                      Only the months included in the selected project duration are shown below.
                    </p>
                  </div>

                  {groupedYears.length > 0 ? (
                    groupedYears.map(([year, entries]) => (
                      <div key={year} className="space-y-4 rounded-2xl border border-border/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h4 className="text-base font-semibold">Year {year}</h4>
                            <p className="text-xs text-muted-foreground">
                              Coverage for this year is based on the project overview inclusive dates.
                            </p>
                          </div>
                          <p className="text-sm font-medium text-[#159E44]">
                            {currency(entries.reduce((sum, entry) => sum + Number(entry.total || 0), 0))}
                          </p>
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
                                      {format(new Date(entry.coverage_start), "MMM d")} - {format(new Date(entry.coverage_end), "MMM d, yyyy")}
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
                                                  className="h-10 rounded-xl text-right"
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
                      Select a project with inclusive dates to generate the monthly utilization fields.
                    </div>
                  )}
                </div>

                <Separator />

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
            disabled={saving}
            onClick={form.handleSubmit(handleSubmit)}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Budget Utilization"}
          </Button>
        )}
      </div>
    </div>
  );
}
