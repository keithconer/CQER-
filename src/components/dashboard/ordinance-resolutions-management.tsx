"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Eye, Pencil, Plus, Search, SlidersHorizontal, Trash2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createOrdinance, deleteOrdinance, updateOrdinance } from "@/lib/actions/technology-ordinance";
import { DEPARTMENTS, getAllUnits, getUnitsByDepartment } from "@/lib/departments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileUpload } from "./file-upload";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DocumentPreview } from "./document-preview";

const statusOptions = ["Submitted/Endorse", "approved"] as const;

const schema = z
  .object({
    department: z.string().min(1),
    curricular_offering: z.string().min(1, "Curricular offering is required"),
    extension_project_activity: z.string().min(1, "Extension project/project/activity is required"),
    ordinance_resolution: z.string().min(1, "Ordinance or resolution is required"),
    status: z.enum(statusOptions),
    date_approved: z.date().optional(),
    remarks: z.string().optional(),
    documents: z.array(z.object({ url: z.string(), name: z.string() })).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.status === "approved" && !data.date_approved) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["date_approved"],
        message: "Date approved is required when status is approved.",
      });
    }
  });

type InputValues = z.input<typeof schema>;
type OutputValues = z.output<typeof schema>;

export interface OrdinanceRecord {
  id: string;
  department: string;
  curricular_offering: string;
  extension_project_activity: string;
  ordinance_resolution: string;
  status: (typeof statusOptions)[number];
  date_approved: string | null;
  remarks: string | null;
  documents: { url: string; name: string }[] | null;
  created_by?: string | null;
}

interface OrdinanceResolutionsManagementProps {
  initialRecords: OrdinanceRecord[];
  department: string | null;
  userType?: "super_admin" | "college_coordinator" | "unit_coordinator" | "extension_office" | "project_leader";
  unit?: string | null;
  unitOptions?: string[];
  currentUserId: string;
  isViewOnly?: boolean;
}

