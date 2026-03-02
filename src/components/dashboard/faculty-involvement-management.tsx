"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";
import { Eye, Pencil, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  createFacultyInvolvement,
  createPoolExpert,
  deleteFacultyInvolvement,
  deletePoolExpert,
  updateFacultyInvolvement,
  updatePoolExpert,
} from "@/lib/actions/faculty-involvement";
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
import { Checkbox } from "@/components/ui/checkbox";
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

const rankOptions = [
  "Associate Professor II",
  "Associate Professor I",
  "Assistant Professor III",
  "Assistant Professor II",
  "Instructor III",
  "Instructor II",
  "Administrative Aide III",
  "Administrative Aide II",
] as const;

const employmentOptions = ["permanent", "COS", "JO"] as const;
const sexOptions = ["male", "female"] as const;

export interface FacultyInvolvementRecord {
  id: string;
  department: string;
  faculty_name: string;
  sex: "male" | "female";
  rank: string;
  employment_status: "permanent" | "COS" | "JO";
  avg_hours_per_week: number;
  total_hours_period: number;
  remarks: string | null;
  documents: { url: string; name: string }[] | null;
  created_by?: string | null;
}

export interface PoolExpertRecord {
  id: string;
  department: string;
  faculty_name: string;
  sex: "male" | "female";
  rank: string;
  employment_status: "permanent" | "COS" | "JO";
  educational_qualifications: string[] | null;
  specialization: string[] | null;
  other_expertise: string | null;
  remarks: string | null;
  documents: { url: string; name: string }[] | null;
  created_by?: string | null;
}

interface FacultyInvolvementManagementProps {
  department: string | null;
  facultyRecords: FacultyInvolvementRecord[];
  poolRecords: PoolExpertRecord[];
  currentUserId: string;
}

const facultySchema = z.object({
  faculty_name: z.string().min(1, "Name of faculty is required"),
  sex: z.enum(sexOptions, { message: "Sex is required" }),
  rank: z.string().min(1, "Rank is required"),
  employment_status: z.enum(employmentOptions, { message: "Employment status is required" }),
  avg_hours_per_week: z.coerce.number().min(0, "Must be 0 or greater"),
  total_hours_period: z.coerce.number().min(0, "Must be 0 or greater"),
  remarks: z.string().optional(),
  documents: z.array(z.object({ url: z.string(), name: z.string() })).default([]),
});

const poolSchema = z.object({
  faculty_name: z.string().min(1, "Name of faculty/staff is required"),
  sex: z.enum(sexOptions, { message: "Sex is required" }),
  rank: z.string().min(1, "Rank is required"),
  employment_status: z.enum(employmentOptions, { message: "Employment status is required" }),
  educational_qualifications: z
    .array(z.object({ value: z.string().min(1, "Educational qualification is required") }))
    .min(1, "Add at least one educational qualification"),
  specialization: z
    .array(z.object({ value: z.string().min(1, "Specialization is required") }))
    .min(1, "Add at least one specialization"),
  other_expertise: z.string().optional(),
  remarks: z.string().optional(),
  documents: z.array(z.object({ url: z.string(), name: z.string() })).default([]),
});

type FacultyInput = z.input<typeof facultySchema>;
type FacultyOutput = z.output<typeof facultySchema>;
type PoolInput = z.input<typeof poolSchema>;
type PoolOutput = z.output<typeof poolSchema>;

