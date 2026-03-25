"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, Save, Trash2, UsersRound, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createTechnicalAdvisoryService,
  deleteTechnicalAdvisoryService,
  updateTechnicalAdvisoryService,
  type TechnicalAdvisoryServiceRecord,
} from "@/lib/actions/technical-advisory-services";
import { FileUpload } from "./file-upload";
import { type Project } from "./projects-table";

const clientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  sex: z.enum(["male", "female"]),
  address: z.string().min(1, "Address is required"),
  agency_office_unit: z.string().min(1, "Agency/office/unit is required"),
  position: z.string().min(1, "Position is required"),
  contact_no: z.string().optional(),
  email: z.string().email("Valid email is required"),
  category: z.enum([
    "student",
    "farmer",
    "fisherfolk",
    "government",
    "employee",
    "private_employee",
    "organization",
    "others",
  ]),
  category_other: z.string().optional(),
});

const servicePersonSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

const formSchema = z
  .object({
    project_no: z.string().min(1, "Project number is required"),
    project_title: z.string().min(1, "Project title is required"),
    lead_unit: z.string().min(1, "Lead unit is required"),
    college: z.string().min(1, "College is required"),
    contact_person: z.string().min(1, "Contact person is required"),
    related_curricular_offerings: z.string().min(1, "Related curricular offering is required"),
    clients: z.array(clientSchema).min(1, "Add at least one client"),
    advisory_date: z.date(),
    venue: z.string().min(1, "Venue is required"),
    service_persons: z.array(servicePersonSchema).min(1, "Add at least one person"),
    service_provided: z.enum([
      "Technical assistance",
      "Consultation",
      "Resource person",
      "Technology promotion",
      "Value adding",
      "Others",
    ]),
    service_provided_other: z.string().optional(),
    quality_score: z.number().int().min(1).max(5),
    relevance_score: z.number().int().min(1).max(5),
    timeliness_score: z.number().int().min(1).max(5),
    overall_satisfaction_score: z.number().int().min(1).max(5),
    comments_suggestions: z.string().optional(),
    document_url: z.string().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    value.clients.forEach((client, index) => {
      if (client.category === "others" && !client.category_other?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["clients", index, "category_other"],
          message: "Please specify the client category",
        });
      }
    });

    if (value.service_provided === "Others" && !value.service_provided_other?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["service_provided_other"],
        message: "Please specify the service provided",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

interface TechnicalAdvisoryServicesFormProps {
  assignedProjects: Project[];
  initialData?: TechnicalAdvisoryServiceRecord;
  onSuccess?: () => void;
  isViewOnly?: boolean;
}

function getProjectLeadUnit(project: Project) {
  if (Array.isArray(project.lead_units) && project.lead_units.length > 0) {
    return project.lead_units.join(", ");
  }
  return project.created_by_unit || "";
}

function getProjectCurricular(project: Project) {
  if (Array.isArray(project.related_curricular_offerings) && project.related_curricular_offerings.length > 0) {
    return project.related_curricular_offerings.join(", ");
  }
  return "";
}

function AssessmentPicker({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border/50 p-3">
      <p className="text-[10px] font-semibold">{label}</p>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <label
            key={score}
            className="flex items-center gap-1 rounded-md border border-border/50 px-2 py-1 text-[10px]"
          >
            <Checkbox
              checked={value === score}
              onCheckedChange={() => onChange(score)}
              disabled={disabled}
            />
            <span>{score}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function TechnicalAdvisoryServicesForm({
  assignedProjects,
  initialData,
  onSuccess,
  isViewOnly = false,
}: TechnicalAdvisoryServicesFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          project_no: initialData.project_no,
          project_title: initialData.project_title,
          lead_unit: initialData.lead_unit,
          college: initialData.college || "CEIT",
          contact_person: initialData.contact_person,
          related_curricular_offerings: (initialData.related_curricular_offerings || []).join(", "),
          clients:
            initialData.clients?.length > 0
              ? initialData.clients.map((client) => ({
                  name: client.name || "",
                  sex: client.sex || "male",
                  address: client.address || "",
                  agency_office_unit: client.agency_office_unit || "",
                  position: client.position || "",
                  contact_no: client.contact_no || "",
                  email: client.email || "",
                  category: client.category || "student",
                  category_other: client.category_other || "",
                }))
              : [],
          advisory_date: initialData.advisory_date ? new Date(initialData.advisory_date) : undefined,
          venue: initialData.venue,
          service_persons:
            initialData.service_persons?.length > 0 ? initialData.service_persons : [{ name: "" }],
          service_provided: initialData.service_provided,
          service_provided_other: initialData.service_provided_other || "",
          quality_score: initialData.quality_score || 1,
          relevance_score: initialData.relevance_score || 1,
          timeliness_score: initialData.timeliness_score || 1,
          overall_satisfaction_score: initialData.overall_satisfaction_score || 1,
          comments_suggestions: initialData.comments_suggestions || "",
          document_url: initialData.document_url || null,
        }
      : {
          project_no: "",
          project_title: "",
          lead_unit: "",
          college: "CEIT",
          contact_person: "",
          related_curricular_offerings: "",
          clients: [
            {
              name: "",
              sex: "male",
              address: "",
              agency_office_unit: "",
              position: "",
              contact_no: "",
              email: "",
              category: "student",
              category_other: "",
            },
          ],
          advisory_date: undefined,
          venue: "",
          service_persons: [{ name: "" }],
          service_provided: "Technical assistance",
          service_provided_other: "",
          quality_score: 1,
          relevance_score: 1,
          timeliness_score: 1,
          overall_satisfaction_score: 1,
          comments_suggestions: "",
          document_url: null,
        },
  });

  const selectedProjectNo = useWatch({ control: form.control, name: "project_no" });
  const selectedService = useWatch({ control: form.control, name: "service_provided" });
  const clientsValue = useWatch({ control: form.control, name: "clients" });
  const clientsArray = useFieldArray({ control: form.control, name: "clients" });
  const servicePersonsArray = useFieldArray({ control: form.control, name: "service_persons" });

  React.useEffect(() => {
    if (!selectedProjectNo || initialData) return;
    const project = assignedProjects.find((item) => item.project_no === selectedProjectNo);
    if (!project) return;
    form.setValue("project_title", project.title || "");
    form.setValue("lead_unit", getProjectLeadUnit(project));
    form.setValue("college", "CEIT");
    form.setValue("contact_person", project.contact_person || "");
    form.setValue("related_curricular_offerings", getProjectCurricular(project));
  }, [assignedProjects, form, initialData, selectedProjectNo]);

  async function onSubmit(values: FormValues) {
    if (isViewOnly) return;
    try {
      setIsSubmitting(true);
      const payload = {
        project_no: values.project_no,
        project_title: values.project_title,
        lead_unit: values.lead_unit,
        college: values.college,
        contact_person: values.contact_person,
        related_curricular_offerings: values.related_curricular_offerings
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        advisory_date: values.advisory_date.toISOString(),
        venue: values.venue.trim(),
        service_persons: values.service_persons.map((person) => ({ name: person.name.trim() })),
        service_provided: values.service_provided,
        service_provided_other:
          values.service_provided === "Others" ? values.service_provided_other?.trim() || null : null,
        clients: values.clients.map((client) => ({
          ...client,
          name: client.name.trim(),
          address: client.address.trim(),
          agency_office_unit: client.agency_office_unit.trim(),
          position: client.position.trim(),
          contact_no: client.contact_no?.trim() || "",
          email: client.email.trim(),
          category_other: client.category === "others" ? client.category_other?.trim() || "" : "",
        })),
        quality_score: values.quality_score,
        relevance_score: values.relevance_score,
        timeliness_score: values.timeliness_score,
        overall_satisfaction_score: values.overall_satisfaction_score,
        comments_suggestions: values.comments_suggestions?.trim() || null,
        document_url: values.document_url || null,
      };

      if (initialData?.id) {
        await updateTechnicalAdvisoryService(initialData.id, payload);
      } else {
        await createTechnicalAdvisoryService(payload);
      }

      onSuccess?.();
    } catch (error) {
      console.error(error);
      alert("Failed to save technical advisory service.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!initialData?.id || isViewOnly) return;
    if (!confirm("Are you sure you want to delete this technical advisory service record?")) return;
    try {
      setIsSubmitting(true);
      await deleteTechnicalAdvisoryService(initialData.id);
      onSuccess?.();
    } catch (error) {
      console.error(error);
      alert("Failed to delete technical advisory service record.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField control={form.control} name="project_no" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px]">Project No.</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isViewOnly || !!initialData}>
                <FormControl>
                  <SelectTrigger className="h-8 text-[10px]">
                    <SelectValue placeholder="Select project no." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {assignedProjects.map((project) => (
                    <SelectItem key={project.project_no || project.id} value={project.project_no || project.id} className="text-[10px]">
                      {(project.project_no || "N/A") + " - " + (project.title || "Untitled Project")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )} />

          <FormField control={form.control} name="project_title" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px]">Project Title</FormLabel>
              <FormControl><Input {...field} readOnly className="h-8 text-[10px] bg-muted/40" /></FormControl>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )} />

          <FormField control={form.control} name="lead_unit" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px]">Lead Unit</FormLabel>
              <FormControl><Input {...field} readOnly className="h-8 text-[10px] bg-muted/40" /></FormControl>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )} />

          <FormField control={form.control} name="college" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px]">College</FormLabel>
              <FormControl><Input {...field} readOnly className="h-8 text-[10px] bg-muted/40" /></FormControl>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )} />

          <FormField control={form.control} name="contact_person" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px]">Contact Person</FormLabel>
              <FormControl><Input {...field} readOnly className="h-8 text-[10px] bg-muted/40" /></FormControl>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )} />

          <FormField control={form.control} name="related_curricular_offerings" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px]">Related Curricular Offering</FormLabel>
              <FormControl><Input {...field} readOnly className="h-8 text-[10px] bg-muted/40" /></FormControl>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )} />
        </div>

        <div className="space-y-3 rounded-lg border border-border/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-primary/10 p-1.5"><UsersRound className="h-3.5 w-3.5 text-primary" /></div>
              <div>
                <h3 className="text-[11px] font-semibold">Client&apos;s Information</h3>
                <p className="text-[10px] text-muted-foreground">Add one or more clients for this service.</p>
              </div>
            </div>
            {!isViewOnly && (
              <Button type="button" variant="outline" className="h-7 text-[10px]" onClick={() => clientsArray.append({
                name: "", sex: "male", address: "", agency_office_unit: "", position: "", contact_no: "", email: "", category: "student", category_other: "",
              })}>
                <Plus className="mr-1 h-3 w-3" />Add Client
              </Button>
            )}
          </div>

          {clientsArray.fields.map((clientField, index) => {
            const currentCategory = clientsValue?.[index]?.category;
            return (
              <div key={clientField.id} className="space-y-3 rounded-lg border border-border/50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold">Client {index + 1}</p>
                  {!isViewOnly && clientsArray.fields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => clientsArray.remove(index)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <FormField control={form.control} name={`clients.${index}.name`} render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px]">Name</FormLabel><FormControl><Input {...field} className="h-8 text-[10px]" disabled={isViewOnly} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name={`clients.${index}.sex`} render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px]">Sex</FormLabel>
                      <div className="flex items-center gap-4 rounded-md border border-border/50 px-3 py-2">
                        <label className="flex items-center gap-2 text-[10px]"><Checkbox checked={field.value === "male"} onCheckedChange={() => field.onChange("male")} disabled={isViewOnly} />Male</label>
                        <label className="flex items-center gap-2 text-[10px]"><Checkbox checked={field.value === "female"} onCheckedChange={() => field.onChange("female")} disabled={isViewOnly} />Female</label>
                      </div>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`clients.${index}.address`} render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px]">Address</FormLabel><FormControl><Input {...field} className="h-8 text-[10px]" disabled={isViewOnly} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name={`clients.${index}.agency_office_unit`} render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px]">Agency/Office/Unit</FormLabel><FormControl><Input {...field} className="h-8 text-[10px]" disabled={isViewOnly} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name={`clients.${index}.position`} render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px]">Position</FormLabel><FormControl><Input {...field} className="h-8 text-[10px]" disabled={isViewOnly} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name={`clients.${index}.contact_no`} render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px]">Contact No. (Optional)</FormLabel><FormControl><Input {...field} className="h-8 text-[10px]" disabled={isViewOnly} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name={`clients.${index}.email`} render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px]">Email</FormLabel><FormControl><Input {...field} className="h-8 text-[10px]" disabled={isViewOnly} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name={`clients.${index}.category`} render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px]">Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isViewOnly}>
                        <FormControl><SelectTrigger className="h-8 text-[10px]"><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="student" className="text-[10px]">Student</SelectItem>
                          <SelectItem value="farmer" className="text-[10px]">Farmer</SelectItem>
                          <SelectItem value="fisherfolk" className="text-[10px]">Fisherfolk</SelectItem>
                          <SelectItem value="government" className="text-[10px]">Government</SelectItem>
                          <SelectItem value="employee" className="text-[10px]">Employee</SelectItem>
                          <SelectItem value="private_employee" className="text-[10px]">Private Employee</SelectItem>
                          <SelectItem value="organization" className="text-[10px]">Organization</SelectItem>
                          <SelectItem value="others" className="text-[10px]">Others</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )} />
                </div>

                {currentCategory === "others" && (
                  <FormField control={form.control} name={`clients.${index}.category_other`} render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px]">Please Specify</FormLabel><FormControl><Input {...field} className="h-8 text-[10px]" disabled={isViewOnly} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-3 rounded-lg border border-border/50 p-4">
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-primary/10 p-1.5"><Wrench className="h-3.5 w-3.5 text-primary" /></div>
            <div>
              <h3 className="text-[11px] font-semibold">Advisory Services Details</h3>
              <p className="text-[10px] text-muted-foreground">Record the activity date, venue, people, and service provided.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <FormField control={form.control} name="advisory_date" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-[10px] pb-1">Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" className={cn("h-8 justify-between text-[10px] font-normal", !field.value && "text-muted-foreground")} disabled={isViewOnly}>
                        {field.value ? format(field.value, "PPP") : "Pick a date"}
                        <CalendarIcon className="h-3 w-3 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )} />
            <FormField control={form.control} name="venue" render={({ field }) => (
              <FormItem><FormLabel className="text-[10px]">Venue</FormLabel><FormControl><Input {...field} className="h-8 text-[10px]" disabled={isViewOnly} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
            )} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FormLabel className="text-[10px]">Name of Person</FormLabel>
              {!isViewOnly && (
                <Button type="button" variant="outline" className="h-7 text-[10px]" onClick={() => servicePersonsArray.append({ name: "" })}>
                  <Plus className="mr-1 h-3 w-3" />Add Person
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {servicePersonsArray.fields.map((fieldItem, index) => (
                <div key={fieldItem.id} className="flex items-start gap-2">
                  <FormField control={form.control} name={`service_persons.${index}.name`} render={({ field }) => (
                    <FormItem className="flex-1"><FormControl><Input {...field} className="h-8 text-[10px]" disabled={isViewOnly} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  {!isViewOnly && servicePersonsArray.fields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => servicePersonsArray.remove(index)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <FormField control={form.control} name="service_provided" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[10px]">Services Provided</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isViewOnly}>
                <FormControl><SelectTrigger className="h-8 text-[10px]"><SelectValue placeholder="Select service" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="Technical assistance" className="text-[10px]">Technical assistance</SelectItem>
                  <SelectItem value="Consultation" className="text-[10px]">Consultation</SelectItem>
                  <SelectItem value="Resource person" className="text-[10px]">Resource person</SelectItem>
                  <SelectItem value="Technology promotion" className="text-[10px]">Technology promotion</SelectItem>
                  <SelectItem value="Value adding" className="text-[10px]">Value adding</SelectItem>
                  <SelectItem value="Others" className="text-[10px]">Others</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage className="text-[10px]" />
            </FormItem>
          )} />

          {selectedService === "Others" && (
            <FormField control={form.control} name="service_provided_other" render={({ field }) => (
              <FormItem><FormLabel className="text-[10px]">Please Specify</FormLabel><FormControl><Input {...field} className="h-8 text-[10px]" disabled={isViewOnly} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
            )} />
          )}
        </div>

        <div className="space-y-3 rounded-lg border border-border/50 p-4">
          <div><h3 className="text-[11px] font-semibold">Assessment</h3><p className="text-[10px] text-muted-foreground">Choose one rating from 1 to 5 for each criterion.</p></div>
          <FormField control={form.control} name="quality_score" render={({ field }) => <FormItem><AssessmentPicker label="A. Quality" value={field.value} onChange={field.onChange} disabled={isViewOnly} /><FormMessage className="text-[10px]" /></FormItem>} />
          <FormField control={form.control} name="relevance_score" render={({ field }) => <FormItem><AssessmentPicker label="B. Relevance" value={field.value} onChange={field.onChange} disabled={isViewOnly} /><FormMessage className="text-[10px]" /></FormItem>} />
          <FormField control={form.control} name="timeliness_score" render={({ field }) => <FormItem><AssessmentPicker label="C. Timeliness" value={field.value} onChange={field.onChange} disabled={isViewOnly} /><FormMessage className="text-[10px]" /></FormItem>} />
          <FormField control={form.control} name="overall_satisfaction_score" render={({ field }) => <FormItem><AssessmentPicker label="D. Overall satisfaction feedback to experts" value={field.value} onChange={field.onChange} disabled={isViewOnly} /><FormMessage className="text-[10px]" /></FormItem>} />
        </div>

        <FormField control={form.control} name="comments_suggestions" render={({ field }) => (
          <FormItem><FormLabel className="text-[10px]">Comments/Suggestions</FormLabel><FormControl><Textarea {...field} className="min-h-[90px] text-[10px]" disabled={isViewOnly} placeholder="Add remarks, comments, or suggestions." /></FormControl><FormMessage className="text-[10px]" /></FormItem>
        )} />

        <FormField control={form.control} name="document_url" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[10px]">Upload Document (PDF)</FormLabel>
            <FormControl>
              <FileUpload
                value={field.value ? [{ url: field.value, name: "Technical Advisory Service Document" }] : []}
                onChange={(files) => field.onChange(files[0]?.url || null)}
                bucket="cqer-technical-advisory-services-pdfs"
                accept=".pdf"
                disabled={isViewOnly}
              />
            </FormControl>
            <p className="text-[9px] text-muted-foreground">Suggested bucket name: <span className="font-medium">cqer-technical-advisory-services-pdfs</span></p>
            <FormMessage className="text-[10px]" />
          </FormItem>
        )} />

        {!isViewOnly && (
          <div className="flex justify-end gap-2 pt-2">
            {initialData && (
              <Button type="button" variant="destructive" className="h-8 text-[10px]" onClick={handleDelete} disabled={isSubmitting}>
                <Trash2 className="mr-1 h-3 w-3" />Delete
              </Button>
            )}
            <Button type="submit" className="h-8 bg-[#159E44] text-[10px] text-white hover:bg-[#128A3B]" disabled={isSubmitting}>
              <Save className="mr-1 h-3 w-3" />{isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
