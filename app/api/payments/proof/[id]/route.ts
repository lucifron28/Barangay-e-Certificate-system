import { getAuthContext } from "@/lib/auth/guards";
import { isAdminRole } from "@/lib/auth/roles";
import { getPaymentById } from "@/lib/db/queries";
import { readPrivatePaymentFile } from "@/lib/payments/storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAuthContext();
  if (context.setupMissing || !context.profile) {
    return new Response("Unauthorized", {
      headers: { "Cache-Control": "no-store" },
      status: 401,
    });
  }

  const { id } = await params;
  if (!id) {
    return new Response("Not found", {
      headers: { "Cache-Control": "no-store" },
      status: 404,
    });
  }

  const payment = await getPaymentById(id);
  if (!payment || !payment.proof_storage_key) {
    return new Response("Payment proof not found", {
      headers: { "Cache-Control": "no-store" },
      status: 404,
    });
  }

  // Authorization check:
  // Admin and Secretary can view all proofs.
  // Residents can ONLY view proofs for their own requests.
  const isStaff = isAdminRole(context.profile.role);
  const isOwner = payment.resident_id === context.profile.id;

  if (!isStaff && !isOwner) {
    return new Response("Forbidden", {
      headers: { "Cache-Control": "no-store" },
      status: 403,
    });
  }

  const file = await readPrivatePaymentFile({
    key: payment.proof_storage_key,
    provider: payment.proof_storage_provider || "local",
  });

  if (!file) {
    return new Response("Payment proof file unavailable", {
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
