from pathlib import Path
import json
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    Image, KeepTogether
)
from reportlab.pdfbase.pdfmetrics import stringWidth
from PIL import Image as PILImage


ROOT = Path(__file__).resolve().parents[3]
REPORT_DIR = ROOT / "Documents" / "TestingReport"
OUTPUT = REPORT_DIR / "Software_Testing_Report.pdf"
SYSTEM_JSON = REPORT_DIR / "Test_Execution_Logs" / "system_tests.json"
SCREEN_DIR = REPORT_DIR / "Screenshots"

NAVY = colors.HexColor("#12304A")
BLUE = colors.HexColor("#1D6D9B")
TEAL = colors.HexColor("#138A8A")
PALE = colors.HexColor("#EAF4F7")
LIGHT = colors.HexColor("#F5F7F9")
GREEN = colors.HexColor("#238636")
AMBER = colors.HexColor("#A15C00")
RED = colors.HexColor("#B42318")
GREY = colors.HexColor("#5D6873")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="ReportTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=26, leading=31, textColor=colors.white, alignment=TA_CENTER, spaceAfter=10))
styles.add(ParagraphStyle(name="CoverSub", parent=styles["Normal"], fontName="Helvetica", fontSize=12, leading=17, textColor=colors.white, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="H1x", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=17, leading=21, textColor=NAVY, spaceBefore=4, spaceAfter=10))
styles.add(ParagraphStyle(name="H2x", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=12.5, leading=16, textColor=BLUE, spaceBefore=8, spaceAfter=6))
styles.add(ParagraphStyle(name="Bodyx", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.2, leading=13.4, textColor=colors.HexColor("#25313C"), spaceAfter=7))
styles.add(ParagraphStyle(name="Smallx", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.5, leading=10, textColor=colors.HexColor("#33414D")))
styles.add(ParagraphStyle(name="Captionx", parent=styles["BodyText"], fontName="Helvetica-Oblique", fontSize=7.3, leading=9.5, textColor=GREY, alignment=TA_CENTER, spaceAfter=8))
styles.add(ParagraphStyle(name="Calloutx", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=10.2, leading=14, textColor=NAVY, alignment=TA_CENTER))


def p(text, style="Bodyx"):
    return Paragraph(str(text), styles[style])


def cell(text, bold=False, small=True):
    style = styles["Smallx"] if small else styles["Bodyx"]
    value = str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    if bold:
        value = f"<b>{value}</b>"
    return Paragraph(value, style)


def make_table(headers, rows, widths, font_size=7.2, repeat=True, status_col=None):
    data = [[cell(h, bold=True) for h in headers]]
    data.extend([[cell(v) for v in row] for row in rows])
    table = Table(data, colWidths=widths, repeatRows=1 if repeat else 0, hAlign="LEFT")
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#C9D2D9")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("FONTSIZE", (0, 0), (-1, -1), font_size),
    ]
    for idx in range(1, len(data)):
        if idx % 2 == 0:
            commands.append(("BACKGROUND", (0, idx), (-1, idx), LIGHT))
    if status_col is not None:
        for idx, row in enumerate(rows, start=1):
            status = str(row[status_col]).upper()
            color = GREEN if status == "PASS" else (RED if status == "FAIL" else AMBER)
            commands.extend([("TEXTCOLOR", (status_col, idx), (status_col, idx), color), ("FONTNAME", (status_col, idx), (status_col, idx), "Helvetica-Bold")])
    table.setStyle(TableStyle(commands))
    return table


def bullets(items):
    return [Paragraph(f"<font color='#138A8A'>&#8226;</font> {item}", styles["Bodyx"]) for item in items]


def section(title):
    return [Paragraph(title, styles["H1x"]), Table([[""]], colWidths=[172 * mm], rowHeights=[1.2 * mm], style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), TEAL)])), Spacer(1, 4 * mm)]


