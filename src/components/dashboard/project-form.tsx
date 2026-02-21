"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { CalendarIcon, Plus, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import { createProject, updateProject } from "@/lib/actions/projects";
import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileUpload } from "./file-upload";

const sdgOptions = [
  { id: "Goal 1", label: "Goal 1 - No Poverty" },
  { id: "Goal 2", label: "Goal 2 - Zero Hunger" },
  { id: "Goal 3", label: "Goal 3 - Good Health and Well-being" },
  { id: "Goal 4", label: "Goal 4 - Quality Education" },
  { id: "Goal 5", label: "Goal 5 - Gender Equality" },
  { id: "Goal 6", label: "Goal 6 - Clean Water and Sanitation" },
  { id: "Goal 7", label: "Goal 7 - Affordable and Clean Energy" },
  { id: "Goal 8", label: "Goal 8 - Decent Work and Economic Growth" },
  { id: "Goal 9", label: "Goal 9 - Industry, Innovation and Infrastructure" },
  { id: "Goal 10", label: "Goal 10 - Reduced Inequality" },
  { id: "Goal 11", label: "Goal 11 - Sustainable Cities and Communities" },
  { id: "Goal 12", label: "Goal 12 - Responsible Consumption and Production" },
  { id: "Goal 13", label: "Goal 13 - Climate Action" },
  { id: "Goal 14", label: "Goal 14 - Life Below Water" },
  { id: "Goal 15", label: "Goal 15 - Life on Land" },
  { id: "Goal 16", label: "Goal 16 - Peace, Justice and Strong Institutions" },
  { id: "Goal 17", label: "Goal 17 - Partnerships for the Goals" },
];

const programOptions = [
  "BS Agricultural and Biosystems Engineering",
  "BS Architecture",
  "BS Civil Engineering",
  "BS Computer Engineering",
  "BS Computer Science",
  "BS Electrical Engineering",
  "BS Electronics Engineering",
  "BS Industrial Engineering",
  "BS Industrial Technology",
  "BS Information Technology",
];

const industrialTechMajors = [
  "Automotive Technology",
  "Electrical Technology",
  "Electronics Technology",
];

const classificationOptions = [
  "Agri-Fisheries and Food Security",
  "Biodiversity and Environmental Conservation",
  "Smart Engineering, ICT, and Industrial Competitiveness",
  "Public Health and Welfare",
  "Societal Development and Equality",
];

interface ProjectFormValues {
  title: string;
  classification: string[];
  sdg_goals: string[];
  academic_program: string;
  major: string;
  proponents: { name: string }[];
  college: string;
  collaborating_agencies: string;
  target_beneficiaries: string[];
  community_location: string;
  start_date: Date;
  end_date: Date;
  budget_requirements: { name: string; amount: number }[];
  gad_score: number;
  documents: { url: string; name: string }[];
}

const projectSchema = z.object({
  title: z.string().min(1, "Title is required"),
  classification: z.array(z.string()).min(1, "Select at least one classification"),
  sdg_goals: z.array(z.string()).min(1, "Select at least one SDG"),
  academic_program: z.string().min(1, "Academic program is required"),
  major: z.string(),
  proponents: z.array(z.object({
    name: z.string().min(1, "Name is required")
  })).min(1, "At least one proponent is required"),
  college: z.string(),
  collaborating_agencies: z.string(),
  target_beneficiaries: z.array(z.string()).min(1, "Select at least one beneficiary"),
  community_location: z.string(),
  start_date: z.date(),
  end_date: z.date(),
  budget_requirements: z.array(z.object({
    name: z.string().min(1, "Budget name is required"),
    amount: z.coerce.number().min(0, "Amount must be positive")
  })),
  gad_score: z.coerce.number().min(0).max(100),
  documents: z.array(z.object({
    url: z.string(),
    name: z.string()
  })).default([]),
});

interface ProjectFormProps {
  onSuccess?: () => void;
  project?: any;
  isViewOnly?: boolean;
}

