"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import {
  Building2,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  UserRound,
  UsersRound,
} from "lucide-react";

import { FullscreenFormHeader } from "@/components/dashboard/fullscreen-form-header";
import { FileUpload } from "@/components/dashboard/file-upload";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import {
  createTechnicalAdvisoryService,
  updateTechnicalAdvisoryService,
  type CreateTechnicalAdvisoryServicePayload,
  type RatingBreakdown,
  type TechnicalAdvisoryServiceRecord,
} from "@/lib/actions/technical-advisory-services";

const stepLabels = ["Agency Information", "Advisory Services Details", "Assessment", "Saving"];
const nonNegativeNumber = z.coerce.number().min(0, "Value must be 0 or greater.");
const ratingBreakdownSchema = z.object({
  "5": nonNegativeNumber.default(0),
  "4": nonNegativeNumber.default(0),
  "3": nonNegativeNumber.default(0),
  "2": nonNegativeNumber.default(0),
  "1": nonNegativeNumber.default(0),
});

const clientSchema = z
  .object({
    name: z.string().trim().min(1, "Client name is required."),
    sex: z.enum(["male", "female"]),
    position: z.string().trim().min(1, "Position is required."),
    contact_through: z.enum(["email", "phone", "both"]),
    email: z.string().trim().optional().or(z.literal("")),
    phone_number: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if ((value.contact_through === "email" || value.contact_through === "both") && !value.email) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["email"], message: "Email is required." });
    }
    if ((value.contact_through === "phone" || value.contact_through === "both") && !value.phone_number) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phone_number"], message: "Phone number is required." });
    }
  });

const facultySchema = z.object({
  name: z.string().trim().min(1, "Faculty member name is required."),
});

const formSchema = z.object({
  agency_name: z.string().trim().min(1, "Name of agency is required."),
  agency_address: z.string().trim().min(1, "Address is required."),
  clients: z.array(clientSchema).min(1, "Add at least one client."),
  category: z.enum(["internal", "external"]),
  advisory_date: z.date(),
  venue: z.string().trim().min(1, "Venue is required."),
  faculty_members: z.array(facultySchema).min(1, "Add at least one faculty member."),
  number_of_hours: nonNegativeNumber,
  rating_relevance_breakdown: ratingBreakdownSchema,
  rating_quality_breakdown: ratingBreakdownSchema,
  rating_timeliness_breakdown: ratingBreakdownSchema,
  rating_overall_breakdown: ratingBreakdownSchema,
  documents: z.array(z.object({ url: z.string(), name: z.string() })).default([]),
});

type FormValues = z.infer<typeof formSchema>;

interface TechnicalAdvisoryServicesFormProps {
  initialData?: TechnicalAdvisoryServiceRecord;
  onSuccess: (action: "created" | "updated") => void;
  onClose?: () => void;
  isViewOnly?: boolean;
}