def screenshot_flow(path, caption):
    with PILImage.open(path) as im:
        w, h = im.size
    max_w, max_h = 170 * mm, 78 * mm
    scale = min(max_w / w, max_h / h)
    image = Image(str(path), width=w * scale, height=h * scale)
    return KeepTogether([image, Paragraph(caption, styles["Captionx"])])


def draw_page(canvas, doc):
    canvas.saveState()
    width, height = A4
    if doc.page > 1:
        canvas.setStrokeColor(colors.HexColor("#D8E0E5"))
        canvas.line(20 * mm, 16 * mm, width - 20 * mm, 16 * mm)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(GREY)
        canvas.drawString(20 * mm, 10.5 * mm, "Hospital Management System | Software Testing Report")
        page_text = f"Page {doc.page}"
        canvas.drawRightString(width - 20 * mm, 10.5 * mm, page_text)
    canvas.restoreState()


system_data = json.loads(SYSTEM_JSON.read_text(encoding="utf-8"))
system_results = system_data["results"]

story = []

# Cover page
cover = Table([
    [Spacer(1, 28 * mm)],
    [Paragraph("SOFTWARE TESTING REPORT", styles["ReportTitle"])],
    [Paragraph("Hospital Management System", styles["CoverSub"])],
    [Spacer(1, 13 * mm)],
    [Table([[Paragraph("UNIT", styles["Calloutx"]), Paragraph("INTEGRATION", styles["Calloutx"]), Paragraph("SYSTEM", styles["Calloutx"])]], colWidths=[48 * mm] * 3, rowHeights=[17 * mm], style=TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("BOX", (0, 0), (-1, -1), 0.7, colors.white),
        ("INNERGRID", (0, 0), (-1, -1), 0.7, PALE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))],
    [Spacer(1, 24 * mm)],
    [Paragraph("Prepared for Software Engineering Mini-Project submission", styles["CoverSub"])],
    [Paragraph("Repository: SamiShahapuri/Hospital-Management-System", styles["CoverSub"])],
    [Spacer(1, 14 * mm)],
    [Paragraph("Execution date: 11 November 2026 | Asia/Calcutta", styles["CoverSub"])],
    [Paragraph("Assessment status: Executed automated scope passed; full matrix partially executed", styles["CoverSub"])],
    [Spacer(1, 24 * mm)],
], colWidths=[172 * mm], style=TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), NAVY),
    ("BOX", (0, 0), (-1, -1), 0, NAVY),
    ("LEFTPADDING", (0, 0), (-1, -1), 12 * mm),
    ("RIGHTPADDING", (0, 0), (-1, -1), 12 * mm),
]))
story.extend([cover, PageBreak()])

story += section("Document Control and Executive Result")
story.append(make_table(["Item", "Value"], [
    ["Document", "Software Testing Report"],
    ["Project", "Hospital Management System"],
    ["Version", "1.0 - Final execution evidence"],
    ["Execution date", "11 November 2026"],
    ["Prepared from", "Local repository, requirements documents, source code, CI configuration, automated logs, database records, and browser evidence"],
], [42 * mm, 130 * mm], font_size=8))
story.append(Spacer(1, 5 * mm))
story.append(Table([[p("64", "Calloutx"), p("0", "Calloutx"), p("20", "Calloutx"), p("76.2%", "Calloutx")], [cell("Passed", True), cell("Failed", True), cell("Not executed", True), cell("Full-matrix pass")]], colWidths=[43 * mm] * 4, rowHeights=[14 * mm, 9 * mm], style=TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), PALE), ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#C9D2D9")), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ALIGN", (0, 0), (-1, -1), "CENTER")
])))
story.append(Spacer(1, 5 * mm))
story.append(p("All 64 executed cases passed after four application defects were corrected and regression-tested. Twenty requested UI/manual cases remain NOT EXECUTED; therefore, this report does not declare the entire project fully passed. It concludes that the executed automated scope passed and the remaining scope requires manual or extended environment testing."))
story.append(PageBreak())

