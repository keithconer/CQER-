"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import {
  CheckCircle2,
  FileText,
  Save,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import {
  createConsultancyExtension,
  updateConsultancyExtension,
  deleteConsultancyExtension,
  type ConsultancyExtension,
} from "@/lib/actions/consultancy-extension";
import { FileUpload } from "./file-upload";
import { type Project } from "./projects-table";

const formSchema = z.object({
  project_no: z.string().min(1, "Project number is required"),
  project_title: z.string().min(1, "Project title is required"),
  category: z.string().min(1, "Category is required"),
  is_part_of_project: z.boolean().nullable().default(null),
  consultancy_project_title: z.string().default(""),
  base_agency: z.string().min(1, "Base agency is required"),
  nature_of_consultancy: z.string().min(1, "Nature of consultancy is required"),
  status: z.enum(["On-going", "Completed"]).nullable(),
  document_url: z.string().nullable().default(null),
});

type FormValues = z.infer<typeof formSchema>;

interface ConsultancyExtensionFormProps {
  initialData?: ConsultancyExtension;
  assignedProjects: Project[];
  onSuccess?: () => void;
  isViewOnly?: boolean;
}

export function ConsultancyExtensionForm({
  initialData,
  assignedProjects,
  onSuccess,
  isViewOnly = false,
}: ConsultancyExtensionFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: initialData
      ? {
          project_no: initialData.project_no,
          project_title: initialData.project_title,
          category: initialData.category,
          is_part_of_project: initialData.is_part_of_project,
          consultancy_project_title: initialData.consultancy_project_title || "",
          base_agency: initialData.base_agency || "",
          nature_of_consultancy: initialData.nature_of_consultancy || "",
          status: initialData.status as "On-going" | "Completed",
          document_url: initialData.document_url || null,
        }
      : {
          project_no: "",
          project_title: "",
          category: "",
          is_part_of_project: false,
          consultancy_project_title: "",
          base_agency: "",
          nature_of_consultancy: "",
          status: null,
          document_url: null,
        },
  });

  const selectedProjectNo = useWatch({
    control: form.control,
    name: "project_no",
  });

  const isPartOfProject = useWatch({
    control: form.control,
    name: "is_part_of_project",
  });

  // Auto-populate logic when project_no changes
  React.useEffect(() => {
    if (selectedProjectNo && !initialData) {
      const proj = assignedProjects.find((p) => p.project_no === selectedProjectNo);
      if (proj) {
        const projAny = proj as any;
        form.setValue("project_title", proj.title || projAny.project_title || "");
        const cat = (proj.funding_source || "").toLowerCase().includes("external") ? "External" : "Internal";
        form.setValue("category", cat);
      }
    }
  }, [selectedProjectNo, assignedProjects, form, initialData]);

  async function onSubmit(data: FormValues) {
    if (isViewOnly) return;
    try {
      setIsSubmitting(true);
      if (initialData?.id) {
        await updateConsultancyExtension(initialData.id, data as any);
      } else {
        await createConsultancyExtension(data as any);
      }
      onSuccess?.();
    } catch (error) {
      console.error(error);
      alert("Failed to save consultancy extension");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!initialData?.id || isViewOnly) return;
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      setIsSubmitting(true);
      await deleteConsultancyExtension(initialData.id);
      onSuccess?.();
    } catch (error) {
      console.error(error);
      alert("Failed to delete record");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control as any}
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
                    <SelectTrigger className="h-8 text-[10px]">
                      <SelectValue placeholder="Select project no." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {assignedProjects.map((p) => (
                      <SelectItem
                        className="text-[10px]"
                        key={p.project_no || p.id}
                        value={p.project_no || p.id}
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
            control={form.control as any}
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
          control={form.control as any}
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
          control={form.control as any}
          name="is_part_of_project"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-[10px]">Part of project?</FormLabel>
              <div className="flex flex-row space-x-4">
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value === true}
                      onCheckedChange={() => field.onChange(true)}
                      disabled={isViewOnly}
                    />
                  </FormControl>
                  <FormLabel className="text-[10px] font-normal">Yes</FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value === false}
                      onCheckedChange={() => field.onChange(false)}
                      disabled={isViewOnly}
                    />
                  </FormControl>
                  <FormLabel className="text-[10px] font-normal">No</FormLabel>
                </FormItem>
              </div>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />

        {isPartOfProject === false && (
          <FormField
            control={form.control as any}
            name="consultancy_project_title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px]">Title of consultancy project</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    className="h-8 text-[10px] placeholder:text-[10px]"
                    placeholder="Enter consultancy project title"
                    disabled={isViewOnly}
                  />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control as any}
            name="base_agency"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px]">Base Agency</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="h-8 text-[10px] placeholder:text-[10px]"
                    placeholder="Agency name"
                    disabled={isViewOnly}
                  />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="nature_of_consultancy"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px]">Nature of Consultancy</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="h-8 text-[10px] placeholder:text-[10px]"
                    placeholder="Nature"
                    disabled={isViewOnly}
                  />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control as any}
          name="status"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-[10px]">Status</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-row space-x-4"
                  disabled={isViewOnly}
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="On-going" />
                    </FormControl>
                    <FormLabel className="text-[10px] font-normal">On-going</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="Completed" />
                    </FormControl>
                    <FormLabel className="text-[10px] font-normal">Completed</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control as any}
          name="document_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px]">Uploading of Documents (PDF)</FormLabel>
              <FormControl>
                <FileUpload
                  value={field.value ? [{ url: field.value, name: "Document" }] : []}
                  onChange={(files) => field.onChange(files[0]?.url || null)}
                  bucket="cqer-consultancy-extensions-pdfs"
                  accept=".pdf"
                  disabled={isViewOnly}
                />
              </FormControl>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )}
        />

        {!isViewOnly && (
          <div className="flex justify-end gap-2 pt-4">
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
                  Save Consultancy Extension
                </>
              )}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
