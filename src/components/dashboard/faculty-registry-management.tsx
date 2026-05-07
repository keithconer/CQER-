"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { BriefcaseBusiness, Pencil, Search, SlidersHorizontal, Trash2, Users2 } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  createFacultyRegistryRecord,
  deleteFacultyRegistryRecord,
  updateFacultyRegistryRecord,
  type FacultyRegistryEmployment,
  type FacultyRegistryRecord,
} from "@/lib/actions/faculty-registry";
import { ExportPreviewMenu, type ExportPreviewColumn } from "@/components/dashboard/export-preview-menu";
import { RecordPagination, useRecordPagination } from "@/components/dashboard/record-pagination";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getUnitsByDepartment } from "@/lib/departments";

const employmentOptions = ["Permanent", "Contract of Service"] as const;
const formSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required."),
  last_name: z.string().trim().min(1, "Last name is required."),
  designation: z.string().trim().min(1, "Designation is required."),
  unit: z.string().trim().min(1, "Unit is required."),
  employment: z.enum(employmentOptions),
});

type FormValues = z.infer<typeof formSchema>;
type ResultFilter = "all" | "permanent" | "contract_of_service";

function getFullName(record: FacultyRegistryRecord) {
  return `${record.first_name} ${record.last_name}`.trim();
}

const exportColumns = [
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "designation", label: "Designation" },
  { key: "unit", label: "Unit" },
  { key: "employment", label: "Employment" },
] satisfies ExportPreviewColumn[];

function buildExportRows(records: FacultyRegistryRecord[]) {
  return records.map((record) => ({
    firstName: record.first_name,
    lastName: record.last_name,
    designation: record.designation,
    unit: record.unit || "-",
    employment: record.employment,
  }));
}

