import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const root = path.resolve("Documents/TestingReport");
const logDir = path.join(root, "Test_Execution_Logs");
const previewDir = path.join(root, ".previews");
await fs.mkdir(previewDir, { recursive: true });

const unitLog = await fs.readFile(path.join(logDir, "unit_tests.log"), "utf16le");
const system = JSON.parse(await fs.readFile(path.join(logDir, "system_tests.json"), "utf8"));
const executionDate = new Date("2026-11-11T00:00:00+05:30");

const excludedUnitNames = new Set([
  "UT_M4_03 — Reschedule an existing appointment",
  "UT_M7_01: scheduled appointment reminders are persisted once and reconciled after changes",
  "MongoDB-backed API workflows: authentication, records, appointments, admissions and billing"
]);
const unitNames = [...unitLog.matchAll(/^# Subtest: (.+)$/gm)].map(match => match[1].trim()).filter(name => !excludedUnitNames.has(name));
if (unitNames.length !== 44) throw new Error(`Expected 44 executed unit/source checks, found ${unitNames.length}`);

function moduleFor(name) {
  const n = name.toLowerCase();
  if (n.includes("password") || n.includes("login") || n.includes("authorization") || n.includes("role") || n.includes("logout") || n.includes("account")) return "Authentication & Authorization";
  if (n.includes("patient") || n.includes("clinical") || n.includes("profile") || n.includes("prescription")) return "Patients & Clinical Records";
  if (n.includes("doctor") || n.includes("department") || n.includes("availability")) return "Doctors & Departments";
  if (n.includes("appointment") || n.includes("future-date") || n.includes("slot")) return "Appointments";
  if (n.includes("admission") || n.includes("bed") || n.includes("facility")) return "Admissions & Facilities";
  if (n.includes("bill") || n.includes("payment")) return "Billing & Payments";
  if (n.includes("reminder") || n.includes("notification")) return "Notifications";
  if (n.includes("report") || n.includes("lab")) return "Reports & Lab Tests";
  return "Architecture / Source Wiring";
}

const unitRows = unitNames.map((name, index) => [
  `UT-AUTO-${String(index + 1).padStart(3, "0")}`, moduleFor(name), name,
  "Backend dependencies installed; no database required for this check.",
  "Run `cd backend && npm test`; inspect the named Node test result.",
  "The assertion completes without error.",
  "Node test runner reported PASS in the final regression run.", "PASS",
  "Test_Execution_Logs/unit_tests.log", executionDate, "Automated (Node test runner)"
]);

const integrationRows = [
  ["IT-AUTO-001", "Appointments", "Reschedule persists in MongoDB", "Dedicated test DB; API on isolated port.", "Create fixture; book; reschedule; read Appointment from MongoDB.", "HTTP 200 and stored time equals requested time.", "Passed; persisted time matched.", "PASS", "Test_Execution_Logs/integration_tests.log", executionDate, "Automated"],
  ["IT-AUTO-002", "Notifications", "Reminder generation is idempotent and reconciles changes", "Dedicated test DB.", "Create due appointment; run generator twice; reschedule; cancel; query reminders.", "One reminder per event; old reminder superseded; cancelled reminder cancelled.", "Passed with MongoDB persistence checks.", "PASS", "Test_Execution_Logs/integration_tests.log", executionDate, "Automated"],
  ["IT-AUTO-003", "Cross-module workflow", "Authentication, records, scheduling, admissions, billing, lab tests and reports", "Seeded isolated database and two API ports.", "Execute the full integration workflow and all embedded API/database assertions.", "All positive and negative assertions pass; records persist and authorization holds.", "Passed; included duplicate slots, bed conflicts, discharge release, payments, reminders and reports.", "PASS", "Test_Execution_Logs/integration_tests.log", executionDate, "Automated"],
  ["IT-AUTO-004", "Authentication", "Valid Admin login", "Seeded Admin exists.", "POST valid credentials; request Admin summary with returned token.", "HTTP 200, Admin role and authorized response.", "Passed.", "PASS", "Test_Execution_Logs/integration_tests.log", executionDate, "Automated"],
  ["IT-AUTO-005", "Authentication", "Invalid password rejection", "Seeded Admin exists.", "POST known username with incorrect password.", "HTTP 401 with useful message.", "Passed.", "PASS", "Test_Execution_Logs/integration_tests.log", executionDate, "Automated"],
  ["IT-AUTO-006", "Authentication", "Blank credentials rejection", "API running.", "POST blank username and password.", "HTTP 400 required-fields response.", "Passed.", "PASS", "Test_Execution_Logs/integration_tests.log", executionDate, "Automated"],
  ["IT-AUTO-007", "Authorization", "Receptionist denied Admin reports", "Receptionist authenticated.", "GET Admin-only report endpoint using Receptionist token.", "HTTP 403.", "Passed.", "PASS", "Test_Execution_Logs/integration_tests.log", executionDate, "Automated"],
  ["IT-AUTO-008", "Authentication", "Logout revokes existing token", "Patient authenticated.", "POST logout; reuse old token on authenticated endpoint.", "Old token receives HTTP 401.", "Passed.", "PASS", "Test_Execution_Logs/integration_tests.log", executionDate, "Automated"]
];

const systemRows = system.results.map(item => [
  item.id, item.id.includes("GUEST") ? "Guest" : item.id.includes("DOCTOR") ? "Doctor" : item.id.includes("PATIENT") ? "Patient" : item.id.includes("RECEPTION") ? "Receptionist" : item.id.includes("RESPONSIVE") ? "Non-functional" : "Admin / Authentication",
  item.description, "Seeded isolated system database; backend and Vite frontend running.",
  "Execute the Playwright scenario through the rendered application and verify the visible result and/or persisted API state.",
  item.description, item.actual, item.status, item.evidence, executionDate, "Automated (Playwright + Chrome)"
]);

const notExecuted = [
  ["ST-ADMIN-WARD-01", "Admin", "Ward create/update/deactivate through UI"],
  ["ST-ADMIN-ROOM-01", "Admin", "Room create/update/deactivate through UI"],
  ["ST-ADMIN-BED-01", "Admin", "Bed status management through UI"],
  ["ST-ADMIN-ADMISSION-01", "Admin", "Admission workflow through UI"],
  ["ST-ADMIN-DISCHARGE-01", "Admin", "Discharge workflow and bed release through UI"],
  ["ST-ADMIN-BILLING-01", "Admin", "Bill creation and payment through UI"],
  ["ST-RECEPTION-APPT-01", "Receptionist", "Book, reschedule and cancel appointment through UI"],
  ["ST-RECEPTION-ADMISSION-01", "Receptionist", "Front-desk admission workflow through UI"],
  ["ST-DOCTOR-AVAIL-01", "Doctor", "Update personal availability and consultation duration through UI"],
  ["ST-DOCTOR-CONSULT-01", "Doctor", "Complete consultation through UI"],
  ["ST-DOCTOR-NOTE-01", "Doctor", "Add diagnosis and treatment note through UI"],
  ["ST-DOCTOR-RX-01", "Doctor", "Add prescription through UI"],
  ["ST-DOCTOR-PROFILE-01", "Doctor", "Update Doctor profile and image through UI"],
  ["ST-PATIENT-BOOK-01", "Patient", "Book appointment through Patient portal"],
  ["ST-PATIENT-RESCHEDULE-01", "Patient", "Reschedule appointment through Patient portal"],
  ["ST-PATIENT-CANCEL-01", "Patient", "Cancel appointment through Patient portal"],
  ["ST-PATIENT-PROFILE-01", "Patient", "Update Patient profile and image through UI"],
  ["ST-BILL-PRINT-01", "Billing", "Open and verify browser print/receipt dialog"],
  ["ST-CONCURRENCY-UI-01", "Appointments", "Two simultaneous human UI booking submissions"],
  ["ST-PERF-12M-01", "Reports", "Large 12-month production-sized report benchmark"]
].map(([id, module, scenario]) => [
  id, module, scenario, "Relevant records and role account available.",
  "Manual browser workflow required.", "Workflow completes with correct persistence and authorization.",
  "Not executed in this assessment. API integration coverage exists for several related rules, but no UI pass is claimed.",
  "NOT EXECUTED", "TESTING_README.md - Known limitations", executionDate, "Manual"
]);
systemRows.push(...notExecuted);

const defectRows = [
  ["DEF-001", "High", "Authorization / privacy", "Patient could override billing scope with another patient ID query parameter.", "The generic query filter overwrote the authenticated Patient's server-side patient filter.", "Return HTTP 403 when a Patient supplies a different patient ID; added integration regression assertion.", "Final integration suite: 8 passed, 0 failed.", "FIXED", "backend/src/routes/billing.js; integration_tests.log"],
  ["DEF-002", "High", "Frontend runtime", "Doctor and Patient dashboard components crashed with `PageHeader is not defined`.", "RoleWidgets declared PageHeader without exporting it; dashboards also omitted the import.", "Exported PageHeader and imported it in both dashboards; browser suite now fails on page errors.", "Doctor and Patient dashboard screenshots rendered; 12/12 system tests passed.", "FIXED", "Screenshots/08-doctor-dashboard.png; Screenshots/09-patient-dashboard.png"],
  ["DEF-003", "Medium", "Input validation", "Username and phone HTML patterns produced invalid modern-browser regular expressions.", "Hyphen and plus characters were not escaped for the HTML pattern attribute's Unicode Sets mode.", "Used escaped character-class literals via JSX expressions.", "Final browser log contains no Pattern attribute errors.", "FIXED", "Test_Execution_Logs/system_tests.json"],
  ["DEF-004", "Low", "Database schema", "Mongoose warned about a duplicate Admission.bed index.", "The field declared index:true and the schema also declared a partial unique index.", "Removed the redundant field-level index while preserving the partial unique active-bed index.", "Final unit run contains no duplicate-index warning.", "FIXED", "backend/src/models/Admission.js; unit_tests.log"]
];

const workbook = Workbook.create();
const summary = workbook.worksheets.add("Overall Summary");
const unit = workbook.worksheets.add("Unit Tests");
const integration = workbook.worksheets.add("Integration Tests");
const systemSheet = workbook.worksheets.add("System Tests");
const defects = workbook.worksheets.add("Defect Log");
const font = "Arial";
const navy = "#17365D";
const blue = "#1F4E78";
const lightBlue = "#D9EAF7";
const border = "#C9D2DC";
const headers = ["Test ID", "Module", "Scenario", "Preconditions", "Steps", "Expected Result", "Actual Result", "Status", "Evidence Reference", "Execution Date", "Automation"];

function styleDataSheet(sheet, title, rows, tableName) {
  sheet.showGridLines = false;
  sheet.getRange("A2").values = [[title]];
  sheet.getRange("A2").format = { font: { name: font, size: 16, bold: true, color: navy } };
  sheet.getRange("A3").values = [["Hospital Management System | execution date: 11 November 2026 | synthetic test data only"]];
  sheet.getRange("A3").format = { font: { name: font, size: 10, italic: true, color: "#5B6573" } };
  const endRow = 5 + rows.length;
  sheet.getRange(`A5:K${endRow}`).values = [headers, ...rows];
  sheet.getRange(`A5:K${endRow}`).format.font = { name: font, size: 10, color: "#1F2937" };
  sheet.getRange("A5:K5").format = { fill: navy, font: { name: font, size: 10, bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { preset: "inside", style: "thin", color: "#FFFFFF" } };
  sheet.getRange(`A6:K${endRow}`).format.verticalAlignment = "top";
  sheet.getRange(`C6:I${endRow}`).format.wrapText = true;
  sheet.getRange(`J6:J${endRow}`).format.numberFormat = "dd-mmm-yyyy";
  sheet.getRange(`A5:K${endRow}`).format.borders = { insideHorizontal: { style: "thin", color: border }, bottom: { style: "thin", color: border } };
  sheet.getRange(`H6:H${endRow}`).conditionalFormats.add("containsText", { text: "PASS", format: { fill: "#E2F0D9", font: { bold: true, color: "#375623" } } });
  sheet.getRange(`H6:H${endRow}`).conditionalFormats.add("containsText", { text: "FAIL", format: { fill: "#FCE4D6", font: { bold: true, color: "#C00000" } } });
  sheet.getRange(`H6:H${endRow}`).conditionalFormats.add("containsText", { text: "NOT EXECUTED", format: { fill: "#FFF2CC", font: { bold: true, color: "#7F6000" } } });
  sheet.getRange(`H6:H${endRow}`).conditionalFormats.add("containsText", { text: "BLOCKED", format: { fill: "#E4DFEC", font: { bold: true, color: "#5F497A" } } });
  sheet.getRange("A:A").format.columnWidth = 16;
  sheet.getRange("B:B").format.columnWidth = 24;
  sheet.getRange("C:C").format.columnWidth = 38;
  sheet.getRange("D:G").format.columnWidth = 34;
  sheet.getRange("H:H").format.columnWidth = 16;
  sheet.getRange("I:I").format.columnWidth = 34;
  sheet.getRange("J:J").format.columnWidth = 16;
  sheet.getRange("K:K").format.columnWidth = 24;
  sheet.getRange("A5:K5").format.rowHeight = 32;
  sheet.freezePanes.freezeRows(5);
  sheet.tables.add(`A5:K${endRow}`, true, tableName).style = "TableStyleMedium2";
  return endRow;
}

const unitEnd = styleDataSheet(unit, "Unit and source-wiring test cases", unitRows, "UnitTestsTable");
const integrationEnd = styleDataSheet(integration, "MongoDB-backed integration test cases", integrationRows, "IntegrationTestsTable");
const systemEnd = styleDataSheet(systemSheet, "System and browser test cases", systemRows, "SystemTestsTable");

defects.showGridLines = false;
defects.getRange("A2").values = [["Defect log"]];
defects.getRange("A2").format = { font: { name: font, size: 16, bold: true, color: navy } };
const defectHeaders = ["Defect ID", "Severity", "Category", "Description", "Root Cause", "Resolution", "Verification", "Status", "Evidence"];
const defectEnd = 5 + defectRows.length;
defects.getRange(`A5:I${defectEnd}`).values = [defectHeaders, ...defectRows];
defects.getRange(`A5:I${defectEnd}`).format.font = { name: font, size: 10, color: "#1F2937" };
defects.getRange("A5:I5").format = { fill: navy, font: { name: font, size: 10, bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true };
defects.getRange(`C6:I${defectEnd}`).format.wrapText = true;
defects.getRange(`A6:I${defectEnd}`).format.verticalAlignment = "top";
defects.getRange("A:A").format.columnWidth = 14; defects.getRange("B:B").format.columnWidth = 12; defects.getRange("C:C").format.columnWidth = 22;
defects.getRange("D:G").format.columnWidth = 38; defects.getRange("H:H").format.columnWidth = 14; defects.getRange("I:I").format.columnWidth = 38;
defects.freezePanes.freezeRows(5);
defects.tables.add(`A5:I${defectEnd}`, true, "DefectLogTable").style = "TableStyleMedium2";
defects.getRange(`H6:H${defectEnd}`).conditionalFormats.add("containsText", { text: "FIXED", format: { fill: "#E2F0D9", font: { bold: true, color: "#375623" } } });

summary.showGridLines = false;
summary.tabColor = navy;
summary.getRange("A2").values = [["Software testing execution summary"]];
summary.getRange("A2").format = { font: { name: font, size: 16, bold: true, color: navy } };
summary.getRange("A3").values = [["Hospital Management System | 11 November 2026 | final regression after defect fixes"]];
summary.getRange("A3").format = { font: { name: font, size: 10, italic: true, color: "#5B6573" } };
summary.getRange("A5:G5").values = [["Testing Type", "Total", "Passed", "Failed", "Blocked", "Not Executed", "Pass %"]];
summary.getRange("A6:A9").values = [["Unit Testing"], ["Integration Testing"], ["System Testing"], ["Overall"]];
summary.getRange("B6:F6").formulas = [[`=COUNTA('Unit Tests'!A6:A${unitEnd})`, `=COUNTIF('Unit Tests'!H6:H${unitEnd},"PASS")`, `=COUNTIF('Unit Tests'!H6:H${unitEnd},"FAIL")`, `=COUNTIF('Unit Tests'!H6:H${unitEnd},"BLOCKED")`, `=COUNTIF('Unit Tests'!H6:H${unitEnd},"NOT EXECUTED")`]];
summary.getRange("B7:F7").formulas = [[`=COUNTA('Integration Tests'!A6:A${integrationEnd})`, `=COUNTIF('Integration Tests'!H6:H${integrationEnd},"PASS")`, `=COUNTIF('Integration Tests'!H6:H${integrationEnd},"FAIL")`, `=COUNTIF('Integration Tests'!H6:H${integrationEnd},"BLOCKED")`, `=COUNTIF('Integration Tests'!H6:H${integrationEnd},"NOT EXECUTED")`]];
summary.getRange("B8:F8").formulas = [[`=COUNTA('System Tests'!A6:A${systemEnd})`, `=COUNTIF('System Tests'!H6:H${systemEnd},"PASS")`, `=COUNTIF('System Tests'!H6:H${systemEnd},"FAIL")`, `=COUNTIF('System Tests'!H6:H${systemEnd},"BLOCKED")`, `=COUNTIF('System Tests'!H6:H${systemEnd},"NOT EXECUTED")`]];
summary.getRange("B9:F9").formulas = [["=SUM(B6:B8)", "=SUM(C6:C8)", "=SUM(D6:D8)", "=SUM(E6:E8)", "=SUM(F6:F8)"]];
summary.getRange("G6").formulas = [["=IF(B6=0,0,C6/B6)"]]; summary.getRange("G6:G9").fillDown();
summary.getRange("A5:G9").format.font = { name: font, size: 11, color: "#1F2937" };
summary.getRange("A5:G5").format = { fill: navy, font: { name: font, size: 10, bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center" };
summary.getRange("B6:G9").format.horizontalAlignment = "center";
summary.getRange("G6:G9").format.numberFormat = "0.0%";
summary.getRange("A9:G9").format = { fill: lightBlue, font: { name: font, size: 11, bold: true, color: navy }, borders: { preset: "doubleBottom", style: "medium", color: blue } };
summary.getRange("A12").values = [["Assessment conclusion"]];
summary.getRange("A12").format = { font: { name: font, size: 12, bold: true, color: navy } };
summary.getRange("A13:G13").merge();
summary.getRange("A13").values = [["The executed automated suite passed after four defects were fixed. The project is not assessed as fully passed because 20 requested browser/manual scenarios remain unexecuted; those cases are listed on the System Tests sheet."]];
summary.getRange("A13:G13").format = { fill: "#FFF2CC", font: { name: font, size: 10, color: "#7F6000" }, wrapText: true, verticalAlignment: "center" };
summary.getRange("A16:B21").values = [
  ["Evidence", "Reference"],
  ["Unit tests", "Test_Execution_Logs/unit_tests.log"],
  ["Integration tests", "Test_Execution_Logs/integration_tests.log"],
  ["System tests", "Test_Execution_Logs/system_tests.log"],
  ["Frontend build", "Test_Execution_Logs/frontend_build.log"],
  ["Screenshots", "Screenshots/01-invalid-login.png through 11-mobile-guest-booking.png"]
];
summary.getRange("A16:B16").format = { fill: blue, font: { name: font, size: 10, bold: true, color: "#FFFFFF" } };
summary.getRange("A2:G21").format.font.name = font;
summary.getRange("A:A").format.columnWidth = 28; summary.getRange("B:F").format.columnWidth = 15; summary.getRange("G:G").format.columnWidth = 16;
summary.getRange("B:B").format.columnWidth = 55;
summary.getRange("A13:G13").format.rowHeight = 48;

unit.tabColor = "#5B9BD5"; integration.tabColor = "#70AD47"; systemSheet.tabColor = "#ED7D31"; defects.tabColor = "#C00000";
workbook.recalculate();

const summaryCheck = await workbook.inspect({ kind: "table", range: "Overall Summary!A5:G13", include: "values,formulas", tableMaxRows: 15, tableMaxCols: 8 });
console.log(summaryCheck.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 300 }, summary: "final formula error scan" });
console.log(errors.ndjson);
for (const [sheetName, range] of [["Overall Summary", "A1:G22"], ["Unit Tests", `A1:K${unitEnd}`], ["Integration Tests", `A1:K${integrationEnd}`], ["System Tests", `A1:K${systemEnd}`], ["Defect Log", `A1:I${defectEnd}`]]) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
  await fs.writeFile(path.join(previewDir, `${sheetName.replaceAll(" ", "_")}.png`), new Uint8Array(await preview.arrayBuffer()));
}
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(path.join(root, "Test_Cases.xlsx"));
console.log(`Workbook saved: ${path.join(root, "Test_Cases.xlsx")}`);
process.exitCode = 0;
