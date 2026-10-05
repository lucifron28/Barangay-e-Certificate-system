/* global console */
import { chromium } from '@playwright/test';
import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
// ---------------------------------------------------------------------------
// Configuration & Credentials
// ---------------------------------------------------------------------------
const BASE_URL = (process.env.QA_BASE_URL || 'https://barangay-bato-ecertificate-system.vercel.app').replace(/\/$/, '');
const ADMIN_LOGIN = process.env.QA_ADMIN_LOGIN || 'admin@example.com';
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || 'Demo12345678!';
const SECRETARY_LOGIN = process.env.QA_SECRETARY_LOGIN || 'secretary@example.com';
const SECRETARY_PASSWORD = process.env.QA_SECRETARY_PASSWORD || 'Demo12345678!';
const RESIDENT_1_LOGIN = process.env.QA_RESIDENT_LOGIN || 'resident@example.com';
const RESIDENT_1_PASSWORD = process.env.QA_RESIDENT_PASSWORD || 'Demo12345678!';
const RESIDENT_2_LOGIN = process.env.QA_SECOND_RESIDENT_LOGIN || 'maria.resident@example.com';
const RESIDENT_2_PASSWORD = process.env.QA_SECOND_RESIDENT_PASSWORD || 'Demo12345678!';

const ARTIFACT_DIR = path.resolve('artifacts/playwright-demo');
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'screenshots');
const DOWNLOAD_DIR = path.join(ARTIFACT_DIR, 'downloads');

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

// Ensure synthetic receipt image exists in gitignored storage
const SYNTHETIC_RECEIPT_PATH = path.join(ARTIFACT_DIR, 'payment-receipt.png');
if (!fs.existsSync(SYNTHETIC_RECEIPT_PATH)) {
  const png1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  fs.writeFileSync(SYNTHETIC_RECEIPT_PATH, png1x1);
}

// ---------------------------------------------------------------------------
// Logging & Assertion Tracker
// ---------------------------------------------------------------------------
const testResults = [];

function assertTest(scenario, testName, condition, details = '') {
  const status = condition ? 'PASS' : 'FAIL';
  testResults.push({ scenario, testName, status, details });
  const icon = condition ? '✅' : '❌';
  console.log(`${icon} [${scenario}] ${testName}: ${status} ${details ? '— ' + details : ''}`);
  if (!condition) {
    throw new Error(`Assertion failed: [${scenario}] ${testName} (${details})`);
  }
}

// Helper: login user
async function loginUser(page, email, password, expectedUrlFragment) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[name="login"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL(`**${expectedUrlFragment}**`, { timeout: 30000 }).catch(() => null),
    page.click('button[type="submit"]')
  ]);
  const currentUrl = page.url();
  return currentUrl.includes(expectedUrlFragment);
}

// Helper: submit form and wait for server action POST response
async function submitFormAndWait(page, submitButtonLocator) {
  await Promise.all([
    page.waitForResponse(res => res.request().method() === 'POST', { timeout: 35000 }).catch(() => null),
    submitButtonLocator.click()
  ]);
  await page.waitForLoadState('networkidle').catch(() => null);
  await page.waitForTimeout(3000);
}

// Helper: load generate certificate page with reload fallback for Next.js cache revalidation
async function openGenerateCertificatePage(page, requestId) {
  await page.goto(`${BASE_URL}/admin/generate-certificate/${requestId}`, { waitUntil: 'networkidle' });
  let signBtn = page.locator('button:has-text("Sign & Issue Certificate")');
  const isVis = await signBtn.isVisible().catch(() => false);
  if (!isVis) {
    await page.waitForTimeout(2500);
    await page.reload({ waitUntil: 'networkidle' });
    signBtn = page.locator('button:has-text("Sign & Issue Certificate")');
  }
  await signBtn.waitFor({ state: 'visible', timeout: 35000 });
  return signBtn;
}

