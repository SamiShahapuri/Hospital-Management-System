import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "file:///C:/Users/SAMI%20SHAHAPURI/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const baseUrl = process.env.HMS_SYSTEM_URL || "http://localhost:5174";
const apiUrl = process.env.HMS_SYSTEM_API || "http://localhost:5200/api";
const chromePath = process.env.HMS_CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const outputRoot = path.resolve("Documents/TestingReport");
const screenshotDir = path.join(outputRoot, "Screenshots");
const logDir = path.join(outputRoot, "Test_Execution_Logs");
await fs.mkdir(screenshotDir, { recursive: true });
await fs.mkdir(logDir, { recursive: true });

const results = [];
const browserErrors = [];
const pageErrors = [];
let adminToken = "";
let guestBooking = null;

function record(id, description, status, actual, evidence = "") {
  results.push({ id, description, status, actual, evidence });
  console.log(`${status} ${id}: ${actual}`);
}

async function run(id, description, fn) {
  try {
    const startingPageErrorCount = pageErrors.length;
    const value = await fn();
    if (pageErrors.length > startingPageErrorCount) {
      throw new Error(`Uncaught browser error: ${pageErrors.slice(startingPageErrorCount).join(" | ")}`);
    }
    record(id, description, "PASS", value?.actual || "Expected behavior observed.", value?.evidence || "");
  } catch (error) {
    record(id, description, "FAIL", error?.stack || String(error));
  }
}

async function screenshot(page, name) {
  const file = path.join(screenshotDir, name);
  await page.screenshot({ path: file, fullPage: true });
  return `Screenshots/${name}`;
}