story += section("1. Project Introduction")
story.append(p("The Hospital Management System is a role-based web application built with React and Vite on the client, Express and Mongoose on the server, and MongoDB for persistence. It supports Admin, Receptionist, Doctor, Patient, and Guest workflows across identity, departments, clinical operations, facilities, admissions, billing, laboratory records, notifications, and reporting."))
story.append(p("The assessment began with the repository README, SRS, existing test plan, coverage notes, final verification checklist, package manifests, CI workflow, routes, models, frontend pages, and existing tests. Features were treated as unverified until exercised by a test or explicitly marked not executed."))
story += section("2. Objectives of Testing")
story += bullets([
    "Validate core domain rules at unit level, including boundary and invalid-input behavior.",
    "Verify API, authentication, role authorization, database persistence, scheduling, facilities, billing, clinical records, laboratories, notifications, and reporting against an isolated MongoDB database.",
    "Exercise representative end-to-end journeys through the real React interface using Chrome automation.",
    "Detect and correct genuine defects without weakening assertions or changing unrelated functionality.",
    "Produce reproducible evidence and distinguish PASS, FAIL, BLOCKED, and NOT EXECUTED outcomes.",
])
story += section("3. Scope of Testing")
story.append(make_table(["In scope", "Assessment approach"], [
    ["Unit", "Validation helpers, models, scheduling/availability helpers, billing arithmetic, notification rules, middleware authorization, and source wiring."],
    ["Integration", "HTTP/API behavior with MongoDB, authentication, RBAC, CRUD, appointment conflicts, admissions/beds, discharge, clinical history, laboratory records, billing/payment, notifications, reports, and persistence reads."],
    ["System", "Role login and dashboards, department/doctor/patient UI actions, reports, role denial, doctor/patient portal visibility, guest booking, duplicate booking prevention, and mobile layout."],
    ["Regression", "Unit, integration, frontend build, backend syntax, and complete 12-case browser suite after fixes."],
], [38 * mm, 134 * mm], font_size=7.8))
story.append(PageBreak())

story += section("4. Software and Hardware Test Environment")
env_rows = [
    ["Operating system", "Microsoft Windows NT 10.0.26300.0, 64-bit process"],
    ["Runtime", "Node.js v22.20.0; npm 10.9.3"],
    ["Database", "MongoDB 8.2.1 Windows service"],
    ["Browser automation", "Playwright 1.62.1 with Chrome 157.0.8103.50"],
    ["Frontend", "React 18.3.1; Vite 6.4.5"],
    ["Backend", "Express 4.21.2; Mongoose 8.9.5"],
    ["Integration database", "hms_testing_report_20261111"],
    ["System database", "hms_system_testing_20261111"],
    ["Hardware", "Intel64 Family 6 Model 186; RAM not exposed by managed environment"],
    ["Unavailable", "Docker and Computer Use browser host; neither prevented execution because local MongoDB and bundled Playwright were available"],
]
story.append(make_table(["Component", "Configuration"], env_rows, [48 * mm, 124 * mm], font_size=7.8))
story.append(p("Database safety: all integration and system operations used dedicated databases. No normal development or production database was targeted."))
story += section("5. Testing Methodology")
story += bullets([
    "Black-box API and UI assertions were combined with white-box unit tests for validation and domain helpers.",
    "Positive, negative, boundary, duplicate/conflict, authentication, and authorization cases were included.",
    "Integration cases verified status codes and response data and performed read-back checks from MongoDB-backed endpoints.",
    "System tests drove actual forms and routes, recorded screenshots, and failed on uncaught browser page errors.",
    "Defects were classified, corrected, and followed by targeted and full regression runs.",
])
story.append(PageBreak())