async function exportFacultyRegistryExcel(records: FacultyRegistryRecord[]) {
  const ExcelJSImport = await import("exceljs/dist/exceljs.min.js");
  const ExcelJS = ExcelJSImport?.default ?? ExcelJSImport;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Faculty Registry");
  const columns = [
    { header: "First Name", key: "firstName", width: 22 },
    { header: "Last Name", key: "lastName", width: 22 },
    { header: "Designation", key: "designation", width: 28 },
    { header: "Unit", key: "unit", width: 28 },
    { header: "Employment", key: "employment", width: 20 },
  ];
  sheet.columns = columns.map((column) => ({ key: column.key, width: column.width }));
  sheet.mergeCells("A1:E1");
  sheet.getCell("A1").value = "Faculty Registry";
  sheet.getCell("A1").font = { bold: true, size: 14 };
  sheet.getCell("A1").alignment = { horizontal: "center" };
  sheet.getRow(2).values = columns.map((column) => column.header);
  sheet.getRow(2).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF159E44" } };
  });
  records.forEach((record) => {
    sheet.addRow({
      firstName: record.first_name,
      lastName: record.last_name,
      designation: record.designation,
      unit: record.unit || "-",
      employment: record.employment,
    });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `faculty-registry-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function exportFacultyRegistryPdf(records: FacultyRegistryRecord[]) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(12);
  doc.text("Faculty Registry", doc.internal.pageSize.getWidth() / 2, 12, { align: "center" });
  autoTable(doc, {
    startY: 18,
    head: [["First Name", "Last Name", "Designation", "Unit", "Employment"]],
    body: records.map((record) => [
      record.first_name,
      record.last_name,
      record.designation,
      record.unit || "-",
      record.employment,
    ]),
    theme: "grid",
    headStyles: { fillColor: [21, 158, 68], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
  });
  doc.save(`faculty-registry-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function FacultyRegistryForm({
  department,
  designationSuggestions,
  record,
  onSuccess,
}: {
  department: string;
  designationSuggestions: string[];
  record?: FacultyRegistryRecord | null;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: record?.first_name || "",
      last_name: record?.last_name || "",
      designation: record?.designation || "",
      unit: record?.unit || "",
      employment: record?.employment || "Permanent",
    },
  });

  React.useEffect(() => {
    form.reset({
      first_name: record?.first_name || "",
      last_name: record?.last_name || "",
      designation: record?.designation || "",
      unit: record?.unit || "",
      employment: record?.employment || "Permanent",
    });
  }, [form, record]);

  const designationInput =
    useWatch({
      control: form.control,
      name: "designation",
    }) || "";

  const availableUnits = React.useMemo(() => getUnitsByDepartment(department), [department]);

  const filteredDesignationSuggestions = React.useMemo(() => {
    const query = designationInput.trim().toLowerCase();
    const filtered = designationSuggestions.filter((value) => value.toLowerCase().includes(query));
    return query ? filtered : designationSuggestions;
  }, [designationInput, designationSuggestions]);

  const onSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = record?.id
      ? await updateFacultyRegistryRecord(record.id, values)
      : await createFacultyRegistryRecord(values);
    setIsSubmitting(false);

    if (result?.error) {
      form.setError("root", { message: result.error });
      return;
    }

    if (!record?.id) {
      form.reset({
        first_name: "",
        last_name: "",
        designation: "",
        unit: "",
        employment: "Permanent",
      });
    }

    router.refresh();
    onSuccess();
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">First Name</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isSubmitting} className="h-9 rounded-xl text-xs" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Last Name</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isSubmitting} className="h-9 rounded-xl text-xs" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="designation"
            render={({ field }) => (
              <FormItem className="md:col-span-1">
                <FormLabel className="text-xs">Designation</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isSubmitting} className="h-9 rounded-xl text-xs" />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Unit</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger className="h-9 rounded-xl text-xs">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableUnits.map((unit) => (
                      <SelectItem key={unit} value={unit} className="text-xs">
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="employment"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Employment</FormLabel>
                <Select value={field.value} onValueChange={(value: FacultyRegistryEmployment) => field.onChange(value)} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger className="h-9 rounded-xl text-xs">
                      <SelectValue placeholder="Select employment" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {employmentOptions.map((option) => (
                      <SelectItem key={option} value={option} className="text-xs">
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>

        {filteredDesignationSuggestions.length > 0 ? (
          <div className="space-y-2 rounded-2xl border border-border/40 bg-muted/10 px-3 py-3">
            <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
              <BriefcaseBusiness className="h-3.5 w-3.5" />
              Existing designation suggestions
            </div>
            <div className="flex flex-wrap gap-2">
              {filteredDesignationSuggestions.map((designation) => (
                <Button
                  key={designation}
                  type="button"
                  variant="outline"
                  className="h-7 rounded-full px-3 text-[10px]"
                  onClick={() => form.setValue("designation", designation, { shouldDirty: true, shouldValidate: true })}
                >
                  {designation}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {form.formState.errors.root?.message ? (
          <p className="text-xs font-medium text-destructive">{form.formState.errors.root.message}</p>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" className="h-9 rounded-xl text-xs" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : record?.id ? "Update Faculty Record" : "Save Faculty Record"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

interface FacultyRegistryManagementProps {
  department: string;
  records: FacultyRegistryRecord[];
}

export function FacultyRegistryManagement({
  department,
  records,
}: FacultyRegistryManagementProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedUnits, setSelectedUnits] = React.useState<string[]>([]);
  const [selectedEmployment, setSelectedEmployment] = React.useState<ResultFilter>("all");
  const [editingRecord, setEditingRecord] = React.useState<FacultyRegistryRecord | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const availableUnits = React.useMemo(() => getUnitsByDepartment(department), [department]);
  const designationSuggestions = React.useMemo(
    () =>
      Array.from(new Set(records.map((record) => record.designation.trim()).filter(Boolean))).sort((left, right) =>
        left.localeCompare(right)
      ),
    [records]
  );

  const filteredRecords = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return records.filter((record) => {
      if (selectedUnits.length > 0 && !selectedUnits.includes(record.unit || "")) return false;
      if (selectedEmployment === "permanent" && record.employment !== "Permanent") return false;
      if (selectedEmployment === "contract_of_service" && record.employment !== "Contract of Service") return false;
      if (!query) return true;

      return [
        record.first_name,
        record.last_name,
        record.designation,
        record.unit || "",
        record.employment,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [records, searchTerm, selectedEmployment, selectedUnits]);

  const {
    currentPage,
    paginatedItems,
    resetPagination,
    setCurrentPage,
    startIndex,
    totalPages,
  } = useRecordPagination(filteredRecords);

  React.useEffect(() => {
    resetPagination();
  }, [resetPagination, searchTerm, selectedEmployment, selectedUnits]);

  const toggleUnitFilter = (value: string) => {
    setSelectedUnits((previous) =>
      previous.includes(value) ? previous.filter((item) => item !== value) : [...previous, value]
    );
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await deleteFacultyRegistryRecord(id);
    setDeletingId(null);

    if (result?.error) {
      alert(result.error);
      return;
    }

    router.refresh();
  };

  const handleCreateSuccess = () => {
    router.refresh();
  };

  const closeEditDialogAndRefresh = () => {
    setEditingRecord(null);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="space-y-4 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users2 className="h-4.5 w-4.5 text-foreground" />
              Faculty Involvement
            </CardTitle>
            <CardDescription className="text-xs">
              Register department faculty records for training committee selection and internal staffing references.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <FacultyRegistryForm
            department={department}
            designationSuggestions={designationSuggestions}
            onSuccess={handleCreateSuccess}
          />
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle className="text-base">Saved Faculty Records</CardTitle>
              <CardDescription className="text-xs">
                Search, filter, export, update, or delete the faculty records available to this department.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <ExportPreviewMenu
                title="Faculty Registry"
                description="Preview the filtered faculty registry records before exporting them."
                columns={exportColumns}
                rows={buildExportRows(filteredRecords)}
                onDownloadExcel={() => exportFacultyRegistryExcel(filteredRecords)}
                onDownloadPdf={() => exportFacultyRegistryPdf(filteredRecords)}
                triggerClassName="h-9 rounded-xl text-xs"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 rounded-xl text-xs">
                    <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
                    Results Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="text-[10px]">Employment</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    className="text-[10px]"
                    checked={selectedEmployment === "all"}
                    onCheckedChange={() => setSelectedEmployment("all")}
                  >
                    All employment types
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    className="text-[10px]"
                    checked={selectedEmployment === "permanent"}
                    onCheckedChange={() => setSelectedEmployment("permanent")}
                  >
                    Permanent only
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    className="text-[10px]"
                    checked={selectedEmployment === "contract_of_service"}
                    onCheckedChange={() => setSelectedEmployment("contract_of_service")}
                  >
                    Contract of Service only
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px]">Units</DropdownMenuLabel>
                  {availableUnits.map((unit) => (
                    <DropdownMenuCheckboxItem
                      key={unit}
                      className="text-[10px]"
                      checked={selectedUnits.includes(unit)}
                      onCheckedChange={() => toggleUnitFilter(unit)}
                    >
                      {unit}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="relative w-full max-w-lg">
              <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search faculty name, designation, or unit..."
                className="h-9 rounded-xl pl-9 text-xs"
              />
            </div>

            {designationSuggestions.length > 0 ? (
              <div className="flex flex-wrap gap-2 rounded-2xl border border-border/40 bg-muted/10 px-3 py-3">
                {designationSuggestions.slice(0, 8).map((designation) => (
                  <span
                    key={designation}
                    className="rounded-full border border-border/50 bg-background px-3 py-1 text-[10px] text-muted-foreground"
                  >
                    {designation}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-border/50">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="h-9 text-[10px] font-semibold">Name</TableHead>
                  <TableHead className="h-9 text-[10px] font-semibold">Designation</TableHead>
                  <TableHead className="h-9 text-[10px] font-semibold">Unit</TableHead>
                  <TableHead className="h-9 text-[10px] font-semibold">Employment</TableHead>
                  <TableHead className="h-9 text-right text-[10px] font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length > 0 ? (
                  paginatedItems.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="py-3 text-xs font-medium">{getFullName(record)}</TableCell>
                      <TableCell className="py-3 text-xs">{record.designation}</TableCell>
                      <TableCell className="py-3 text-xs">{record.unit || "-"}</TableCell>
                      <TableCell className="py-3 text-xs">{record.employment}</TableCell>
                      <TableCell className="py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-xl"
                            onClick={() => setEditingRecord(record)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-xl text-destructive"
                            disabled={deletingId === record.id}
                            onClick={() => void handleDelete(record.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">
                      No faculty records match the current search or filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <RecordPagination
            currentPage={currentPage}
            totalPages={totalPages}
            startIndex={startIndex}
            totalItems={filteredRecords.length}
            itemLabel="faculty records"
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Update Faculty Involvement Record</DialogTitle>
            <DialogDescription className="text-[10px]">
              Edit the saved faculty registry details.
            </DialogDescription>
          </DialogHeader>
          {editingRecord ? (
            <FacultyRegistryForm
              department={department}
              designationSuggestions={designationSuggestions}
              record={editingRecord}
              onSuccess={closeEditDialogAndRefresh}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