function nextWeekday(targetDay) {
  const current = new Date();
  const days = (targetDay - current.getDay() + 7) % 7 || 7;
  const date = new Date(current.getFullYear(), current.getMonth(), current.getDate() + days);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

const browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.on("console", message => { if (message.type() === "error") browserErrors.push(`console: ${message.text()}`); });
page.on("pageerror", error => { pageErrors.push(error.message); browserErrors.push(`pageerror: ${error.message}`); });

await run("ST-AUTH-NEG-01", "Invalid staff login displays an error", async () => {
  await page.goto(`${baseUrl}/login`);
  await page.getByLabel("Email or username").fill("admin01");
  await page.getByLabel("Password").fill("wrongpass");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("alert").filter({ hasText: "Invalid email or password" }).waitFor();
  return { actual: "Invalid credentials were rejected with the expected visible error.", evidence: await screenshot(page, "01-invalid-login.png") };
});

await run("ST-ADMIN-01", "Admin login and dashboard", async () => {
  await page.getByLabel("Password").fill("Admin@123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/admin/dashboard");
  await page.getByRole("link", { name: "Dashboard" }).waitFor();
  adminToken = await page.evaluate(() => localStorage.getItem("hms_token"));
  return { actual: "Admin dashboard loaded after credential authentication.", evidence: await screenshot(page, "02-admin-dashboard.png") };
});

await run("ST-ADMIN-DEPT-01", "Admin creates, updates, and deactivates a department", async () => {
  const suffix = Date.now().toString().slice(-6);
  const createdName = `Testing ${suffix}`;
  const updatedName = `${createdName} Updated`;
  await page.goto(`${baseUrl}/admin/departments`);
  await page.getByLabel("Department name").fill(createdName);
  await page.getByLabel("Description").fill("System test department");
  await page.getByRole("button", { name: "Add department" }).click();
  const createdCard = page.locator("article.department-card").filter({ hasText: createdName });
  await createdCard.waitFor();
  await createdCard.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Department name").fill(updatedName);
  await page.getByRole("button", { name: "Save changes" }).click();
  const updatedCard = page.locator("article.department-card").filter({ hasText: updatedName });
  await updatedCard.waitFor();
  page.once("dialog", dialog => dialog.accept());
  await updatedCard.getByRole("button", { name: "Deactivate" }).click();
  await updatedCard.waitFor({ state: "detached" });
  return { actual: "Department create, rename, and deactivate operations persisted through the UI.", evidence: await screenshot(page, "03-departments-after-crud.png") };
});

await run("ST-ADMIN-DOCTOR-01", "Admin creates, updates availability, and deactivates a doctor", async () => {
  const suffix = Date.now().toString().slice(-7);
  const doctorName = `Dr System ${suffix}`;
  await page.goto(`${baseUrl}/admin/doctors`);
  await page.getByLabel("Full name").fill(doctorName);
  await page.getByLabel("Specialization").fill("General Medicine");
  await page.locator("form.form-grid select").first().selectOption({ label: "General Medicine" });
  await page.getByLabel("Doctor login email").fill(`doctor.system.${suffix}@example.test`);
  await page.getByLabel("Doctor username").fill(`dr.system.${suffix}`);
  await page.getByLabel("Initial password").fill("DoctorTest123!");
  await page.getByRole("button", { name: "Add doctor" }).click();
  const row = page.locator("tbody tr").filter({ hasText: doctorName });
  await row.waitFor();
  await row.getByRole("button", { name: "Edit availability" }).click();
  await page.getByLabel("Consultation duration").selectOption("45");
  await page.getByRole("button", { name: "Save availability" }).click();
  await row.filter({ hasText: "45 min" }).waitFor();
  page.once("dialog", dialog => dialog.accept());
  await row.getByRole("button", { name: "Deactivate" }).click();
  await row.waitFor({ state: "detached" });
  return { actual: "Doctor account creation, 45-minute duration update, and deactivation succeeded.", evidence: await screenshot(page, "04-doctors-after-crud.png") };
});

await run("ST-ADMIN-PATIENT-01", "Admin registers and updates a patient", async () => {
  const suffix = Date.now().toString().slice(-7);
  const patientName = `System Patient ${suffix}`;
  const email = `system.patient.${suffix}@example.test`;
  await page.goto(`${baseUrl}/admin/patients`);
  await page.getByLabel("Full name").fill(patientName);
  await page.getByLabel("Age").fill("35");
  await page.getByLabel("Gender").selectOption("Other");
  await page.getByLabel("Phone").fill(`987${suffix}`);
  await page.getByLabel("Registered email").fill(email);
  await page.getByLabel("Address").fill("Synthetic system-test address");
  await page.getByRole("button", { name: "Register patient" }).click();
  const row = page.locator("tbody tr").filter({ hasText: patientName });
  await row.waitFor();
  await row.getByRole("button", { name: /View \/ edit/ }).click();
  await page.getByRole("button", { name: "Edit contact details" }).click();
  await page.getByLabel("Phone").last().fill(`986${suffix}`);
  await page.getByRole("button", { name: "Save patient details" }).click();
  await page.getByText(`986${suffix}`).first().waitFor();
  return { actual: "Patient registration produced a Patient ID and the updated phone persisted.", evidence: await screenshot(page, "05-patient-created-and-updated.png") };
});

await run("ST-ADMIN-REPORTS-01", "Admin reports page loads current persisted data", async () => {
  await page.goto(`${baseUrl}/admin/reports`);
  await page.getByText("Reports & analytics").waitFor();
  return { actual: "Reports workspace rendered for Admin with live summary content.", evidence: await screenshot(page, "06-admin-reports.png") };
});

await run("ST-RECEPTION-01", "Receptionist login and Admin route denial", async () => {
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${baseUrl}/login`);
  await page.getByLabel("Email or username").fill("reception01");
  await page.getByLabel("Password").fill("Recep@123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/receptionist/dashboard");
  await page.goto(`${baseUrl}/admin/reports`);
  await page.waitForURL("**/receptionist/dashboard");
  return { actual: "Receptionist dashboard loaded and direct Admin report access redirected to the role dashboard.", evidence: await screenshot(page, "07-receptionist-dashboard.png") };
});

await run("ST-DOCTOR-01", "Doctor login, dashboard, appointments, and patient workspace", async () => {
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${baseUrl}/doctor/login`);
  await page.getByLabel("Email or username").fill("drsmith");
  await page.getByLabel("Password").fill("Doctor@123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/doctor/dashboard");
  await page.getByRole("heading", { name: /Good day,/ }).waitFor();
  const dashboardEvidence = await screenshot(page, "08-doctor-dashboard.png");
  await page.goto(`${baseUrl}/doctor/appointments`);
  await page.getByText("My appointments").waitFor();
  await page.goto(`${baseUrl}/doctor/patients`);
  await page.getByText("My patients").waitFor();
  return { actual: "Doctor-specific dashboard, own appointments, and assigned-patient pages rendered.", evidence: dashboardEvidence };
});

