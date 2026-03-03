"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Eye, Pencil, Trash2, Search, ChevronLeft, ChevronRight, AlertTriangle, FileText, CalendarIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteProject } from "@/lib/actions/projects";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProjectForm } from "./project-form";
import { FileUpload } from "./file-upload";
import { useRouter } from "next/navigation";

export interface Project {
  id: string;
  created_by?: string;
  created_by_user_type?: "super_admin" | "college_coordinator" | "unit_coordinator" | null;
  created_by_unit?: string | null;
  entry_type?: "project" | "program" | null;
  project_no?: string | null;
  program_no?: string | null;
  moa_no?: string | null;
  contact_person?: string | null;
  contact_details?: string | null;
  title: string;
  classification: string[];
  academic_program: string;
  start_date: string | null;
  end_date: string | null;
  proponents: { name: string }[];
  co_project_leaders: { name: string }[];
  category: "new" | "existing" | "on process" | null;
  funding_source: "internally funded" | "externally funded" | null;
  lead_units?: string[];
  related_curricular_offerings?: string[];
  visibility_scope?: "public" | "specific_units" | null;
  visible_units?: string[];
  budget_total: number | null;
  budget_requirements: { name: string; amount: number }[];
  gad_score: number;
  sdg_goals: string[];
  target_beneficiaries: string[];
  documents: { url: string; name: string }[];
}

interface ProjectsTableProps {
  projects: Project[];
  entityType?: "project" | "program";
  readOnly?: boolean;
  currentUserId?: string;
  searchTerm?: string;
  onSearchTermChange?: (value: string) => void;
  showSearch?: boolean;
  paginationAlign?: "between" | "right";
  allowViewOnlyAction?: boolean;
  formContext?: {
    userType?: "super_admin" | "college_coordinator" | "unit_coordinator";
    department?: string | null;
    unit?: string | null;
    unitOptions?: string[];
  };
}

function DateInput({
  value,
  onChange,
}: {
  value: Date | null;
  onChange: (date: Date | null) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-8 w-full justify-start text-xs font-normal">
          {value ? format(value, "MMM d, yyyy") : "Pick date"}
          <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value || undefined} onSelect={(date) => onChange(date || null)} initialFocus />
      </PopoverContent>
    </Popover>
  );
}

