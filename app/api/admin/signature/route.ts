import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getCertificateRecordById } from "@/lib/db/queries";
import { getDatabaseProvider as getProvider } from "@/lib/db/provider";
import {
  getSignatureStorageProvider,
  readStoredSignatureImage,
} from "@/lib/certificates/signature-storage";
import { getSystemSettings } from "@/lib/services/certificate-data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await requireAdmin();

  if (context.setupMissing) {
    return NextResponse.json(
      { error: "This service is temporarily unavailable." },
      { status: 503 },
    );
  }

  const settings = await getSystemSettings(context.supabase);
  let signatureKey = settings.signatureImagePath;
  let signatureProvider =
    settings.signatureImageProvider ?? getSignatureStorageProvider();

  const recordId = new URL(request.url).searchParams.get("record_id");
  if (recordId && getProvider() !== "supabase") {
    const record = await getCertificateRecordById(recordId);
    const snapshot = record?.certificate_snapshot;
    if (snapshot?.signature_image_key) {
      signatureKey = snapshot.signature_image_key;
      signatureProvider =
        snapshot.signature_image_provider ?? signatureProvider;
    }
  }

  if (!signatureKey) {
    return new Response("Signature image is not configured.", {
      headers: { "Cache-Control": "no-store" },
      status: 404,
    });
  }

  let image: Awaited<ReturnType<typeof readStoredSignatureImage>>;
  try {
    image = await readStoredSignatureImage({
      key: signatureKey,
      provider: signatureProvider,
    });
  } catch {
    image = null;
  }

  if (!image) {
    return new Response("Signature image is unavailable.", {
      headers: { "Cache-Control": "no-store" },
      status: 404,
    });
  }

  return new Response(Buffer.from(image.bytes), {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": image.contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
