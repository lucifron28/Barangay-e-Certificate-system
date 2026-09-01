import { CreditCard, PenLine, Settings } from "lucide-react";
import { SetupRequired } from "@/components/ui/setup-required";
import { SubmitButton } from "@/components/forms/submit-button";
import { FlashMessage } from "@/components/ui/flash-message";
import {
  updatePaymentMethodSettingsAction,
  updateSystemSettingsAction,
} from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { getSystemSettings } from "@/lib/db/queries";
import { env } from "@/lib/env";
import { isDemoPaymentMethodConfig } from "@/lib/payments/demo-config";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; message?: string }>;
}) {
  const context = await requireAdmin();

  if (context.setupMissing) {
    return <SetupRequired missingEnv={context.missingEnv} />;
  }

  const settings = await getSystemSettings();
  const canEdit = context.profile.role === "main_admin";
  const query = await searchParams;

  const gcash = settings.paymentReceiving.gcash;
  const maya = settings.paymentReceiving.maya;
  const demoPaymentMode =
    env.paymentDemoMode &&
    (isDemoPaymentMethodConfig(gcash) || isDemoPaymentMethodConfig(maya));

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-base-content/70">
          Operational settings used by online certificate generation and manual
          payment verification.
        </p>
      </div>

      <FlashMessage error={query?.error} message={query?.message} />

      {demoPaymentMode && (
        <div className="alert alert-warning text-sm">
          <span className="font-bold">Thesis demo payment mode is on.</span>
          <span>
            GCash and Maya use generated non-payment QR codes. Do not use them
            for real funds. Upload real merchant QR codes before production use.
          </span>
        </div>
      )}

      {/* General Settings */}
      <section className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <Settings className="size-6 text-primary" aria-hidden />
          <h2 className="text-xl font-bold">Signer & Certificate Settings</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <dt className="text-sm font-semibold text-base-content/70">
              Barangay Captain / Signer Name
            </dt>
            {canEdit ? (
              <form
                action={updateSystemSettingsAction}
                className="mt-2 space-y-3"
                encType="multipart/form-data"
              >
                <input
                  className="input input-bordered w-full"
                  name="barangay_captain_name"
                  defaultValue={settings.barangayCaptainName}
                  required
                />
                <label className="form-control">
                  <span className="label">
                    <span className="label-text">Visual Signature Image</span>
                  </span>
                  <input
                    className="file-input file-input-bordered w-full"
                    name="signature_image"
                    type="file"
                    accept="image/png,image/jpeg"
                  />
                  <span className="label">
                    <span className="label-text-alt">
                      PNG or JPEG, up to 2 MB. Leave empty to keep the current image.
                    </span>
                  </span>
                </label>
                <SubmitButton
                  className="btn btn-primary btn-sm"
                  pendingText="Saving settings..."
                >
                  Save Signer
                </SubmitButton>
              </form>
            ) : (
              <dd className="mt-1 font-medium">
                {settings.barangayCaptainName}
              </dd>
            )}
            <div className="mt-4 rounded-md border border-base-300 bg-base-200/40 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <PenLine className="size-4 text-primary" aria-hidden />
                <span>Signature image</span>
              </div>
              {settings.signatureImagePath ? (
                <div className="mt-3 space-y-2">
                  <div className="flex min-h-24 items-center justify-center rounded border border-base-300 bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/api/admin/signature"
                      alt="Configured authorized official visual signature"
                      className="max-h-20 max-w-full object-contain"
                    />
                  </div>
                  <p className="text-xs text-base-content/60">
                    Updated {settings.signatureImageUpdatedAt ?? "in system settings"}.
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-base-content/70">
                  No signature image is configured. New certificates will use the
                  printed-name fallback until Main Admin uploads one.
                </p>
              )}
            </div>
          </div>
          <div>
            <dt className="text-sm font-semibold text-base-content/70">
              Payment Mode
            </dt>
            <dd className="mt-1 font-medium">
              Manual GCash & Maya verification (No automated funds transfer)
            </dd>
          </div>
        </div>
        <p className="mt-4 text-xs text-base-content/60">
          The signer name and uploaded image are visual thesis/demo elements in
          HTML previews and PDFs. They are not a legally verified digital signature.
        </p>
      </section>

      {/* Payment Receiving Accounts */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <CreditCard className="size-6 text-primary" aria-hidden />
          <div>
            <h2 className="text-xl font-bold">
              Official Payment Receiving Accounts
            </h2>
            <p className="text-sm text-base-content/70">
              Configure the official merchant names and QR codes displayed to
              residents when paying certificate fees.
            </p>
          </div>
        </div>

        {!canEdit && (
          <div className="alert alert-info text-sm">
            <span>
              Barangay Secretary has view-only access. Only Main Admin can
              modify payment receiving settings.
            </span>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* GCash Settings */}
          <div className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-blue-600 font-bold text-white text-xs">
                  G
                </div>
                <h3 className="font-bold text-lg">GCash</h3>
              </div>
              <span
                className={`badge ${
                  gcash.enabled ? "badge-success text-white" : "badge-ghost"
                }`}
              >
                {gcash.enabled
                  ? isDemoPaymentMethodConfig(gcash)
                    ? "Demo active"
                    : "Active"
                  : "Disabled"}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-base-content/70 uppercase">
                  Merchant / Account Name
                </span>
                <p className="font-medium text-sm">
                  {gcash.merchantName || "Not configured"}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-base-content/70 uppercase">
                  {isDemoPaymentMethodConfig(gcash)
                    ? "Demo GCash QR Code"
                    : "Official GCash QR Code"}
                </span>
                {gcash.qrStorageKey ? (
                  <div className="mt-2 space-y-2">
                    <div className="relative aspect-square max-w-[180px] overflow-hidden rounded-lg border border-base-300 bg-base-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/api/payments/merchant-qr/gcash?preview=true"
                        alt={`${isDemoPaymentMethodConfig(gcash) ? "Demo" : "Official"} GCash QR`}
                        className="size-full object-contain p-2"
                      />
                    </div>
                    {(isDemoPaymentMethodConfig(gcash) ||
                      gcash.qrUpdatedAt) && (
                      <p className="text-xs text-base-content/50">
                        {isDemoPaymentMethodConfig(gcash)
                          ? "Generated for thesis demo use"
                          : `Updated ${new Date(gcash.qrUpdatedAt!).toLocaleDateString()}`}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 rounded-md border border-dashed border-warning/60 bg-warning/10 p-3 text-xs text-warning-content">
                    <p className="font-semibold">
                      CLIENT PAYMENT QR CONFIGURATION REQUIRED
                    </p>
                    <p className="mt-1 text-base-content/70">
                      No official GCash QR image has been uploaded. Upload one
                      before enabling this method.
                    </p>
                  </div>
                )}
              </div>

              {canEdit && (
                <form
                  action={updatePaymentMethodSettingsAction}
                  className="mt-4 space-y-4 border-t border-base-200 pt-4"
                >
                  <input type="hidden" name="provider" value="gcash" />
                  <div>
                    <label className="label text-xs font-semibold">
                      <span>Merchant Name</span>
                    </label>
                    <input
                      name="merchant_name"
                      defaultValue={gcash.merchantName}
                      placeholder="e.g. Official Merchant / Account Name"
                      className="input input-bordered input-sm w-full"
                    />
                  </div>

                  <div>
                    <label className="label text-xs font-semibold">
                      <span>
                        Upload Official QR Code (JPEG, PNG, WebP ≤ 5MB)
                      </span>
                    </label>
                    <input
                      type="file"
                      name="qr_image"
                      accept="image/png,image/jpeg,image/webp"
                      className="file-input file-input-bordered file-input-sm w-full"
                    />
                  </div>

                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-3">
                      <input
                        type="checkbox"
                        name="enabled"
                        defaultChecked={gcash.enabled}
                        className="checkbox checkbox-primary checkbox-sm"
                      />
                      <span className="label-text text-sm font-medium">
                        Enable GCash for Resident Payments
                      </span>
                    </label>
                  </div>

                  <SubmitButton
                    className="btn btn-primary btn-sm w-full"
                    pendingText="Saving GCash..."
                  >
                    Save GCash Settings
                  </SubmitButton>
                </form>
              )}
            </div>
          </div>

          {/* Maya Settings */}
          <div className="rounded-lg border border-base-300 bg-base-100 p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-emerald-600 font-bold text-white text-xs">
                  M
                </div>
                <h3 className="font-bold text-lg">Maya</h3>
              </div>
              <span
                className={`badge ${
                  maya.enabled ? "badge-success text-white" : "badge-ghost"
                }`}
              >
                {maya.enabled
                  ? isDemoPaymentMethodConfig(maya)
                    ? "Demo active"
                    : "Active"
                  : "Disabled"}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-base-content/70 uppercase">
                  Merchant / Account Name
                </span>
                <p className="font-medium text-sm">
                  {maya.merchantName || "Not configured"}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-base-content/70 uppercase">
                  {isDemoPaymentMethodConfig(maya)
                    ? "Demo Maya QR Code"
                    : "Official Maya QR Code"}
                </span>
                {maya.qrStorageKey ? (
                  <div className="mt-2 space-y-2">
                    <div className="relative aspect-square max-w-[180px] overflow-hidden rounded-lg border border-base-300 bg-base-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/api/payments/merchant-qr/maya?preview=true"
                        alt={`${isDemoPaymentMethodConfig(maya) ? "Demo" : "Official"} Maya QR`}
                        className="size-full object-contain p-2"
                      />
                    </div>
                    <p className="text-xs text-base-content/50">
                      {isDemoPaymentMethodConfig(maya)
                        ? "Generated for thesis demo use"
                        : maya.qrUpdatedAt
                          ? `Updated ${new Date(maya.qrUpdatedAt).toLocaleDateString()}`
                          : ""}
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 rounded-md border border-dashed border-warning/60 bg-warning/10 p-3 text-xs text-warning-content">
                    <p className="font-semibold">
                      CLIENT PAYMENT QR CONFIGURATION REQUIRED
                    </p>
                    <p className="mt-1 text-base-content/70">
                      No official Maya QR image has been uploaded. Upload one
                      before enabling this method.
                    </p>
                  </div>
                )}
              </div>

              {canEdit && (
                <form
                  action={updatePaymentMethodSettingsAction}
                  className="mt-4 space-y-4 border-t border-base-200 pt-4"
                >
                  <input type="hidden" name="provider" value="maya" />
                  <div>
                    <label className="label text-xs font-semibold">
                      <span>Merchant Name</span>
                    </label>
                    <input
                      name="merchant_name"
                      defaultValue={maya.merchantName}
                      placeholder="e.g. Official Merchant / Account Name"
                      className="input input-bordered input-sm w-full"
                    />
                  </div>

                  <div>
                    <label className="label text-xs font-semibold">
                      <span>
                        Upload Official QR Code (JPEG, PNG, WebP ≤ 5MB)
                      </span>
                    </label>
                    <input
                      type="file"
                      name="qr_image"
                      accept="image/png,image/jpeg,image/webp"
                      className="file-input file-input-bordered file-input-sm w-full"
                    />
                  </div>

                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-3">
                      <input
                        type="checkbox"
                        name="enabled"
                        defaultChecked={maya.enabled}
                        className="checkbox checkbox-primary checkbox-sm"
                      />
                      <span className="label-text text-sm font-medium">
                        Enable Maya for Resident Payments
                      </span>
                    </label>
                  </div>

                  <SubmitButton
                    className="btn btn-primary btn-sm w-full"
                    pendingText="Saving Maya..."
                  >
                    Save Maya Settings
                  </SubmitButton>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
