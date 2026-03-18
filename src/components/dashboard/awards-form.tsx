"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { createAward, updateAward } from "@/lib/actions/awards";
import { DEPARTMENTS } from "@/lib/departments";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { FileUpload } from "./file-upload";

const levelOptions = ["local", "regional", "national", "international"] as const;

const awardsSchema = z.object({
  department: z.string().min(1, "Department is required"),
  extension_ppa: z
    .array(
      z.object({
        value: z.string().min(1, "Extension PPA is required"),
      })
    )
    .min(1, "At least one Extension PPA is required"),
  award_recognition_received: z.string().min(1, "Award/Recognition is required"),
  donor: z.string().min(1, "Donor is required"),
  level: z.enum(levelOptions, { message: "Level is required" }),
  date_received: z.date(),
  remarks: z.string().optional(),
  documents: z.array(z.object({ url: z.string(), name: z.string() })).default([]),
});

type AwardsFormValues = z.infer<typeof awardsSchema>;
type AwardsFormInput = z.input<typeof awardsSchema>;
type AwardsFormOutput = z.output<typeof awardsSchema>;

interface AwardsFormProps {
  department: string;
  userType?: "super_admin" | "college_coordinator" | "unit_coordinator" | "extension_office" | "project_leader";
  award?: {
    id: string;
    department: string;
    extension_ppa: string[] | null;
    award_recognition_received: string;
    donor: string;
    level: "local" | "regional" | "national" | "international";
    date_received: string;
    remarks: string | null;
    documents: { url: string; name: string }[] | null;
  };
  isViewOnly?: boolean;
  onSuccess?: () => void;
}

export function AwardsForm({ department, userType, award, isViewOnly = false, onSuccess }: AwardsFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const defaultDate = award?.date_received ? new Date(award.date_received) : new Date();

  const form = useForm<AwardsFormInput, unknown, AwardsFormOutput>({
    resolver: zodResolver(awardsSchema),
    defaultValues: {
      department: award?.department || department || "",
      extension_ppa:
        Array.isArray(award?.extension_ppa) && award.extension_ppa.length > 0
          ? award.extension_ppa.map((value) => ({ value }))
          : [{ value: "" }],
      award_recognition_received: award?.award_recognition_received || "",
      donor: award?.donor || "",
      level: award?.level || "local",
      date_received: defaultDate,
      remarks: award?.remarks || "",
      documents: award?.documents || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "extension_ppa",
  });

  React.useEffect(() => {
    form.reset({
      department: award?.department || department || "",
      extension_ppa:
        Array.isArray(award?.extension_ppa) && award.extension_ppa.length > 0
          ? award.extension_ppa.map((value) => ({ value }))
          : [{ value: "" }],
      award_recognition_received: award?.award_recognition_received || "",
      donor: award?.donor || "",
      level: award?.level || "local",
      date_received: award?.date_received ? new Date(award.date_received) : new Date(),
      remarks: award?.remarks || "",
      documents: award?.documents || [],
    });
  }, [award, department, form]);

  const onSubmit = async (values: AwardsFormOutput) => {
    setIsSubmitting(true);
    try {
      const payload = {
        department: values.department,
        extension_ppa: values.extension_ppa.map((item) => item.value.trim()).filter(Boolean),
        award_recognition_received: values.award_recognition_received.trim(),
        donor: values.donor.trim(),
        level: values.level,
        date_received: values.date_received.toISOString().slice(0, 10),
        remarks: values.remarks?.trim() || "",
        documents: values.documents || [],
      };
      const result = award?.id ? await updateAward(award.id, payload) : await createAward(payload);

      if (result.error) {
        alert(`Error: ${result.error}`);
        return;
      }

      onSuccess?.();
    } catch {
      alert("Something went wrong while creating the award.");
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
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Level</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-xs" disabled={isViewOnly}>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {levelOptions.map((option) => (
                      <SelectItem key={option} value={option} className="text-xs capitalize">
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <FormLabel className="text-xs">Extension PPA</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[10px]"
              disabled={isViewOnly}
              onClick={() => append({ value: "" })}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <FormField
                control={form.control}
                name={`extension_ppa.${index}.value`}
                render={({ field: inputField }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        {...inputField}
                        placeholder="Enter person/individual"
                        className="h-8 text-xs"
                        disabled={isViewOnly}
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  disabled={isViewOnly}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="award_recognition_received"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Award/Recognition Received</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="h-8 text-xs"
                    placeholder="Enter award/recognition"
                    disabled={isViewOnly}
                  />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="donor"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Donor</FormLabel>
                <FormControl>
                  <Input {...field} className="h-8 text-xs" placeholder="Enter donor" disabled={isViewOnly} />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="date_received"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-xs">Date Received</FormLabel>
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
                        <CalendarIcon className="ml-auto h-3.5 w-3.5 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                      disabled={isViewOnly}
                    />
                  </PopoverContent>
                </Popover>
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
              {isSubmitting ? "Saving..." : award?.id ? "Update Award" : "Create Award"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
