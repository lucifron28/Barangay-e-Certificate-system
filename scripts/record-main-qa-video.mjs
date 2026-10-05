/* global console */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const BASE_URL = (process.env.QA_BASE_URL || 'https://barangay-bato-ecertificate-system.vercel.app').replace(/\/$/, '');
const ADMIN_LOGIN = process.env.QA_ADMIN_LOGIN || 'admin@example.com';
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || 'Demo12345678!';
const SECRETARY_LOGIN = process.env.QA_SECRETARY_LOGIN || 'secretary@example.com';
const SECRETARY_PASSWORD = process.env.QA_SECRETARY_PASSWORD || 'Demo12345678!';
const RESIDENT_LOGIN = process.env.QA_RESIDENT_LOGIN || 'resident@example.com';
const RESIDENT_PASSWORD = process.env.QA_RESIDENT_PASSWORD || 'Demo12345678!';

const ARTIFACT_DIR = path.resolve('artifacts/payment-qa');
const VIDEO_DIR = path.join(ARTIFACT_DIR, 'videos');
const DOWNLOAD_DIR = path.join(ARTIFACT_DIR, 'downloads');
const GENERATED_DIR = path.join(ARTIFACT_DIR, 'generated');
const GCASH_RECEIPT_PATH = path.join(GENERATED_DIR, 'gcash-qa-receipt.png');

fs.mkdirSync(VIDEO_DIR, { recursive: true });
fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

async function injectDisclaimerBanner(page) {
  await page.evaluate(() => {
    const doc = globalThis.document;
    if (doc.getElementById('qa-simulation-disclaimer-banner')) return;
    const banner = doc.createElement('div');
    banner.id = 'qa-simulation-disclaimer-banner';
    banner.innerHTML = '<strong>PAYMENT TRANSACTION SHOWN IN THIS QA RUN IS SIMULATED. NO REAL GCash/Maya FUNDS WERE TRANSFERRED. THE PURPOSE IS TO VALIDATE THE SYSTEM\'S MANUAL PAYMENT VERIFICATION WORKFLOW.</strong>';
    banner.style.cssText = 'position:fixed;top:0;left:0;width:100%;pointer-events:none;background:#DC2626;color:#FFFFFF;padding:8px 16px;font-size:11px;font-weight:800;text-align:center;z-index:999999;box-shadow:0 2px 10px rgba(0,0,0,0.3);letter-spacing:0.5px;';
    doc.body.prepend(banner);
    doc.body.style.paddingTop = '36px';
  });
}

function generateGcash13DigitRef(date = new Date()) {
  const yy = date.getFullYear().toString().slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yymmdd = `${yy}${mm}${dd}`;
  const random7 = Math.floor(1000000 + Math.random() * 9000000).toString();
  return `${yymmdd}${random7}`;
}

async function loginStep(page, context, email, password, expectedUrlFragment) {
  await context.clearCookies();
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[name="login"]', { timeout: 30000 });
  await page.waitForLoadState('networkidle').catch(() => null);
  await page.fill('input[name="login"]', email);
  await page.fill('input[name="password"]', password);
  try {
    await Promise.all([
      page.waitForURL(`**${expectedUrlFragment}**`, { timeout: 45000 }),
      page.click('button[type="submit"]')
    ]);
  } catch (err) {
    console.error(`\n[DIAGNOSTIC] Login failed for ${email}! Current URL: ${page.url()}`);
    const alerts = await page.locator('.alert').allInnerTexts().catch(() => []);
    console.error('[DIAGNOSTIC] Alerts on page:', alerts);
    throw err;
  }
  await injectDisclaimerBanner(page);
  await page.waitForTimeout(2000);
}

