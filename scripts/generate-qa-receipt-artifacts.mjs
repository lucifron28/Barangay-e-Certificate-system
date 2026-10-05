/* global console */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const TARGET_DIR = path.resolve('artifacts/payment-qa/generated');
fs.mkdirSync(TARGET_DIR, { recursive: true });

const GCASH_PATH = path.join(TARGET_DIR, 'gcash-qa-receipt.png');
const MAYA_PATH = path.join(TARGET_DIR, 'maya-qa-receipt.png');

async function main() {
  console.log('Generating clearly marked QA receipt images for GCash and Maya...');
  const browser = await chromium.launch({ headless: true });

  const now = new Date();
  const qaTimestamp = now.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Manila',
  });

  try {
    const page = await browser.newPage({ viewport: { width: 440, height: 720 } });

    // -----------------------------------------------------------------------
    // GCash QA Receipt
    // -----------------------------------------------------------------------
    const gcashHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          body { background: #E2E8F0; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 16px; }
          .card { width: 100%; max-width: 390px; background: #FFFFFF; border-radius: 16px; overflow: hidden; border: 3px dashed #DC2626; box-shadow: 0 8px 24px rgba(0,0,0,0.12); position: relative; }
          .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 26px; font-weight: 900; color: rgba(220, 38, 38, 0.22); text-align: center; pointer-events: none; width: 130%; line-height: 1.3; border: 4px dashed rgba(220,38,38,0.3); padding: 16px; }
          .banner-warning { background: #FEF2F2; color: #DC2626; border-bottom: 2px solid #F87171; padding: 12px; text-align: center; font-weight: 900; font-size: 13px; letter-spacing: 0.5px; }
          .banner-warning span { display: block; font-size: 11px; font-weight: 700; color: #991B1B; margin-top: 2px; }
          .header { background: #007DFE; color: white; padding: 20px; text-align: center; }
          .header h2 { font-size: 18px; font-weight: 800; }
          .header p { font-size: 12px; opacity: 0.9; margin-top: 2px; }
          .content { padding: 20px; }
          .amount-box { text-align: center; padding-bottom: 16px; border-bottom: 1px dashed #CBD5E1; margin-bottom: 16px; }
          .amount-box .label { font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 700; }
          .amount-box .val { font-size: 32px; font-weight: 900; color: #0F172A; margin-top: 4px; }
          .field { display: flex; justify-content: space-between; padding: 10px 0; font-size: 13px; border-bottom: 1px solid #F1F5F9; }
          .field .lbl { color: #64748B; font-weight: 600; }
          .field .txt { color: #0F172A; font-weight: 700; text-align: right; }
          .field .mono { font-family: ui-monospace, monospace; font-size: 13px; color: #007DFE; }
          .footer { background: #F8FAFC; border-top: 2px dashed #DC2626; padding: 14px 16px; text-align: center; font-size: 11px; color: #64748B; }
          .footer strong { color: #DC2626; font-size: 12px; display: block; margin-bottom: 2px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="watermark">
            QA SIMULATION<br>
            NOT A REAL PAYMENT<br>
            NOT A REAL FINANCIAL TRANSACTION
          </div>
          <div class="banner-warning">
            QA SIMULATION — NOT A REAL PAYMENT
            <span>FOR TESTING PURPOSE ONLY — ZERO FUNDS TRANSFERRED</span>
          </div>
          <div class="header">
            <h2>GCash QA Payment Simulation</h2>
            <p>Simulated Proof of Transfer</p>
          </div>
          <div class="content">
            <div class="amount-box">
              <div class="label">Amount</div>
              <div class="val">PHP 50.00</div>
            </div>
            <div class="field">
              <span class="lbl">Merchant:</span>
              <span class="txt">Barangay Bato Treasury</span>
            </div>
            <div class="field">
              <span class="lbl">Channel:</span>
              <span class="txt">GCash P2M QR Ph</span>
            </div>
            <div class="field">
              <span class="lbl">Date:</span>
              <span class="txt">${qaTimestamp}</span>
            </div>
            <div class="field">
              <span class="lbl">Reference:</span>
              <span class="txt mono">2610051234567</span>
            </div>
          </div>
          <div class="footer">
            <strong>NOT A REAL FINANCIAL TRANSACTION</strong>
            This is an automated simulation artifact for software QA testing only.
          </div>
        </div>
      </body>
      </html>
    `;

    await page.setContent(gcashHtml, { waitUntil: 'networkidle' });
    await page.screenshot({ path: GCASH_PATH, fullPage: true });
    console.log(`✅ Saved GCash QA Receipt: ${GCASH_PATH}`);

    // -----------------------------------------------------------------------
    // Maya QA Receipt
    // -----------------------------------------------------------------------
    const mayaHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          body { background: #0B0F19; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 16px; }
          .card { width: 100%; max-width: 390px; background: #111827; border-radius: 16px; overflow: hidden; border: 3px dashed #EF4444; box-shadow: 0 8px 24px rgba(0,0,0,0.6); position: relative; color: #F9FAFB; }
          .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 26px; font-weight: 900; color: rgba(239, 68, 68, 0.25); text-align: center; pointer-events: none; width: 130%; line-height: 1.3; border: 4px dashed rgba(239,68,68,0.35); padding: 16px; }
          .banner-warning { background: rgba(239, 68, 68, 0.15); color: #F87171; border-bottom: 2px solid #EF4444; padding: 12px; text-align: center; font-weight: 900; font-size: 13px; letter-spacing: 0.5px; }
          .banner-warning span { display: block; font-size: 11px; font-weight: 700; color: #FCA5A5; margin-top: 2px; }
          .header { background: #1F2937; border-bottom: 2px solid #00D084; color: white; padding: 20px; text-align: center; }
          .header h2 { font-size: 18px; font-weight: 800; color: #00D084; }
          .header p { font-size: 12px; color: #9CA3AF; margin-top: 2px; }
          .content { padding: 20px; }
          .amount-box { text-align: center; padding-bottom: 16px; border-bottom: 1px dashed #374151; margin-bottom: 16px; }
          .amount-box .label { font-size: 11px; color: #9CA3AF; text-transform: uppercase; font-weight: 700; }
          .amount-box .val { font-size: 32px; font-weight: 900; color: #FFFFFF; margin-top: 4px; }
          .field { display: flex; justify-content: space-between; padding: 10px 0; font-size: 13px; border-bottom: 1px solid #1F2937; }
          .field .lbl { color: #9CA3AF; font-weight: 600; }
          .field .txt { color: #F9FAFB; font-weight: 700; text-align: right; }
          .field .mono { font-family: ui-monospace, monospace; font-size: 12px; color: #00D084; }
          .footer { background: #1F2937; border-top: 2px dashed #EF4444; padding: 14px 16px; text-align: center; font-size: 11px; color: #9CA3AF; }
          .footer strong { color: #EF4444; font-size: 12px; display: block; margin-bottom: 2px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="watermark">
            QA SIMULATION<br>
            NOT A REAL PAYMENT<br>
            NOT A REAL FINANCIAL TRANSACTION
          </div>
          <div class="banner-warning">
            QA SIMULATION — NOT A REAL PAYMENT
            <span>FOR TESTING PURPOSE ONLY — ZERO FUNDS TRANSFERRED</span>
          </div>
          <div class="header">
            <h2>MAYA QA PAYMENT SIMULATION</h2>
            <p>Simulated Proof of Transfer</p>
          </div>
          <div class="content">
            <div class="amount-box">
              <div class="label">Amount</div>
              <div class="val">PHP 50.00</div>
            </div>
            <div class="field">
              <span class="lbl">Merchant:</span>
              <span class="txt">Barangay Bato Treasury</span>
            </div>
            <div class="field">
              <span class="lbl">Channel:</span>
              <span class="txt">Maya QR / QR Ph</span>
            </div>
            <div class="field">
              <span class="lbl">Date:</span>
              <span class="txt">${qaTimestamp}</span>
            </div>
            <div class="field">
              <span class="lbl">Reference:</span>
              <span class="txt mono">MAYA-QA-20261005-001</span>
            </div>
          </div>
          <div class="footer">
            <strong>NOT A REAL FINANCIAL TRANSACTION</strong>
            This is an automated simulation artifact for software QA testing only.
          </div>
        </div>
      </body>
      </html>
    `;

    await page.setContent(mayaHtml, { waitUntil: 'networkidle' });
    await page.screenshot({ path: MAYA_PATH, fullPage: true });
    console.log(`✅ Saved Maya QA Receipt: ${MAYA_PATH}`);
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Error generating QA receipts:', err);
  process.exit(1);
});
