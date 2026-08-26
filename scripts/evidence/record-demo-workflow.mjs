/* global Buffer, URL, document, process */

import { chromium } from "@playwright/test";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const artifactRoot = path.join(root, "artifacts", "playwright-demo");
const screenshotRoot = path.join(artifactRoot, "screenshots");
const downloadRoot = path.join(artifactRoot, "downloads");
const logRoot = path.join(artifactRoot, "logs");
const videoRoot = path.join(artifactRoot, ".video-tmp");

const baseUrl = (process.env.DEMO_BASE_URL || "https://barangay-bato-ecertificate-system.vercel.app").replace(/\/$/, "");
const staffPassword = process.env.DEMO_ADMIN_PASSWORD || "";
const residentPassword = process.env.DEMO_RESIDENT_PASSWORD || "";
const adminEmail = process.env.DEMO_ADMIN_EMAIL || "admin@example.com";
const secretaryEmail = process.env.DEMO_SECRETARY_EMAIL || "secretary@example.com";
const residentAEmail = process.env.DEMO_RESIDENT_EMAIL || "resident@example.com";
const residentBEmail = process.env.DEMO_SECOND_RESIDENT_EMAIL || "maria.resident@example.com";
const year = new Date().getFullYear();

const syntheticReceiptPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const results = {
  baseUrl,
  browser: {
    viewport: { height: 900, width: 1440 },
    video: "video/demo-workflow.webm",
    trace: "playwright-trace.zip",
  },
  startedAt: new Date().toISOString(),
  status: "running",
  steps: [],
  downloads: [],
  assertions: [],
  error: null,
};

function requireCredential(name, value) {
  if (!value) {
    throw new Error(`${name} is required for the live demo recording. It is read from the process environment only.`);
  }
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function requestNumber(code) {
  return `REQ-${year}-${code}`;
}

function pushAssertion(label, passed, detail = "") {
  results.assertions.push({ detail, label, passed });
  if (!passed) throw new Error(`${label}${detail ? `: ${detail}` : ""}`);
}

async function bodyText(page) {
  return page.locator("body").innerText();
}

async function waitForPage(page) {
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.waitForTimeout(700);
}

async function waitForStatus(page) {
  await page.getByRole("status").waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(500);
}

async function goto(page, route) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await waitForPage(page);
}

async function assertText(page, text, label) {
  const content = await bodyText(page);
  pushAssertion(label, content.includes(text), `Expected page text to contain ${JSON.stringify(text)}.`);
}

async function recordStep(page, name, expectedText) {
  if (expectedText) await assertText(page, expectedText, `Screen: ${name}`);
  const index = String(results.steps.length + 1).padStart(2, "0");
  const safeName = `${index}-${slug(name)}`;
  const screenshot = path.join(screenshotRoot, `${safeName}.png`);
  const textPath = path.join(logRoot, `${safeName}.txt`);
  await page.screenshot({ path: screenshot, animations: "disabled" });
  await writeFile(textPath, `${await bodyText(page)}\n`, "utf8");
  results.steps.push({
    expectedText: expectedText || null,
    name,
    screenshot: `screenshots/${safeName}.png`,
    text: `logs/${safeName}.txt`,
    url: page.url(),
  });
}

async function createContext({ recordVideo = false } = {}) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    acceptDownloads: true,
    baseURL: baseUrl,
    colorScheme: "light",
    ...(recordVideo
      ? { recordVideo: { dir: videoRoot, size: { height: 900, width: 1440 } } }
      : {}),
    viewport: { height: 900, width: 1440 },
  });
  const page = await context.newPage();
  const consoleLines = [];
  const pageErrors = [];
  const failedRequests = [];
  const httpErrors = [];
  page.on("console", (message) => {
    consoleLines.push({ args: message.args().length, text: message.text(), type: message.type() });
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    failedRequests.push({ error: request.failure()?.errorText || "unknown", method: request.method(), url: request.url() });
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      httpErrors.push({ method: response.request().method(), status: response.status(), url: response.url() });
    }
  });
  return { browser, consoleLines, context, failedRequests, httpErrors, page, pageErrors };
}