function FacultyForm({
  record,
  isViewOnly = false,
  onSuccess,
}: {
  record?: FacultyInvolvementRecord | null;
  isViewOnly?: boolean;
  onSuccess: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const form = useForm<FacultyInput, unknown, FacultyOutput>({
    resolver: zodResolver(facultySchema),
    defaultValues: {
      faculty_name: record?.faculty_name || "",
      sex: record?.sex || "male",
      rank: record?.rank || "",
      employment_status: record?.employment_status || "permanent",
      avg_hours_per_week: record?.avg_hours_per_week ?? 0,
      total_hours_period: record?.total_hours_period ?? 0,
      remarks: record?.remarks || "",
      documents: record?.documents || [],
    },
  });

  React.useEffect(() => {
    form.reset({
      faculty_name: record?.faculty_name || "",
      sex: record?.sex || "male",
      rank: record?.rank || "",
      employment_status: record?.employment_status || "permanent",
      avg_hours_per_week: record?.avg_hours_per_week ?? 0,
      total_hours_period: record?.total_hours_period ?? 0,
      remarks: record?.remarks || "",
      documents: record?.documents || [],
    });
  }, [record, form]);

  const onSubmit = async (values: FacultyOutput) => {
    setIsSubmitting(true);
    const payload = {
      ...values,
      remarks: values.remarks?.trim() || "",
      documents: values.documents || [],
    };
    const result = record?.id
      ? await updateFacultyInvolvement(record.id, payload)
      : await createFacultyInvolvement(payload);
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
          name="faculty_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Name of Faculty (Last, First, MI)</FormLabel>
              <FormControl>
                <Input {...field} className="h-8 text-xs" disabled={isViewOnly} />
              </FormControl>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FormField
            control={form.control}
            name="sex"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Sex</FormLabel>
                <div className="flex items-center gap-4 h-8">
                  {sexOptions.map((option) => (
                    <label key={option} className="flex items-center gap-1.5">
                      <Checkbox
                        checked={field.value === option}
                        disabled={isViewOnly}
                        onCheckedChange={(checked) => {
                          if (checked) field.onChange(option);
                        }}
                      />
                      <span className="text-[10px] capitalize">{option}</span>
                    </label>
                  ))}
                </div>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rank"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Academic / Non-Academic Rank</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-xs" disabled={isViewOnly}>
                      <SelectValue placeholder="Select rank" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {rankOptions.map((option) => (
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
            name="employment_status"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Employment Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-xs" disabled={isViewOnly}>
                      <SelectValue placeholder="Select status" />
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
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="avg_hours_per_week"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Average number of hours engaged (per week)</FormLabel>
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
                    min={0}
                  />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="total_hours_period"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Total hours engaged for period/quarter</FormLabel>
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
                    min={0}
                  />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
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
              {isSubmitting ? "Saving..." : record?.id ? "Update Faculty Involvement" : "Create Faculty Involvement"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
function PoolForm({
  facultyRecords,
  record,
  isViewOnly = false,
  onSuccess,
}: {
  facultyRecords: FacultyInvolvementRecord[];
  record?: PoolExpertRecord | null;
  isViewOnly?: boolean;
  onSuccess: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const employeeOptions = React.useMemo(
    () =>
      facultyRecords.map((item) => ({
        name: item.faculty_name,
        sex: item.sex,
        rank: item.rank,
        employment_status: item.employment_status,
      })),
    [facultyRecords]
  );

  const form = useForm<PoolInput, unknown, PoolOutput>({
    resolver: zodResolver(poolSchema),
    defaultValues: {
      faculty_name: record?.faculty_name || "",
      sex: record?.sex || "male",
      rank: record?.rank || "",
      employment_status: record?.employment_status || "permanent",
      educational_qualifications:
        record?.educational_qualifications?.length
          ? record.educational_qualifications.map((value) => ({ value }))
          : [{ value: "" }],
      specialization:
        record?.specialization?.length
          ? record.specialization.map((value) => ({ value }))
          : [{ value: "" }],
      other_expertise: record?.other_expertise || "",
      remarks: record?.remarks || "",
      documents: record?.documents || [],
    },
  });

  const eduArray = useFieldArray({ control: form.control, name: "educational_qualifications" });
  const specArray = useFieldArray({ control: form.control, name: "specialization" });

  React.useEffect(() => {
    form.reset({
      faculty_name: record?.faculty_name || "",
      sex: record?.sex || "male",
      rank: record?.rank || "",
      employment_status: record?.employment_status || "permanent",
      educational_qualifications:
        record?.educational_qualifications?.length
          ? record.educational_qualifications.map((value) => ({ value }))
          : [{ value: "" }],
      specialization:
        record?.specialization?.length
          ? record.specialization.map((value) => ({ value }))
          : [{ value: "" }],
      other_expertise: record?.other_expertise || "",
      remarks: record?.remarks || "",
      documents: record?.documents || [],
    });
  }, [record, form]);

  const selectedName = form.watch("faculty_name");
  React.useEffect(() => {
    if (!selectedName) return;
    const selected = employeeOptions.find((x) => x.name === selectedName);
    if (!selected) return;
    form.setValue("sex", selected.sex);
    form.setValue("rank", selected.rank);
    form.setValue("employment_status", selected.employment_status);
  }, [selectedName, employeeOptions, form]);

  const onSubmit = async (values: PoolOutput) => {
    setIsSubmitting(true);
    const payload = {
      faculty_name: values.faculty_name,
      sex: values.sex,
      rank: values.rank,
      employment_status: values.employment_status,
      educational_qualifications: values.educational_qualifications.map((x) => x.value),
      specialization: values.specialization.map((x) => x.value),
      other_expertise: values.other_expertise?.trim() || "",
      remarks: values.remarks?.trim() || "",
      documents: values.documents || [],
    };
    const result = record?.id ? await updatePoolExpert(record.id, payload) : await createPoolExpert(payload);
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
          name="faculty_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Name of Faculty/Staff</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-8 text-xs" disabled={isViewOnly}>
                    <SelectValue placeholder="Select existing employee name" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {employeeOptions.map((option) => (
                    <SelectItem key={option.name} value={option.name} className="text-xs">
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FormField
            control={form.control}
            name="sex"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Sex</FormLabel>
                <div className="flex items-center gap-4 h-8">
                  {sexOptions.map((option) => (
                    <label key={option} className="flex items-center gap-1.5">
                      <Checkbox checked={field.value === option} disabled />
                      <span className="text-[10px] capitalize">{option}</span>
                    </label>
                  ))}
                </div>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rank"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Academic / Non-Academic Rank</FormLabel>
                <FormControl>
                  <Input {...field} readOnly className="h-8 text-xs bg-muted/30" />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="employment_status"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Employment Status</FormLabel>
                <FormControl>
                  <Input {...field} readOnly className="h-8 text-xs bg-muted/30" />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <FormLabel className="text-xs">Educational Qualifications</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[10px]"
              disabled={isViewOnly}
              onClick={() => eduArray.append({ value: "" })}
            >
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
          {eduArray.fields.map((item, index) => (
            <div key={item.id} className="flex gap-2">
              <FormField
                control={form.control}
                name={`educational_qualifications.${index}.value`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input {...field} className="h-8 text-xs" disabled={isViewOnly} />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
              {eduArray.fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  disabled={isViewOnly}
                  onClick={() => eduArray.remove(index)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <FormLabel className="text-xs">Specialization</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[10px]"
              disabled={isViewOnly}
              onClick={() => specArray.append({ value: "" })}
            >
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
          {specArray.fields.map((item, index) => (
            <div key={item.id} className="flex gap-2">
              <FormField
                control={form.control}
                name={`specialization.${index}.value`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input {...field} className="h-8 text-xs" disabled={isViewOnly} />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
              {specArray.fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  disabled={isViewOnly}
                  onClick={() => specArray.remove(index)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <FormField
          control={form.control}
          name="other_expertise"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Other fields of expertise</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} className="h-8 text-xs" disabled={isViewOnly} />
              </FormControl>
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
              {isSubmitting ? "Saving..." : record?.id ? "Update Pool Expert" : "Create Pool Expert"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
export function FacultyInvolvementManagement({
  department,
  facultyRecords,
  poolRecords,
  currentUserId,
}: FacultyInvolvementManagementProps) {
  const [activeTab, setActiveTab] = React.useState<"faculty" | "pool">("faculty");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedScopes, setSelectedScopes] = React.useState<string[]>([
    "created_by_me",
    "department_files",
  ]);

  const [createFacultyOpen, setCreateFacultyOpen] = React.useState(false);
  const [editFaculty, setEditFaculty] = React.useState<FacultyInvolvementRecord | null>(null);
  const [viewFaculty, setViewFaculty] = React.useState<FacultyInvolvementRecord | null>(null);
  const [deletingFacultyId, setDeletingFacultyId] = React.useState<string | null>(null);

  const [createPoolOpen, setCreatePoolOpen] = React.useState(false);
  const [editPool, setEditPool] = React.useState<PoolExpertRecord | null>(null);
  const [viewPool, setViewPool] = React.useState<PoolExpertRecord | null>(null);
  const [deletingPoolId, setDeletingPoolId] = React.useState<string | null>(null);

  const router = useRouter();
  const refreshTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const supabase = createClient();
    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = setTimeout(() => router.refresh(), 500);
    };

    const channel = supabase
      .channel("faculty-module-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "faculty_involvement" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "pool_of_experts" }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [router]);

  const filteredFaculty = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const scopedRecords = facultyRecords.filter((item) => {
      const isMine = item.created_by === currentUserId;
      return (
        (selectedScopes.includes("created_by_me") && isMine) ||
        (selectedScopes.includes("department_files") && !isMine)
      );
    });
    if (!term) return scopedRecords;
    return scopedRecords.filter((item) =>
      [
        item.faculty_name,
        item.sex,
        item.rank,
        item.employment_status,
        String(item.avg_hours_per_week),
        String(item.total_hours_period),
        item.remarks || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [currentUserId, facultyRecords, searchTerm, selectedScopes]);

  const filteredPool = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const scopedRecords = poolRecords.filter((item) => {
      const isMine = item.created_by === currentUserId;
      return (
        (selectedScopes.includes("created_by_me") && isMine) ||
        (selectedScopes.includes("department_files") && !isMine)
      );
    });
    if (!term) return scopedRecords;
    return scopedRecords.filter((item) =>
      [
        item.faculty_name,
        item.sex,
        item.rank,
        item.employment_status,
        (item.educational_qualifications || []).join(" "),
        (item.specialization || []).join(" "),
        item.other_expertise || "",
        item.remarks || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [currentUserId, poolRecords, searchTerm, selectedScopes]);

  const toggleScopeFilter = (value: string) => {
    setSelectedScopes((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const closeDialogsAndRefresh = () => {
    setCreateFacultyOpen(false);
    setEditFaculty(null);
    setCreatePoolOpen(false);
    setEditPool(null);
    router.refresh();
  };

  const handleDeleteFaculty = async (id: string) => {
    if (!window.confirm("Delete this faculty involvement record?")) return;
    setDeletingFacultyId(id);
    const result = await deleteFacultyInvolvement(id);
    setDeletingFacultyId(null);
    if (result.error) return alert(`Error: ${result.error}`);
    router.refresh();
  };

  const handleDeletePool = async (id: string) => {
    if (!window.confirm("Delete this pool expert record?")) return;
    setDeletingPoolId(id);
    const result = await deletePoolExpert(id);
    setDeletingPoolId(null);
    if (result.error) return alert(`Error: ${result.error}`);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-xs font-semibold">Faculty Involvement in ESCE</CardTitle>
              <CardDescription className="text-[10px]">Manage faculty involvement and pool of experts.</CardDescription>
            </div>
            <Button
              size="sm"
              className="h-8 text-xs bg-[#159E44] hover:bg-[#128A3B] text-white"
              onClick={() => (activeTab === "faculty" ? setCreateFacultyOpen(true) : setCreatePoolOpen(true))}
            >
              <Plus className="h-3 w-3 mr-1" />
              {activeTab === "faculty" ? "Create Faculty Involvement" : "Create Pool Expert"}
            </Button>
          </div>

          <div className="inline-flex rounded-md border border-border/60 p-0.5 bg-muted/20">
            <Button
              size="sm"
              onClick={() => {
                setActiveTab("faculty");
                setSearchTerm("");
              }}
              className={`h-7 text-[10px] px-2.5 ${activeTab === "faculty" ? "bg-[#159E44] hover:bg-[#128A3B] text-white" : "bg-transparent text-foreground hover:bg-muted"}`}
            >
              Faculty Involvement
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setActiveTab("pool");
                setSearchTerm("");
              }}
              className={`h-7 text-[10px] px-2.5 ${activeTab === "pool" ? "bg-[#159E44] hover:bg-[#128A3B] text-white" : "bg-transparent text-foreground hover:bg-muted"}`}
            >
              Pool of Experts
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-8 h-8 text-xs placeholder:text-[10px] bg-muted/20 border-border/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
          {activeTab === "faculty" ? (
            <div className="rounded-md border border-border/50 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="text-[10px] h-9 font-semibold">Name</TableHead>
                    <TableHead className="text-[10px] h-9 font-semibold">Sex</TableHead>
                    <TableHead className="text-[10px] h-9 font-semibold">Rank</TableHead>
                    <TableHead className="text-[10px] h-9 font-semibold">Employment</TableHead>
                    <TableHead className="text-[10px] h-9 font-semibold">Avg Hrs/Week</TableHead>
                    <TableHead className="text-[10px] h-9 font-semibold">Total Hrs/Period</TableHead>
                    <TableHead className="text-[10px] h-9 font-semibold">Remarks</TableHead>
                    <TableHead className="text-[10px] h-9 font-semibold">Documents</TableHead>
                    <TableHead className="text-[10px] h-9 font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFaculty.length > 0 ? (
                    filteredFaculty.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/10 border-border/30">
                        <TableCell className="text-[10px] py-2.5 px-3">{item.faculty_name}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3 capitalize">{item.sex}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{item.rank}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{item.employment_status}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{item.avg_hours_per_week}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{item.total_hours_period}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{item.remarks || "-"}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">
                          {item.documents?.length ? (
                            <div className="max-w-[220px] space-y-1">
                              {item.documents.map((doc) => (
                                <p key={`${item.id}-${doc.url}`} className="truncate" title={doc.name}>
                                  {doc.name}
                                </p>
                              ))}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button type="button" variant="outline" size="icon" className="h-7 w-7 border-border/50" title="View" aria-label="View" onClick={() => setViewFaculty(item)}>
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button type="button" variant="outline" size="icon" className="h-7 w-7 border-border/50" title="Update" aria-label="Update" onClick={() => setEditFaculty(item)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button type="button" variant="outline" size="icon" className="h-7 w-7 border-border/50 text-destructive" title="Delete" aria-label="Delete" disabled={deletingFacultyId === item.id} onClick={() => handleDeleteFaculty(item.id)}>
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
          ) : (
            <div className="rounded-md border border-border/50 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="text-[10px] h-9 font-semibold">Name</TableHead>
                    <TableHead className="text-[10px] h-9 font-semibold">Sex</TableHead>
                    <TableHead className="text-[10px] h-9 font-semibold">Rank</TableHead>
                    <TableHead className="text-[10px] h-9 font-semibold">Employment</TableHead>
                    <TableHead className="text-[10px] h-9 font-semibold">Educational Qualifications</TableHead>
                    <TableHead className="text-[10px] h-9 font-semibold">Specialization</TableHead>
                    <TableHead className="text-[10px] h-9 font-semibold">Other Expertise</TableHead>
                    <TableHead className="text-[10px] h-9 font-semibold">Documents</TableHead>
                    <TableHead className="text-[10px] h-9 font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPool.length > 0 ? (
                    filteredPool.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/10 border-border/30">
                        <TableCell className="text-[10px] py-2.5 px-3">{item.faculty_name}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3 capitalize">{item.sex}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{item.rank}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{item.employment_status}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{(item.educational_qualifications || []).join(", ") || "-"}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{(item.specialization || []).join(", ") || "-"}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">{item.other_expertise || "-"}</TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">
                          {item.documents?.length ? (
                            <div className="max-w-[220px] space-y-1">
                              {item.documents.map((doc) => (
                                <p key={`${item.id}-${doc.url}`} className="truncate" title={doc.name}>
                                  {doc.name}
                                </p>
                              ))}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-[10px] py-2.5 px-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button type="button" variant="outline" size="icon" className="h-7 w-7 border-border/50" title="View" aria-label="View" onClick={() => setViewPool(item)}>
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button type="button" variant="outline" size="icon" className="h-7 w-7 border-border/50" title="Update" aria-label="Update" onClick={() => setEditPool(item)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button type="button" variant="outline" size="icon" className="h-7 w-7 border-border/50 text-destructive" title="Delete" aria-label="Delete" disabled={deletingPoolId === item.id} onClick={() => handleDeletePool(item.id)}>
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
          )}
        </CardContent>
      </Card>

      <Dialog open={createFacultyOpen} onOpenChange={setCreateFacultyOpen}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">Create Faculty Involvement</DialogTitle>
            <DialogDescription className="text-[10px]">Fill out the form below.</DialogDescription>
          </DialogHeader>
          <FacultyForm onSuccess={closeDialogsAndRefresh} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editFaculty} onOpenChange={(open) => !open && setEditFaculty(null)}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">Update Faculty Involvement</DialogTitle>
            <DialogDescription className="text-[10px]">Update record details.</DialogDescription>
          </DialogHeader>
          {editFaculty && <FacultyForm record={editFaculty} onSuccess={closeDialogsAndRefresh} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewFaculty} onOpenChange={(open) => !open && setViewFaculty(null)}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">View Faculty Involvement</DialogTitle>
            <DialogDescription className="text-[10px]">View record details.</DialogDescription>
          </DialogHeader>
          {viewFaculty && <FacultyForm record={viewFaculty} isViewOnly onSuccess={() => setViewFaculty(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={createPoolOpen} onOpenChange={setCreatePoolOpen}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">Create Pool Expert</DialogTitle>
            <DialogDescription className="text-[10px]">Fill out the form below.</DialogDescription>
          </DialogHeader>
          <PoolForm facultyRecords={facultyRecords} onSuccess={closeDialogsAndRefresh} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editPool} onOpenChange={(open) => !open && setEditPool(null)}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">Update Pool Expert</DialogTitle>
            <DialogDescription className="text-[10px]">Update record details.</DialogDescription>
          </DialogHeader>
          {editPool && <PoolForm facultyRecords={facultyRecords} record={editPool} onSuccess={closeDialogsAndRefresh} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewPool} onOpenChange={(open) => !open && setViewPool(null)}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">View Pool Expert</DialogTitle>
            <DialogDescription className="text-[10px]">View record details.</DialogDescription>
          </DialogHeader>
          {viewPool && <PoolForm facultyRecords={facultyRecords} record={viewPool} isViewOnly onSuccess={() => setViewPool(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
