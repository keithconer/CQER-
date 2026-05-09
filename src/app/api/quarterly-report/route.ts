import type ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

import {
  QUARTERLY_REPORT_SHEET_NAMES,
  type QuarterlyReportSheetName,
} from "@/lib/quarterly-report/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProjectBudgetSnapshot, getProjectOverallBudget } from "@/lib/project-budget";

export const runtime = "nodejs";

type ReportPayload = {
  academicYear?: string;
  quarter?: string;
  college?: string;
  generatedBy?: string;
  dateGenerated?: string;
  selectedTables?: string[];
};

type CellValue = string | number | Date | null;
type AnyRecord = Record<string, unknown>;

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "public",
  "templates",
  "EXTN-QF-02 Quarterly Report (V02).xlsx"
);

const DATA_START_ROWS: Partial<Record<QuarterlyReportSheetName, number>> = {
  "Table 3. Trainings ": 6,
  "Table 4. Technical Advisory Ser": 6,
  "Table 10. Extension PPAs Featur": 4,
};

const SECTION_MARKERS = [
  "instruction",
  "supporting document",
  "supporting documents",
  "for campus/college",
  "* for",
  "note:",
];

function asText(value: unknown) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") return String(item);
        if (item && typeof item === "object") {
          const entry = item as AnyRecord;
          return String(entry.name || entry.agency_name || entry.title || entry.value || "").trim();
        }
        return "";
      })
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object") return "";
  return String(value);
}