async function recordMainWorkflow() {
  console.log('Starting Playwright Video Recording of Main QA Workflow...');
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    recordVideo: {
      dir: VIDEO_DIR,
      size: { width: 1280, height: 720 },
    },
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();
  const timestamp = Date.now().toString().slice(-5);
  const gcashRef = generateGcash13DigitRef();
  let requestId;
  let requestNumber;
  try {
    // 1. Resident Login
    console.log('Step 1: Resident Login');
    await loginStep(page, context, RESIDENT_LOGIN, RESIDENT_PASSWORD, '/resident/dashboard');

    // 2. Create Certificate Request
    console.log('Step 2: Create Request');
    await page.goto(`${BASE_URL}/resident/request-certificate`, { waitUntil: 'load' });
    await injectDisclaimerBanner(page);
    await page.selectOption('select[name="certificate_type"]', 'barangay_clearance');
    await page.fill('textarea[name="purpose"]', `QA Video Workflow Simulation - ${timestamp}`);
    await Promise.all([
      page.waitForURL('**/resident/my-requests/**', { timeout: 35000 }),
      page.click('button[type="submit"]:has-text("Submit")')
    ]);
    await injectDisclaimerBanner(page);
    requestId = page.url().split('/resident/my-requests/')[1].split('?')[0];
    const pageText = await page.textContent('body');
    const numMatch = pageText.match(/REQ-2026-[0-9]{4}/);
    requestNumber = numMatch ? numMatch[0] : requestId.slice(0, 8);
    console.log(`Created request: ${requestNumber} (${requestId})`);
    await page.waitForTimeout(2000);

    // 3. Secretary Accepts Request
    console.log('Step 3: Staff Acceptance');
    await loginStep(page, context, SECRETARY_LOGIN, SECRETARY_PASSWORD, '/admin/dashboard');

    await page.goto(`${BASE_URL}/admin/certificate-requests/${requestId}`, { waitUntil: 'load' });
    await injectDisclaimerBanner(page);
    const acceptForm = page.locator('form:has(button:has-text("Accept Request"))');
    await acceptForm.locator('textarea[name="remarks"]').fill('Accepted for official video recording.');
    await Promise.all([
      page.waitForResponse(res => res.request().method() === 'POST', { timeout: 35000 }),
      acceptForm.locator('button:has-text("Accept Request")').click()
    ]);
    await page.waitForTimeout(3000);
    await injectDisclaimerBanner(page);

    // 4. Resident Opens Payment Page & Submits Proof
    console.log('Step 4: Resident Payment Proof Submission');
    await loginStep(page, context, RESIDENT_LOGIN, RESIDENT_PASSWORD, '/resident/dashboard');

    await page.goto(`${BASE_URL}/resident/payments/${requestId}`, { waitUntil: 'load' });
    await injectDisclaimerBanner(page);
    await page.locator('button:has-text("GCash")').click();
    await page.waitForTimeout(1000);

    const proofForm = page.locator('form:has(input[name="reference_number"])');
    await proofForm.locator('input[name="reference_number"]').fill(gcashRef);
    await proofForm.locator('input[name="proof_image"]').setInputFiles(GCASH_RECEIPT_PATH);
    await page.waitForTimeout(1500);

    await Promise.all([
      page.waitForResponse(res => res.request().method() === 'POST', { timeout: 35000 }),
      proofForm.locator('button[type="submit"]').click()
    ]);
    await page.waitForTimeout(3000);
    await injectDisclaimerBanner(page);
    console.log('Submitted payment proof. State is Pending Verification.');

    // 5. Staff Reviews and Confirms Payment
    console.log('Step 5: Staff Review & Confirmation');
    await loginStep(page, context, SECRETARY_LOGIN, SECRETARY_PASSWORD, '/admin/dashboard');

    await page.goto(`${BASE_URL}/admin/payments`, { waitUntil: 'load' });
    await injectDisclaimerBanner(page);
    const reviewLink = page.locator('a[href*="/admin/payments/"]:has-text("Review Proof")').first();
    const reviewHref = await reviewLink.getAttribute('href');
    await page.goto(`${BASE_URL}${reviewHref}`, { waitUntil: 'load' });
    await injectDisclaimerBanner(page);
    await page.waitForTimeout(2000);

    const confirmForm = page.locator('form:has(button:has-text("Confirm Payment Received"))');
    await confirmForm.locator('input[name="remarks"]').fill('Verified via GCash receiving phone for QA video recording.');
    await Promise.all([
      page.waitForResponse(res => res.request().method() === 'POST', { timeout: 45000 }),
      confirmForm.evaluate(f => f.requestSubmit())
    ]);
    await page.waitForTimeout(3000);
    await injectDisclaimerBanner(page);
    console.log('Confirmed payment. State is Paid.');

    // 6. Main Admin Signs & Issues Certificate
    console.log('Step 6: Admin Signs Certificate');
    await loginStep(page, context, ADMIN_LOGIN, ADMIN_PASSWORD, '/admin/dashboard');

    await page.goto(`${BASE_URL}/admin/generate-certificate/${requestId}`, { waitUntil: 'load' });
    await injectDisclaimerBanner(page);
    let signBtn = page.locator('button:has-text("Sign & Issue Certificate")');
    if (!(await signBtn.isVisible().catch(() => false))) {
      await page.waitForTimeout(2500);
      await page.reload({ waitUntil: 'load' });
      signBtn = page.locator('button:has-text("Sign & Issue Certificate")');
    }
    await page.waitForTimeout(2000);
    await Promise.all([
      page.waitForResponse(res => res.request().method() === 'POST', { timeout: 35000 }),
      signBtn.click()
    ]);
    await page.waitForTimeout(3000);
    await injectDisclaimerBanner(page);
    console.log('Certificate officially signed and issued.');

    // 7. Resident Downloads PDF
    console.log('Step 7: Resident Downloads PDF');
    await loginStep(page, context, RESIDENT_LOGIN, RESIDENT_PASSWORD, '/resident/dashboard');

    await page.goto(`${BASE_URL}/resident/certificates`, { waitUntil: 'load' });
    await injectDisclaimerBanner(page);
    const certLink = page.locator('a[href*="/resident/certificates/"]').first();
    const certHref = await certLink.getAttribute('href');
    await page.goto(`${BASE_URL}${certHref}`, { waitUntil: 'load' });
    await injectDisclaimerBanner(page);
    await page.waitForTimeout(1500);

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20000 }),
      page.locator('a:has-text("Download certificate PDF")').click()
    ]);
    const dlPath = path.join(DOWNLOAD_DIR, download.suggestedFilename());
    await download.saveAs(dlPath);
    console.log(`Downloaded PDF: ${download.suggestedFilename()} (${fs.statSync(dlPath).size} bytes)`);

    await page.waitForTimeout(2000);
  } finally {
    await context.close();
    await browser.close();
  }

  // Rename video to standard canonical name
  const videoFiles = fs.readdirSync(VIDEO_DIR).filter(f => f.endsWith('.webm'));
  if (videoFiles.length > 0) {
    const latestVideo = path.join(VIDEO_DIR, videoFiles[videoFiles.length - 1]);
    const canonicalVideo = path.join(VIDEO_DIR, 'main-qa-workflow.webm');
    fs.copyFileSync(latestVideo, canonicalVideo);
    console.log(`✅ Main QA Workflow Video Recorded: ${canonicalVideo}`);
  }
}

recordMainWorkflow().catch(err => {
  console.error('Error recording main QA video:', err);
  process.exit(1);
});