export function ProjectForm({ onSuccess, project, isViewOnly }: ProjectFormProps) {
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema) as any,
    defaultValues: {
      title: project?.title || "",
      classification: Array.isArray(project?.classification) ? project.classification : project?.classification ? [project.classification] : [],
      sdg_goals: project?.sdg_goals || [],
      academic_program: project?.academic_program || "",
      major: project?.major || "",
      proponents: project?.proponents || [{ name: "" }],
      college: project?.college || "CEIT",
      collaborating_agencies: project?.collaborating_agencies || "",
      target_beneficiaries: Array.isArray(project?.target_beneficiaries) ? project.target_beneficiaries : project?.target_beneficiaries ? [project.target_beneficiaries] : [],
      community_location: project?.community_location || "",
      start_date: project?.start_date ? new Date(project.start_date) : new Date(),
      end_date: project?.end_date ? new Date(project.end_date) : new Date(),
      budget_requirements: project?.budget_requirements || [{ name: "", amount: 0 }],
      gad_score: project?.gad_score || 0,
      documents: project?.documents || [],
    },
  });

  const [showSuccess, setShowSuccess] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { fields: proponentFields, append: appendProponent, remove: removeProponent } = useFieldArray({
    name: "proponents",
    control: form.control,
  });

  const { fields: budgetFields, append: appendBudget, remove: removeBudget } = useFieldArray({
    name: "budget_requirements",
    control: form.control,
  });

  async function onSubmit(data: ProjectFormValues) {
    if (isViewOnly) return;
    setIsSubmitting(true);
    try {
      let result;
      if (project?.id) {
        result = await updateProject(project.id, data);
      } else {
        result = await createProject(data);
      }
      
      if (result.error) {
        alert("Error: " + result.error);
        return;
      }
      setShowSuccess(true);
    } catch (error) {
      alert("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleSuccessClose = () => {
    setShowSuccess(false);
    form.reset();
    onSuccess?.();
  };

  const selectedProgram = form.watch("academic_program");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6 pb-4">
            {/* Title & Classification */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control as any}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Program/Project Title</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter title"
                        {...field}
                        className="min-h-[80px] text-xs resize-none"
                        disabled={isViewOnly}
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name="classification"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs">University Extension Agenda Classification</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          disabled={isViewOnly}
                          className={cn(
                            "w-full justify-between h-auto min-h-[32px] text-xs px-2 py-1",
                            !field.value?.length && "text-muted-foreground"
                          )}
                        >
                          <div className="flex flex-wrap gap-1">
                            {field.value?.length > 0 ? (
                              field.value.map((val: string) => (
                                <div key={val} className="bg-muted px-1.5 py-0.5 rounded-sm flex items-center gap-1 border">
                                  <span>{val}</span>
                                </div>
                              ))
                            ) : (
                              <span>Select classification</span>
                            )}
                          </div>
                          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search classification..." className="h-8 text-xs" />
                          <CommandEmpty className="text-xs p-2">No classification found.</CommandEmpty>
                          <CommandGroup className="p-0">
                            <CommandList className="max-h-64 overflow-y-auto">
                              {classificationOptions.map((option) => (
                                <CommandItem
                                  key={option}
                                  value={option}
                                  onSelect={() => {
                                    const current = new Set(field.value || []);
                                    if (current.has(option)) {
                                      current.delete(option);
                                    } else {
                                      current.add(option);
                                    }
                                    field.onChange(Array.from(current));
                                  }}
                                  className="text-xs"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-3 w-3",
                                      (field.value || []).includes(option)
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {option}
                                </CommandItem>
                              ))}
                            </CommandList>
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            </div>

            {/* SDG Goals Multi-select */}
            <FormField
              control={form.control}
              name="sdg_goals"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-xs">Sustainable Development Goals (SDGs)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          disabled={isViewOnly}
                          className={cn(
                            "w-full justify-between h-auto min-h-[32px] text-xs px-2 py-1",
                            !field.value.length && "text-muted-foreground"
                          )}
                        >
                          <div className="flex flex-wrap gap-1">
                            {field.value.length > 0 ? (
                              field.value.map((val: string) => {
                                const option = sdgOptions.find(o => o.id === val);
                                return (
                                  <div key={val} className="bg-[#159E44]/10 text-[#159E44] px-1.5 py-0.5 rounded-sm flex items-center gap-1 border border-[#159E44]/20 text-[9px]">
                                    <span>{option?.label || option?.id}</span>
                                  </div>
                                );
                              })
                            ) : (
                              <span>Select SDGs</span>
                            )}
                          </div>
                          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Search SDG..." className="h-8 text-xs" />
                        <CommandEmpty className="text-xs p-2">No SDG found.</CommandEmpty>
                        <CommandGroup className="p-0">
                          <CommandList className="max-h-64 overflow-y-auto">
                              {sdgOptions.map((option) => (
                                <CommandItem
                                  key={option.id}
                                  value={option.label}
                                  onSelect={() => {
                                    const current = new Set(field.value);
                                    if (current.has(option.id)) {
                                      current.delete(option.id);
                                    } else {
                                      current.add(option.id);
                                    }
                                    field.onChange(Array.from(current));
                                  }}
                                  className="text-xs"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-3 w-3",
                                      field.value.includes(option.id)
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {option.label}
                                </CommandItem>
                              ))}
                            </CommandList>
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            {/* Academic Program & Major */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control as any}
                name="academic_program"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Academic Program</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isViewOnly}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select program" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {programOptions.map((program) => (
                          <SelectItem key={program} value={program} className="text-xs">
                            {program}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />

              {selectedProgram === "BS Industrial Technology" && (
                <FormField
                  control={form.control as any}
                  name="major"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Major</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isViewOnly}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select major" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {industrialTechMajors.map((major) => (
                            <SelectItem key={major} value={major} className="text-xs">
                              {major}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Proponents */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel className="text-xs">Proponents</FormLabel>
                {!isViewOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendProponent({ name: "" })}
                    className="h-6 text-[10px] px-2"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                )}
              </div>
              {proponentFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <FormField
                    control={form.control as any}
                    name={`proponents.${index}.name`}
                    render={({ field: inputField }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            placeholder="Firstname MI. Lastname"
                            {...inputField}
                            className="h-8 text-xs"
                            disabled={isViewOnly}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  {!isViewOnly && proponentFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeProponent(index)}
                      className="h-8 w-8 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Agencies & Beneficiaries & Location */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control as any}
                name="collaborating_agencies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Collaborating Agencies</FormLabel>
                    <FormControl>
                      <Input placeholder="Agencies" {...field} className="h-8 text-xs" disabled={isViewOnly} />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name="target_beneficiaries"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Target Beneficiaries</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Type beneficiaries (separate with commas)"
                        value={(field.value || []).join(", ")}
                        onChange={(e) => {
                          const parsed = e.target.value
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean);
                          field.onChange(parsed);
                        }}
                        className="h-8 text-xs"
                        disabled={isViewOnly}
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name="community_location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Community Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Location" {...field} className="h-8 text-xs" disabled={isViewOnly} />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control as any}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs">Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full h-8 px-2 text-left font-normal text-xs",
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
                          initialFocus
                          className="text-xs"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs">End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full h-8 px-2 text-left font-normal text-xs",
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
                          disabled={(date) => {
                            const startDate = form.getValues("start_date");
                            if (!startDate) return false;
                            const d1 = new Date(startDate);
                            d1.setHours(0, 0, 0, 0);
                            return date <= d1;
                          }}
                          initialFocus
                          className="text-xs"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            </div>

            {/* Budget Requirements */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel className="text-xs">Budgetary Requirement (Php)</FormLabel>
                {!isViewOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendBudget({ name: "", amount: 0 })}
                    className="h-6 text-[10px] px-2"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                )}
              </div>
              {budgetFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <FormField
                    control={form.control as any}
                    name={`budget_requirements.${index}.name`}
                    render={({ field: inputField }) => (
                      <FormItem className="flex-[2]">
                        <FormControl>
                          <Input placeholder="Source/Item" {...inputField} className="h-8 text-xs" disabled={isViewOnly} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as any}
                    name={`budget_requirements.${index}.amount`}
                    render={({ field: inputField }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-2 top-2.5 text-xs text-muted-foreground">₱</span>
                            <Input 
                              type="number" 
                              placeholder="Amount" 
                              {...inputField} 
                              className="h-8 text-xs pl-5" 
                              disabled={isViewOnly} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  {!isViewOnly && budgetFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBudget(index)}
                      className="h-8 w-8 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* GAD Score */}
            <FormField
              control={form.control as any}
              name="gad_score"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Total GAD Score for project identification and design stages</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} className="h-8 text-xs" disabled={isViewOnly} />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            {/* Document Copies (PDF) */}
            <div className="space-y-3 pt-2">
              <FormLabel className="text-xs">Document Copies (Optional)</FormLabel>
              <FormDescription className="text-[10px] -mt-2 mb-2">
                Upload signed and scanned copies of the project documents (PDF format).
              </FormDescription>
              <FormField
                control={form.control as any}
                name="documents"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <FileUpload
                        value={field.value || []}
                        onChange={field.onChange}
                        disabled={isViewOnly || isSubmitting}
                        maxFiles={10}
                      />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            </div>

            {!isViewOnly && (
              <div className="flex justify-end gap-3 pt-6">
                <Button 
                  type="submit" 
                  className="h-8 text-xs px-6 bg-[#159E44] hover:bg-[#128A3B]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : project?.id ? "Update Project" : "Submit Project"}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </form>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader className="flex flex-col items-center justify-center pt-4">
            <div className="rounded-full bg-[#159E44]/10 p-3 mb-4">
              <CheckCircle2 className="h-10 w-10 text-[#159E44]" />
            </div>
            <DialogTitle className="text-lg font-semibold text-center">
              {project?.id ? "Project Updated!" : "Project Created!"}
            </DialogTitle>
            <DialogDescription className="text-xs text-center">
              {project?.id 
                ? "The project information has been successfully updated." 
                : "The project has been successfully registered."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button 
              type="button" 
              className="bg-[#159E44] hover:bg-[#128A3B] px-8 h-9 text-xs"
              onClick={handleSuccessClose}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
