/* global console */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
const ARTIFACT_DIR = path.resolve('artifacts/playwright-demo');
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const GCASH_RECEIPT_PATH = path.join(ARTIFACT_DIR, 'gcash-qa-receipt.png');
const MAYA_RECEIPT_PATH = path.join(ARTIFACT_DIR, 'maya-qa-receipt.png');

async function generateReceipts() {
  console.log('Generating clearly marked QA receipt images for GCash and Maya...');
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ viewport: { width: 420, height: 680 } });

    // -------------------------------------------------------------------------
    // 1. GCash QA Receipt
    // -------------------------------------------------------------------------
    const gcashHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          body { background: #f0f4f9; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 16px; }
          .receipt { width: 100%; max-width: 380px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08); border: 2px dashed #007DFE; position: relative; }
          .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 28px; font-weight: 900; color: rgba(220, 38, 38, 0.18); text-align: center; pointer-events: none; width: 120%; line-height: 1.4; border: 4px dashed rgba(220,38,38,0.25); padding: 12px; }
          .header { background: #007DFE; color: white; padding: 24px 20px; text-align: center; }
          .header h1 { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { font-size: 13px; opacity: 0.9; margin-top: 4px; }
          .badge-qa { background: #FEF2F2; color: #DC2626; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 999px; display: inline-block; margin-top: 8px; border: 1px solid #FCA5A5; letter-spacing: 0.5px; }
          .content { padding: 24px 20px; }
          .amount-box { text-align: center; padding-bottom: 20px; border-bottom: 1px dashed #E2E8F0; }
          .amount-box .label { font-size: 12px; color: #64748B; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
          .amount-box .value { font-size: 34px; font-weight: 800; color: #0F172A; margin-top: 4px; }
          .row { display: flex; justify-content: space-between; padding: 12px 0; font-size: 13px; border-bottom: 1px solid #F1F5F9; }
          .row .dt { color: #64748B; font-weight: 500; }
          .row .dd { color: #0F172A; font-weight: 700; text-align: right; }
          .row .mono { font-family: ui-monospace, monospace; font-size: 13px; color: #007DFE; }
          .footer { background: #F8FAFC; padding: 16px 20px; text-align: center; font-size: 11px; color: #64748B; border-top: 1px solid #E2E8F0; }
          .footer strong { color: #DC2626; display: block; margin-bottom: 2px; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="watermark">GCASH QA PAYMENT SIMULATION<br>NOT A REAL FINANCIAL TRANSACTION</div>
          <div class="header">
            <h1>GCash Payment Sent</h1>
            <p>Official Transaction Receipt</p>
            <div class="badge-qa">GCASH QA PAYMENT SIMULATION</div>
          </div>
          <div class="content">
            <div class="amount-box">
              <div class="label">Amount Paid</div>
              <div class="value">₱50.00</div>
            </div>
            <div class="row">
              <span class="dt">Paid to</span>
              <span class="dd">Barangay Bato Treasury</span>
            </div>
            <div class="row">
              <span class="dt">Channel</span>
              <span class="dd">GCash P2M QR Ph</span>
            </div>
            <div class="row">
              <span class="dt">Date & Time</span>
              <span class="dd">Oct 06, 2026, 01:30 AM</span>
            </div>
            <div class="row">
              <span class="dt">Ref. No.</span>
              <span class="dd mono">2610061193041</span>
            </div>
          </div>
          <div class="footer">
            <strong>NOT A REAL FINANCIAL TRANSACTION</strong>
            This is an automated simulation screenshot for software quality assurance.
          </div>
        </div>
      </body>
      </html>
    `;

    await page.setContent(gcashHtml, { waitUntil: 'networkidle' });
    await page.screenshot({ path: GCASH_RECEIPT_PATH, fullPage: true });
    console.log(`✅ Saved GCash QA Receipt: ${GCASH_RECEIPT_PATH}`);

    // -------------------------------------------------------------------------
    // 2. Maya QA Receipt
    // -------------------------------------------------------------------------
    const mayaHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          body { background: #0b0f19; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 16px; }
          .receipt { width: 100%; max-width: 380px; background: #111827; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.5); border: 2px dashed #00D084; position: relative; color: #F9FAFB; }
          .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 28px; font-weight: 900; color: rgba(239, 68, 68, 0.22); text-align: center; pointer-events: none; width: 120%; line-height: 1.4; border: 4px dashed rgba(239, 68, 68, 0.3); padding: 12px; }
          .header { background: #1F2937; border-bottom: 2px solid #00D084; padding: 24px 20px; text-align: center; }
          .header h1 { font-size: 20px; font-weight: 800; color: #00D084; letter-spacing: -0.5px; }
          .header p { font-size: 13px; color: #9CA3AF; margin-top: 4px; }
          .badge-qa { background: rgba(239, 68, 68, 0.15); color: #F87171; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 999px; display: inline-block; margin-top: 8px; border: 1px solid #EF4444; letter-spacing: 0.5px; }
          .content { padding: 24px 20px; }
          .amount-box { text-align: center; padding-bottom: 20px; border-bottom: 1px dashed #374151; }
          .amount-box .label { font-size: 12px; color: #9CA3AF; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
          .amount-box .value { font-size: 34px; font-weight: 800; color: #FFFFFF; margin-top: 4px; }
          .row { display: flex; justify-content: space-between; padding: 12px 0; font-size: 13px; border-bottom: 1px solid #1F2937; }
          .row .dt { color: #9CA3AF; font-weight: 500; }
          .row .dd { color: #F9FAFB; font-weight: 700; text-align: right; }
          .row .mono { font-family: ui-monospace, monospace; font-size: 12px; color: #00D084; }
          .footer { background: #1F2937; padding: 16px 20px; text-align: center; font-size: 11px; color: #9CA3AF; border-top: 1px solid #374151; }
          .footer strong { color: #EF4444; display: block; margin-bottom: 2px; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="watermark">MAYA QA PAYMENT SIMULATION<br>NOT A REAL FINANCIAL TRANSACTION</div>
          <div class="header">
            <h1>Maya Transaction Completed</h1>
            <p>Official Merchant Receipt</p>
            <div class="badge-qa">MAYA QA PAYMENT SIMULATION</div>
          </div>
          <div class="content">
            <div class="amount-box">
              <div class="label">Total Amount</div>
              <div class="value">₱50.00</div>
            </div>
            <div class="row">
              <span class="dt">Paid to</span>
              <span class="dd">Barangay Bato Treasury Maya</span>
            </div>
            <div class="row">
              <span class="dt">Payment Method</span>
              <span class="dd">Maya QR / QR Ph</span>
            </div>
            <div class="row">
              <span class="dt">Date & Time</span>
              <span class="dd">06 Oct 2026, 01:30</span>
            </div>
            <div class="row">
              <span class="dt">Reference ID</span>
              <span class="dd mono">MAYA-QA-20261005-001</span>
            </div>
          </div>
          <div class="footer">
            <strong>NOT A REAL FINANCIAL TRANSACTION</strong>
            This is an automated simulation screenshot for software quality assurance.
          </div>
        </div>
      </body>
      </html>
    `;

    await page.setContent(mayaHtml, { waitUntil: 'networkidle' });
    await page.screenshot({ path: MAYA_RECEIPT_PATH, fullPage: true });
    console.log(`✅ Saved Maya QA Receipt: ${MAYA_RECEIPT_PATH}`);
  } finally {
    await browser.close();
  }
}

generateReceipts().catch(err => {
  console.error('Failed to generate QA receipts:', err);
  process.exit(1);
});