async function writeContextLogs(label, contextState) {
  await writeFile(path.join(logRoot, `${label}-console.json`), `${JSON.stringify(contextState.consoleLines, null, 2)}\n`, "utf8");
  await writeFile(path.join(logRoot, `${label}-page-errors.json`), `${JSON.stringify(contextState.pageErrors, null, 2)}\n`, "utf8");
  await writeFile(path.join(logRoot, `${label}-failed-requests.json`), `${JSON.stringify(contextState.failedRequests, null, 2)}\n`, "utf8");
  await writeFile(path.join(logRoot, `${label}-http-errors.json`), `${JSON.stringify(contextState.httpErrors, null, 2)}\n`, "utf8");
}

async function login(page, email, password, expectedPath) {
  await goto(page, "/login");
  await page.locator('input[name="login"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await page.waitForURL(new RegExp(expectedPath), { timeout: 20000 });
  await page.getByRole("heading", { name: /Welcome,/ }).waitFor({
    state: "visible",
    timeout: 20000,
  });
  await waitForPage(page);
}

async function logout(page) {
  const menu = page.getByRole("button", { name: /Open account menu/ });
  await menu.click();
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await page.waitForURL(/\/login/, { timeout: 20000 });
  await waitForPage(page);
}

async function setTheme(page, value) {
  const theme = page.getByRole("combobox", { name: "Theme" });
  await theme.waitFor({ state: "visible", timeout: 20000 });
  await theme.selectOption(value);
  await page.waitForFunction(
    (expected) => document.documentElement.dataset.theme === expected,
    value,
    { timeout: 10000 },
  );
  const activeTheme = await page.locator("html").getAttribute("data-theme");
  pushAssertion(`Theme switched to ${value}`, activeTheme === value, `data-theme was ${activeTheme || "missing"}.`);
}

async function adminRequestHref(page, number) {
  await goto(page, "/admin/certificate-requests");
  const row = page.locator("tbody tr").filter({ hasText: number }).first();
  pushAssertion(`Admin request ${number} is listed`, await row.count() > 0);
  const link = row.locator('a[href^="/admin/certificate-requests/"]').first();
  const href = await link.getAttribute("href");
  if (!href) throw new Error(`Could not resolve the admin request URL for ${number}.`);
  return href;
}

async function openAdminRequest(page, number) {
  const href = await adminRequestHref(page, number);
  await goto(page, href);
  return href.split("/").pop();
}

async function acceptRequest(page, number) {
  const id = await openAdminRequest(page, number);
  const button = page.getByRole("button", { name: "Accept Request", exact: true });
  if ((await button.count()) > 0 && await button.isEnabled()) {
    await button.click();
    await waitForStatus(page);
    await waitForPage(page);
    await recordStep(page, `admin-accepted-${number}`, "Request accepted.");
  } else {
    pushAssertion(`Request ${number} is already accepted or beyond review`, true);
  }
  return id;
}

async function rejectRequest(page, number, remarks) {
  const id = await openAdminRequest(page, number);
  const form = page.locator("form").filter({ hasText: "Reject request" }).first();
  await form.locator('textarea[name="remarks"]').fill(remarks);
  await form.getByRole("button", { name: "Reject Request", exact: true }).click();
  await waitForStatus(page);
  await waitForPage(page);
  await recordStep(page, `admin-rejected-${number}`, "Request rejected.");
  return id;
}

async function createResidentRequest(page, type, purpose, values = {}) {
  await goto(page, "/resident/request-certificate");
  await page.locator('select[name="certificate_type"]').selectOption(type);
  await page.waitForTimeout(250);
  if (values.fullName) await page.locator('input[name="full_name"]').fill(values.fullName);
  if (values.age) await page.locator('input[name="age"]').fill(String(values.age));
  if (values.sitio) await page.locator('input[name="sitio"]').fill(values.sitio);
  if (values.contactNumber) await page.locator('input[name="contact_number"]').fill(values.contactNumber);
  if (values.placeOfBirth) await page.locator('input[name="place_of_birth"]').fill(values.placeOfBirth);
  if (values.birthdate) await page.locator('input[name="birthdate"]').fill(values.birthdate);
  if (values.yearsOfResidency !== undefined) await page.locator('input[name="years_of_residency"]').fill(String(values.yearsOfResidency));
  await page.locator('textarea[name="purpose"]').fill(purpose);
  await page.getByRole("button", { name: "Submit Request", exact: true }).click();
  await page.waitForURL(/\/resident\/my-requests/, { timeout: 20000 });
  await waitForStatus(page);
  await waitForPage(page);
  const currentPath = new URL(page.url()).pathname;
  if (/\/resident\/my-requests\/[^/]+$/.test(currentPath)) {
    const number = (await page.locator("main h1").first().innerText()).trim();
    if (!number.startsWith("REQ-")) throw new Error(`New ${type} request number was not rendered after submission.`);
    return { href: currentPath, number, purpose };
  }
  const row = page.locator("tbody tr").filter({ hasText: purpose }).first();
  await row.waitFor({ state: "visible", timeout: 20000 });
  const link = row.locator('a[href^="/resident/my-requests/"]').first();
  const href = await link.getAttribute("href");
  const number = (await link.innerText()).trim();
  if (!href || !number) throw new Error(`New ${type} request could not be located after submission.`);
  return { href, number, purpose };
}

async function submitPayment(page, requestId, requestNumber, provider, reference, receiptPath, shouldSubmit = true) {
  await goto(page, `/resident/payments/${requestId}`);
  const paymentPageText = await bodyText(page);
  if (!paymentPageText.includes("Choose Payment Method")) {
    await recordStep(page, `${requestNumber}-${provider}-payment-state`, "Fee Breakdown");
    return null;
  }
  await assertText(page, "Choose Payment Method", `Payment page opened for ${requestNumber}`);
  const label = provider === "gcash" ? "GCash" : "Maya";
  const providerButton = page.locator("button").filter({ hasText: label }).first();
  await providerButton.click();
  await page.waitForTimeout(300);
  const qr = page.locator(`img[alt*="${label}"][alt*="payment QR"]`).first();
  pushAssertion(`${label} demo selector is clickable`, await qr.isVisible());
  await recordStep(page, `${requestNumber}-${provider}-demo-payment`, "Demo payment mode");
  if (!shouldSubmit) return null;

  await page.locator('input[name="reference_number"]').fill(reference);
  await page.locator('input[name="transaction_datetime"]').fill(`${year}-08-26T13:00`);
  await page.locator('input[type="file"][name="proof_image"]').setInputFiles(receiptPath);
  await page.waitForTimeout(250);
  await recordStep(page, `${requestNumber}-${provider}-proof-form`, "Submit Demo Payment Proof");
  await page.getByRole("button", { name: /Submit (Demo )?Payment Proof/ }).click();
  await waitForStatus(page);
  await waitForPage(page);
  await assertText(page, "Payment Proof Submitted", `Payment proof submission result for ${requestNumber}`);
  await recordStep(page, `${requestNumber}-${provider}-proof-submitted`, "Pending Verification");
  return reference;
}

async function reviewPayment(page, requestNumber, reference) {
  await goto(page, "/admin/payments?status=pending");
  await assertText(page, reference, `Payment ${reference} appears in the verification queue`);
  const row = page.locator("tbody tr").filter({ hasText: reference }).first();
  const link = row.locator('a[href^="/admin/payments/"]').first();
  const href = await link.getAttribute("href");
  if (!href) throw new Error(`Payment review link missing for ${reference}.`);
  await goto(page, href);
  await recordStep(page, `${requestNumber}-payment-review`, "Merchant History Cross-Check Required");
  await page.getByRole("button", { name: "Confirm Payment Received", exact: true }).click();
  await waitForStatus(page);
  await waitForPage(page);
  await assertText(page, "verified successfully", `Payment ${reference} was confirmed`);
  await recordStep(page, `${requestNumber}-payment-verified`, "verified successfully");
}

async function issueCertificate(page, number, downloadName) {
  const id = await openAdminRequest(page, number);
  await goto(page, `/admin/generate-certificate/${id}`);
  await waitForPage(page);
  await assertText(page, "Printable HTML certificate", `Printable ${number} preview opened`);
  await recordStep(page, `certificate-${number}-preview`, "Printable HTML certificate");

  const saveButton = page.getByRole("button", { name: "Save Certificate Record", exact: true });
  if ((await saveButton.count()) > 0 && await saveButton.isEnabled()) {
    await saveButton.click();
    await waitForStatus(page);
    await waitForPage(page);
    await assertText(page, "Certificate record saved", `Certificate ${number} was saved`);
    await recordStep(page, `certificate-${number}-saved`, "Certificate record saved");
  }

  const downloadLink = page.getByRole("link", { name: "Download PDF", exact: true });
  if ((await downloadLink.count()) === 0) throw new Error(`Download PDF link missing for ${number}.`);
  const downloadPromise = page.waitForEvent("download");
  await downloadLink.click();
  const download = await downloadPromise;
  const target = path.join(downloadRoot, downloadName);
  await download.saveAs(target);
  const bytes = (await readFile(target)).byteLength;
  pushAssertion(`${number} PDF download is non-empty`, bytes > 1000, `${bytes} bytes.`);
  results.downloads.push({ bytes, name: downloadName, requestNumber: number, source: "admin" });
  await recordStep(page, `certificate-${number}-downloaded`, "Download PDF");
  return id;
}

async function resubmitRejectedRequest(page, href, purpose) {
  await goto(page, href);
  const form = page.locator("form").filter({ hasText: "Edit and Resubmit" }).first();
  pushAssertion("Rejected request exposes resubmission form", await form.count() > 0);
  await form.locator('textarea[name="purpose"]').fill(purpose);
  await form.getByRole("button", { name: "Resubmit Request", exact: true }).click();
  await waitForStatus(page);
  await waitForPage(page);
  await assertText(page, "Request resubmitted", "Rejected request was resubmitted");
  await recordStep(page, "resident-b-resubmitted", "Request resubmitted");
}

async function runPreflight() {
  const state = await createContext();
  const { browser, context, page } = state;
  try {
    await goto(page, "/");
    await assertText(page, "Barangay Bato e-Certificate System", "Preflight home page");
    await goto(page, "/about");
    await assertText(page, "What the system does", "Preflight about page");

    await login(page, adminEmail, staffPassword, "admin/dashboard");
    for (const route of [
      "/admin/dashboard",
      "/admin/certificate-requests",
      "/admin/payments",
      "/admin/resident-records",
      "/admin/reports",
      "/admin/activity-log",
      "/admin/account",
      "/admin/settings",
    ]) {
      await goto(page, route);
      pushAssertion(`Admin preflight route ${route}`, !page.url().includes("/login"));
    }
    await logout(page);

    await login(page, residentAEmail, residentPassword, "resident/dashboard");
    for (const route of [
      "/resident/dashboard",
      "/resident/request-certificate",
      "/resident/my-requests",
      "/resident/certificates",
      "/resident/account",
    ]) {
      await goto(page, route);
      pushAssertion(`Resident preflight route ${route}`, !page.url().includes("/login"));
    }
    await goto(page, "/admin/dashboard");
    pushAssertion("Resident is redirected away from admin dashboard", page.url().includes("/resident/dashboard"));
    await logout(page);

    await login(page, secretaryEmail, staffPassword, "admin/dashboard");
    pushAssertion("Barangay Secretary redirects to admin dashboard", page.url().includes("/admin/dashboard"));
    await logout(page);
  } finally {
    await writeContextLogs("preflight", state);
    await context.close();
    await browser.close();
  }
}

async function runRecordedWorkflow() {
  const state = await createContext({ recordVideo: true });
  const { browser, context, page } = state;
  let video;
  try {
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

    await goto(page, "/");
    await recordStep(page, "public-home", "Barangay Bato e-Certificate System");
    await setTheme(page, "night");
    await recordStep(page, "public-home-night-theme", "Barangay Bato e-Certificate System");
    await setTheme(page, "barangay-bato");
    await goto(page, "/about");
    await recordStep(page, "public-about", "What the system does");
    await goto(page, "/register");
    await recordStep(page, "public-register", "Resident Registration");
    await goto(page, "/login");
    await recordStep(page, "public-login", "Email or Username");

    await login(page, residentAEmail, residentPassword, "resident/dashboard");
    await recordStep(page, "resident-a-dashboard", "Welcome, Juan Demo Resident");
    await goto(page, "/resident/account");
    await recordStep(page, "resident-a-account", "Keep your resident details updated");
    await page.locator('input[name="occupation"]').fill("Demo workflow presenter");
    await page.getByRole("button", { name: "Save Profile", exact: true }).click();
    await waitForStatus(page);
    await waitForPage(page);
    await recordStep(page, "resident-a-profile-updated", "Profile updated.");

    const residentRequest = await createResidentRequest(
      page,
      "barangay_clearance",
      `Thesis presentation clearance ${Date.now()}`,
      {
        age: 28,
        contactNumber: "09170000001",
        fullName: "Juan Demo Resident",
        sitio: "Sitio Centro",
      },
    );
    await recordStep(page, "resident-a-request-submitted", residentRequest.number);
    await goto(page, residentRequest.href);
    await recordStep(page, "resident-a-request-details", residentRequest.number);
    const residentRequestId = residentRequest.href.split("/").pop();
    await logout(page);

    await login(page, adminEmail, staffPassword, "admin/dashboard");
    await recordStep(page, "admin-dashboard", "Welcome, Demo Main Admin");
    await goto(page, "/admin/certificate-requests");
    await recordStep(page, "admin-certificate-requests", "Certificate Requests");
    await acceptRequest(page, residentRequest.number);
    await logout(page);

    await login(page, residentAEmail, residentPassword, "resident/dashboard");
    await goto(page, `/resident/payments/${residentRequestId}`);
    const mayaButton = page.locator("button").filter({ hasText: "Maya" }).first();
    await mayaButton.click();
    await waitForPage(page);
    await recordStep(page, `${residentRequest.number}-maya-selector`, "Demo payment mode");
    const residentPaymentReference = await submitPayment(page, residentRequestId, residentRequest.number, "gcash", `DEMO-GCASH-${Date.now()}`, path.join(artifactRoot, "fixtures", "demo-payment-receipt.png"));
    await logout(page);

    await login(page, adminEmail, staffPassword, "admin/dashboard");
    await reviewPayment(page, residentRequest.number, residentPaymentReference);

    await goto(page, "/admin/settings");
    await recordStep(page, "admin-settings-demo-payment", "Thesis demo payment mode");
    await goto(page, "/admin/resident-records");
    await recordStep(page, "admin-resident-records", "Resident Records");
    await goto(page, "/admin/reports");
    await recordStep(page, "admin-reports", "Printable request summary");
    await goto(page, "/admin/activity-log");
    await recordStep(page, "admin-activity-log", "Activity Log");

    const clearance = residentRequest.number;
    const indigency = requestNumber("9001");

    await acceptRequest(page, indigency);
    await logout(page);

    await login(page, residentAEmail, residentPassword, "resident/dashboard");
    const certificateRequest = await createResidentRequest(
      page,
      "barangay_certificate",
      `Thesis presentation certificate ${Date.now()}`,
      {
        age: 28,
        contactNumber: "09170000001",
        fullName: "Juan Demo Resident",
        placeOfBirth: "Mauban, Quezon",
      },
    );
    await recordStep(page, "resident-a-certificate-request-submitted", certificateRequest.number);
    const certificateId = certificateRequest.href.split("/").pop();
    await logout(page);

    await login(page, residentBEmail, residentPassword, "resident/dashboard");
    const residencyRequest = await createResidentRequest(
      page,
      "barangay_residency",
      `Thesis presentation residency ${Date.now()}`,
      {
        age: 31,
        birthdate: "1995-09-20",
        contactNumber: "09170000002",
        fullName: "Maria Demo Resident",
        sitio: "Sitio Ilaya",
        yearsOfResidency: 12,
      },
    );
    await recordStep(page, "resident-b-residency-request-submitted", residencyRequest.number);
    const residencyId = residencyRequest.href.split("/").pop();
    await logout(page);

    await login(page, adminEmail, staffPassword, "admin/dashboard");
    await acceptRequest(page, certificateRequest.number);
    await acceptRequest(page, residencyRequest.number);
    await logout(page);

    await login(page, residentAEmail, residentPassword, "resident/dashboard");
    const certificatePaymentReference = await submitPayment(page, certificateId, certificateRequest.number, "gcash", `DEMO-GCASH-${Date.now()}`, path.join(artifactRoot, "fixtures", "demo-payment-receipt.png"));
    await logout(page);

    await login(page, residentBEmail, residentPassword, "resident/dashboard");
    const residencyPaymentReference = await submitPayment(page, residencyId, residencyRequest.number, "maya", `DEMO-MAYA-${Date.now()}`, path.join(artifactRoot, "fixtures", "demo-payment-receipt.png"));
    await logout(page);

    await login(page, adminEmail, staffPassword, "admin/dashboard");
    if (certificatePaymentReference) {
      await reviewPayment(page, certificateRequest.number, certificatePaymentReference);
    }
    if (residencyPaymentReference) {
      await reviewPayment(page, residencyRequest.number, residencyPaymentReference);
    }

    await issueCertificate(page, clearance, `admin-${clearance}-clearance.pdf`);
    await issueCertificate(page, certificateRequest.number, `admin-${certificateRequest.number}-certificate.pdf`);
    await issueCertificate(page, indigency, `admin-${indigency}-indigency.pdf`);
    await issueCertificate(page, residencyRequest.number, `admin-${residencyRequest.number}-residency.pdf`);

    await goto(page, "/admin/reports");
    const reportPdfPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: "Download PDF", exact: true }).click();
    const reportPdf = await reportPdfPromise;
    const reportPdfPath = path.join(downloadRoot, "admin-request-report.pdf");
    await reportPdf.saveAs(reportPdfPath);
    const reportPdfBytes = (await readFile(reportPdfPath)).byteLength;
    pushAssertion("Report PDF download is non-empty", reportPdfBytes > 1000, `${reportPdfBytes} bytes.`);
    results.downloads.push({ bytes: reportPdfBytes, name: "admin-request-report.pdf", source: "report" });
    const reportExcelPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: "Export Excel", exact: true }).click();
    const reportExcel = await reportExcelPromise;
    const reportExcelPath = path.join(downloadRoot, "admin-request-report.xlsx");
    await reportExcel.saveAs(reportExcelPath);
    const reportExcelBytes = (await readFile(reportExcelPath)).byteLength;
    pushAssertion("Report Excel download is non-empty", reportExcelBytes > 1000, `${reportExcelBytes} bytes.`);
    results.downloads.push({ bytes: reportExcelBytes, name: "admin-request-report.xlsx", source: "report" });
    await recordStep(page, "admin-report-exports", "Export Excel");
    await goto(page, "/admin/activity-log");
    await recordStep(page, "admin-final-activity-log", "Activity Log");
    await logout(page);

    await login(page, residentAEmail, residentPassword, "resident/dashboard");
    await goto(page, "/resident/certificates");
    await recordStep(page, "resident-a-certificates", "My Certificates");
    const viewCertificate = page.getByRole("link", { name: "View certificate", exact: true }).first();
    if ((await viewCertificate.count()) > 0) {
      await viewCertificate.click();
      await waitForPage(page);
      await page.getByRole("link", { name: "Download certificate PDF", exact: true }).waitFor({
        state: "visible",
        timeout: 20000,
      });
      await recordStep(page, "resident-a-certificate-detail", "Download certificate PDF");
      const residentDownloadPromise = page.waitForEvent("download");
      await page.getByRole("link", { name: "Download certificate PDF", exact: true }).click();
      const residentDownload = await residentDownloadPromise;
      const residentPdfPath = path.join(downloadRoot, "resident-certificate.pdf");
      await residentDownload.saveAs(residentPdfPath);
      const residentPdfBytes = (await readFile(residentPdfPath)).byteLength;
      pushAssertion("Resident certificate PDF download is non-empty", residentPdfBytes > 1000, `${residentPdfBytes} bytes.`);
      results.downloads.push({ bytes: residentPdfBytes, name: "resident-certificate.pdf", source: "resident" });
      await recordStep(page, "resident-a-certificate-downloaded", "Download certificate PDF");
    }
    await logout(page);

    await login(page, residentBEmail, residentPassword, "resident/dashboard");
    const rejection = await createResidentRequest(
      page,
      "barangay_residency",
      `Resident B rejection test ${Date.now()}`,
      {
        age: 31,
        birthdate: "1995-09-20",
        contactNumber: "09170000002",
        fullName: "Maria Demo Resident",
        sitio: "Sitio Ilaya",
        yearsOfResidency: 12,
      },
    );
    await recordStep(page, "resident-b-request-submitted", rejection.number);
    const rejectionHref = rejection.href;
    await logout(page);

    await login(page, adminEmail, staffPassword, "admin/dashboard");
    await rejectRequest(page, rejection.number, "Incomplete Information - synthetic QA rejection.");
    await logout(page);

    await login(page, residentBEmail, residentPassword, "resident/dashboard");
    await resubmitRejectedRequest(page, rejectionHref, `Resident B corrected resubmission ${Date.now()}`);
    const cancelled = await createResidentRequest(
      page,
      "barangay_clearance",
      `Resident B cancellation test ${Date.now()}`,
      {
        age: 31,
        contactNumber: "09170000002",
        fullName: "Maria Demo Resident",
        sitio: "Sitio Ilaya",
      },
    );
    await goto(page, cancelled.href);
    await page.getByRole("button", { name: "Cancel Pending Request", exact: true }).click();
    await waitForStatus(page);
    await waitForPage(page);
    await assertText(page, "Request cancelled", "Pending request cancellation");
    await recordStep(page, "resident-b-request-cancelled", "Request cancelled");
    await goto(page, "/admin/dashboard");
    pushAssertion("Resident cannot access admin dashboard", page.url().includes("/resident/dashboard"));
    await recordStep(page, "resident-b-admin-guard", "Welcome, Maria Demo Resident");
    await logout(page);

    await login(page, secretaryEmail, staffPassword, "admin/dashboard");
    await recordStep(page, "secretary-dashboard", "Welcome, Demo Barangay Secretary");
    await logout(page);

    await context.tracing.stop({ path: path.join(artifactRoot, "playwright-trace.zip") });
    results.status = "passed";
  } finally {
    await writeContextLogs("recorded", state);
    video = page.video();
    await context.close();
    await browser.close();
    if (video) {
      const videoPath = await video.path();
      const target = path.join(artifactRoot, "video", "demo-workflow.webm");
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(videoPath, target);
    }
  }
}