function normalizeDateValue(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function buildDefaultValues(record?: TechnicalAdvisoryServiceRecord): FormValues {
  return {
    agency_name: record?.agency_name || "",
    agency_address: record?.agency_address || "",
    clients: record?.clients?.length
      ? record.clients.map((client) => ({
          name: client.name || "",
          sex: client.sex || "male",
          position: client.position || "",
          contact_through: client.contact_through || "email",
          email: client.email || "",
          phone_number: client.phone_number || "",
        }))
      : [{ name: "", sex: "male", position: "", contact_through: "email", email: "", phone_number: "" }],
    category: record?.category || "internal",
    advisory_date: record?.advisory_date ? normalizeDateValue(new Date(record.advisory_date)) : normalizeDateValue(new Date()),
    venue: record?.venue || "",
    faculty_members: record?.faculty_members?.length
      ? record.faculty_members.map((member) => ({ name: member.name || "" }))
      : [{ name: "" }],
    number_of_hours: record?.number_of_hours ?? 0,
    rating_relevance_breakdown: record?.rating_relevance_breakdown || { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 },
    rating_quality_breakdown: record?.rating_quality_breakdown || { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 },
    rating_timeliness_breakdown: record?.rating_timeliness_breakdown || { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 },
    rating_overall_breakdown: record?.rating_overall_breakdown || { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 },
    documents: record?.documents || [],
  };
}

function getRatingsTotal(breakdown?: RatingBreakdown) {
  if (!breakdown) return 0;
  return Number(breakdown["5"] || 0) + Number(breakdown["4"] || 0) + Number(breakdown["3"] || 0) + Number(breakdown["2"] || 0) + Number(breakdown["1"] || 0);
}

function RatingBreakdownFields({
  title,
  value,
  onChange,
  disabled,
}: {
  title: string;
  value: RatingBreakdown;
  onChange: (next: RatingBreakdown) => void;
  disabled?: boolean;
}) {
  const total = getRatingsTotal(value);

  return (
    <Card className="rounded-2xl border-border/40 shadow-none">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-5">
          {(["5", "4", "3", "2", "1"] as const).map((key) => (
            <div key={key} className="space-y-2">
              <FormLabel className="text-xs">{key} - how many rated {key}</FormLabel>
              <Input
                type="number"
                min="0"
                value={String(value[key] ?? 0)}
                disabled={disabled}
                onChange={(event) => onChange({ ...value, [key]: Math.max(0, Number(event.target.value || 0)) })}
                onFocus={(event) => event.currentTarget.select()}
                className="h-10 rounded-xl text-sm"
              />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-3 text-sm">
          Total: <span className="font-semibold">{total}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function TechnicalAdvisoryServicesForm({
  initialData,
  onSuccess,
  onClose,
  isViewOnly = false,
}: TechnicalAdvisoryServicesFormProps) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const autoSubmitStartedRef = React.useRef(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: buildDefaultValues(initialData),
  });

  const clientsArray = useFieldArray({ control: form.control, name: "clients" });
  const facultyArray = useFieldArray({ control: form.control, name: "faculty_members" });
  const clients = useWatch({ control: form.control, name: "clients" });
  const ratingRelevance = useWatch({ control: form.control, name: "rating_relevance_breakdown" });
  const ratingQuality = useWatch({ control: form.control, name: "rating_quality_breakdown" });
  const ratingTimeliness = useWatch({ control: form.control, name: "rating_timeliness_breakdown" });
  const ratingOverall = useWatch({ control: form.control, name: "rating_overall_breakdown" });

  const relevanceTotal = getRatingsTotal(ratingRelevance);
  const qualityTotal = getRatingsTotal(ratingQuality);
  const timelinessTotal = getRatingsTotal(ratingTimeliness);
  const overallTotal = getRatingsTotal(ratingOverall);
  const grandTotal = relevanceTotal + qualityTotal + timelinessTotal + overallTotal;

  const validateStep = async () => {
    if (currentStep === 1) return form.trigger(["agency_name", "agency_address", "clients", "category"]);
    if (currentStep === 2) return form.trigger(["advisory_date", "venue", "faculty_members", "number_of_hours"]);
    if (currentStep === 3) return form.trigger(["rating_relevance_breakdown", "rating_quality_breakdown", "rating_timeliness_breakdown", "rating_overall_breakdown", "documents"]);
    return true;
  };

  const goNext = async () => {
    if (isViewOnly) {
      setCurrentStep((value) => Math.min(value + 1, stepLabels.length));
      return;
    }
    const valid = await validateStep();
    if (!valid) return;
    setCurrentStep((value) => Math.min(value + 1, stepLabels.length));
  };

  const goPrevious = () => setCurrentStep((value) => Math.max(value - 1, 1));

  const handleSubmit = React.useCallback(async (values: FormValues) => {
    const payload: CreateTechnicalAdvisoryServicePayload = {
      agency_name: values.agency_name,
      agency_address: values.agency_address,
      clients: values.clients.map((client) => ({
        ...client,
        email: client.contact_through === "phone" ? "" : client.email || "",
        phone_number: client.contact_through === "email" ? "" : client.phone_number || "",
      })),
      category: values.category,
      advisory_date: normalizeDateValue(values.advisory_date).toISOString(),
      venue: values.venue,
      faculty_members: values.faculty_members,
      number_of_hours: values.number_of_hours,
      rating_relevance_breakdown: values.rating_relevance_breakdown,
      rating_quality_breakdown: values.rating_quality_breakdown,
      rating_timeliness_breakdown: values.rating_timeliness_breakdown,
      rating_overall_breakdown: values.rating_overall_breakdown,
      documents: values.documents,
    };

    setIsSubmitting(true);
    const result = initialData?.id
      ? await updateTechnicalAdvisoryService(initialData.id, payload)
      : await createTechnicalAdvisoryService(payload);
    setIsSubmitting(false);

    if (result?.error) {
      alert(result.error);
      setCurrentStep(3);
      autoSubmitStartedRef.current = false;
      return;
    }

    onSuccess(initialData?.id ? "updated" : "created");
  }, [initialData?.id, onSuccess]);

  React.useEffect(() => {
    autoSubmitStartedRef.current = false;
  }, [initialData?.id]);

  React.useEffect(() => {
    if (currentStep !== 4 || isViewOnly || autoSubmitStartedRef.current) return;
    autoSubmitStartedRef.current = true;
    const timeout = window.setTimeout(() => {
      void form.handleSubmit(handleSubmit as any)();
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [currentStep, form, handleSubmit, isViewOnly]);

  return (
    <Form {...form}>
      <form onSubmit={(event) => event.preventDefault()} className="flex h-full min-h-0 flex-col bg-background">
        <FullscreenFormHeader
          title={initialData?.id ? (isViewOnly ? "Technical Advisory Details" : "Update Technical Advisory") : "Create Technical Advisory"}
          currentStep={currentStep}
          totalSteps={stepLabels.length}
          labels={stepLabels}
          onClose={onClose}
          items={[
            { icon: Building2, label: "Agency", value: form.watch("agency_name") || "Unassigned", minWidthClassName: "min-w-[200px]" },
            { icon: ClipboardCheck, label: "Category", value: form.watch("category") || "N/A", minWidthClassName: "min-w-[140px]" },
            { icon: UsersRound, label: "Grand Total Ratings", value: grandTotal, minWidthClassName: "min-w-[160px]" },
          ]}
        />

        <div className="flex-1 overflow-y-auto bg-background px-4 py-4 sm:px-6 lg:px-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <Card className="rounded-3xl border-border/40 shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-5 w-5 text-foreground" />
                    Agency Information
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Capture the agency details, client list, contact channel, and category.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 xl:grid-cols-2">
                    <FormField
                      control={form.control as any}
                      name="agency_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Name of Agency</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={isViewOnly} className="h-10 rounded-xl text-sm" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control as any}
                      name="agency_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Address</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input {...field} disabled={isViewOnly} className="h-10 rounded-xl pl-10 text-sm" />
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control as any}
                    name="category"
                    render={({ field }) => (
                      <FormItem className="max-w-sm">
                        <FormLabel className="text-xs">Category</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange} disabled={isViewOnly}>
                          <FormControl>
                            <SelectTrigger className="h-10 rounded-xl text-sm">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="internal" className="text-sm">Internal</SelectItem>
                            <SelectItem value="external" className="text-sm">External</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <Card className="rounded-2xl border-border/40 shadow-none">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-sm">Clients</CardTitle>
                        <CardDescription className="text-xs">Add one or more clients dynamically.</CardDescription>
                      </div>
                      {!isViewOnly && (
                        <Button type="button" className="rounded-xl bg-[#159E44] text-white hover:bg-[#128A3B]" onClick={() => clientsArray.append({ name: "", sex: "male", position: "", contact_through: "email", email: "", phone_number: "" })}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Client
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {clientsArray.fields.map((fieldItem, index) => {
                        const currentContactMode = clients?.[index]?.contact_through;
                        return (
                          <div key={fieldItem.id} className="space-y-4 rounded-2xl border border-border/40 p-4">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold">Client {index + 1}</p>
                              {!isViewOnly && clientsArray.fields.length > 1 && (
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive" onClick={() => clientsArray.remove(index)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <div className="grid gap-4 xl:grid-cols-2">
                              <FormField
                                control={form.control as any}
                                name={`clients.${index}.name`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Name of Client</FormLabel>
                                    <FormControl>
                                      <div className="relative">
                                        <UserRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input {...field} disabled={isViewOnly} className="h-10 rounded-xl pl-10 text-sm" />
                                      </div>
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control as any}
                                name={`clients.${index}.position`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Position</FormLabel>
                                    <FormControl>
                                      <Input {...field} disabled={isViewOnly} className="h-10 rounded-xl text-sm" />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <FormField
                              control={form.control as any}
                              name={`clients.${index}.sex`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Sex</FormLabel>
                                  <div className="flex gap-4 rounded-xl border border-border/40 px-4 py-3">
                                    <label className="flex items-center gap-2 text-sm">
                                      <Checkbox checked={field.value === "male"} onCheckedChange={() => field.onChange("male")} disabled={isViewOnly} />
                                      Male
                                    </label>
                                    <label className="flex items-center gap-2 text-sm">
                                      <Checkbox checked={field.value === "female"} onCheckedChange={() => field.onChange("female")} disabled={isViewOnly} />
                                      Female
                                    </label>
                                  </div>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control as any}
                              name={`clients.${index}.contact_through`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Contact Through</FormLabel>
                                  <Select value={field.value} onValueChange={field.onChange} disabled={isViewOnly}>
                                    <FormControl>
                                      <SelectTrigger className="h-10 rounded-xl text-sm max-w-sm">
                                        <SelectValue placeholder="Select contact method" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="email" className="text-sm">Email</SelectItem>
                                      <SelectItem value="phone" className="text-sm">Phone Number</SelectItem>
                                      <SelectItem value="both" className="text-sm">Both</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage className="text-xs" />
                                </FormItem>
                              )}
                            />
                            <div className="grid gap-4 xl:grid-cols-2">
                              {(currentContactMode === "email" || currentContactMode === "both") && (
                                <FormField
                                  control={form.control as any}
                                  name={`clients.${index}.email`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Email</FormLabel>
                                      <FormControl>
                                        <div className="relative">
                                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                          <Input {...field} disabled={isViewOnly} className="h-10 rounded-xl pl-10 text-sm" />
                                        </div>
                                      </FormControl>
                                      <FormMessage className="text-xs" />
                                    </FormItem>
                                  )}
                                />
                              )}
                              {(currentContactMode === "phone" || currentContactMode === "both") && (
                                <FormField
                                  control={form.control as any}
                                  name={`clients.${index}.phone_number`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Phone Number</FormLabel>
                                      <FormControl>
                                        <div className="relative">
                                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                          <Input {...field} disabled={isViewOnly} className="h-10 rounded-xl pl-10 text-sm" />
                                        </div>
                                      </FormControl>
                                      <FormMessage className="text-xs" />
                                    </FormItem>
                                  )}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <Card className="rounded-3xl border-border/40 shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UsersRound className="h-5 w-5 text-foreground" />
                    Advisory Services Details
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Record the date, venue, faculty members, and number of hours rendered.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 xl:grid-cols-2">
                    <FormField
                      control={form.control as any}
                      name="advisory_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-xs">Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant="outline" className={cn("h-10 justify-between rounded-xl text-sm font-normal", !field.value && "text-muted-foreground")} disabled={isViewOnly}>
                                  {field.value ? format(field.value, "PPP") : "Pick a date"}
                                  <CalendarIcon className="h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                  if (!date) return;
                                  field.onChange(normalizeDateValue(date));
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control as any}
                      name="venue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Venue</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={isViewOnly} className="h-10 rounded-xl text-sm" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Card className="rounded-2xl border-border/40 shadow-none">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-sm">Faculty Members</CardTitle>
                        <CardDescription className="text-xs">Add the faculty members who rendered the services.</CardDescription>
                      </div>
                      {!isViewOnly && (
                        <Button type="button" className="rounded-xl bg-[#159E44] text-white hover:bg-[#128A3B]" onClick={() => facultyArray.append({ name: "" })}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Faculty
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {facultyArray.fields.map((fieldItem, index) => (
                        <div key={fieldItem.id} className="flex items-start gap-2">
                          <FormField
                            control={form.control as any}
                            name={`faculty_members.${index}.name`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel className="text-xs">Name of the Faculty Member</FormLabel>
                                <FormControl>
                                  <Input {...field} disabled={isViewOnly} className="h-10 rounded-xl text-sm" />
                                </FormControl>
                                <FormMessage className="text-xs" />
                              </FormItem>
                            )}
                          />
                          {!isViewOnly && facultyArray.fields.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" className="mt-6 h-10 w-10 rounded-full text-destructive" onClick={() => facultyArray.remove(index)}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <FormField
                    control={form.control as any}
                    name="number_of_hours"
                    render={({ field }) => (
                      <FormItem className="max-w-sm">
                        <FormLabel className="text-xs">Number of Hours</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Clock3 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input type="number" min="0" {...field} disabled={isViewOnly} className="h-10 rounded-xl pl-10 text-sm" />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <Card className="rounded-3xl border-border/40 shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardCheck className="h-5 w-5 text-foreground" />
                    Assessment
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Capture the rating breakdowns and upload the supporting PDF document.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField control={form.control as any} name="rating_relevance_breakdown" render={({ field }) => (
                    <RatingBreakdownFields title="Client Rating on the Relevance of the Services" value={field.value} onChange={field.onChange} disabled={isViewOnly} />
                  )} />
                  <FormField control={form.control as any} name="rating_quality_breakdown" render={({ field }) => (
                    <RatingBreakdownFields title="Client Rating on the Quality of the Services" value={field.value} onChange={field.onChange} disabled={isViewOnly} />
                  )} />
                  <FormField control={form.control as any} name="rating_timeliness_breakdown" render={({ field }) => (
                    <RatingBreakdownFields title="Client Rating on the Timeliness of the Services" value={field.value} onChange={field.onChange} disabled={isViewOnly} />
                  )} />
                  <FormField control={form.control as any} name="rating_overall_breakdown" render={({ field }) => (
                    <RatingBreakdownFields title="Overall Satisfaction to Feedback to Experts" value={field.value} onChange={field.onChange} disabled={isViewOnly} />
                  )} />

                  <div className="rounded-2xl border border-border/40 bg-muted/10 px-4 py-4 text-sm">
                    Grand Total of All Ratings: <span className="font-semibold">{grandTotal}</span>
                  </div>

                  <Card className="rounded-2xl border-border/40 shadow-none">
                    <CardHeader>
                      <CardTitle className="text-sm">Uploading of Documents</CardTitle>
                      <CardDescription className="text-xs">
                        Upload PDF files to the private `cqer-technicaladv_pdf` bucket. Maximum 5MB per file.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control as any}
                        name="documents"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <FileUpload
                                value={field.value ?? []}
                                onChange={field.onChange}
                                disabled={isViewOnly}
                                bucket="cqer-technicaladv_pdf"
                                accept=".pdf"
                                maxSizeInMB={5}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <Card className="rounded-3xl border-border/40 shadow-none">
                <CardHeader>
                  <CardTitle className="text-center text-lg">{isViewOnly ? "Technical Advisory Summary" : isSubmitting ? "Saving..." : "Preparing Save"}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center py-10">
                  <div className="mb-4 rounded-full bg-muted p-6">
                    <Save className={cn("h-10 w-10 text-foreground", !isViewOnly && "animate-pulse")} />
                  </div>
                  <p className="max-w-md text-center text-sm text-muted-foreground">
                    {isViewOnly
                      ? "This technical advisory record is displayed in the same step-based layout used for create and update."
                      : "Please wait while the technical advisory record is automatically saved."}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <div className="border-t border-border/50 bg-background px-5 py-4 sm:px-7 lg:px-10">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">Step {currentStep} of {stepLabels.length}</div>
            <div className="flex flex-wrap justify-end gap-3">
              {currentStep > 1 && (
                <Button type="button" variant="outline" className="rounded-xl" onClick={goPrevious}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
              )}
              {currentStep < stepLabels.length && (
                <Button type="button" className="rounded-xl" onClick={goNext} disabled={isSubmitting}>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
