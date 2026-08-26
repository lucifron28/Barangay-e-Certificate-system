"use client";

import { useState } from "react";
import { Image as ImageIcon, QrCode, UploadCloud } from "lucide-react";
import { submitPaymentProofAction } from "@/lib/actions/payments";
import { SubmitButton } from "@/components/forms/submit-button";
import { formatCurrency } from "@/lib/utils/format";
import { isDemoPaymentMethodConfig } from "@/lib/payments/demo-config";
import type { CertificateRequest } from "@/types/database";
import type { SystemSettings } from "@/lib/db/queries";
import type { PaymentProvider } from "@/types/enums";
export function getLocalDatetimeInputValue(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function ResidentPaymentForm({
  request,
  settings,
}: {
  latestPayment?: unknown;
  request: CertificateRequest;
  settings: SystemSettings;
}) {
  const gcashConfig = settings.paymentReceiving.gcash;
  const mayaConfig = settings.paymentReceiving.maya;

  const defaultProvider: PaymentProvider = gcashConfig.enabled
    ? "gcash"
    : mayaConfig.enabled
      ? "maya"
      : "gcash";

  const [selectedProvider, setSelectedProvider] =
    useState<PaymentProvider>(defaultProvider);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const activeConfig = selectedProvider === "gcash" ? gcashConfig : mayaConfig;
  const activeLabel = selectedProvider === "gcash" ? "GCash" : "Maya";
  const isDemoPayment = isDemoPaymentMethodConfig(activeConfig);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  return (
    <div className="space-y-6">
      {isDemoPayment && (
        <div className="alert alert-warning items-start text-sm">
          <span className="font-bold">Demo payment mode</span>
          <span>
            These QR codes are for the thesis presentation only. They do not
            receive money. Use test payment details and a clearly marked test
            receipt.
          </span>
        </div>
      )}

      {/* Payment Provider Selection */}
      <div className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
        <h2 className="font-bold text-lg">1. Choose Payment Method</h2>
        <p className="mt-1 text-sm text-base-content/70">
          Select a method to view its payment instructions.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setSelectedProvider("gcash")}
            disabled={!gcashConfig.enabled}
            aria-pressed={selectedProvider === "gcash"}
            className={`flex flex-col items-center justify-center rounded-lg border-2 p-4 transition ${
              selectedProvider === "gcash"
                ? "border-primary bg-primary/5 text-primary"
                : "border-base-300 hover:border-base-content/30"
            } ${!gcashConfig.enabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-blue-600 font-bold text-white text-sm">
              G
            </div>
            <span className="mt-2 font-bold">GCash</span>
            <span className="text-xs text-base-content/60">
              {gcashConfig.enabled
                ? isDemoPaymentMethodConfig(gcashConfig)
                  ? "Demo available"
                  : "Available"
                : "Unavailable"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedProvider("maya")}
            disabled={!mayaConfig.enabled}
            aria-pressed={selectedProvider === "maya"}
            className={`flex flex-col items-center justify-center rounded-lg border-2 p-4 transition ${
              selectedProvider === "maya"
                ? "border-primary bg-primary/5 text-primary"
                : "border-base-300 hover:border-base-content/30"
            } ${!mayaConfig.enabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-600 font-bold text-white text-sm">
              M
            </div>
            <span className="mt-2 font-bold">Maya</span>
            <span className="text-xs text-base-content/60">
              {mayaConfig.enabled
                ? isDemoPaymentMethodConfig(mayaConfig)
                  ? "Demo available"
                  : "Available"
                : "Unavailable"}
            </span>
          </button>
        </div>
      </div>

      {/* QR Code and Instructions */}
      {activeConfig.enabled && activeConfig.qrStorageKey ? (
        <div className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <QrCode className="size-5 text-primary" aria-hidden />
            <h2 className="font-bold text-lg">
              {isDemoPayment
                ? "2. Demo payment instructions"
                : "2. Scan official QR and pay"}
            </h2>
          </div>

          <div className="mt-4 grid gap-6 md:grid-cols-2 md:items-center">
            <div className="flex flex-col items-center justify-center rounded-lg border border-base-200 bg-base-200/50 p-4">
              <div className="relative aspect-square w-full max-w-[220px] overflow-hidden rounded-lg border border-base-300 bg-white p-2 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/payments/merchant-qr/${selectedProvider}`}
                  alt={`${isDemoPayment ? "Demo" : "Official"} ${activeLabel} payment QR`}
                  className="size-full object-contain"
                />
              </div>
              <p className="mt-3 font-semibold text-sm">
                {activeConfig.merchantName}
              </p>
              <p className="text-xs text-base-content/60">
                {isDemoPayment
                  ? "Demo-only QR. Do not send money."
                  : "Official Barangay merchant"}
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="rounded-md bg-base-200 p-3">
                <span className="text-xs font-semibold text-base-content/70 uppercase">
                  {isDemoPayment ? "Demo amount" : "Exact amount to pay"}
                </span>
                <p className="font-bold text-2xl text-primary">
                  {formatCurrency(request.fee_amount)}
                </p>
              </div>

              {isDemoPayment ? (
                <ol className="list-inside list-decimal space-y-2 text-base-content/80 text-xs sm:text-sm">
                  <li>
                    Do not send money. This QR is only for the presentation.
                  </li>
                  <li>Use a clearly marked test receipt.</li>
                  <li>
                    Enter the test reference and upload the receipt below.
                  </li>
                </ol>
              ) : (
                <ol className="list-inside list-decimal space-y-2 text-base-content/80 text-xs sm:text-sm">
                  <li>
                    Open your <strong>{activeLabel}</strong> app.
                  </li>
                  <li>Scan the official QR code on the left.</li>
                  <li>
                    Verify recipient name:{" "}
                    <strong>{activeConfig.merchantName}</strong>.
                  </li>
                  <li>
                    Pay the exact fee of{" "}
                    <strong>{formatCurrency(request.fee_amount)}</strong>.
                  </li>
                  <li>
                    Save or take a screenshot of your transaction receipt.
                  </li>
                </ol>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-warning/50 bg-warning/10 p-6 text-sm">
          <h3 className="font-bold text-base text-warning-content">
            {activeLabel} Payment Currently Unavailable
          </h3>
          <p className="mt-1 text-base-content/70">
            Official QR code configuration is required for {activeLabel}. Please
            select another payment method or contact the Barangay Hall.
          </p>
        </div>
      )}

      {/* Proof Submission Form */}
      {activeConfig.enabled && (
        <div className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <UploadCloud className="size-5 text-primary" aria-hidden />
            <h2 className="font-bold text-lg">3. Submit Payment Proof</h2>
          </div>
          <p className="mt-1 text-sm text-base-content/70">
            {isDemoPayment
              ? "Enter test transaction details and upload a test receipt screenshot."
              : "Enter your transaction reference number and upload your receipt screenshot."}
          </p>

          <form action={submitPaymentProofAction} className="mt-6 space-y-4">
            <input type="hidden" name="request_id" value={request.id} />
            <input type="hidden" name="provider" value={selectedProvider} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label text-xs font-semibold">
                  <span>{activeLabel} Reference / Transaction Number *</span>
                </label>
                <input
                  name="reference_number"
                  type="text"
                  placeholder={
                    isDemoPayment
                      ? "e.g. DEMO-GCASH-001"
                      : "e.g. 1000 2345 6789"
                  }
                  className="input input-bordered w-full"
                  required
                  minLength={4}
                  maxLength={50}
                />
                <span className="label-text-alt mt-1 text-xs text-base-content/50">
                  {isDemoPayment
                    ? "Use a test reference for the presentation"
                    : "Located on your payment confirmation screen"}
                </span>
              </div>

              <div>
                <label className="label text-xs font-semibold">
                  <span>Transaction Date & Time *</span>
                </label>
                <input
                  name="transaction_datetime"
                  type="datetime-local"
                  defaultValue={getLocalDatetimeInputValue()}
                  className="input input-bordered w-full"
                  required
                />
                <span className="label-text-alt mt-1 text-xs text-base-content/50">
                  Approximate date and time of transfer
                </span>
              </div>
            </div>

            <div>
              <label className="label text-xs font-semibold">
                <span>
                  Payment Screenshot / Proof Image * (JPEG, PNG, WebP ≤ 5MB)
                </span>
              </label>
              <input
                type="file"
                name="proof_image"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="file-input file-input-bordered w-full"
                required
              />
            </div>

            {previewUrl && (
              <div className="mt-3 rounded-lg border border-base-200 bg-base-200/50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-base-content/70">
                  <ImageIcon className="size-4" aria-hidden />
                  <span>Selected Proof Screenshot Preview</span>
                </div>
                <div className="mt-2 max-h-64 overflow-hidden rounded-md border border-base-300 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Payment screenshot preview"
                    className="max-h-64 w-full object-contain p-2"
                  />
                </div>
              </div>
            )}

            <div className="rounded-md bg-info/10 p-4 text-info-content text-xs">
              <p className="font-semibold">Manual verification</p>
              <p className="mt-1 text-base-content/80">
                Submitting payment details does not mark the request as paid.
                Barangay staff must verify the proof before issuing the
                certificate.
              </p>
            </div>

            <SubmitButton
              className="btn btn-primary w-full"
              pendingText="Submitting payment proof..."
            >
              {isDemoPayment
                ? "Submit Demo Payment Proof"
                : "Submit Payment Proof"}
            </SubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}