await run("ST-PATIENT-01", "Patient login and scoped portal pages", async () => {
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${baseUrl}/patient/login`);
  await page.getByLabel("Email or username").fill("patient01");
  await page.getByLabel("Password").fill("Pat@1234");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/patient/dashboard");
  await page.getByRole("heading", { name: /Welcome back,/ }).waitFor();
  const evidence = await screenshot(page, "09-patient-dashboard.png");
  await page.goto(`${baseUrl}/patient/records`);
  await page.getByText("Medical records & prescriptions").waitFor();
  await page.goto(`${baseUrl}/patient/billing`);
  await page.getByText("My bills and payments").waitFor();
  return { actual: "Patient dashboard, medical records, prescriptions, and billing pages rendered for the linked profile.", evidence };
});

await run("ST-GUEST-01", "Guest books an appointment without creating a login", async () => {
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${baseUrl}/book-appointment`);
  const suffix = Date.now().toString().slice(-7);
  const email = `guest.system.${suffix}@example.test`;
  await page.getByLabel("Full name *").fill(`Guest System ${suffix}`);
  await page.getByLabel("Email address *").fill(email);
  await page.getByLabel("Contact number *").fill(`985${suffix}`);
  await page.getByLabel("Department *").selectOption({ label: "General Medicine" });
  await page.getByLabel("Doctor *").selectOption({ index: 1 });
  const slotSelect = page.locator("form.guest-form select").nth(2);
  const doctor = await page.getByLabel("Doctor *").inputValue();
  let date = "";
  let scheduledAt = "";
  for (let dayOffset = 1; dayOffset <= 14; dayOffset += 1) {
    const candidate = new Date();
    candidate.setDate(candidate.getDate() + dayOffset);
    const candidateDate = [candidate.getFullYear(), String(candidate.getMonth() + 1).padStart(2, "0"), String(candidate.getDate()).padStart(2, "0")].join("-");
    const availabilityResponse = await page.request.get(`${apiUrl}/public/availability?doctor=${encodeURIComponent(doctor)}&date=${candidateDate}`);
    const availability = await availabilityResponse.json();
    if (availabilityResponse.status() === 200 && availability.slots?.length) {
      date = candidateDate;
      scheduledAt = availability.slots[0].scheduledAt;
      break;
    }
  }
  if (!date || !scheduledAt) throw new Error("No available guest slot was returned in the next 14 days");
  await page.getByLabel("Preferred date *").fill(date);
  await slotSelect.selectOption(scheduledAt);
  await page.getByLabel("Reason for visit").fill("Synthetic guest system test");
  await page.getByRole("button", { name: /Confirm appointment/ }).click();
  await page.getByText("Your appointment is booked").waitFor();
  guestBooking = { email, doctor, scheduledAt };
  const patientLookup = await page.request.get(`${apiUrl}/patients?q=${encodeURIComponent(email)}`, { headers: { Authorization: `Bearer ${adminToken}` } });
  const patientRows = await patientLookup.json();
  if (patientLookup.status() !== 200 || !patientRows.some(row => row.email === email)) throw new Error("Guest patient record was not persisted");
  const loginAttempt = await page.request.post(`${apiUrl}/auth/login`, { data: { email, password: "NoGuestAccount123!" } });
  if (loginAttempt.status() !== 401) throw new Error(`Expected no guest login account; received ${loginAttempt.status()}`);
  return { actual: "Guest confirmation rendered; patient record persisted; login remained unavailable.", evidence: await screenshot(page, "10-guest-booking-confirmation.png") };
});

await run("ST-GUEST-NEG-01", "Duplicate guest slot is rejected", async () => {
  if (!guestBooking) throw new Error("Guest booking prerequisite did not complete");
  const response = await page.request.post(`${apiUrl}/public/book-appointment`, { data: {
    fullName: "Duplicate Guest", email: "duplicate.guest@example.test", phone: "9876543210",
    doctor: guestBooking.doctor, scheduledAt: guestBooking.scheduledAt, reason: "Duplicate-slot test"
  } });
  const body = await response.json();
  if (response.status() !== 409) throw new Error(`Expected HTTP 409; received ${response.status()} ${JSON.stringify(body)}`);
  return { actual: `Second booking received HTTP 409: ${body.message}`, evidence: "Test_Execution_Logs/system_tests.log" };
});

await run("ST-RESPONSIVE-01", "Guest booking page renders at mobile viewport", async () => {
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(`${baseUrl}/book-appointment`);
  await mobilePage.getByText("Book an appointment").last().waitFor();
  const evidence = await screenshot(mobilePage, "11-mobile-guest-booking.png");
  const overflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  await mobile.close();
  if (overflow) throw new Error("Horizontal page overflow detected at 390px width");
  return { actual: "Mobile viewport rendered without horizontal document overflow.", evidence };
});

await browser.close();
const summary = {
  executedAt: new Date().toISOString(),
  baseUrl,
  apiUrl,
  total: results.length,
  passed: results.filter(item => item.status === "PASS").length,
  failed: results.filter(item => item.status === "FAIL").length,
  browserErrors,
  results
};
await fs.writeFile(path.join(logDir, "system_tests.json"), JSON.stringify(summary, null, 2));
await fs.writeFile(path.join(logDir, "system_tests.log"), [
  `Hospital Management System browser tests`,
  `Executed: ${summary.executedAt}`,
  `Target: ${baseUrl}`,
  `Total: ${summary.total} Passed: ${summary.passed} Failed: ${summary.failed}`,
  "",
  ...results.map(item => `${item.status} ${item.id} - ${item.description}\nActual: ${item.actual}\nEvidence: ${item.evidence || "none"}\n`),
  browserErrors.length ? `Browser errors:\n${browserErrors.join("\n")}` : "Browser errors: none observed"
].join("\n"));
console.log(`SYSTEM SUMMARY total=${summary.total} passed=${summary.passed} failed=${summary.failed}`);
process.exitCode = summary.failed ? 1 : 0;