story += section("6. Unit Testing")
story.append(make_table(["Metric", "Result"], [
    ["Command", "cd backend; npm test"],
    ["Discovered", "47 Node test entries"],
    ["Passed", "44"],
    ["Failed", "0"],
    ["Skipped", "3 opt-in integration bootstrap files; excluded from unit total"],
    ["Duration", "977.9252 ms"],
    ["Evidence", "Test_Execution_Logs/unit_tests.log"],
], [48 * mm, 124 * mm], font_size=8))
story.append(Paragraph("Coverage classification", styles["H2x"]))
story.append(make_table(["Area", "Verified behavior"], [
    ["Identity validation", "Email, username, password length, valid and invalid authentication-shaped inputs"],
    ["Patient and doctor", "Required fields, email/phone validation, doctor duration and availability"],
    ["Departments and appointments", "Department constraints, slot boundaries, duration alignment, overlap and working hours"],
    ["Admissions and facilities", "Admission validity, active-bed uniqueness, discharge rules, bed allocation behavior"],
    ["Billing and payment", "Subtotal/discount/tax/total arithmetic, payment validity, remaining balance"],
    ["Clinical and notification", "Clinical record requirements, notification generation and reminder rules"],
    ["Authorization", "Role middleware allow/deny behavior and source-wiring checks"],
], [48 * mm, 124 * mm], font_size=7.7))
story.append(p("The final unit suite adds focused domain coverage without duplicating existing cases. Valid, invalid, and boundary examples are included. The raw Node output remains the authority for individual assertions."))
story.append(PageBreak())

story += section("7. Integration Testing")
story.append(make_table(["Metric", "Result"], [
    ["Command", "npm run test:integration with all three opt-in flags enabled"],
    ["Database", "hms_testing_report_20261111"],
    ["Passed", "8"], ["Failed", "0"], ["Skipped", "0"],
    ["Duration", "11695.0931 ms"],
    ["Evidence", "Test_Execution_Logs/integration_tests.log"],
], [48 * mm, 124 * mm], font_size=8))
integration_rows = [
    ["IT-01", "Authentication, accounts, departments, doctors and patients", "PASS"],
    ["IT-02", "Appointments, availability, duplicate-slot protection and persistence", "PASS"],
    ["IT-03", "Admissions, occupied-bed rejection, discharge and bed release", "PASS"],
    ["IT-04", "Clinical history and patient-record access control", "PASS"],
    ["IT-05", "Billing, payments, totals, patient scope and persistence", "PASS"],
    ["IT-06", "Laboratory records and patient linkage", "PASS"],
    ["IT-07", "Notification generation and appointment reminder behavior", "PASS"],
    ["IT-08", "Reports and database aggregation", "PASS"],
]
story.append(make_table(["ID", "Scenario", "Status"], integration_rows, [22 * mm, 125 * mm, 25 * mm], status_col=2))
story.append(p("The Node test runner reports eight top-level integration tests. Several top-level cases contain multiple endpoint and persistence assertions. Unauthorized access and duplicate/conflicting resource operations are explicitly asserted."))
story.append(PageBreak())

story += section("8. System Testing")
story.append(p("The production-like browser assessment used the actual React UI at localhost:5174 and the Express API at localhost:5200, backed by the isolated hms_system_testing_20261111 database. The final regression completed on 11 November 2026 at 13:24 local time."))
system_rows = [[r["id"], r["description"], r["actual"], r["status"]] for r in system_results]
story.append(make_table(["Test ID", "Description", "Actual result", "Status"], system_rows, [30 * mm, 48 * mm, 70 * mm, 24 * mm], font_size=6.7, status_col=3))
story.append(Spacer(1, 4 * mm))
story.append(p("Final browser result: 12 passed, 0 failed. The run produced 11 genuine screenshots. It recorded no uncaught page errors and no invalid HTML-pattern errors. Expected console noise from intentionally rejected 401/404 requests and sandbox-blocked external resources remains visible in the JSON evidence."))
story.append(PageBreak())

