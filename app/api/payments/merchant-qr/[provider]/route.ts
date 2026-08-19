import { getAuthContext } from "@/lib/auth/guards";
import { isAdminRole } from "@/lib/auth/roles";
import { getSystemSettings, hasEligibleFeePayingRequest } from "@/lib/db/queries";
import { readPrivatePaymentFile } from "@/lib/payments/storage";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const context = await getAuthContext();
  if (context.setupMissing || !context.profile) {
    return new Response("Unauthorized", {
      headers: { "Cache-Control": "no-store" },
      status: 401,
    });
  }

  const isStaff = isAdminRole(context.profile.role);
  if (!isStaff) {
    const isEligible = await hasEligibleFeePayingRequest(context.profile.id);
    if (!isEligible) {
      return new Response("Forbidden", {
        headers: { "Cache-Control": "no-store" },
        status: 403,
      });
    }
  }
  const { provider } = await params;
  if (provider !== "gcash" && provider !== "maya") {
    return new Response("Invalid payment provider", {
      headers: { "Cache-Control": "no-store" },
      status: 400,
    });
  }

  const settings = await getSystemSettings();
  const config = settings.paymentReceiving[provider];

  if (!config || !config.qrStorageKey) {
    return new Response("Merchant QR not configured", {
      headers: { "Cache-Control": "no-store" },
      status: 404,
    });
  }

  const file = await readPrivatePaymentFile({
    key: config.qrStorageKey,
    provider: config.qrStorageProvider || "local",
  });

  if (!file) {
    return new Response("Merchant QR image unavailable", {
      headers: { "Cache-Control": "no-store" },
      status: 404,
    });
  }

  return new Response(Buffer.from(file.bytes), {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": file.contentType,
      "X-Content-Type-Options": "nosniff",
    },
    status: 200,
  });
}