function MultiToggle({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium">{label}</p>
      <div className="max-h-28 space-y-1 overflow-y-auto rounded-md border border-border/50 p-1.5">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2">
            <Checkbox
              checked={value.includes(option.value)}
              onCheckedChange={() =>
                onChange(value.includes(option.value) ? value.filter((item) => item !== option.value) : [...value, option.value])
              }
            />
            <span className="text-[10px]">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function ProjectsTable({
  projects,
  entityType = "project",
  readOnly = false,
  currentUserId,
  searchTerm: controlledSearchTerm,
  onSearchTermChange,
  showSearch = true,
  paginationAlign = "between",
  allowViewOnlyAction = false,
  formContext,
}: ProjectsTableProps) {
  const recordLabel = entityType === "program" ? "Program" : "Project";
  const recordLabelPlural = entityType === "program" ? "programs" : "projects";

  const [internalSearchTerm, setInternalSearchTerm] = React.useState("");
  const searchTerm = controlledSearchTerm ?? internalSearchTerm;
  const setSearchTerm = onSearchTermChange ?? setInternalSearchTerm;
  const [fundingView, setFundingView] = React.useState<"all" | "internal" | "external">("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 5;
  const showActionsColumn = !readOnly || allowViewOnlyAction;

  const [manageInternalOpen, setManageInternalOpen] = React.useState(false);
  const [internalProjectId, setInternalProjectId] = React.useState("");
  const [internalDates, setInternalDates] = React.useState<Date[]>([]);
  const [internalProjectDates, setInternalProjectDates] = React.useState<Date[]>([]);
  const [internalSdg, setInternalSdg] = React.useState<string[]>([]);
  const [internalThematic, setInternalThematic] = React.useState<string[]>([]);
  const [awardDate, setAwardDate] = React.useState<Date | null>(null);
  const [awardUpload, setAwardUpload] = React.useState<{ url: string; name: string }[]>([]);
  const [isSavingInternal, setIsSavingInternal] = React.useState(false);

  const [formData, setFormData] = React.useState({
    leadUnit: "",
    contactPerson: "",
    contactDetails: "",
    relatedCurricular: "",
    collaboratingAgencies: "",
    partOfProgram: false,
    programTitle: "",
    programObjectives: "",
    programStrategies: "",
    programLocale: "",
    programClienteleType: "",
    programClienteleNumber: "",
    programImplementersRole: "",
    approvedBudget: "",
    counterpartFund: "",
    moaNo: "",
    projectTitle: "",
    projectObjectives: "",
    projectStrategies: "",
    projectLocale: "",
    projectClienteleType: "",
    projectClienteleNumber: "",
    projectImplementersRole: "",
    projectApprovedBudget: "",
    projectCounterpartFund: "",
    projectMoaNo: "",
    reCouncilDate: null as Date | null,
    borOpDate: null as Date | null,
    inceptionDate: null as Date | null,
    beneficiaries: "",
    beneficiariesCount: "",
    awardTitle: "",
    conferringAgency: "",
    awardRemarks: "",
  });

  const [programTeamRows, setProgramTeamRows] = React.useState<
    { implementer: string; category: "faculty" | "staff"; specialization: string; functions: string }[]
  >([{ implementer: "", category: "faculty", specialization: "", functions: "" }]);

  const sdgOptions = React.useMemo(
    () => [
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
    ],
    []
  );
  const thematicOptions = React.useMemo(
    () => [
      "Agri-Fisheries and Food Security",
      "Biodiversity and Environmental Conservation",
      "Smart Engineering, ICT, and Industrial Competitiveness",
      "Public Health and Welfare",
      "Societal Development and Equality",
    ],
    []
  );

  const fundingFilteredProjects = React.useMemo(() => {
    if (fundingView === "all") return projects;
    const targetFunding = fundingView === "internal" ? "internally funded" : "externally funded";
    return projects.filter((project) => (project.funding_source || "").toLowerCase() === targetFunding);
  }, [fundingView, projects]);

  const filteredProjects = React.useMemo(() => {
    return fundingFilteredProjects.filter((project) =>
      [
        project.project_no || "",
        project.program_no || "",
        project.moa_no || "",
        project.title,
        project.academic_program,
        (project.proponents || []).map((person) => person?.name || "").join(", "),
        (project.co_project_leaders || []).map((person) => person?.name || "").join(", "),
        project.category || "",
        project.funding_source || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [fundingFilteredProjects, searchTerm]);

  const formatProjectLeaders = (proponents: Project["proponents"]) => {
    if (!Array.isArray(proponents) || proponents.length === 0) return "-";
    const names = proponents
      .map((item) => item?.name?.trim())
      .filter(Boolean) as string[];
    return names.length > 0 ? names.join(", ") : "-";
  };

  const formatDurationYears = (startDate?: string | null, endDate?: string | null) => {
    if (!startDate || !endDate) return "-";
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    return startYear === endYear ? String(startYear) : `${startYear}-${endYear}`;
  };

  const toTitleCase = (value?: string | null) =>
    (value || "")
      .split(" ")
      .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : ""))
      .join(" ");

  const formatCoProjectLeaders = (leaders: Project["co_project_leaders"]) => {
    if (!Array.isArray(leaders) || leaders.length === 0) return "-";
    const names = leaders
      .map((item) => item?.name?.trim())
      .filter(Boolean) as string[];
    return names.length > 0 ? names.join(", ") : "-";
  };

  const getBudgetTotal = (project: Project) => {
    if (typeof project.budget_total === "number") return project.budget_total;
    if (!Array.isArray(project.budget_requirements)) return 0;
    return project.budget_requirements.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0);
  };

  const formatBudgetTotal = (value: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + itemsPerPage);

  const internalFundingProjects = React.useMemo(
    () => projects.filter((project) => (project.funding_source || "").toLowerCase() === "internally funded"),
    [projects]
  );
  const existingMoaNos = React.useMemo(
    () =>
      Array.from(
        new Set(
          projects
            .map((project) => (project.moa_no || "").trim())
            .filter((value) => value.length > 0)
        )
      ),
    [projects]
  );

  // Reset to page 1 when search term/funding changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fundingView]);

  const [viewProject, setViewProject] = React.useState<Project | null>(null);
  const [editProject, setEditProject] = React.useState<Project | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const result = await deleteProject(deleteId);
      if (result.error) {
        alert("Error: " + result.error);
      } else {
        setDeleteId(null);
        router.refresh();
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async (url: string) => {
    if (!url) return;
    
    const supabase = createClient();
    const { data: dataResponse, error } = await supabase.storage
      .from("cqer-projects_pdfs")
      .createSignedUrl(url, 60);

    if (error) {
      console.error("Error creating signed URL:", error);
      alert("Error fetching document link.");
      return;
    }

    if (dataResponse?.signedUrl) {
      window.open(dataResponse.signedUrl, "_blank");
    }
  };

  React.useEffect(() => {
    if (!internalProjectId) return;
    const selected = internalFundingProjects.find((project) => project.id === internalProjectId);
    if (!selected) return;

    setFormData((prev) => ({
      ...prev,
      leadUnit: Array.isArray(selected.lead_units) ? selected.lead_units.join(", ") : "",
      contactPerson: selected.contact_person || formatProjectLeaders(selected.proponents),
      contactDetails: selected.contact_details || "",
      relatedCurricular: Array.isArray(selected.related_curricular_offerings)
        ? selected.related_curricular_offerings.join(", ")
        : "",
      collaboratingAgencies: "",
      moaNo: selected.moa_no || "",
      projectMoaNo: selected.moa_no || "",
    }));
  }, [internalFundingProjects, internalProjectId]);

  const approvedBudgetNumber = Number(formData.approvedBudget || 0);
  const counterpartNumber = Number(formData.counterpartFund || 0);
  const computedTotal = approvedBudgetNumber + counterpartNumber;
  const projectApprovedBudgetNumber = Number(formData.projectApprovedBudget || 0);
  const projectCounterpartNumber = Number(formData.projectCounterpartFund || 0);
  const computedProjectTotal = projectApprovedBudgetNumber + projectCounterpartNumber;

  const toIsoDates = (dates: Date[]) =>
    [...dates]
      .sort((a, b) => a.getTime() - b.getTime())
      .map((date) => format(date, "yyyy-MM-dd"));

  const handleSaveInternalFunding = async () => {
    if (!internalProjectId) {
      alert("Please select a Project No. first.");
      return;
    }

    setIsSavingInternal(true);
    try {
      const selected = internalFundingProjects.find((project) => project.id === internalProjectId);
      const projectNo = selected?.project_no || selected?.program_no || null;

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("You must be logged in to save.");
        return;
      }

      const payload = {
        project_id: internalProjectId,
        project_no: projectNo,
        lead_unit: formData.leadUnit || null,
        contact_person: formData.contactPerson || null,
        contact_details: formData.contactDetails || null,
        related_curricular_offering: formData.relatedCurricular || null,
        collaborating_agencies: formData.collaboratingAgencies || null,
        part_of_program: !!formData.partOfProgram,
        program_title: formData.programTitle || null,
        program_objectives: formData.programObjectives || null,
        program_implementing_strategies: formData.programStrategies || null,
        program_locale: formData.programLocale || null,
        program_type_of_clientele: formData.programClienteleType || null,
        program_number_of_clientele: formData.programClienteleNumber || null,
        program_implementers_team_role: formData.programImplementersRole || null,
        program_approved_budget_cvsu: approvedBudgetNumber || 0,
        program_counterpart_fund: counterpartNumber || 0,
        program_total_budget: computedTotal || 0,
        program_inclusive_dates: toIsoDates(internalDates),
        program_moa_no: formData.moaNo || null,
        program_team_members: programTeamRows,
        project_title: formData.projectTitle || null,
        project_objectives: formData.projectObjectives || null,
        project_implementing_strategies: formData.projectStrategies || null,
        project_locale: formData.projectLocale || null,
        project_type_of_clientele: formData.projectClienteleType || null,
        project_number_of_clientele: formData.projectClienteleNumber || null,
        project_implementers_team_role: formData.projectImplementersRole || null,
        project_approved_budget_cvsu: projectApprovedBudgetNumber || 0,
        project_counterpart_fund: projectCounterpartNumber || 0,
        project_total_budget: computedProjectTotal || 0,
        project_inclusive_dates: toIsoDates(internalProjectDates),
        project_moa_no: formData.projectMoaNo || null,
        re_council_approved_date: formData.reCouncilDate ? format(formData.reCouncilDate, "yyyy-MM-dd") : null,
        bor_op_approved_date: formData.borOpDate ? format(formData.borOpDate, "yyyy-MM-dd") : null,
        inception_meeting_date: formData.inceptionDate ? format(formData.inceptionDate, "yyyy-MM-dd") : null,
        beneficiaries_text: formData.beneficiaries || null,
        beneficiaries_count: formData.beneficiariesCount ? Number(formData.beneficiariesCount) : null,
        sdg_goals: internalSdg,
        thematic_areas: internalThematic,
        awards: [
          {
            title: formData.awardTitle,
            conferring_agency_body: formData.conferringAgency,
            date: awardDate ? format(awardDate, "yyyy-MM-dd") : null,
            remarks: formData.awardRemarks,
            documents: awardUpload,
          },
        ].filter((item) => item.title || item.conferring_agency_body || item.date || item.remarks || item.documents.length > 0),
        award_documents: awardUpload,
        created_by: user.id,
      };

      const { error } = await supabase.from("internal_funding_projects").insert([payload]);
      if (error) {
        alert(`Error: ${error.message}`);
        return;
      }

      alert("Internal funding project saved.");
      setManageInternalOpen(false);
      router.refresh();
    } finally {
      setIsSavingInternal(false);
    }
  };

  if (!projects || projects.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed rounded-lg bg-muted/20">
        <p className="text-xs text-muted-foreground">No {recordLabelPlural} found. Create one to get started.</p>
      </div>
    );
  }

  return (
      <div className="space-y-3">
      {showSearch && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 rounded-md border border-border/60 bg-muted/20 p-0.5">
            <Button
              type="button"
              size="sm"
              onClick={() => setFundingView("all")}
              className={`h-7 px-2.5 text-[10px] ${
                fundingView === "all"
                  ? "bg-[#159E44] text-white hover:bg-[#128A3B]"
                  : "bg-transparent text-foreground hover:bg-muted"
              }`}
            >
              Projects
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setFundingView("internal")}
              className={`h-7 px-2.5 text-[10px] ${
                fundingView === "internal"
                  ? "bg-[#159E44] text-white hover:bg-[#128A3B]"
                  : "bg-transparent text-foreground hover:bg-muted"
              }`}
            >
              Internal Funding
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setFundingView("external")}
              className={`h-7 px-2.5 text-[10px] ${
                fundingView === "external"
                  ? "bg-[#159E44] text-white hover:bg-[#128A3B]"
                  : "bg-transparent text-foreground hover:bg-muted"
              }`}
            >
              External Funding
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="h-8 border-border/50 bg-muted/20 pl-8 text-xs placeholder:text-[10px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {fundingView === "internal" && (
              <Button
                type="button"
                size="sm"
                className="h-8 bg-[#159E44] px-2.5 text-[10px] text-white hover:bg-[#128A3B]"
                onClick={() => setManageInternalOpen(true)}
              >
                Manage Internal Funding Projects
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="rounded-md border border-border/50 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="text-[10px] font-semibold h-9">{recordLabel} Title</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Project Leader</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Co-Project Leaders</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Program</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Duration (Year)</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Period (Date)</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Category</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Funding</TableHead>
              <TableHead className="text-[10px] font-semibold h-9">Budget Total</TableHead>
              {showActionsColumn && (
                <TableHead className="text-[10px] font-semibold h-9 text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProjects.length > 0 ? (
              paginatedProjects.map((project) => (
                <TableRow key={project.id} className="hover:bg-muted/10 border-border/30">
                  <TableCell className="py-2.5 px-3 max-w-[250px]">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium truncate" title={project.title}>
                        {project.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground line-clamp-1" title={Array.isArray(project.classification) ? project.classification.join(", ") : String(project.classification).replace(/[\[\]"]/g, '')}>
                        {Array.isArray(project.classification) ? project.classification.join(", ") : String(project.classification).replace(/[\[\]"]/g, '')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[10px] py-2.5 px-3 max-w-[220px]">
                    <span className="line-clamp-2" title={formatProjectLeaders(project.proponents)}>
                      {formatProjectLeaders(project.proponents)}
                    </span>
                  </TableCell>
                  <TableCell className="text-[10px] py-2.5 px-3 max-w-[220px]">
                    <span className="line-clamp-2" title={formatCoProjectLeaders(project.co_project_leaders)}>
                      {formatCoProjectLeaders(project.co_project_leaders)}
                    </span>
                  </TableCell>
                  <TableCell className="text-[10px] py-2.5 px-3">
                    {project.academic_program}
                  </TableCell>
                  <TableCell className="text-[10px] py-2.5 px-3">
                    {formatDurationYears(project.start_date, project.end_date)}
                  </TableCell>
                  <TableCell className="text-[10px] py-2.5 px-3">
                    {project.start_date && project.end_date ? (
                      <>
                        <span className="whitespace-nowrap">
                          {format(new Date(project.start_date), "MMM d, yyyy")}
                        </span>
                        <span className="mx-1 text-muted-foreground">-</span>
                        <span className="whitespace-nowrap">
                          {format(new Date(project.end_date), "MMM d, yyyy")}
                        </span>
                      </>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-[10px] py-2.5 px-3">
                    {project.category ? toTitleCase(project.category) : "-"}
                  </TableCell>
                  <TableCell className="text-[10px] py-2.5 px-3">
                    {project.funding_source || "-"}
                  </TableCell>
                  <TableCell className="text-[10px] py-2.5 px-3 font-medium whitespace-nowrap">
                    {formatBudgetTotal(getBudgetTotal(project))}
                  </TableCell>
                  {showActionsColumn && (
                    <TableCell className="py-2.5 px-3 text-right">
                    <div className="flex justify-end gap-1">
                      {project.documents && project.documents.length > 0 && (
                        project.documents.length === 1 ? (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-primary hover:text-primary/80 hover:bg-primary/10"
                            onClick={() => handleDownload(project.documents[0].url)}
                            title={project.documents[0].name}
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-primary hover:text-primary/80 hover:bg-primary/10"
                                title={`${project.documents.length} document(s)`}
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Select Document
                              </div>
                              {project.documents.map((doc, idx) => (
                                <DropdownMenuItem 
                                  key={idx} 
                                  onClick={() => handleDownload(doc.url)}
                                  className="text-xs py-2 cursor-pointer"
                                >
                                  <FileText className="h-3 w-3 mr-2 text-primary" />
                                  <span className="truncate">{doc.name}</span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => setViewProject(project)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {!readOnly && (!currentUserId || project.created_by === currentUserId) && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditProject(project)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                            onClick={() => setDeleteId(project.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={showActionsColumn ? 10 : 9} className="h-24 text-center text-xs text-muted-foreground">
                  No matches found for &quot;{searchTerm}&quot;
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className={`flex items-center px-2 pt-1 ${
            paginationAlign === "right" ? "justify-end" : "justify-between"
          }`}
        >
          {paginationAlign === "between" && (
            <p className="text-[10px] text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredProjects.length)} of {filteredProjects.length} {recordLabelPlural}
            </p>
          )}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 border-border/50"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-[10px] font-medium px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 border-border/50"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={manageInternalOpen} onOpenChange={setManageInternalOpen}>
        <DialogContent className="sm:max-w-[980px] max-h-[92vh] overflow-hidden p-6">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-sm font-semibold">Manage Internal Funding Projects</DialogTitle>
            <DialogDescription className="text-[10px]">
              Manage details for internally funded projects using existing project records.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[72vh] pr-4">
            <div className="space-y-4 pb-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div>
                  <p className="mb-1 text-[10px] font-medium">Project No.</p>
                  <Select value={internalProjectId} onValueChange={setInternalProjectId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select project number" />
                    </SelectTrigger>
                    <SelectContent>
                      {internalFundingProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id} className="text-xs">
                          {project.project_no || project.program_no || project.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-medium">Lead Unit</p>
                  <Input value={formData.leadUnit} disabled className="h-8 bg-muted/20 text-xs" />
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-medium">Contact Person</p>
                  <Input value={formData.contactPerson} onChange={(e) => setFormData((p) => ({ ...p, contactPerson: e.target.value }))} className="h-8 text-xs" />
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-medium">Number / Email</p>
                  <Input value={formData.contactDetails} onChange={(e) => setFormData((p) => ({ ...p, contactDetails: e.target.value }))} className="h-8 text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <p className="mb-1 text-[10px] font-medium">Related Curricular Offering</p>
                  <Input value={formData.relatedCurricular} disabled className="h-8 bg-muted/20 text-xs" />
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-medium">Collaborating Agencies</p>
                  <Input value={formData.collaboratingAgencies} onChange={(e) => setFormData((p) => ({ ...p, collaboratingAgencies: e.target.value }))} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-medium">Part of a Program</p>
                  <label className="flex items-center gap-2 text-[10px]">
                    <Checkbox checked={formData.partOfProgram} onCheckedChange={(v) => setFormData((p) => ({ ...p, partOfProgram: !!v }))} />
                    Yes
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-[10px] font-medium">Program / Project Overview</p>
                  <Input placeholder="Title" value={formData.programTitle} onChange={(e) => setFormData((p) => ({ ...p, programTitle: e.target.value }))} className="h-8 text-xs" />
                  <Textarea placeholder="Objectives" value={formData.programObjectives} onChange={(e) => setFormData((p) => ({ ...p, programObjectives: e.target.value }))} className="min-h-[58px] text-xs" />
                  <Textarea placeholder="Implementing Strategies" value={formData.programStrategies} onChange={(e) => setFormData((p) => ({ ...p, programStrategies: e.target.value }))} className="min-h-[58px] text-xs" />
                  <Input placeholder="Locale" value={formData.programLocale} onChange={(e) => setFormData((p) => ({ ...p, programLocale: e.target.value }))} className="h-8 text-xs" />
                  <Input placeholder="Type of Clientele" value={formData.programClienteleType} onChange={(e) => setFormData((p) => ({ ...p, programClienteleType: e.target.value }))} className="h-8 text-xs" />
                  <Input placeholder="Number of Clientele" value={formData.programClienteleNumber} onChange={(e) => setFormData((p) => ({ ...p, programClienteleNumber: e.target.value }))} className="h-8 text-xs" />
                  <Input placeholder="Implementers / Team Members / Role" value={formData.programImplementersRole} onChange={(e) => setFormData((p) => ({ ...p, programImplementersRole: e.target.value }))} className="h-8 text-xs" />
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    <Input placeholder="Approved Budget - CvSU" value={formData.approvedBudget} onChange={(e) => setFormData((p) => ({ ...p, approvedBudget: e.target.value }))} className="h-8 text-xs" />
                    <Input placeholder="Counterpart Fund (optional)" value={formData.counterpartFund} onChange={(e) => setFormData((p) => ({ ...p, counterpartFund: e.target.value }))} className="h-8 text-xs" />
                    <Input value={computedTotal || 0} readOnly disabled className="h-8 bg-muted/20 text-xs" />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-medium">Project Section</p>
                  <Input placeholder="Title" value={formData.projectTitle} onChange={(e) => setFormData((p) => ({ ...p, projectTitle: e.target.value }))} className="h-8 text-xs" />
                  <Textarea placeholder="Objectives" value={formData.projectObjectives} onChange={(e) => setFormData((p) => ({ ...p, projectObjectives: e.target.value }))} className="min-h-[58px] text-xs" />
                  <Textarea placeholder="Implementing Strategies" value={formData.projectStrategies} onChange={(e) => setFormData((p) => ({ ...p, projectStrategies: e.target.value }))} className="min-h-[58px] text-xs" />
                  <Input placeholder="Locale" value={formData.projectLocale} onChange={(e) => setFormData((p) => ({ ...p, projectLocale: e.target.value }))} className="h-8 text-xs" />
                  <Input placeholder="Type of Clientele" value={formData.projectClienteleType} onChange={(e) => setFormData((p) => ({ ...p, projectClienteleType: e.target.value }))} className="h-8 text-xs" />
                  <Input placeholder="Number of Clientele" value={formData.projectClienteleNumber} onChange={(e) => setFormData((p) => ({ ...p, projectClienteleNumber: e.target.value }))} className="h-8 text-xs" />
                  <Input placeholder="Implementers / Team Members / Role" value={formData.projectImplementersRole} onChange={(e) => setFormData((p) => ({ ...p, projectImplementersRole: e.target.value }))} className="h-8 text-xs" />
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    <Input placeholder="Approved Budget - CvSU" value={formData.projectApprovedBudget} onChange={(e) => setFormData((p) => ({ ...p, projectApprovedBudget: e.target.value }))} className="h-8 text-xs" />
                    <Input placeholder="Counterpart Fund (optional)" value={formData.projectCounterpartFund} onChange={(e) => setFormData((p) => ({ ...p, projectCounterpartFund: e.target.value }))} className="h-8 text-xs" />
                    <Input value={computedProjectTotal || 0} readOnly disabled className="h-8 bg-muted/20 text-xs" />
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium">Project Duration Inclusive Dates</p>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="h-8 w-full justify-start text-xs font-normal">
                            {internalProjectDates.length > 0
                              ? `${format(new Date(Math.min(...internalProjectDates.map((d) => d.getTime()))), "MMM d, yyyy")} - ${format(new Date(Math.max(...internalProjectDates.map((d) => d.getTime()))), "MMM d, yyyy")}`
                              : "Select dates"}
                            <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="multiple" selected={internalProjectDates} onSelect={(d) => setInternalProjectDates(d || [])} />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium">Project MOA No.</p>
                      <Select value={formData.projectMoaNo} onValueChange={(value) => setFormData((p) => ({ ...p, projectMoaNo: value }))}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select MOA No." />
                        </SelectTrigger>
                        <SelectContent>
                          {existingMoaNos.map((moaNo) => (
                            <SelectItem key={`project-moa-${moaNo}`} value={moaNo} className="text-xs">{moaNo}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-[10px] font-medium">Duration Inclusive Dates</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-8 w-full justify-start text-xs font-normal">
                        {internalDates.length > 0 ? `${format(new Date(Math.min(...internalDates.map((d) => d.getTime()))), "MMM d, yyyy")} - ${format(new Date(Math.max(...internalDates.map((d) => d.getTime()))), "MMM d, yyyy")}` : "Select dates"}
                        <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="multiple" selected={internalDates} onSelect={(d) => setInternalDates(d || [])} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-medium">MOA No.</p>
                  <Select value={formData.moaNo} onValueChange={(value) => setFormData((p) => ({ ...p, moaNo: value }))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select MOA No." />
                    </SelectTrigger>
                    <SelectContent>
                      {existingMoaNos.map((moaNo) => (
                        <SelectItem key={moaNo} value={moaNo} className="text-xs">{moaNo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 rounded-md border border-border/50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-medium">Program Team</p>
                  <Button type="button" size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setProgramTeamRows((prev) => [...prev, { implementer: "", category: "faculty", specialization: "", functions: "" }])}>
                    <Plus className="mr-1 h-3 w-3" /> Add member
                  </Button>
                </div>
                {programTeamRows.map((member, index) => (
                  <div key={index} className="grid grid-cols-1 gap-2 md:grid-cols-4">
                    <Input value={member.implementer} onChange={(e) => setProgramTeamRows((prev) => prev.map((row, i) => i === index ? { ...row, implementer: e.target.value } : row))} placeholder="Implementer / Team Member" className="h-8 text-xs" />
                    <Select value={member.category} onValueChange={(value: "faculty" | "staff") => setProgramTeamRows((prev) => prev.map((row, i) => i === index ? { ...row, category: value } : row))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="faculty" className="text-xs">Faculty</SelectItem>
                        <SelectItem value="staff" className="text-xs">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input value={member.specialization} onChange={(e) => setProgramTeamRows((prev) => prev.map((row, i) => i === index ? { ...row, specialization: e.target.value } : row))} placeholder="Field of Specialization" className="h-8 text-xs" />
                    <Input value={member.functions} onChange={(e) => setProgramTeamRows((prev) => prev.map((row, i) => i === index ? { ...row, functions: e.target.value } : row))} placeholder="Functions / Nature of Involvement" className="h-8 text-xs" />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div><p className="mb-1 text-[10px] font-medium">Date approved by the R&E Council</p><DateInput value={formData.reCouncilDate} onChange={(value) => setFormData((p) => ({ ...p, reCouncilDate: value }))} /></div>
                <div><p className="mb-1 text-[10px] font-medium">Date approved by the BOR / OP</p><DateInput value={formData.borOpDate} onChange={(value) => setFormData((p) => ({ ...p, borOpDate: value }))} /></div>
                <div><p className="mb-1 text-[10px] font-medium">Date of inception meeting</p><DateInput value={formData.inceptionDate} onChange={(value) => setFormData((p) => ({ ...p, inceptionDate: value }))} /></div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Beneficiaries (text)" value={formData.beneficiaries} onChange={(e) => setFormData((p) => ({ ...p, beneficiaries: e.target.value }))} className="h-8 text-xs" />
                  <Input placeholder="Beneficiaries (number)" value={formData.beneficiariesCount} onChange={(e) => setFormData((p) => ({ ...p, beneficiariesCount: e.target.value }))} className="h-8 text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MultiToggle options={sdgOptions.map((o) => ({ value: o.id, label: o.label }))} value={internalSdg} onChange={setInternalSdg} label="SDGs" />
                  <MultiToggle options={thematicOptions.map((o) => ({ value: o, label: o }))} value={internalThematic} onChange={setInternalThematic} label="Thematic" />
                </div>
              </div>

              <div className="space-y-2 rounded-md border border-border/50 p-3">
                <p className="text-[10px] font-medium">Awards</p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Input placeholder="Title of Award" value={formData.awardTitle} onChange={(e) => setFormData((p) => ({ ...p, awardTitle: e.target.value }))} className="h-8 text-xs" />
                  <Input placeholder="Conferring Agency/Body" value={formData.conferringAgency} onChange={(e) => setFormData((p) => ({ ...p, conferringAgency: e.target.value }))} className="h-8 text-xs" />
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <DateInput value={awardDate} onChange={setAwardDate} />
                  <Input placeholder="Remarks" value={formData.awardRemarks} onChange={(e) => setFormData((p) => ({ ...p, awardRemarks: e.target.value }))} className="h-8 text-xs" />
                </div>
                <FileUpload value={awardUpload} onChange={setAwardUpload} maxFiles={5} />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-2">
            <Button variant="outline" className="h-8 text-xs" onClick={() => setManageInternalOpen(false)}>Close</Button>
            <Button
              className="h-8 text-xs bg-[#159E44] hover:bg-[#128A3B]"
              onClick={handleSaveInternalFunding}
              disabled={isSavingInternal}
            >
              {isSavingInternal ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={!!viewProject} onOpenChange={(open) => !open && setViewProject(null)}>
        <DialogContent className="sm:max-w-[800px] p-6 max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">{recordLabel} Details</DialogTitle>
            <DialogDescription className="text-[10px]">
              Viewing complete information for {viewProject?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {viewProject && (
              <ProjectForm
                project={viewProject}
                mode={(viewProject.entry_type || entityType) as "project" | "program"}
                isViewOnly
                onSuccess={() => setViewProject(null)}
                currentUserType={formContext?.userType}
                currentDepartment={formContext?.department}
                currentUnit={formContext?.unit}
                unitOptions={formContext?.unitOptions}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editProject} onOpenChange={(open) => !open && setEditProject(null)}>
        <DialogContent className="sm:max-w-[800px] p-6 max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">Edit {recordLabel}</DialogTitle>
            <DialogDescription className="text-[10px]">
              Modify {recordLabel.toLowerCase()} information below.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {editProject && (
              <ProjectForm 
                project={editProject} 
                mode={(editProject.entry_type || entityType) as "project" | "program"}
                currentUserType={formContext?.userType}
                currentDepartment={formContext?.department}
                currentUnit={formContext?.unit}
                unitOptions={formContext?.unitOptions}
                onSuccess={() => {
                  setEditProject(null);
                  router.refresh();
                }} 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader className="flex flex-col items-center justify-center pt-4">
            <div className="rounded-full bg-destructive/10 p-3 mb-4">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            <DialogTitle className="text-lg font-semibold text-center">Delete {recordLabel}?</DialogTitle>
            <DialogDescription className="text-xs text-center">
              This action cannot be undone. This will permanently delete the {recordLabel.toLowerCase()} data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2">
            <Button 
              variant="outline"
              onClick={() => setDeleteId(null)}
              className="h-9 text-xs"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              className="h-9 text-xs px-8"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