story += section("9. Functional Test Cases and Unexecuted Scope")
story.append(p("The workbook is the complete row-level test register. The following table records the requested workflows that were not exercised end-to-end through the browser in this assessment. They are not counted as passes."))
not_executed = [
    ["ST-NE-01", "Admin", "Ward management UI CRUD", "NOT EXECUTED"],
    ["ST-NE-02", "Admin", "Room management UI CRUD", "NOT EXECUTED"],
    ["ST-NE-03", "Admin", "Bed management UI CRUD", "NOT EXECUTED"],
    ["ST-NE-04", "Admin", "Admission management through UI", "NOT EXECUTED"],
    ["ST-NE-05", "Admin", "Discharge management through UI", "NOT EXECUTED"],
    ["ST-NE-06", "Admin", "Billing and payment mutation through UI", "NOT EXECUTED"],
    ["ST-NE-07", "Reception", "Patient delete with active-record restrictions", "NOT EXECUTED"],
    ["ST-NE-08", "Reception", "Book appointment through receptionist UI", "NOT EXECUTED"],
    ["ST-NE-09", "Reception", "Reschedule appointment through receptionist UI", "NOT EXECUTED"],
    ["ST-NE-10", "Reception", "Cancel appointment through receptionist UI", "NOT EXECUTED"],
    ["ST-NE-11", "Reception", "Register admission through receptionist UI", "NOT EXECUTED"],
    ["ST-NE-12", "Doctor", "Update availability and duration through doctor UI", "NOT EXECUTED"],
    ["ST-NE-13", "Doctor", "Complete consultation and add diagnosis/treatment", "NOT EXECUTED"],
    ["ST-NE-14", "Doctor", "Add prescriptions through UI", "NOT EXECUTED"],
    ["ST-NE-15", "Doctor", "Update doctor profile through UI", "NOT EXECUTED"],
    ["ST-NE-16", "Patient", "Book/reschedule/cancel appointment through patient UI", "NOT EXECUTED"],
    ["ST-NE-17", "Patient", "Update patient profile through UI", "NOT EXECUTED"],
    ["ST-NE-18", "Output", "Browser print/receipt dialog verification", "NOT EXECUTED"],
    ["ST-NE-19", "Concurrency", "Simultaneous independent human UI sessions", "NOT EXECUTED"],
    ["ST-NE-20", "Performance", "Large 12-month production-volume benchmark", "NOT EXECUTED"],
]
story.append(make_table(["ID", "Role/area", "Scenario", "Status"], not_executed, [26 * mm, 31 * mm, 88 * mm, 27 * mm], font_size=6.6, status_col=3))
story.append(PageBreak())

story += section("10. Non-functional and Regression Results")
nonfunctional = [
    ["Input validation", "Unit/API/UI", "Valid, invalid and boundary values exercised; final HTML patterns valid", "PASS"],
    ["Authentication security", "API/UI", "Invalid credentials rejected; JWT-protected routes enforced", "PASS"],
    ["Role authorization", "API/UI", "Unauthorized patient billing scope fixed; receptionist Admin route denied", "PASS"],
    ["Data integrity", "MongoDB", "Duplicate appointment and occupied-bed conflicts rejected; persistence read back", "PASS"],
    ["API response handling", "Integration", "Status codes and response bodies asserted across modules", "PASS"],
    ["Responsive layout", "Chrome 390px", "Guest page rendered without horizontal document overflow", "PASS"],
    ["Frontend production build", "Vite", "61 modules transformed; build completed in 2.25 s", "PASS"],
    ["Backend syntax", "node --check", "39 JavaScript source files passed", "PASS"],
    ["Load/security certification", "Specialized tooling", "Not performed; no certification claim", "NOT EXECUTED"],
]
story.append(make_table(["Check", "Method", "Actual result", "Status"], nonfunctional, [38 * mm, 30 * mm, 78 * mm, 26 * mm], font_size=6.8, status_col=3))
story.append(Paragraph("Regression sequence", styles["H2x"]))
story += bullets([
    "Reran unit suite: 44 unit passes, no failures.",
    "Reran isolated integration suite: 8 passes, no failures.",
    "Reran frontend production build after the final pattern correction: successful.",
    "Reran all 12 browser cases: all passed, with no uncaught page errors or pattern diagnostics.",
])
story.append(PageBreak())

