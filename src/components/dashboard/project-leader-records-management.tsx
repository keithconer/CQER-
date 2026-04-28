"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { IdCard, Search, Trash2, UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  createProjectLeaderRecord,
  deleteProjectLeaderRecord,
  type ProjectLeaderRecord,
} from "@/lib/actions/project-leader-records";
import { RecordPagination, useRecordPagination } from "@/components/dashboard/record-pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const formSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required."),
  last_name: z.string().trim().min(1, "Last name is required."),
  designation: z.string().trim().min(1, "Designation is required."),
});

type FormValues = z.infer<typeof formSchema>;

interface ProjectLeaderRecordsManagementProps {
  initialRecords: ProjectLeaderRecord[];
}

export function ProjectLeaderRecordsManagement({
  initialRecords,
}: ProjectLeaderRecordsManagementProps) {
  const router = useRouter();
  const [records, setRecords] = React.useState(initialRecords);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      designation: "",
    },
  });

  const designationInput = useWatch({
    control: form.control,
    name: "designation",
  }) || "";
  const designationSuggestions = React.useMemo(() => {
    const normalizedQuery = designationInput.trim().toLowerCase();
    const uniqueSuggestions = Array.from(
      new Set(
        records
          .map((record) => record.designation.trim())
          .filter(Boolean)
      )
    ).sort((left, right) => left.localeCompare(right));

    if (!normalizedQuery) {
      return uniqueSuggestions.slice(0, 6);
    }

    return uniqueSuggestions
      .filter((item) => item.toLowerCase().includes(normalizedQuery))
      .slice(0, 6);
  }, [designationInput, records]);

  const filteredRecords = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return records;

    return records.filter((record) =>
      [
        record.first_name,
        record.last_name,
        record.designation,
        record.department || "",
        record.unit || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [records, searchTerm]);

  const {
    currentPage,
    paginatedItems,
    resetPagination,
    setCurrentPage,
    startIndex,
    totalPages,
  } = useRecordPagination(filteredRecords);

  React.useEffect(() => {
    resetPagination();
  }, [resetPagination, searchTerm]);

  const onSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await createProjectLeaderRecord(values);
    setIsSubmitting(false);

    if (result?.error) {
      form.setError("root", { message: result.error });
      return;
    }

    if (result.data) {
      setRecords((previous) => [result.data!, ...previous]);
      form.reset({
        first_name: "",
        last_name: "",
        designation: "",
      });
      router.refresh();
    }
  });

  const handleDelete = async (id: string) => {
    setDeleteTargetId(id);
    const result = await deleteProjectLeaderRecord(id);
    setDeleteTargetId(null);

    if (result?.error) {
      alert(result.error);
      return;
    }

    setRecords((previous) => previous.filter((record) => record.id !== id));
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4.5 w-4.5 text-foreground" />
            Project Leader Registration
          </CardTitle>
          <CardDescription className="text-xs">
            Save project leader records without email accounts. Previous designations will appear as optional suggestions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">First Name</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isSubmitting} className="h-9 rounded-xl text-xs" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isSubmitting} className="h-9 rounded-xl text-xs" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="designation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Designation</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isSubmitting} className="h-9 rounded-xl text-xs" />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {designationSuggestions.length > 0 ? (
                <div className="space-y-2 rounded-2xl border border-border/40 bg-muted/10 px-3 py-3">
                  <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
                    <IdCard className="h-3.5 w-3.5" />
                    Suggested designation records
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {designationSuggestions.map((designation) => (
                      <Button
                        key={designation}
                        type="button"
                        variant="outline"
                        className="h-7 rounded-full px-3 text-[10px]"
                        onClick={() => form.setValue("designation", designation, { shouldDirty: true, shouldValidate: true })}
                      >
                        {designation}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}

              {form.formState.errors.root?.message ? (
                <p className="text-xs font-medium text-destructive">{form.formState.errors.root.message}</p>
              ) : null}

              <div className="flex justify-end">
                <Button type="submit" className="h-9 rounded-xl text-xs" disabled={isSubmitting}>
                  <UserPlus className="mr-2 h-3.5 w-3.5" />
                  {isSubmitting ? "Saving..." : "Save Record"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4.5 w-4.5 text-foreground" />
                Saved Project Leader Records
              </CardTitle>
              <CardDescription className="text-xs">
                Review and manage the records you registered for your unit.
              </CardDescription>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search name or designation..."
                className="h-9 rounded-xl pl-9 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-border/50">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="h-9 text-[10px] font-semibold">Name</TableHead>
                  <TableHead className="h-9 text-[10px] font-semibold">Designation</TableHead>
                  <TableHead className="h-9 text-[10px] font-semibold">Scope</TableHead>
                  <TableHead className="h-9 text-[10px] font-semibold">Created</TableHead>
                  <TableHead className="h-9 text-right text-[10px] font-semibold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length > 0 ? (
                  paginatedItems.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="py-3 text-xs font-medium">
                        {`${record.first_name} ${record.last_name}`.trim()}
                      </TableCell>
                      <TableCell className="py-3 text-xs">{record.designation}</TableCell>
                      <TableCell className="py-3 text-xs">
                        {record.department ? `${record.department}${record.unit ? ` • ${record.unit}` : ""}` : record.unit || "-"}
                      </TableCell>
                      <TableCell className="py-3 text-xs">
                        {record.created_at ? format(new Date(record.created_at), "MMM d, yyyy") : "-"}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl text-destructive"
                            disabled={deleteTargetId === record.id}
                            onClick={() => void handleDelete(record.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">
                      No project leader records found yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <RecordPagination
            currentPage={currentPage}
            totalPages={totalPages}
            startIndex={startIndex}
            totalItems={filteredRecords.length}
            itemLabel="project leader records"
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
