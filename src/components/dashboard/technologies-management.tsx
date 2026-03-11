"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";
import { Eye, Pencil, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createTechnology, deleteTechnology, updateTechnology } from "@/lib/actions/technology-ordinance";
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

const statusOptions = [
  "Commercialized",
  "Multi-Modal Deployment",
  "Pre-launch activities completed",
] as const;

const schema = z.object({
  college: z.string().min(1),
  department: z.string().min(1),
  curricular_offering: z.string().min(1, "Curricular offering is required"),
  technology_title: z.string().min(1, "Technology title is required"),
  year_develop: z.coerce
    .number()
    .int()
    .min(1000, "Year must be 4 digits")
    .max(9999, "Year must be 4 digits"),
  end_users_clientele: z
    .array(z.object({ value: z.string().min(1, "End user/clientele is required") }))
    .min(1, "Add at least one end user/clientele"),
  technology_generators: z.string().min(1, "Technology generators is required"),
  status: z.enum(statusOptions),
  remarks: z.string().optional(),
  documents: z.array(z.object({ url: z.string(), name: z.string() })).default([]),
});

type InputValues = z.input<typeof schema>;
type OutputValues = z.output<typeof schema>;

export interface TechnologyRecord {
  id: string;
  college: string;
  department: string;
  curricular_offering: string;
  technology_title: string;
  year_develop: number;
  end_users_clientele: string[] | null;
  technology_generators: string;
  status: (typeof statusOptions)[number];
  remarks: string | null;
  documents: { url: string; name: string }[] | null;
  created_by?: string | null;
}

interface TechnologiesManagementProps {
  initialRecords: TechnologyRecord[];
  department: string | null;
  userType?: "super_admin" | "college_coordinator" | "unit_coordinator";
  unit?: string | null;
  unitOptions?: string[];
  currentUserId: string;
}