async function writeIndex() {
  results.finishedAt = new Date().toISOString();
  const durationMs = new Date(results.finishedAt).getTime() - new Date(results.startedAt).getTime();
  results.durationSeconds = Math.round(durationMs / 100) / 10;
  await writeFile(path.join(artifactRoot, "workflow-results.json"), `${JSON.stringify(results, null, 2)}\n`, "utf8");
  const rows = results.steps
    .map((step) => `| ${step.name} | [screenshot](${step.screenshot}) | ${step.url} |`)
    .join("\n");
  const downloads = results.downloads
    .map((item) => `- [${item.name}](downloads/${item.name}) (${item.bytes} bytes; ${item.source})`)
    .join("\n");
  const assertions = results.assertions
    .map((item) => `- ${item.passed ? "PASS" : "FAIL"}: ${item.label}${item.detail ? ` - ${item.detail}` : ""}`)
    .join("\n");
  const content = `# Playwright Demo Evidence\n\nStatus: **${results.status}**  \nBase URL: ${results.baseUrl}  \nViewport: 1440 x 900  \nDuration: ${results.durationSeconds}s\n\nThis evidence uses synthetic demo identities and synthetic payment proof only. Passwords are never written to these artifacts.\n\n## Recording\n\n- [Desktop workflow video](video/demo-workflow.webm)\n- [Playwright trace](playwright-trace.zip)\n- [Structured results](workflow-results.json)\n\n## Downloads\n\n${downloads || "No downloads captured."}\n\n## Assertions\n\n${assertions}\n\n## Screenshots\n\n| Step | Evidence | URL |\n| --- | --- | --- |\n${rows}\n`;
  await writeFile(path.join(artifactRoot, "INDEX.md"), content, "utf8");
}

async function main() {
  requireCredential("DEMO_ADMIN_PASSWORD", staffPassword);
  requireCredential("DEMO_RESIDENT_PASSWORD", residentPassword);
  await rm(artifactRoot, { force: true, recursive: true });
  await Promise.all([
    mkdir(screenshotRoot, { recursive: true }),
    mkdir(downloadRoot, { recursive: true }),
    mkdir(logRoot, { recursive: true }),
    mkdir(path.join(artifactRoot, "fixtures"), { recursive: true }),
    mkdir(videoRoot, { recursive: true }),
  ]);
  await writeFile(path.join(artifactRoot, "fixtures", "demo-payment-receipt.png"), Buffer.from(syntheticReceiptPng, "base64"));

  try {
    await runPreflight();
    await runRecordedWorkflow();
  } catch (error) {
    results.status = "failed";
    results.error = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${results.error}\n`);
  } finally {
    await writeIndex();
  }

  if (results.status !== "passed") process.exitCode = 1;
}

await main();