story += section("11. Test Execution Summary")
summary_rows = [
    ["Unit Testing", 44, 44, 0, 0, 0, "100.0%"],
    ["Integration Testing", 8, 8, 0, 0, 0, "100.0%"],
    ["System Testing", 32, 12, 0, 0, 20, "37.5%"],
    ["Overall", 84, 64, 0, 0, 20, "76.2%"],
]
story.append(make_table(["Testing type", "Total", "Passed", "Failed", "Blocked", "Not executed", "Pass %"], summary_rows, [43 * mm, 18 * mm, 20 * mm, 18 * mm, 19 * mm, 30 * mm, 24 * mm], font_size=7.2))
story.append(p("Pass percentage uses Passed / Total. Blocked and not-executed cases are not counted as passed. The executed-only pass rate is 64/64 = 100%."))
story += section("12. Defect Report")
defects = [
    ["DEF-001", "High", "Patient could override billing scope with another patient ID", "Application authorization bug", "Route enforces linked patient identity and returns 403; integration regression added", "FIXED"],
    ["DEF-002", "High", "Doctor and Patient dashboards crashed: PageHeader not defined", "Frontend import/export bug", "Exported shared PageHeader and imported it in both dashboards", "FIXED"],
    ["DEF-003", "Medium", "Username/phone pattern attributes invalid under browser v-mode", "Frontend validation bug", "Escaped Unicode-set special characters; final system run clean", "FIXED"],
    ["DEF-004", "Low", "Duplicate Admission bed index declaration produced Mongoose warning", "Schema definition issue", "Removed redundant index flag while preserving partial unique active-bed index", "FIXED"],
]
story.append(make_table(["ID", "Severity", "Defect", "Classification", "Resolution / verification", "State"], defects, [18 * mm, 18 * mm, 42 * mm, 30 * mm, 48 * mm, 16 * mm], font_size=5.9))
story.append(PageBreak())

story += section("13. Screenshots and Execution Evidence")
story.append(p("The screenshots below were generated by the final Playwright system suite. Original full-resolution PNG files are retained in Documents/TestingReport/Screenshots. Terminal and JSON evidence is retained in Test_Execution_Logs."))
shots = [
    ("01-invalid-login.png", "Figure 1. Invalid credentials rejected with a visible error."),
    ("02-admin-dashboard.png", "Figure 2. Admin dashboard after successful authentication."),
    ("03-departments-after-crud.png", "Figure 3. Department create/update/deactivate browser workflow."),
    ("04-doctors-after-crud.png", "Figure 4. Doctor creation, duration update, and deactivation workflow."),
    ("05-patient-created-and-updated.png", "Figure 5. Patient registration and persisted update."),
    ("06-admin-reports.png", "Figure 6. Admin reporting workspace with persisted data."),
    ("07-receptionist-dashboard.png", "Figure 7. Receptionist dashboard and role-restricted navigation."),
    ("08-doctor-dashboard.png", "Figure 8. Doctor dashboard rendered after PageHeader fix."),
    ("09-patient-dashboard.png", "Figure 9. Patient dashboard and scoped portal rendered."),
    ("10-guest-booking-confirmation.png", "Figure 10. Guest booking confirmation."),
    ("11-mobile-guest-booking.png", "Figure 11. Guest booking page at 390px mobile viewport."),
]
for idx, (filename, caption) in enumerate(shots):
    story.append(screenshot_flow(SCREEN_DIR / filename, caption))
    if idx % 2 == 1 and idx != len(shots) - 1:
        story.append(PageBreak())
story.append(PageBreak())

