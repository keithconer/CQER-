export const QUARTERLY_REPORT_TABLES = [
  {
    sheetName: "Table 1. Active Partnerships",
    title: "Table 1. Active Partnerships",
  },
  {
    sheetName: "Table 2a. Internally Funded Ext",
    title: "Table 2a. Internally Funded Extension Projects",
  },
  {
    sheetName: "Table 2b. Externally Funded Ext",
    title: "Table 2b. Externally Funded Extension Projects",
  },
  {
    sheetName: "Table 2c. Needs Assessment",
    title: "Table 2c. Needs Assessment",
  },
  {
    sheetName: "Table 2d. Consultancy Extension",
    title: "Table 2d. Consultancy Extension Program/Project",
  },
  {
    sheetName: "Table 3. Trainings ",
    title: "Table 3. Trainings",
  },
  {
    sheetName: "Table 4. Technical Advisory Ser",
    title: "Table 4. Technical Advisory Services",
  },
  {
    sheetName: "Table 5. Adopters with Enterpri",
    title: "Table 5. Adopters with Enterprise",
  },
  {
    sheetName: "Table 6. IEC Materials",
    title: "Table 6. Information, Education, and Communication (IEC) Materials",
  },
  {
    sheetName: "Table 7a. Budget Utilization (G",
    title: "Table 7a. Budget Utilization (GAA)",
  },
  {
    sheetName: "Table 7b. Budget Utilization (I",
    title: "Table 7b. Budget Utilization (Income)",
  },
  {
    sheetName: "Table 8a. Faculty Involvement i",
    title: "Table 8a. Faculty Involvement in ESCE",
  },
  {
    sheetName: "Table 8b. Pool of Experts",
    title: "Table 8b. Pool of Experts",
  },
  {
    sheetName: "Table 9. Student Involvement in",
    title: "Table 9. Student Involvement in ESCE",
  },
  {
    sheetName: "Table 10. Extension PPAs Featur",
    title: "Table 10. Extension PPAs Featured in Media",
  },
  {
    sheetName: "Table 11. Technologiesinnovatio",
    title: "Table 11. Technologies/Innovations Adopted and Commercialized",
  },
  {
    sheetName: "Table 12. OrdinanceResolutions",
    title: "Table 12. Ordinance/Resolution",
  },
  {
    sheetName: "Table 13. Impact Assessment",
    title: "Table 13. Impact Assessment",
  },
  {
    sheetName: "Table 14. Awards",
    title: "Table 14. Awards",
  },
  {
    sheetName: "Table 15. Other Activities",
    title: "Table 15. Other Activities",
  },
] as const;

export type QuarterlyReportSheetName = (typeof QUARTERLY_REPORT_TABLES)[number]["sheetName"];

export const QUARTERLY_REPORT_SHEET_NAMES = QUARTERLY_REPORT_TABLES.map((table) => table.sheetName);