function asNumber(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function formatDate(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return asText(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function fullName(record: AnyRecord) {
  return [record.first_name, record.last_name].map(asText).filter(Boolean).join(" ");
}

function getProjectNo(project: AnyRecord) {
  return asText(project.project_no || project.id).slice(0, 36);
}

function getProjectLeader(project: AnyRecord) {
  const proponents = Array.isArray(project.proponents) ? project.proponents : [];
  const names = proponents
    .map((item) => (item && typeof item === "object" ? asText((item as AnyRecord).name) : asText(item)))
    .filter(Boolean);
  return names.join(", ");
}

function getCollaboratingAgencies(project: AnyRecord) {
  return asText(project.partner_agencies || project.collaborating_agencies);
}

function getBeneficiaries(project: AnyRecord) {
  return asText(project.target_beneficiaries || project.beneficiaries);
}

function getLeadUnit(record: AnyRecord, fallbackDepartment: string) {
  return asText(record.lead_units) || asText(record.department) || asText(record.college) || fallbackDepartment;
}

function getInclusiveDates(record: AnyRecord) {
  if (Array.isArray(record.inclusive_dates) && record.inclusive_dates.length > 0) {
    const dates = record.inclusive_dates.map(formatDate).filter(Boolean);
    return dates.length > 1 ? `${dates[0]} - ${dates[dates.length - 1]}` : dates[0] || "";
  }
  const start = formatDate(record.start_date || record.coverage_start);
  const end = formatDate(record.end_date || record.coverage_end);
  if (start && end) return `${start} - ${end}`;
  return start || end;
}

function getTrainingCategories(record: AnyRecord) {
  return asText(record.training_categories) || asText(record.training_category);
}

function getRating(record: AnyRecord, key: string, rating: number) {
  const breakdown = record[key];
  if (!breakdown || typeof breakdown !== "object") return "";
  return asNumber((breakdown as AnyRecord)[String(rating)]);
}

function getSourceOfFund(record: AnyRecord) {
  const base = asText(record.source_of_fund);
  const other = asText(record.source_of_fund_other);
  return other ? `${base}${base ? ": " : ""}${other}` : base;
}

function makeRows(records: AnyRecord[], mapper: (record: AnyRecord, index: number) => CellValue[]) {
  return records.map((record, index) => mapper(record, index));
}

function mapProject(project: AnyRecord, department: string, contactName: string, contactEmail: string) {
  const budget = getProjectOverallBudget(project as never);
  const snapshot = getProjectBudgetSnapshot(project as never);
  const fundingData = (project.funding_data && typeof project.funding_data === "object" ? project.funding_data : {}) as AnyRecord;
  return {
    no: getProjectNo(project),
    category: asText(project.category) || "On-going",
    leadUnit: getLeadUnit(project, department),
    contactName,
    contactEmail,
    curricularOffering: asText(project.related_curricular_offerings || project.academic_program),
    agencies: getCollaboratingAgencies(project),
    title: asText(project.title),
    objectives: asText(project.objectives || fundingData.objectives),
    strategy: asText(project.implementing_strategy || fundingData.implementing_strategy),
    locale: asText(project.community_location || fundingData.locale),
    clientele: asText(project.clientele || fundingData.clientele),
    clienteleCount: asText(project.clientele_count || fundingData.clientele_count),
    team: getProjectLeader(project),
    approvedBudget: asNumber(project.budget_total) || budget,
    counterpart: asNumber(fundingData.counterpart_fund),
    totalBudget: budget || snapshot.totalBudget,
    duration: getInclusiveDates(project),
    moaNo: asText(project.moa_no),
    beneficiaries: getBeneficiaries(project),
    sdg: asText(project.sdg_goals || fundingData.sdg_main),
    thematicArea: asText(project.thematic_area || fundingData.thematic_area),
    remarks: asText(project.remarks),
    fundingAgency: asText(fundingData.external_funding_agency),
  };
}

function reportRows(
  sheetName: QuarterlyReportSheetName,
  datasets: Record<string, AnyRecord[]>,
  meta: { department: string; contactName: string; contactEmail: string }
) {
  const { department, contactName, contactEmail } = meta;
  const projects = datasets.projects || [];
  if (sheetName === "Table 1. Active Partnerships") {
    return makeRows(projects.filter((project) => getCollaboratingAgencies(project)), (project) => [
      asText(project.moa_no),
      asText(project.partnership_status || project.category) || "Existing",
      formatDate(project.moa_signed_date || project.start_date),
      getLeadUnit(project, department),
      contactName,
      contactEmail,
      asText(project.related_curricular_offerings || project.academic_program),
      asNumber(project.partner_agency_count) || (Array.isArray(project.partner_agencies) ? project.partner_agencies.length : ""),
      getCollaboratingAgencies(project),
      "",
      "",
      asText(project.partnership_level),
      asText(project.partner_agency_category),
      asText(project.nature_of_partnership || project.funding_source),
      asText(project.title),
      asText(project.partnership_type),
      formatDate(project.bor_approval_date),
      getInclusiveDates(project),
      getInclusiveDates(project),
      asNumber(project.amount_involved || project.budget_total) || "",
      asText(project.sdg_goals),
      asText(project.thematic_area),
      "",
      asText(project.remarks),
    ]);
  }

  if (sheetName === "Table 2a. Internally Funded Ext" || sheetName === "Table 2b. Externally Funded Ext") {
    const external = sheetName === "Table 2b. Externally Funded Ext";
    return makeRows(
      projects.filter((project) => {
        const source = asText(project.funding_source).toLowerCase();
        return external ? source.includes("external") : !source.includes("external");
      }),
      (project) => {
        const mapped = mapProject(project, department, contactName, contactEmail);
        const base = [
          mapped.no,
          mapped.category,
          mapped.leadUnit,
          mapped.contactName,
          mapped.contactEmail,
          mapped.curricularOffering,
          mapped.agencies,
          "",
          "",
          "",
          "",
          "",
          "",
          external ? mapped.approvedBudget : mapped.team,
          external ? mapped.counterpart : mapped.approvedBudget,
          external ? mapped.totalBudget : mapped.counterpart,
          external ? mapped.duration : mapped.totalBudget,
          external ? mapped.moaNo : mapped.duration,
          external ? mapped.team : mapped.moaNo,
          "",
          "",
          "",
          mapped.title,
          mapped.objectives,
          mapped.strategy,
          mapped.locale,
          mapped.clientele,
          mapped.clienteleCount,
          external ? mapped.approvedBudget : mapped.team,
          external ? mapped.counterpart : mapped.approvedBudget,
          external ? mapped.totalBudget : mapped.counterpart,
          external ? mapped.duration : mapped.totalBudget,
          external ? mapped.team : mapped.duration,
          "",
          "",
          "",
        ];
        if (external) {
          return [
            ...base,
            mapped.moaNo,
            mapped.fundingAgency,
            "",
            "",
            mapped.beneficiaries,
            mapped.sdg,
            mapped.thematicArea,
            "",
            "",
            "",
            mapped.remarks,
          ];
        }
        return [
          ...base,
          "",
          "",
          "",
          "",
          "",
          mapped.beneficiaries,
          mapped.sdg,
          mapped.thematicArea,
          "",
          "",
          "",
          mapped.remarks,
        ];
      }
    );
  }

  if (sheetName === "Table 2c. Needs Assessment") {
    return makeRows(datasets.needs_assessments || [], (record, index) => [
      index + 1,
      asText(record.category),
      asText(record.needs_assessment || record.project_title),
      formatDate(record.date_conducted),
      asText(record.place_conducted),
      asText(record.results_used),
    ]);
  }

  if (sheetName === "Table 2d. Consultancy Extension") {
    return makeRows(datasets.consultancy_extensions || [], (record, index) => [
      index + 1,
      asText(record.category),
      asText(record.related_project_id || record.related_project_title) ? "Yes" : "No",
      asText(record.related_project_title),
      asText(record.title_of_consultancy),
      asText(record.base_agency_institute),
      asText(record.nature_of_consultancy),
      asText(record.status),
    ]);
  }

  if (sheetName === "Table 3. Trainings ") {
    return makeRows(datasets.trainings || [], (record) => [
      asText(record.training_no || record.id).slice(0, 36),
      getLeadUnit(record, department),
      asText(record.contact_person) || contactName,
      asText(record.contact_details) || contactEmail,
      asText(record.related_curricular_offerings),
      asText(record.partner_agencies),
      asText(record.contact_person) || contactName,
      asText(record.related_project_id || record.related_project_title),
      getTrainingCategories(record),
      asText(record.related_project_id || record.related_project_title) ? "Yes" : "No",
      asText(record.training_title),
      getInclusiveDates(record),
      asText(record.venue_platform),
      asText(record.sdg_main || record.sdg_goals),
      asText(record.sdg_sub),
      getTrainingCategories(record),
      asText(record.training_mode),
      asNumber(record.faculty_male),
      asNumber(record.faculty_female),
      asNumber(record.non_academic_male),
      asNumber(record.non_academic_female),
      asNumber(record.cvsu_students_male),
      asNumber(record.cvsu_students_female),
      asNumber(record.partner_agencies_male),
      asNumber(record.partner_agencies_female),
      asNumber(record.participants_male_total),
      asNumber(record.participants_female_total),
      asNumber(record.participants_prefer_not_say),
      asNumber(record.participants_overall_total),
      asNumber(record.category_student),
      asNumber(record.category_farmer),
      asNumber(record.category_fisherfolk),
      asNumber(record.category_ag_technical),
      asNumber(record.category_government_employee),
      asNumber(record.category_private_employee),
      asNumber(record.category_4ps),
      asNumber(record.category_others),
      asNumber(record.category_total),
      asNumber(record.tvl_solo_parent),
      asNumber(record.tvl_4ps_members),
      asNumber(record.tvl_disabilities_count),
      asText(record.tvl_disability_breakdown),
      asNumber(record.total_persons_trained || record.tvl_total_persons_trained),
      "",
      "",
      "",
      "",
      "",
      asNumber(record.weighted_days_trained),
      asNumber(record.total_trainees_surveyed),
      getRating(record, "rating_relevance_breakdown", 1),
      getRating(record, "rating_relevance_breakdown", 2),
      getRating(record, "rating_relevance_breakdown", 3),
      getRating(record, "rating_relevance_breakdown", 4),
      getRating(record, "rating_relevance_breakdown", 5),
      getRating(record, "rating_quality_breakdown", 1),
      getRating(record, "rating_quality_breakdown", 2),
      getRating(record, "rating_quality_breakdown", 3),
      getRating(record, "rating_quality_breakdown", 4),
      getRating(record, "rating_quality_breakdown", 5),
      getRating(record, "rating_timeliness_breakdown", 1),
      getRating(record, "rating_timeliness_breakdown", 2),
      getRating(record, "rating_timeliness_breakdown", 3),
      getRating(record, "rating_timeliness_breakdown", 4),
      getRating(record, "rating_timeliness_breakdown", 5),
      asNumber(record.total_clients_requesting_trainings),
      asNumber(record.total_requests_responded_next_3_days),
      asNumber(record.amount_charged_to_cvsu),
      asNumber(record.amount_charged_to_partner_agency),
      asText(record.expense_partner_agency_name),
      asText(record.thematic_area),
      asText(record.remarks),
    ]);
  }

  if (sheetName === "Table 4. Technical Advisory Ser") {
    return makeRows(datasets.technical_advisory_services || [], (record, index) => {
      const clients = Array.isArray(record.clients) ? record.clients : [];
      const firstClient = (clients[0] && typeof clients[0] === "object" ? clients[0] : {}) as AnyRecord;
      return [
        index + 1,
        asText(record.unit || record.department) || department,
        contactName,
        contactEmail,
        "",
        asText(firstClient.name || record.agency_name),
        asText(firstClient.sex),
        asText(firstClient.address || record.agency_address),
        asText(firstClient.agency || record.agency_name),
        asText(firstClient.position),
        asText(firstClient.contact_number),
        asText(firstClient.email),
        asText(record.category || firstClient.category),
        asText(record.project_no),
        formatDate(record.advisory_date),
        asText(record.venue),
        asText(record.faculty_members),
        asText(record.services_provided),
        getRating(record, "rating_quality_breakdown", 1),
        getRating(record, "rating_quality_breakdown", 2),
        getRating(record, "rating_quality_breakdown", 3),
        getRating(record, "rating_quality_breakdown", 4),
        getRating(record, "rating_quality_breakdown", 5),
        getRating(record, "rating_relevance_breakdown", 1),
        getRating(record, "rating_relevance_breakdown", 2),
        getRating(record, "rating_relevance_breakdown", 3),
        getRating(record, "rating_relevance_breakdown", 4),
        getRating(record, "rating_relevance_breakdown", 5),
        getRating(record, "rating_timeliness_breakdown", 1),
        getRating(record, "rating_timeliness_breakdown", 2),
        getRating(record, "rating_timeliness_breakdown", 3),
        getRating(record, "rating_timeliness_breakdown", 4),
        getRating(record, "rating_timeliness_breakdown", 5),
        getRating(record, "rating_overall_breakdown", 1),
        getRating(record, "rating_overall_breakdown", 2),
        getRating(record, "rating_overall_breakdown", 3),
        getRating(record, "rating_overall_breakdown", 4),
        getRating(record, "rating_overall_breakdown", 5),
        asText(record.comments),
      ];
    });
  }

  if (sheetName === "Table 5. Adopters with Enterpri") {
    return makeRows(datasets.adopters_with_enterprise || [], (record, index) => {
      const adopters = Array.isArray(record.adopters) ? record.adopters : [];
      const first = (adopters[0] && typeof adopters[0] === "object" ? adopters[0] : {}) as AnyRecord;
      return [
        index + 1,
        asText(record.unit || record.department) || department,
        contactName,
        contactEmail,
        "",
        asText(first.name),
        asText(first.address),
        asText(first.contact),
        asText(first.sex),
        asText(first.category),
        asText(record.related_project_title),
        asText(first.trainings_attended),
        asText(first.other_assistance),
        formatDate(record.transfer_date || first.adoption_date),
        asText(record.technology_transferred),
        asNumber(first.previous_income) || "",
        asNumber(first.current_income) || "",
        asNumber(first.income_difference) || "",
        asText(first.significant_changes),
        asText(record.remarks),
      ];
    });
  }

  if (sheetName === "Table 6. IEC Materials") {
    return makeRows(datasets.iec_materials || [], (record, index) => [
      index + 1,
      asText(record.unit || record.department) || department,
      contactName,
      contactEmail,
      "",
      asText(record.title),
      asText(record.format),
      asNumber(record.male_count),
      asNumber(record.female_count),
      asNumber(record.student_count),
      asNumber(record.farmer_count),
      asNumber(record.fisherfolk_count),
      asNumber(record.ag_technician_count),
      asNumber(record.government_employee_count),
      asNumber(record.private_employee_count),
      asNumber(record.others_count),
      asNumber(record.male_count) + asNumber(record.female_count),
      asText(record.related_project_title || record.related_project_id),
      asText(record.sdg_goals),
      asText(record.thematic_area),
      asText(record.remarks),
    ]);
  }

  if (sheetName === "Table 7a. Budget Utilization (G" || sheetName === "Table 7b. Budget Utilization (I") {
    return makeRows(datasets.budget_utilizations || [], (record) => [
      asNumber(record.total_budget),
      department,
      "",
      asNumber(record.total_budget),
      asNumber(record.utilized_total),
      asText(record.project_title),
    ]);
  }

  if (sheetName === "Table 8a. Faculty Involvement i") {
    const records = (datasets.faculty_involvement || []).length
      ? datasets.faculty_involvement
      : datasets.faculty_registry_records || [];
    return makeRows(records, (record) => [
      asText(record.faculty_name) || fullName(record),
      asText(record.sex),
      asText(record.rank || record.designation),
      asText(record.employment_status || record.employment),
      asNumber(record.avg_hours_per_week) || "",
      asNumber(record.total_hours_period) || "",
      asText(record.remarks),
    ]);
  }

  if (sheetName === "Table 8b. Pool of Experts") {
    const records = (datasets.pool_of_experts || []).length ? datasets.pool_of_experts : datasets.faculty_registry_records || [];
    return makeRows(records, (record) => [
      asText(record.faculty_name) || fullName(record),
      asText(record.sex),
      asText(record.rank || record.designation),
      asText(record.employment_status || record.employment),
      asText(record.educational_qualifications),
      asText(record.specialization),
      asText(record.other_expertise),
    ]);
  }

  if (sheetName === "Table 9. Student Involvement in") {
    return makeRows(datasets.student_involvement || [], (record) => [
      asText(record.college),
      asText(record.department) || department,
      asText(record.curricular_offering),
      asNumber(record.total_students),
      asNumber(record.involved_students),
      asNumber(record.percentage),
      asText(record.remarks),
    ]);
  }

  if (sheetName === "Table 10. Extension PPAs Featur") {
    return makeRows(datasets.extension_programs || [], (record) => [
      asText(record.activity_title || record.project_title),
      asText(record.media_channels),
      formatDate(record.date_featured),
      asText(record.remarks),
    ]);
  }

  if (sheetName === "Table 11. Technologiesinnovatio") {
    const records = (datasets.technologies_innovations || []).length
      ? datasets.technologies_innovations
      : datasets.technologies_innovations_commercialized || [];
    return makeRows(records, (record) => [
      asText(record.college || record.unit),
      asText(record.department) || department,
      asText(record.curricular_offering),
      asText(record.technology_title || record.technology_name),
      asText(record.year_develop || record.year_developed),
      asText(record.end_users_clientele || record.related_project_title),
      asText(record.technology_generators || record.technology_generator),
      asText(record.status),
      asText(record.remarks),
    ]);
  }

  if (sheetName === "Table 12. OrdinanceResolutions") {
    return makeRows(datasets.ordinance_resolutions || [], (record) => [
      department,
      "",
      asText(record.project_title),
      asText(record.name),
      asText(record.status),
      formatDate(record.date_of_approval),
      asText(record.remarks),
    ]);
  }

  if (sheetName === "Table 13. Impact Assessment") {
    return makeRows(datasets.impact_assessments || [], (record) => [
      department,
      "",
      asText(record.activity_name || record.project_title),
      asText(record.proponent || record.lead_evaluator),
      formatDate(record.date_of_assessment),
      asText(record.remarks),
    ]);
  }

  if (sheetName === "Table 14. Awards") {
    const records = (datasets.awards || []).length ? datasets.awards : datasets.awards_recognitions || [];
    return makeRows(records, (record) => [
      asText(record.department) || department,
      asText(record.extension_ppa || record.event_title || record.project_title),
      asText(record.award_recognition_received || record.award_title),
      asText(record.donor || record.donor_body),
      asText(record.level),
      formatDate(record.date_received),
      asText(record.remarks),
    ]);
  }

  if (sheetName === "Table 15. Other Activities") {
    return makeRows(datasets.other_activities || [], (record) => [
      formatDate(record.activity_date),
      asText(record.activity_title),
      asText(record.category),
      asText(record.participants),
      asText(record.purpose),
      asNumber(record.budget_involved) || "",
      getSourceOfFund(record),
      asText(record.remarks),
    ]);
  }

  return [];
}

function findSectionRow(worksheet: ExcelJS.Worksheet, startRow: number) {
  for (let rowNumber = startRow; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const value = asText(worksheet.getRow(rowNumber).getCell(1).value).toLowerCase();
    if (SECTION_MARKERS.some((marker) => value.startsWith(marker))) {
      return rowNumber;
    }
  }
  return startRow + 7;
}

function cloneRowStyle(source: ExcelJS.Row, target: ExcelJS.Row) {
  target.height = source.height;
  for (let column = 1; column <= source.cellCount; column += 1) {
    const sourceCell = source.getCell(column);
    const targetCell = target.getCell(column);
    targetCell.style = { ...sourceCell.style };
    targetCell.numFmt = sourceCell.numFmt;
    if (sourceCell.alignment) targetCell.alignment = { ...sourceCell.alignment };
    if (sourceCell.border) targetCell.border = { ...sourceCell.border };
    if (sourceCell.fill) targetCell.fill = { ...sourceCell.fill };
    if (sourceCell.font) targetCell.font = { ...sourceCell.font };
  }
}

function populateWorksheet(worksheet: ExcelJS.Worksheet, sheetName: QuarterlyReportSheetName, rows: CellValue[][]) {
  const startRow = DATA_START_ROWS[sheetName] || 5;
  const sectionRow = findSectionRow(worksheet, startRow);
  const reservedRows = Math.max(sectionRow - startRow, 1);
  if (rows.length > reservedRows) {
    worksheet.spliceRows(sectionRow, 0, ...Array.from({ length: rows.length - reservedRows }, () => []));
    for (let rowNumber = sectionRow; rowNumber < sectionRow + rows.length - reservedRows; rowNumber += 1) {
      cloneRowStyle(worksheet.getRow(startRow), worksheet.getRow(rowNumber));
    }
  }

  rows.forEach((values, rowIndex) => {
    const row = worksheet.getRow(startRow + rowIndex);
    values.forEach((value, columnIndex) => {
      row.getCell(columnIndex + 1).value = value === undefined || value === null ? "" : value;
    });
    row.commit();
  });
}

async function fetchDataset(table: string, creatorIds: string[], department: string, departmentColumn = false) {
  const admin = createAdminClient();
  let query = admin.from(table).select("*").order("created_at", { ascending: false });
  if (creatorIds.length > 0) {
    query = query.in("created_by", creatorIds);
  }
  const { data, error } = await query;
  if (error) {
    console.error(`Quarterly report fetch skipped for ${table}:`, error.message);
    return [];
  }
  const records = (data || []) as AnyRecord[];
  if (!departmentColumn) return records;
  return records.filter((record) => {
    const recordDepartment = asText(record.department);
    return !recordDepartment || recordDepartment === department;
  });
}

async function getReportData(selectedTables: QuarterlyReportSheetName[], department: string) {
  const admin = createAdminClient();
  const { data: departmentProfiles } = await admin
    .from("profiles")
    .select("id")
    .eq("department", department);
  const { data: superAdmins } = await admin.from("profiles").select("id").eq("user_type", "super_admin");
  const departmentCreatorIds = (departmentProfiles || []).map((item) => item.id);
  const superAdminIds = (superAdmins || []).map((item) => item.id);
  const creatorIds = Array.from(new Set([...departmentCreatorIds, ...superAdminIds]));

  const datasets: Record<string, AnyRecord[]> = {};
  const needs = new Set(selectedTables);
  const needProjects =
    needs.has("Table 1. Active Partnerships") ||
    needs.has("Table 2a. Internally Funded Ext") ||
    needs.has("Table 2b. Externally Funded Ext");

  const tasks: Promise<void>[] = [];
  const load = (key: string, table: string, departmentColumn = false) => {
    tasks.push(fetchDataset(table, creatorIds, department, departmentColumn).then((records) => {
      datasets[key] = records;
    }));
  };

  if (needProjects) {
    tasks.push(fetchDataset("projects", creatorIds, department).then((records) => {
      const departmentCreatorSet = new Set(departmentCreatorIds);
      datasets.projects = records.filter((project) => {
        if (departmentCreatorSet.has(asText(project.created_by))) return true;
        const visibleDepartments = Array.isArray(project.visible_departments) ? project.visible_departments.map(asText) : [];
        const leadUnits = Array.isArray(project.lead_units) ? project.lead_units.map(asText) : [];
        return (
          project.visibility_scope === "all_departments" ||
          visibleDepartments.includes(department) ||
          leadUnits.includes(department)
        );
      });
    }));
  }
  if (needs.has("Table 2c. Needs Assessment")) load("needs_assessments", "needs_assessments");
  if (needs.has("Table 2d. Consultancy Extension")) load("consultancy_extensions", "consultancy_extensions");
  if (needs.has("Table 3. Trainings ")) load("trainings", "trainings");
  if (needs.has("Table 4. Technical Advisory Ser")) load("technical_advisory_services", "technical_advisory_services");
  if (needs.has("Table 5. Adopters with Enterpri")) load("adopters_with_enterprise", "adopters_with_enterprise", true);
  if (needs.has("Table 6. IEC Materials")) load("iec_materials", "iec_materials", true);
  if (needs.has("Table 7a. Budget Utilization (G") || needs.has("Table 7b. Budget Utilization (I")) {
    load("budget_utilizations", "budget_utilizations");
  }
  if (needs.has("Table 8a. Faculty Involvement i")) {
    load("faculty_involvement", "faculty_involvement", true);
    load("faculty_registry_records", "faculty_registry_records", true);
  }
  if (needs.has("Table 8b. Pool of Experts")) {
    load("pool_of_experts", "pool_of_experts", true);
    load("faculty_registry_records", "faculty_registry_records", true);
  }
  if (needs.has("Table 9. Student Involvement in")) load("student_involvement", "student_involvement", true);
  if (needs.has("Table 10. Extension PPAs Featur")) load("extension_programs", "extension_programs");
  if (needs.has("Table 11. Technologiesinnovatio")) {
    load("technologies_innovations", "technologies_innovations", true);
    load("technologies_innovations_commercialized", "technologies_innovations_commercialized", true);
  }
  if (needs.has("Table 12. OrdinanceResolutions")) load("ordinance_resolutions", "ordinance_resolutions");
  if (needs.has("Table 13. Impact Assessment")) load("impact_assessments", "impact_assessments");
  if (needs.has("Table 14. Awards")) {
    load("awards", "awards", true);
    load("awards_recognitions", "awards_recognitions");
  }
  if (needs.has("Table 15. Other Activities")) load("other_activities", "other_activities");

  await Promise.all(tasks);
  return datasets;
}

function populateCoverPage(workbook: ExcelJS.Workbook, payload: ReportPayload, profile: AnyRecord) {
  const cover = workbook.getWorksheet("Cover Page");
  if (!cover) return;
  const generatedDate = payload.dateGenerated ? formatDate(payload.dateGenerated) : formatDate(new Date().toISOString());
  cover.getCell("D9").value = generatedDate;
  cover.getCell("D11").value = payload.college || asText(profile.department);
  cover.getCell("D13").value = `${payload.quarter || ""}${payload.academicYear ? `, AY ${payload.academicYear}` : ""}`.trim();
  cover.getCell("A37").value = `Generated by: ${payload.generatedBy || fullName(profile) || asText(profile.email)}`;
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as ReportPayload;
  const selectedTables = (payload.selectedTables || []).filter((name): name is QuarterlyReportSheetName =>
    QUARTERLY_REPORT_SHEET_NAMES.includes(name as QuarterlyReportSheetName)
  );

  if (selectedTables.length === 0) {
    return NextResponse.json({ error: "Select at least one report table." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, user_type, department")
    .eq("id", user.id)
    .single();

  if (!profile || !["college_coordinator", "super_admin"].includes(profile.user_type)) {
    return NextResponse.json({ error: "Only college coordinators can generate this dashboard report." }, { status: 403 });
  }

  const department = profile.department || payload.college || "";
  const { default: ExcelJSRuntime } = await import("exceljs");
  const workbook = new ExcelJSRuntime.Workbook();
  await workbook.xlsx.readFile(TEMPLATE_PATH);
  populateCoverPage(workbook, payload, profile);

  const keepSheets = new Set(["Cover Page", ...selectedTables]);
  for (const worksheet of [...workbook.worksheets]) {
    if (!keepSheets.has(worksheet.name)) {
      workbook.removeWorksheet(worksheet.id);
    }
  }

  const datasets = await getReportData(selectedTables, department);
  const meta = {
    department,
    contactName: payload.generatedBy || fullName(profile),
    contactEmail: asText(profile.email),
  };

  selectedTables.forEach((sheetName) => {
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) return;
    populateWorksheet(worksheet, sheetName, reportRows(sheetName, datasets, meta));
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `quarterly-report-${(payload.quarter || "quarter").toLowerCase().replace(/\s+/g, "-")}-${new Date()
    .toISOString()
    .slice(0, 10)}.xlsx`;

  return new NextResponse(buffer as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