function OrdinanceForm({
  department,
  userType,
  unit,
  unitOptions = [],
  record,
  isViewOnly = false,
  onSuccess,
}: {
  department: string;
  userType?: "super_admin" | "college_coordinator" | "unit_coordinator" | "extension_office" | "project_leader";
  unit?: string | null;
  unitOptions?: string[];
  record?: OrdinanceRecord | null;
  isViewOnly?: boolean;
  onSuccess: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const curricularOptions = React.useMemo(() => {
    if (userType === "super_admin" || userType === "college_coordinator") {
      if (userType === "super_admin") return getAllUnits();
      return unitOptions;
    }
    if (userType === "unit_coordinator" && department) {
      const options = getUnitsByDepartment(department);
      if (options.length > 0) return options;
      return unit ? [unit] : [];
    }
    return [];
  }, [department, unit, unitOptions, userType]);

  const form = useForm<InputValues, unknown, OutputValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      department: record?.department || department || "",
      curricular_offering: record?.curricular_offering || "",
      extension_project_activity: record?.extension_project_activity || "",
      ordinance_resolution: record?.ordinance_resolution || "",
      status: record?.status || "Submitted/Endorse",
      date_approved: record?.date_approved ? new Date(record.date_approved) : undefined,
      remarks: record?.remarks || "",
      documents: record?.documents || [],
    },
  });

  React.useEffect(() => {
    form.reset({
      department: record?.department || department || "",
      curricular_offering: record?.curricular_offering || "",
      extension_project_activity: record?.extension_project_activity || "",
      ordinance_resolution: record?.ordinance_resolution || "",
      status: record?.status || "Submitted/Endorse",
      date_approved: record?.date_approved ? new Date(record.date_approved) : undefined,
      remarks: record?.remarks || "",
      documents: record?.documents || [],
    });
  }, [department, form, record]);

  const selectedStatus = form.watch("status");

  const onSubmit = async (values: OutputValues) => {
    setIsSubmitting(true);
    const payload = {
      department: values.department,
      curricular_offering: values.curricular_offering,
      extension_project_activity: values.extension_project_activity.trim(),
      ordinance_resolution: values.ordinance_resolution.trim(),
      status: values.status,
      date_approved:
        values.status === "approved" && values.date_approved
          ? values.date_approved.toISOString().slice(0, 10)
          : null,
      remarks: values.remarks?.trim() || "",
      documents: values.documents || [],
    };
    const result = record?.id
      ? await updateOrdinance(record.id, payload)
      : await createOrdinance(payload);
    setIsSubmitting(false);
    if (result.error) {
      alert(`Error: ${result.error}`);
      return;
    }
    onSuccess();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="department"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Department</FormLabel>
              {userType === "super_admin" ? (
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-xs" disabled={isViewOnly}>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept} className="text-xs">
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <FormControl>
                  <Input {...field} readOnly className="h-8 text-xs bg-muted/30" />
                </FormControl>
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="curricular_offering"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Curricular Offering</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-8 text-xs" disabled={isViewOnly}>
                    <SelectValue placeholder="Select curricular offering" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {curricularOptions.map((option) => (
                    <SelectItem key={option} value={option} className="text-xs">
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="extension_project_activity"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Extension Project / Project / Activity</FormLabel>
                <FormControl>
                  <Input {...field} className="h-8 text-xs" disabled={isViewOnly} />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ordinance_resolution"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Ordinance or Resolution</FormLabel>
                <FormControl>
                  <Input {...field} className="h-8 text-xs" disabled={isViewOnly} />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-xs" disabled={isViewOnly}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option} value={option} className="text-xs">
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
          {selectedStatus === "approved" && (
            <FormField
              control={form.control}
              name="date_approved"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-xs">Date Approved</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild disabled={isViewOnly}>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "h-8 text-xs justify-start font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "PPP") : "Pick a date"}
                          <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          control={form.control}
          name="remarks"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Remarks</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value || ""}
                  className="min-h-[70px] text-xs resize-none"
                  disabled={isViewOnly}
                />
              </FormControl>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="documents"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Upload documents</FormLabel>
              <FormControl>
                <FileUpload
                  value={field.value || []}
                  onChange={field.onChange}
                  disabled={isSubmitting || isViewOnly}
                  maxFiles={10}
                />
              </FormControl>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />

        {!isViewOnly && (
          <div className="flex justify-end">
            <Button type="submit" className="h-8 text-xs bg-[#159E44] hover:bg-[#128A3B]" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : record?.id ? "Update Ordinance/Resolution" : "Create Ordinance/Resolution"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}

export function OrdinanceResolutionsManagement({
  initialRecords,
  department,
  userType,
  unit,
  unitOptions = [],
  currentUserId,
  isViewOnly = false,
}: OrdinanceResolutionsManagementProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editRecord, setEditRecord] = React.useState<OrdinanceRecord | null>(null);
  const [viewRecord, setViewRecord] = React.useState<OrdinanceRecord | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [selectedScopes, setSelectedScopes] = React.useState<string[]>([
    "created_by_me",
    "department_files",
  ]);
  const refreshTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  React.useEffect(() => {
    const supabase = createClient();
    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = setTimeout(() => router.refresh(), 500);
    };

    const channel = supabase
      .channel("ordinance-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "ordinance_resolutions" }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [router]);

  const filtered = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const scopedRecords = initialRecords.filter((item) => {
      const isMine = item.created_by === currentUserId;
      return (
        (selectedScopes.includes("created_by_me") && isMine) ||
        (selectedScopes.includes("department_files") && !isMine)
      );
    });
    if (!term) return scopedRecords;
    return scopedRecords.filter((item) =>
      [
        item.department,
        item.curricular_offering,
        item.extension_project_activity,
        item.ordinance_resolution,
        item.status,
        item.date_approved || "",
        item.remarks || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [currentUserId, initialRecords, searchTerm, selectedScopes]);

  const toggleScopeFilter = (value: string) => {
    setSelectedScopes((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const closeAndRefresh = () => {
    setCreateOpen(false);
    setEditRecord(null);
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this ordinance/resolution record?")) return;
    setDeletingId(id);
    const result = await deleteOrdinance(id);
    setDeletingId(null);
    if (result.error) return alert(`Error: ${result.error}`);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-xs font-semibold">Ordinance or Resolutions</CardTitle>
              <CardDescription className="text-[10px]">Manage ordinance/resolution records.</CardDescription>
            </div>
            {!isViewOnly && (
              <Button size="sm" className="h-8 text-xs bg-[#159E44] hover:bg-[#128A3B] text-white" onClick={() => setCreateOpen(true)}>
                <Plus className="h-3 w-3 mr-1" />
                Create Ordinance/Resolution
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-8 h-8 text-xs placeholder:text-[10px] bg-muted/20 border-border/50" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[10px] border-border/50 bg-muted/20"
                >
                  <SlidersHorizontal className="h-3 w-3 mr-1" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-[10px]">Results Filter</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  className="text-[10px]"
                  checked={selectedScopes.includes("created_by_me")}
                  onCheckedChange={() => toggleScopeFilter("created_by_me")}
                >
                  Created by me
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  className="text-[10px]"
                  checked={selectedScopes.includes("department_files")}
                  onCheckedChange={() => toggleScopeFilter("department_files")}
                >
                  All files from the department
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="text-[10px] h-9 font-semibold">Department</TableHead>
                  <TableHead className="text-[10px] h-9 font-semibold">Curricular Offering</TableHead>
                  <TableHead className="text-[10px] h-9 font-semibold">Extension Project / Project / Activity</TableHead>
                  <TableHead className="text-[10px] h-9 font-semibold">Ordinance/Resolution</TableHead>
                  <TableHead className="text-[10px] h-9 font-semibold">Status</TableHead>
                  <TableHead className="text-[10px] h-9 font-semibold">Date Approved</TableHead>
                  <TableHead className="text-[10px] h-9 font-semibold">Documents</TableHead>
                  <TableHead className="text-[10px] h-9 font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? (
                  filtered.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/10 border-border/30">
                      <TableCell className="text-[10px] py-2.5 px-3">{item.department}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">{item.curricular_offering}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">{item.extension_project_activity}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">{item.ordinance_resolution}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">{item.status}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        {item.date_approved ? format(new Date(item.date_approved), "MMM d, yyyy") : "-"}
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        <DocumentPreview documents={item.documents} />
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button type="button" variant="outline" size="icon" className="h-7 w-7 border-border/50" title="View" aria-label="View" onClick={() => setViewRecord(item)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                          {!isViewOnly && (
                            <>
                              <Button type="button" variant="outline" size="icon" className="h-7 w-7 border-border/50" title="Update" aria-label="Update" onClick={() => setEditRecord(item)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button type="button" variant="outline" size="icon" className="h-7 w-7 border-border/50 text-destructive" title="Delete" aria-label="Delete" disabled={deletingId === item.id} onClick={() => handleDelete(item.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-xs text-muted-foreground">
                      No records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {!isViewOnly && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto p-6">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-sm font-semibold">Create Ordinance/Resolution</DialogTitle>
              <DialogDescription className="text-[10px]">Fill out the form below.</DialogDescription>
            </DialogHeader>
            <OrdinanceForm department={department || ""} userType={userType} unit={unit} unitOptions={unitOptions} onSuccess={closeAndRefresh} />
          </DialogContent>
        </Dialog>
      )}

      {!isViewOnly && (
        <Dialog open={!!editRecord} onOpenChange={(open) => !open && setEditRecord(null)}>
          <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto p-6">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-sm font-semibold">Update Ordinance/Resolution</DialogTitle>
              <DialogDescription className="text-[10px]">Update record details.</DialogDescription>
            </DialogHeader>
            {editRecord && <OrdinanceForm department={department || ""} userType={userType} unit={unit} unitOptions={unitOptions} record={editRecord} onSuccess={closeAndRefresh} />}
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={!!viewRecord} onOpenChange={(open) => !open && setViewRecord(null)}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">View Ordinance/Resolution</DialogTitle>
            <DialogDescription className="text-[10px]">View record details.</DialogDescription>
          </DialogHeader>
          {viewRecord && <OrdinanceForm department={department || ""} userType={userType} unit={unit} unitOptions={unitOptions} record={viewRecord} isViewOnly onSuccess={() => setViewRecord(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