story += section("14. Requirement-to-Test Traceability")
trace = [
    ["FR-01 Identity and RBAC", "UT identity/RBAC; IT-01; ST-AUTH-NEG-01, ST-ADMIN-01, ST-RECEPTION-01", "Covered; PASS"],
    ["FR-02 Patients", "UT patient validation; IT-01/IT-04; ST-ADMIN-PATIENT-01, ST-PATIENT-01", "Core covered; mutation gaps noted"],
    ["FR-03 Doctors/departments", "UT doctor/department validation; IT-01; ST-ADMIN-DEPT-01, ST-ADMIN-DOCTOR-01, ST-DOCTOR-01", "Core covered; doctor self-update gap"],
    ["FR-04 Appointments", "UT slot/availability; IT-02; ST-GUEST-01, ST-GUEST-NEG-01", "API/guest covered; role UI mutations pending"],
    ["FR-05 Admissions/facilities", "UT admission/bed/discharge; IT-03", "API covered; full UI pending"],
    ["FR-06 Clinical/laboratory", "UT clinical rules; IT-04/IT-06; ST-DOCTOR-01, ST-PATIENT-01", "Visibility covered; clinical UI mutation pending"],
    ["FR-07 Billing/payments", "UT calculations/payment; IT-05; ST-PATIENT-01", "API covered and scope fixed; UI payment pending"],
    ["FR-08 Notifications/reports", "UT notification rules; IT-07/IT-08; ST-ADMIN-REPORTS-01", "Covered; PASS"],
    ["NFR Validation/security", "Unit + integration negative paths; role-denial system checks", "Covered within tested scope"],
    ["NFR Responsive/performance", "ST-RESPONSIVE-01; build timing", "Mobile smoke covered; load benchmark pending"],
]
story.append(make_table(["Requirement area", "Mapped tests", "Coverage outcome"], trace, [48 * mm, 82 * mm, 42 * mm], font_size=6.7))
story.append(Spacer(1, 5 * mm))
story.append(p("Traceability is based on the implemented feature set and the repository's SRS/test-plan material. The Excel workbook provides the detailed test rows, preconditions, steps, expected and actual results, status, and evidence reference."))
story.append(PageBreak())

story += section("15. Limitations")
story += bullets([
    "Twenty UI/manual cases listed in Section 9 were not executed; none is counted as passed.",
    "The browser suite used Chrome only. Cross-browser behavior, formal accessibility conformance, and assistive-technology operation were not certified.",
    "No production-scale load test, penetration test, vulnerability certification, disaster-recovery exercise, or sustained availability test was performed.",
    "The mobile check was a representative 390px viewport smoke test, not a full device laboratory.",
    "Browser print-dialog/receipt behavior was not automated because native print UI is outside the page automation surface.",
    "The tests used deterministic local data. Production integrations, email/SMS gateways, deployment infrastructure, backup/restore, and real operational volumes were outside scope.",
    "Expected console resource messages from deliberately rejected requests and restricted external resources were retained; the final run had no uncaught page error.",
])
story += section("16. Conclusion")
story.append(p("The Hospital Management System passed every test that was actually executed: 44 unit, 8 integration, and 12 system cases. Four defects were identified, corrected, and verified by regression. The isolated databases, raw logs, JSON results, screenshots, workbook, and this report provide an auditable evidence chain."))
story.append(p("The complete project is not declared fully passed because 20 planned system/manual scenarios remain unexecuted. The evidence supports the conclusion: EXECUTED AUTOMATED SCOPE PASSED; COMPLETE ASSESSMENT PARTIALLY EXECUTED. The remaining UI workflows and non-functional certifications should be completed before a production-readiness claim."))
story.append(Spacer(1, 8 * mm))
story.append(Table([[p("FINAL ASSESSMENT", "Calloutx")], [p("Executed automated scope: PASS", "Calloutx")], [p("Complete project assessment: PARTIAL - additional manual and extended testing required", "Calloutx")]], colWidths=[172 * mm], rowHeights=[12 * mm, 12 * mm, 16 * mm], style=TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), NAVY), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#E7F5EA")),
    ("BACKGROUND", (0, 2), (-1, 2), colors.HexColor("#FFF3D6")),
    ("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#B8C4CC")), ("VALIGN", (0, 0), (-1, -1), "MIDDLE")
])))

doc = SimpleDocTemplate(
    str(OUTPUT), pagesize=A4,
    rightMargin=19 * mm, leftMargin=19 * mm,
    topMargin=18 * mm, bottomMargin=21 * mm,
    title="Software Testing Report - Hospital Management System",
    author="Software Engineering Mini-Project",
    subject="Executed unit, integration, and system testing assessment",
)
doc.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
print(f"Created {OUTPUT}")
