"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  createStudentInvolvement,
  updateStudentInvolvement,
} from "@/lib/actions/student-involvement";
import { getUnitsByDepartment } from "@/lib/departments";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "./file-upload";

const schema = z
  .object({
    college: z.string().min(1),
    department: z.string().min(1, "Department is required"),
    curricular_offering: z.string().min(1, "Curricular offering is required"),
    total_students: z.coerce.number().int().min(1, "Total students must be at least 1"),
    involved_students: z.coerce.number().int().min(0, "Involved students cannot be negative"),
    percentage: z.coerce.number().min(0),
    remarks: z.string().optional(),
    documents: z.array(z.object({ url: z.string(), name: z.string() })).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.involved_students > data.total_students) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["involved_students"],
        message: "Involved students cannot exceed total students.",
      });
    }
  });

type StudentInvolvementInput = z.input<typeof schema>;
type StudentInvolvementOutput = z.output<typeof schema>;

interface StudentInvolvementRecord {
  id: string;
  college: string;
  department: string;
  curricular_offering: string;
  total_students: number;
  involved_students: number;
  percentage: number;
  remarks: string | null;
  documents: { url: string; name: string }[] | null;
}

interface StudentInvolvementFormProps {
  department: string;
  userType?: "super_admin" | "college_coordinator" | "unit_coordinator";
  unit?: string | null;
  unitOptions?: string[];
  record?: StudentInvolvementRecord;
  isViewOnly?: boolean;
  onSuccess?: () => void;
}

export function StudentInvolvementForm({
  department,
  userType,
  unit,
  unitOptions = [],
  record,
  isViewOnly = false,
  onSuccess,
}: StudentInvolvementFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const curricularOptions = React.useMemo(() => {
    if (userType === "college_coordinator") return unitOptions;
    if (userType === "unit_coordinator" && department) {
      const fromDepartment = getUnitsByDepartment(department);
      if (fromDepartment.length > 0) return fromDepartment;
      return unit ? [unit] : [];
    }
    return [];
  }, [department, unit, unitOptions, userType]);

  const form = useForm<StudentInvolvementInput, unknown, StudentInvolvementOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      college: "CEIT",
      department: department || "",
      curricular_offering: record?.curricular_offering || "",
      total_students: record?.total_students ?? 0,
      involved_students: record?.involved_students ?? 0,
      percentage: record?.percentage ?? 0,
      remarks: record?.remarks || "",
      documents: record?.documents || [],
    },
  });

  React.useEffect(() => {
    form.reset({
      college: "CEIT",
      department: department || "",
      curricular_offering: record?.curricular_offering || "",
      total_students: record?.total_students ?? 0,
      involved_students: record?.involved_students ?? 0,
      percentage: record?.percentage ?? 0,
      remarks: record?.remarks || "",
      documents: record?.documents || [],
    });
  }, [department, form, record]);

  const totalStudents = form.watch("total_students");
  const involvedStudents = form.watch("involved_students");

  React.useEffect(() => {
    const a = Number(totalStudents) || 0;
    const b = Number(involvedStudents) || 0;
    const pct = a > 0 ? Number(((b / a) * 100).toFixed(2)) : 0;
    form.setValue("percentage", pct, { shouldValidate: true, shouldDirty: true });
  }, [totalStudents, involvedStudents, form]);

  const onSubmit = async (values: StudentInvolvementOutput) => {
    setIsSubmitting(true);
    try {
      const payload = {
        college: "CEIT",
        department: values.department,
        curricular_offering: values.curricular_offering,
        total_students: values.total_students,
        involved_students: values.involved_students,
        percentage: values.percentage,
        remarks: values.remarks?.trim() || "",
        documents: values.documents || [],
      };

      const result = record?.id
        ? await updateStudentInvolvement(record.id, payload)
        : await createStudentInvolvement(payload);

      if (result.error) {
        alert(`Error: ${result.error}`);
        return;
      }

      onSuccess?.();
    } catch {
      alert("Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
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
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Department</FormLabel>
                <FormControl>
                  <Input {...field} readOnly className="h-8 text-xs bg-muted/30" />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="curricular_offering"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Curricular Offering</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FormField
            control={form.control}
            name="total_students"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">
                  Total Number of Students for the period (a)
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    name={field.name}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    value={typeof field.value === "number" ? field.value : ""}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      field.onChange(nextValue === "" ? "" : Number(nextValue));
                    }}
                    className="h-8 text-xs"
                    disabled={isViewOnly}
                    min={1}
                  />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="involved_students"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">
                  Students involved in extension activities (b)
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    name={field.name}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    value={typeof field.value === "number" ? field.value : ""}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      field.onChange(nextValue === "" ? "" : Number(nextValue));
                    }}
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
            name="percentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">
                  Percentage ((b / a) x 100)
                </FormLabel>
                <FormControl>
                  <Input
                    name={field.name}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    readOnly
                    className="h-8 text-xs bg-muted/30"
                    value={`${Number(field.value || 0).toFixed(2)}%`}
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
                  className="min-h-[80px] text-xs resize-none"
                  placeholder="Additional remarks"
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
            <Button
              type="submit"
              className="h-8 text-xs bg-[#159E44] hover:bg-[#128A3B] text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : record?.id ? "Update Student Involvement" : "Create Student Involvement"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