// ---------------------------------------------------------------------------
// Main QA Simulation Runner
// ---------------------------------------------------------------------------
async function runSimulation() {
  console.log('========================================================================================');
  console.log('STARTING CONTROLLED QA PAYMENT SIMULATION ON DEPLOYED APPLICATION');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('========================================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const timestampPrefix = Date.now().toString().slice(-6);

  try {
    // =======================================================================
    // SCENARIO 1: GCash Standard Manual Payment Lifecycle
    // =======================================================================
    console.log('\n--- Scenario 1: GCash Standard Manual Payment Lifecycle ---');
    let gcashRequestId = null;
    let gcashRequestNum = null;
    let gcashCertCode = null;

    // 1.1 Resident 1 applies for Barangay Clearance (fee: ₱50.00)
    const res1Context = await browser.newContext();
    const res1Page = await res1Context.newPage();
    const r1LoginOk = await loginUser(res1Page, RESIDENT_1_LOGIN, RESIDENT_1_PASSWORD, '/resident/dashboard');
    assertTest('Scenario 1 - GCash', 'Resident 1 Login', r1LoginOk, res1Page.url());

    await res1Page.goto(`${BASE_URL}/resident/request-certificate`, { waitUntil: 'networkidle' });
    await res1Page.selectOption('select[name="certificate_type"]', 'barangay_clearance');
    await res1Page.fill('textarea[name="purpose"], input[name="purpose"]', `QA GCash Simulation Run ${timestampPrefix}`);
    if (await res1Page.locator('input[name="contact_number"]').count() > 0) {
      await res1Page.fill('input[name="contact_number"]', '09171234567');
    }

    await Promise.all([
      res1Page.waitForURL('**/resident/my-requests/**', { timeout: 30000 }),
      res1Page.click('button[type="submit"]:has-text("Submit")')
    ]);

    const gcashReqUrl = res1Page.url();
    gcashRequestId = gcashReqUrl.split('/resident/my-requests/')[1].split('?')[0];
    const pageText1 = await res1Page.textContent('body');
    const numMatch1 = pageText1.match(/REQ-2026-[0-9]{4}/);
    gcashRequestNum = numMatch1 ? numMatch1[0] : gcashRequestId.slice(0, 8);
    assertTest('Scenario 1 - GCash', 'Clearance Request Created', Boolean(gcashRequestId), `RRN: ${gcashRequestNum}`);
    await res1Context.close();

    // 1.2 Secretary reviews and accepts the request
    const secContext1 = await browser.newContext();
    const secPage1 = await secContext1.newPage();
    const secLogin1 = await loginUser(secPage1, SECRETARY_LOGIN, SECRETARY_PASSWORD, '/admin/dashboard');
    assertTest('Scenario 1 - GCash', 'Secretary Login', secLogin1);

    await secPage1.goto(`${BASE_URL}/admin/certificate-requests/${gcashRequestId}`, { waitUntil: 'networkidle' });
    const acceptForm1 = secPage1.locator('form:has(button:has-text("Accept Request"))');
    await acceptForm1.locator('textarea[name="remarks"]').fill('Accepted for automated QA simulation.');
    await submitFormAndWait(secPage1, acceptForm1.locator('button:has-text("Accept Request")'));
    const secPage1Text = await secPage1.textContent('body');
    assertTest('Scenario 1 - GCash', 'Staff Acceptance', secPage1Text.includes('Accepted') || secPage1Text.includes('accepted'));
    await secContext1.close();

    // 1.3 Resident opens payment page, selects GCash, submits synthetic proof
    const res1PayContext = await browser.newContext();
    const res1PayPage = await res1PayContext.newPage();
    await loginUser(res1PayPage, RESIDENT_1_LOGIN, RESIDENT_1_PASSWORD, '/resident/dashboard');

    await res1PayPage.goto(`${BASE_URL}/resident/payments/${gcashRequestId}`, { waitUntil: 'networkidle' });
    await res1PayPage.locator('button:has-text("GCash")').click();
    await res1PayPage.waitForTimeout(300);

    const paymentText1 = await res1PayPage.textContent('body');
    assertTest('Scenario 1 - GCash', 'Official Merchant Identity Displayed', paymentText1.includes('Barangay Bato Treasury'));
    assertTest('Scenario 1 - GCash', 'No Demo Mode Banners Exposed', !paymentText1.includes('Demo payment mode'));

    const syntheticGcashRef = `20261005${timestampPrefix}1`;
    const proofForm1 = res1PayPage.locator('form:has(input[name="reference_number"])');
    await proofForm1.locator('input[name="reference_number"]').fill(syntheticGcashRef);
    await proofForm1.locator('input[name="proof_image"]').setInputFiles(SYNTHETIC_RECEIPT_PATH);

    await submitFormAndWait(res1PayPage, proofForm1.locator('button[type="submit"]'));

    const afterSubmitText1 = await res1PayPage.textContent('body');
    assertTest('Scenario 1 - GCash', 'Proof Ingestion -> Pending Verification', afterSubmitText1.includes('Pending Verification') || afterSubmitText1.includes('submitted successfully'), `Ref: ${syntheticGcashRef}`);
    await res1PayContext.close();

    // 1.4 Staff reviews evidence and confirms payment
    const staffReconContext1 = await browser.newContext();
    const staffReconPage1 = await staffReconContext1.newPage();
    await loginUser(staffReconPage1, SECRETARY_LOGIN, SECRETARY_PASSWORD, '/admin/dashboard');

    await staffReconPage1.goto(`${BASE_URL}/admin/payments`, { waitUntil: 'networkidle' });
    const reviewLink1 = staffReconPage1.locator('a[href*="/admin/payments/"]:has-text("Review Proof")').first();
    const reviewHref1 = await reviewLink1.getAttribute('href');
    const gcashPaymentId = reviewHref1.split('/admin/payments/')[1].split('?')[0];
    console.log(`Reviewing GCash payment ID: ${gcashPaymentId}`);
    await staffReconPage1.goto(`${BASE_URL}${reviewHref1}`, { waitUntil: 'networkidle' });
    const detailText1 = await staffReconPage1.textContent('body');
    assertTest('Scenario 1 - GCash', 'Staff Review Surface Displays Ref No.', detailText1.includes(syntheticGcashRef));

    const confirmForm1 = staffReconPage1.locator('form:has(button:has-text("Confirm Payment Received"))');
    await confirmForm1.locator('input[name="remarks"]').fill('Verified via GCash receiving phone for QA simulation.');

    await Promise.all([
      staffReconPage1.waitForResponse(res => res.request().method() === 'POST', { timeout: 45000 }),
      confirmForm1.evaluate(f => f.requestSubmit())
    ]);
    await staffReconPage1.waitForURL(url => url.searchParams.has('message') || url.pathname === '/admin/payments', { timeout: 30000 }).catch(() => null);
    await staffReconPage1.waitForTimeout(3000);
    assertTest('Scenario 1 - GCash', 'Staff Confirms Payment Received', staffReconPage1.url().includes('/admin/payments'));
    await staffReconContext1.close();

    // 1.5 Main Admin signs and issues the certificate
    const adminContext1 = await browser.newContext();
    const adminPage1 = await adminContext1.newPage();
    await loginUser(adminPage1, ADMIN_LOGIN, ADMIN_PASSWORD, '/admin/dashboard');

    const signBtn1 = await openGenerateCertificatePage(adminPage1, gcashRequestId);
    assertTest('Scenario 1 - GCash', 'Issuance Engine Unlocked Upon Paid', await signBtn1.isEnabled());
    await submitFormAndWait(adminPage1, signBtn1);
    const afterSignText1 = await adminPage1.textContent('body');
    assertTest('Scenario 1 - GCash', 'Certificate Signed & Issued', afterSignText1.includes('Certificate signed and issued') || afterSignText1.includes('Revoke issued certificate'));
    await adminContext1.close();

    // 1.6 Resident downloads official PDF & verifies QR code
    const res1DlContext = await browser.newContext();
    const res1DlPage = await res1DlContext.newPage();
    await loginUser(res1DlPage, RESIDENT_1_LOGIN, RESIDENT_1_PASSWORD, '/resident/dashboard');

    await res1DlPage.goto(`${BASE_URL}/resident/certificates`, { waitUntil: 'networkidle' });
    const topCert1 = res1DlPage.locator('a[href*="/resident/certificates/"]').first();
    const certHref1 = await topCert1.getAttribute('href');
    await res1DlPage.goto(`${BASE_URL}${certHref1}`, { waitUntil: 'networkidle' });

    const dlBtn1 = res1DlPage.locator('a:has-text("Download certificate PDF")');
    const [download1] = await Promise.all([
      res1DlPage.waitForEvent('download', { timeout: 15000 }),
      dlBtn1.click()
    ]);
    const dlPath1 = path.join(DOWNLOAD_DIR, download1.suggestedFilename());
    await download1.saveAs(dlPath1);
    const pdfBytes1 = fs.readFileSync(dlPath1);
    const isPdf1 = pdfBytes1.subarray(0, 5).toString('ascii') === '%PDF-';
    assertTest('Scenario 1 - GCash', 'Resident PDF Download', isPdf1 && pdfBytes1.length > 50000, `Downloaded ${download1.suggestedFilename()} (${pdfBytes1.length} bytes)`);

    // Verify public code on /verify
    const { connect } = await import('@tursodatabase/serverless');
    const db = connect({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
    const verRow1 = await (await db.prepare("SELECT short_verification_code FROM certificate_verifications ORDER BY created_at DESC LIMIT 1")).get();
    gcashCertCode = verRow1?.short_verification_code;

    await res1DlPage.goto(`${BASE_URL}/verify?code=${gcashCertCode}`, { waitUntil: 'networkidle' });
    const verifyText1 = await res1DlPage.textContent('body');
    assertTest('Scenario 1 - GCash', 'Public Verification is VALID', verifyText1.includes('Valid') && !verifyText1.includes('Expired'), `Code: ${gcashCertCode}`);
    await res1DlContext.close();


    // =======================================================================
    // SCENARIO 2: Maya Standard Manual Payment Lifecycle
    // =======================================================================
    console.log('\n--- Scenario 2: Maya Standard Manual Payment Lifecycle ---');
    let mayaRequestId = null;
    let mayaRequestNum = null;
    let mayaPaymentId = null;
    let mayaCertCode = null;

    // 2.1 Resident 2 applies for Barangay Certificate (PAGPAPATUNAY)
    const res2Context = await browser.newContext();
    const res2Page = await res2Context.newPage();
    await loginUser(res2Page, RESIDENT_2_LOGIN, RESIDENT_2_PASSWORD, '/resident/dashboard');

    await res2Page.goto(`${BASE_URL}/resident/request-certificate`, { waitUntil: 'networkidle' });
    await res2Page.selectOption('select[name="certificate_type"]', 'barangay_certificate');
    await res2Page.fill('textarea[name="purpose"], input[name="purpose"]', `QA Maya Simulation Run ${timestampPrefix}`);
    if (await res2Page.locator('input[name="contact_number"]').count() > 0) {
      await res2Page.fill('input[name="contact_number"]', '09179998888');
    }
    if (await res2Page.locator('input[name="place_of_birth"]').count() > 0) {
      await res2Page.fill('input[name="place_of_birth"]', 'Mauban, Quezon');
    }

    await Promise.all([
      res2Page.waitForURL('**/resident/my-requests/**', { timeout: 30000 }),
      res2Page.click('button[type="submit"]:has-text("Submit")')
    ]);

    const mayaReqUrl = res2Page.url();
    mayaRequestId = mayaReqUrl.split('/resident/my-requests/')[1].split('?')[0];
    const pageText2 = await res2Page.textContent('body');
    const numMatch2 = pageText2.match(/REQ-2026-[0-9]{4}/);
    mayaRequestNum = numMatch2 ? numMatch2[0] : mayaRequestId.slice(0, 8);
    assertTest('Scenario 2 - Maya', 'Certificate Request Created', Boolean(mayaRequestId), `RRN: ${mayaRequestNum}`);
    await res2Context.close();

    // 2.2 Secretary accepts the request
    const secContext2 = await browser.newContext();
    const secPage2 = await secContext2.newPage();
    await loginUser(secPage2, SECRETARY_LOGIN, SECRETARY_PASSWORD, '/admin/dashboard');

    await secPage2.goto(`${BASE_URL}/admin/certificate-requests/${mayaRequestId}`, { waitUntil: 'networkidle' });
    const acceptForm2 = secPage2.locator('form:has(button:has-text("Accept Request"))');
    await acceptForm2.locator('textarea[name="remarks"]').fill('Accepted for Maya QA simulation.');
    await submitFormAndWait(secPage2, acceptForm2.locator('button:has-text("Accept Request")'));
    assertTest('Scenario 2 - Maya', 'Staff Acceptance', (await secPage2.textContent('body')).includes('Accepted'));
    await secContext2.close();

    // 2.3 Resident 2 opens payment page, selects Maya, submits synthetic proof
    const res2PayContext = await browser.newContext();
    const res2PayPage = await res2PayContext.newPage();
    await loginUser(res2PayPage, RESIDENT_2_LOGIN, RESIDENT_2_PASSWORD, '/resident/dashboard');

    await res2PayPage.goto(`${BASE_URL}/resident/payments/${mayaRequestId}`, { waitUntil: 'networkidle' });
    await res2PayPage.locator('button:has-text("Maya")').click();
    await res2PayPage.waitForTimeout(300);

    const paymentText2 = await res2PayPage.textContent('body');
    assertTest('Scenario 2 - Maya', 'Official Maya Merchant Displayed', paymentText2.includes('Barangay Bato Treasury Maya'));

    const syntheticMayaRef = `MAYA-2026-${timestampPrefix}`;
    const proofForm2 = res2PayPage.locator('form:has(input[name="reference_number"])');
    await proofForm2.locator('input[name="reference_number"]').fill(syntheticMayaRef);
    await proofForm2.locator('input[name="proof_image"]').setInputFiles(SYNTHETIC_RECEIPT_PATH);

    await submitFormAndWait(res2PayPage, proofForm2.locator('button[type="submit"]'));

    const afterSubmitText2 = await res2PayPage.textContent('body');
    assertTest('Scenario 2 - Maya', 'Maya Proof Ingestion -> Pending Verification', afterSubmitText2.includes('Pending Verification') || afterSubmitText2.includes('submitted successfully'), `Ref: ${syntheticMayaRef}`);
    await res2PayContext.close();

    // 2.4 Staff reviews and confirms Maya payment
    const staffReconContext2 = await browser.newContext();
    const staffReconPage2 = await staffReconContext2.newPage();
    await loginUser(staffReconPage2, SECRETARY_LOGIN, SECRETARY_PASSWORD, '/admin/dashboard');

    const mayaPmtRow = await (await db.prepare("SELECT id FROM payments WHERE request_id = ? ORDER BY created_at DESC LIMIT 1")).get([mayaRequestId]);
    mayaPaymentId = mayaPmtRow?.id;

    await staffReconPage2.goto(`${BASE_URL}/admin/payments/${mayaPaymentId}`, { waitUntil: 'networkidle' });
    assertTest('Scenario 2 - Maya', 'Staff Review Surface Displays Maya Ref', (await staffReconPage2.textContent('body')).includes(syntheticMayaRef));

    const confirmForm2 = staffReconPage2.locator('form:has(button:has-text("Confirm Payment Received"))');
    await confirmForm2.locator('input[name="remarks"]').fill('Confirmed received in Maya merchant portal for QA.');

    await Promise.all([
      staffReconPage2.waitForResponse(res => res.request().method() === 'POST', { timeout: 45000 }),
      confirmForm2.evaluate(f => f.requestSubmit())
    ]);
    await staffReconPage2.waitForURL(url => url.searchParams.has('message') || url.pathname === '/admin/payments', { timeout: 30000 }).catch(() => null);
    await staffReconPage2.waitForTimeout(3000);
    assertTest('Scenario 2 - Maya', 'Staff Confirms Maya Payment', staffReconPage2.url().includes('/admin/payments'));
    await staffReconContext2.close();

    // 2.5 Admin signs and issues the certificate
    const adminContext2 = await browser.newContext();
    const adminPage2 = await adminContext2.newPage();
    await loginUser(adminPage2, ADMIN_LOGIN, ADMIN_PASSWORD, '/admin/dashboard');

    const signBtn2 = await openGenerateCertificatePage(adminPage2, mayaRequestId);
    await submitFormAndWait(adminPage2, signBtn2);
    assertTest('Scenario 2 - Maya', 'Maya Certificate Signed & Issued', (await adminPage2.textContent('body')).includes('Certificate signed and issued'));
    await adminContext2.close();

    // 2.6 Resident downloads Maya PDF and verifies code
    const res2DlContext = await browser.newContext();
    const res2DlPage = await res2DlContext.newPage();
    await loginUser(res2DlPage, RESIDENT_2_LOGIN, RESIDENT_2_PASSWORD, '/resident/dashboard');

    await res2DlPage.goto(`${BASE_URL}/resident/certificates`, { waitUntil: 'networkidle' });
    const topCert2 = res2DlPage.locator('a[href*="/resident/certificates/"]').first();
    const certHref2 = await topCert2.getAttribute('href');
    await res2DlPage.goto(`${BASE_URL}${certHref2}`, { waitUntil: 'networkidle' });

    const [download2] = await Promise.all([
      res2DlPage.waitForEvent('download', { timeout: 15000 }),
      res2DlPage.locator('a:has-text("Download certificate PDF")').click()
    ]);
    const dlPath2 = path.join(DOWNLOAD_DIR, download2.suggestedFilename());
    await download2.saveAs(dlPath2);
    const pdfBytes2 = fs.readFileSync(dlPath2);
    assertTest('Scenario 2 - Maya', 'Resident Download Maya PDF', pdfBytes2.subarray(0, 5).toString('ascii') === '%PDF-');

    const verRow2 = await (await db.prepare("SELECT short_verification_code FROM certificate_verifications ORDER BY created_at DESC LIMIT 1")).get();
    mayaCertCode = verRow2?.short_verification_code;

    await res2DlPage.goto(`${BASE_URL}/verify?code=${mayaCertCode}`, { waitUntil: 'networkidle' });
    assertTest('Scenario 2 - Maya', 'Public QR Verification is VALID', (await res2DlPage.textContent('body')).includes('Valid'), `Code: ${mayaCertCode}`);
    await res2DlContext.close();


    // =======================================================================
    // SCENARIO 3: Rejection & Corrected Resubmission Lifecycle
    // =======================================================================
    console.log('\n--- Scenario 3: Rejection & Corrected Resubmission Lifecycle ---');
    let rejRequestId = null;
    let rejPaymentId = null;
    // 3.1 Resident 1 requests Barangay Residency
    const res1Context3 = await browser.newContext();
    const res1Page3 = await res1Context3.newPage();
    await loginUser(res1Page3, RESIDENT_1_LOGIN, RESIDENT_1_PASSWORD, '/resident/dashboard');

    await res1Page3.goto(`${BASE_URL}/resident/request-certificate`, { waitUntil: 'networkidle' });
    await res1Page3.selectOption('select[name="certificate_type"]', 'barangay_residency');
    await res1Page3.fill('textarea[name="purpose"], input[name="purpose"]', `QA Rejection Test ${timestampPrefix}`);
    if (await res1Page3.locator('input[name="birthdate"]').count() > 0) {
      await res1Page3.fill('input[name="birthdate"]', '1995-05-15');
    }
    if (await res1Page3.locator('input[name="years_of_residency"]').count() > 0) {
      await res1Page3.fill('input[name="years_of_residency"]', '5');
    }
    await Promise.all([
      res1Page3.waitForURL('**/resident/my-requests/**', { timeout: 30000 }),
      res1Page3.click('button[type="submit"]:has-text("Submit")')
    ]);
    rejRequestId = res1Page3.url().split('/resident/my-requests/')[1].split('?')[0];
    await res1Context3.close();

    // 3.2 Secretary accepts request
    const secContext3 = await browser.newContext();
    const secPage3 = await secContext3.newPage();
    await loginUser(secPage3, SECRETARY_LOGIN, SECRETARY_PASSWORD, '/admin/dashboard');

    await secPage3.goto(`${BASE_URL}/admin/certificate-requests/${rejRequestId}`, { waitUntil: 'networkidle' });
    const acceptForm3 = secPage3.locator('form:has(button:has-text("Accept Request"))');
    await acceptForm3.locator('textarea[name="remarks"]').fill('Accepted for rejection test.');
    await submitFormAndWait(secPage3, acceptForm3.locator('button:has-text("Accept Request")'));
    await secContext3.close();

    // 3.3 Resident submits bad reference: WRONG-REF-000000
    const res1PayContext3 = await browser.newContext();
    const res1PayPage3 = await res1PayContext3.newPage();
    await loginUser(res1PayPage3, RESIDENT_1_LOGIN, RESIDENT_1_PASSWORD, '/resident/dashboard');

    await res1PayPage3.goto(`${BASE_URL}/resident/payments/${rejRequestId}`, { waitUntil: 'networkidle' });
    const flawedRef = `FLAWED-${timestampPrefix}`;
    const proofForm3 = res1PayPage3.locator('form:has(input[name="reference_number"])');
    await proofForm3.locator('input[name="reference_number"]').fill(flawedRef);
    await proofForm3.locator('input[name="proof_image"]').setInputFiles(SYNTHETIC_RECEIPT_PATH);
    await submitFormAndWait(res1PayPage3, proofForm3.locator('button[type="submit"]'));
    const text3 = await res1PayPage3.textContent('body');
    assertTest('Scenario 3 - Rejection', 'Flawed Payment Ingested', text3.includes('Pending Verification') || text3.includes('submitted successfully'));
    await res1PayContext3.close();

    // 3.4 Staff rejects payment proof with standardized reason
    const staffRejContext = await browser.newContext();
    const staffRejPage = await staffRejContext.newPage();
    await loginUser(staffRejPage, SECRETARY_LOGIN, SECRETARY_PASSWORD, '/admin/dashboard');

    const rejPmtRow = await (await db.prepare("SELECT id FROM payments WHERE request_id = ? ORDER BY created_at DESC LIMIT 1")).get([rejRequestId]);
    rejPaymentId = rejPmtRow?.id;

    await staffRejPage.goto(`${BASE_URL}/admin/payments/${rejPaymentId}`, { waitUntil: 'networkidle' });
    const rejForm = staffRejPage.locator('form:has(button:has-text("Reject Payment Proof"))');
    await rejForm.locator('select[name="reason"]').selectOption('Reference not found');
    await rejForm.locator('textarea[name="remarks"]').fill('Transaction reference was absent from merchant ledger. Please re-enter.');
    await submitFormAndWait(staffRejPage, rejForm.locator('button:has-text("Reject Payment Proof")'));
    assertTest('Scenario 3 - Rejection', 'Staff Executes Rejection', staffRejPage.url().includes('/admin/payments'));
    await staffRejContext.close();

    // 3.5 Resident inspects rejection instructions & resubmits corrected proof
    const res1ResubContext = await browser.newContext();
    const res1ResubPage = await res1ResubContext.newPage();
    await loginUser(res1ResubPage, RESIDENT_1_LOGIN, RESIDENT_1_PASSWORD, '/resident/dashboard');

    await res1ResubPage.goto(`${BASE_URL}/resident/payments/${rejRequestId}`, { waitUntil: 'networkidle' });
    const rejViewText = await res1ResubPage.textContent('body');
    assertTest('Scenario 3 - Rejection', 'Resident Sees Rejection Feedback', rejViewText.includes('Transaction reference was absent') || rejViewText.includes('Reference not found'));

    const correctedRef = `20261005${timestampPrefix}8`;
    const resubForm = res1ResubPage.locator('form:has(input[name="reference_number"])');
    await resubForm.locator('input[name="reference_number"]').fill(correctedRef);
    await resubForm.locator('input[name="proof_image"]').setInputFiles(SYNTHETIC_RECEIPT_PATH);
    await submitFormAndWait(res1ResubPage, resubForm.locator('button[type="submit"]'));
    const resubText = await res1ResubPage.textContent('body');
    assertTest('Scenario 3 - Rejection', 'Resubmission Transitions Back to Pending', resubText.includes('Pending Verification') || resubText.includes('submitted successfully'));
    await res1ResubContext.close();

    // 3.6 Staff approves resubmission & Admin signs certificate
    const staffApproveContext = await browser.newContext();
    const staffApprovePage = await staffApproveContext.newPage();
    await loginUser(staffApprovePage, SECRETARY_LOGIN, SECRETARY_PASSWORD, '/admin/dashboard');

    await staffApprovePage.goto(`${BASE_URL}/admin/payments/${rejPaymentId}`, { waitUntil: 'networkidle' });
    const approveResubForm = staffApprovePage.locator('form:has(button:has-text("Confirm Payment Received"))');
    await approveResubForm.locator('input[name="remarks"]').fill('Corrected reference verified in ledger.');
    await Promise.all([
      staffApprovePage.waitForResponse(res => res.request().method() === 'POST', { timeout: 45000 }),
      approveResubForm.evaluate(f => f.requestSubmit())
    ]);
    await staffApprovePage.waitForURL(url => url.searchParams.has('message') || url.pathname === '/admin/payments', { timeout: 30000 }).catch(() => null);
    await staffApprovePage.waitForTimeout(3000);
    await staffApproveContext.close();

    const adminContext3 = await browser.newContext();
    const adminPage3 = await adminContext3.newPage();
    await loginUser(adminPage3, ADMIN_LOGIN, ADMIN_PASSWORD, '/admin/dashboard');
    const signBtn3 = await openGenerateCertificatePage(adminPage3, rejRequestId);
    await submitFormAndWait(adminPage3, signBtn3);
    assertTest('Scenario 3 - Rejection', 'Resubmitted Certificate Issued', (await adminPage3.textContent('body')).includes('Certificate signed and issued'));


    // =======================================================================
    // SCENARIO 4: Security, Boundaries & IDOR Isolation
    // =======================================================================
    console.log('\n--- Scenario 4: Security, Boundaries & IDOR Isolation ---');
    const boundContext = await browser.newContext();
    const boundPage = await boundContext.newPage();
    await loginUser(boundPage, RESIDENT_1_LOGIN, RESIDENT_1_PASSWORD, '/resident/dashboard');

    // 4.1 Non-existent request payment URL
    await boundPage.goto(`${BASE_URL}/resident/payments/00000000-0000-4000-8000-000000000000`, { waitUntil: 'networkidle' });
    assertTest('Scenario 4 - Security', 'Non-Existent Request Guard', boundPage.url().includes('/resident/my-requests?error='));

    // 4.2 Cross-resident payment isolation (Resident 1 accessing Resident 2's request)
    await boundPage.goto(`${BASE_URL}/resident/payments/${mayaRequestId}`, { waitUntil: 'networkidle' });
    assertTest('Scenario 4 - Security', 'Cross-Resident Payment Isolation', boundPage.url().includes('/resident/my-requests?error='));

    await boundContext.close();

    console.log('\n========================================================================================');
    console.log('QA SIMULATION SUMMARY: ALL TEST SCENARIOS PASSED WITH 100% PARITY');
    console.log(`Total Assertions Passed: ${testResults.filter(r => r.status === 'PASS').length} / ${testResults.length}`);
    console.log('========================================================================================\n');
  } finally {
    await browser.close();
  }
}

runSimulation().catch(err => {
  console.error('\nQA Simulation Execution Error:', err);
  process.exit(1);
});