function TechnologyForm({
  department,
  userType,
  unit,
  unitOptions = [],
  record,
  isViewOnly = false,
  onSuccess,
}: {
  department: string;
  userType?: "super_admin" | "college_coordinator" | "unit_coordinator";
  unit?: string | null;
  unitOptions?: string[];
  record?: TechnologyRecord | null;
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
      college: "CEIT",
      department: record?.department || department || "",
      curricular_offering: record?.curricular_offering || "",
      technology_title: record?.technology_title || "",
      year_develop: record?.year_develop || new Date().getFullYear(),
      end_users_clientele:
        record?.end_users_clientele?.length
          ? record.end_users_clientele.map((value) => ({ value }))
          : [{ value: "" }],
      technology_generators: record?.technology_generators || "",
      status: record?.status || "Commercialized",
      remarks: record?.remarks || "",
      documents: record?.documents || [],
    },
  });

  const endUsers = useFieldArray({ control: form.control, name: "end_users_clientele" });

  React.useEffect(() => {
    form.reset({
      college: "CEIT",
      department: record?.department || department || "",
      curricular_offering: record?.curricular_offering || "",
      technology_title: record?.technology_title || "",
      year_develop: record?.year_develop || new Date().getFullYear(),
      end_users_clientele:
        record?.end_users_clientele?.length
          ? record.end_users_clientele.map((value) => ({ value }))
          : [{ value: "" }],
      technology_generators: record?.technology_generators || "",
      status: record?.status || "Commercialized",
      remarks: record?.remarks || "",
      documents: record?.documents || [],
    });
  }, [department, form, record]);

  const onSubmit = async (values: OutputValues) => {
    setIsSubmitting(true);
    const payload = {
      college: "CEIT",
      department: values.department,
      curricular_offering: values.curricular_offering,
      technology_title: values.technology_title.trim(),
      year_develop: values.year_develop,
      end_users_clientele: values.end_users_clientele.map((item) => item.value.trim()),
      technology_generators: values.technology_generators.trim(),
      status: values.status,
      remarks: values.remarks?.trim() || "",
      documents: values.documents || [],
    };
    const result = record?.id
      ? await updateTechnology(record.id, payload)
      : await createTechnology(payload);
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="college"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">College</FormLabel>
                <FormControl>
                  <Input {...field} readOnly className="h-8 text-xs bg-muted/30" />
                </FormControl>
              </FormItem>
            )}
          />
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          <FormField
            control={form.control}
            name="technology_title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Technology Title</FormLabel>
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
            name="year_develop"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Year Develop</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    name={field.name}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    value={typeof field.value === "number" ? field.value : ""}
                    onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                    className="h-8 text-xs"
                    disabled={isViewOnly}
                    min={1000}
                    max={9999}
                  />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="technology_generators"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Technology Generators</FormLabel>
                <FormControl>
                  <Input {...field} className="h-8 text-xs" disabled={isViewOnly} />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <FormLabel className="text-xs">End Users / Clientele</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[10px]"
              disabled={isViewOnly}
              onClick={() => endUsers.append({ value: "" })}
            >
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
          {endUsers.fields.map((fieldItem, index) => (
            <div key={fieldItem.id} className="flex gap-2">
              <FormField
                control={form.control}
                name={`end_users_clientele.${index}.value`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input {...field} className="h-8 text-xs" disabled={isViewOnly} />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
              {endUsers.fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  disabled={isViewOnly}
                  onClick={() => endUsers.remove(index)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>

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
              {isSubmitting ? "Saving..." : record?.id ? "Update Technology" : "Create Technology"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}

export function TechnologiesManagement({
  initialRecords,
  department,
  userType,
  unit,
  unitOptions = [],
  currentUserId,
}: TechnologiesManagementProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editRecord, setEditRecord] = React.useState<TechnologyRecord | null>(null);
  const [viewRecord, setViewRecord] = React.useState<TechnologyRecord | null>(null);
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
      .channel("technologies-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "technologies_innovations" }, scheduleRefresh)
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
        item.college,
        item.department,
        item.curricular_offering,
        item.technology_title,
        String(item.year_develop),
        (item.end_users_clientele || []).join(" "),
        item.technology_generators,
        item.status,
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
    if (!window.confirm("Delete this technology record?")) return;
    setDeletingId(id);
    const result = await deleteTechnology(id);
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
              <CardTitle className="text-xs font-semibold">Technologies/Innovation Adapted</CardTitle>
              <CardDescription className="text-[10px]">Manage technologies and innovations adapted/commercialized.</CardDescription>
            </div>
            <Button size="sm" className="h-8 text-xs bg-[#159E44] hover:bg-[#128A3B] text-white" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3 w-3 mr-1" />
              Create Technology
            </Button>
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
                  <TableHead className="text-[10px] h-9 font-semibold">College</TableHead>
                  <TableHead className="text-[10px] h-9 font-semibold">Department</TableHead>
                  <TableHead className="text-[10px] h-9 font-semibold">Curricular Offering</TableHead>
                  <TableHead className="text-[10px] h-9 font-semibold">Technology Title</TableHead>
                  <TableHead className="text-[10px] h-9 font-semibold">Year</TableHead>
                  <TableHead className="text-[10px] h-9 font-semibold">End Users / Clientele</TableHead>
                  <TableHead className="text-[10px] h-9 font-semibold">Status</TableHead>
                  <TableHead className="text-[10px] h-9 font-semibold">Documents</TableHead>
                  <TableHead className="text-[10px] h-9 font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? (
                  filtered.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/10 border-border/30">
                      <TableCell className="text-[10px] py-2.5 px-3">{item.college}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">{item.department}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">{item.curricular_offering}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">{item.technology_title}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">{item.year_develop}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">{(item.end_users_clientele || []).join(", ") || "-"}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">{item.status}</TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        <DocumentPreview documents={item.documents} />
                      </TableCell>
                      <TableCell className="text-[10px] py-2.5 px-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button type="button" variant="outline" size="icon" className="h-7 w-7 border-border/50" title="View" aria-label="View" onClick={() => setViewRecord(item)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button type="button" variant="outline" size="icon" className="h-7 w-7 border-border/50" title="Update" aria-label="Update" onClick={() => setEditRecord(item)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button type="button" variant="outline" size="icon" className="h-7 w-7 border-border/50 text-destructive" title="Delete" aria-label="Delete" disabled={deletingId === item.id} onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-xs text-muted-foreground">
                      No records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">Create Technology</DialogTitle>
            <DialogDescription className="text-[10px]">Fill out the form below.</DialogDescription>
          </DialogHeader>
          <TechnologyForm department={department || ""} userType={userType} unit={unit} unitOptions={unitOptions} onSuccess={closeAndRefresh} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRecord} onOpenChange={(open) => !open && setEditRecord(null)}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">Update Technology</DialogTitle>
            <DialogDescription className="text-[10px]">Update record details.</DialogDescription>
          </DialogHeader>
          {editRecord && <TechnologyForm department={department || ""} userType={userType} unit={unit} unitOptions={unitOptions} record={editRecord} onSuccess={closeAndRefresh} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewRecord} onOpenChange={(open) => !open && setViewRecord(null)}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">View Technology</DialogTitle>
            <DialogDescription className="text-[10px]">View record details.</DialogDescription>
          </DialogHeader>
          {viewRecord && <TechnologyForm department={department || ""} userType={userType} unit={unit} unitOptions={unitOptions} record={viewRecord} isViewOnly onSuccess={() => setViewRecord(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
