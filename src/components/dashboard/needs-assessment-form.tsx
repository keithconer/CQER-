"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import {
  CalendarIcon,
  CheckCircle2,
  FileText,
  Save,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DEFAULT_DOCUMENT_ACCEPT, DOCUMENT_UPLOAD_GUIDANCE } from "@/lib/document-uploads";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { createNeedsAssessment, updateNeedsAssessment, deleteNeedsAssessment, type NeedsAssessment } from "@/lib/actions/needs-assessment";
import { FileUpload } from "./file-upload";
import { Project } from "./projects-table";

const formSchema = z.object({
  project_no: z.string().min(1, "Project number is required"),
  project_title: z.string().min(1, "Project title is required"),
  category: z.enum(["Internal", "External"]),
  needs_assessment: z.string().min(1, "Needs assessment details are required"),
  date_conducted: z.date(),
  place_conducted: z.string().min(1, "Place conducted is required"),
  results_used: z.string().min(1, "Please specify how results were used"),
  document_url: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface NeedsAssessmentFormProps {
  initialData?: NeedsAssessment;
  assignedProjects: Project[];
  onSuccess?: () => void;
  isViewOnly?: boolean;
}

export function NeedsAssessmentForm({
  initialData,
  assignedProjects,
  onSuccess,
  isViewOnly = false,
}: NeedsAssessmentFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const defaultValues: Partial<FormValues> = initialData
    ? {
        ...initialData,
        date_conducted: new Date(initialData.date_conducted),
      }
    : {
        project_no: "",
        project_title: "",
        category: "Internal",
        needs_assessment: "",
        place_conducted: "",
        results_used: "",
        document_url: null,
      };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const selectedProjectNo = useWatch({
    control: form.control,
    name: "project_no",
  });

  // Auto-populate logic when project_no changes
  React.useEffect(() => {
    if (selectedProjectNo && !initialData) {
      const proj = assignedProjects.find((p) => p.project_no === selectedProjectNo);
      if (proj) {
        // use type assertion for project_title which might exist at runtime
        const projAny = proj as any;
        form.setValue("project_title", proj.title || projAny.project_title || "");
        const cat = (proj.funding_source || "").toLowerCase().includes("external") ? "External" : "Internal";
        form.setValue("category", cat as "Internal" | "External");
      }
    }
  }, [selectedProjectNo, assignedProjects, form, initialData]);

  async function onSubmit(data: FormValues) {
    if (isViewOnly) return;
    try {
      setIsSubmitting(true);
      const payload = {
        ...data,
        date_conducted: data.date_conducted.toISOString(),
      };

      if (initialData?.id) {
        await updateNeedsAssessment(initialData.id, payload);
      } else {
        await createNeedsAssessment(payload);
      }

      onSuccess?.();
    } catch (error) {
      console.error(error);
      alert("Failed to save needs assessment");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!initialData?.id || isViewOnly) return;
    if (!confirm("Are you sure you want to delete this needs assessment?")) return;
    try {
      setIsSubmitting(true);
      await deleteNeedsAssessment(initialData.id);
      onSuccess?.();
    } catch (error) {
      console.error(error);
      alert("Failed to delete needs assessment");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="project_no"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px]">Project No.</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isViewOnly || !!initialData}
                >
                  <FormControl>
                    <SelectTrigger className="h-8 text-[10px]" title={field.value ? assignedProjects.find(p => p.project_no === field.value)?.title : "Select project number"}>
                      <SelectValue placeholder="Select project no." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {assignedProjects.map((p) => (
                      <SelectItem
                        className="text-[10px]"
                        key={p.project_no || p.id}
                        value={p.project_no || p.id}
                        title={p.title}
                      >
                        {p.project_no || "N/A"} - {p.title}
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
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px]">Category</FormLabel>
                <FormControl>
                  <Input {...field} className="h-8 text-[10px] bg-muted/50" readOnly />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="project_title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px]">Project Title</FormLabel>
              <FormControl>
                <Input {...field} className="h-8 text-[10px] bg-muted/50" readOnly />
              </FormControl>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="needs_assessment"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px]">Needs Assessment</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  className="min-h-[80px] text-[10px] placeholder:text-[10px]" 
                  placeholder="Details about the assessment..." 
                  disabled={isViewOnly} 
                />
              </FormControl>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date_conducted"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-[10px] pb-1">Date Conducted</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        disabled={isViewOnly}
                        className={cn(
                          "h-8 w-full pl-3 text-left font-normal text-[10px]",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className="text-[10px]"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="place_conducted"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px]">Place Conducted</FormLabel>
                <FormControl>
                  <Input {...field} className="h-8 text-[10px] placeholder:text-[10px]" placeholder="Location" disabled={isViewOnly} />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="results_used"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px]">How results were used</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  className="min-h-[80px] text-[10px] placeholder:text-[10px]" 
                  placeholder="Describe how the assessment results were utilized..." 
                  disabled={isViewOnly} 
                />
              </FormControl>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="document_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px]">Document (PDF or Excel)</FormLabel>
              <FormControl>
                <FileUpload
                  value={field.value ? [{ url: field.value, name: "Document" }] : []}
                  onChange={(files) => field.onChange(files[0]?.url || null)}
                  bucket="cqer-needs-assessment-pdfs"
                  accept={DEFAULT_DOCUMENT_ACCEPT}
                  disabled={isViewOnly}
                  guidance={DOCUMENT_UPLOAD_GUIDANCE.needsAssessment}
                  maxFiles={1}
                />
              </FormControl>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />

        {!isViewOnly && (
          <div className="flex justify-end gap-2 pt-4">
            {initialData && (
              <Button
                type="button"
                variant="destructive"
                className="h-8 text-[10px]"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            )}
            <Button
              type="submit"
              className="h-8 text-[10px] bg-[#159E44] hover:bg-[#128A3B] text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                "Saving..."
              ) : (
                <>
                  <Save className="h-3 w-3 mr-1" />
                  Save Assessment
                </>
              )}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
