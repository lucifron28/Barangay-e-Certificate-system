import "server-only";

import { env } from "@/lib/env";

export type SendEmailInput = {
  to: string;
  subject: string;
  message: string;
};

export type SendEmailResult = {
  status: "sent" | "skipped" | "failed";
  providerResponse: Record<string, unknown>;
};

export async function sendEmailNotification({
  message,
  subject,
  to,
}: SendEmailInput): Promise<SendEmailResult> {
  // TODO: Final email sender address needs client confirmation.
  // TODO: Real email provider API key will be added later.
  if (!env.resendApiKey || !env.emailFrom) {
    return {
      status: "skipped",
      providerResponse: {
        reason: "Email provider is not configured. Action continued.",
      },
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to,
        subject,
        text: message,
      }),
    });

    const body = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    return {
      status: response.ok ? "sent" : "failed",
      providerResponse: body,
    };
  } catch (error) {
    return {
      status: "failed",
      providerResponse: {
        message: error instanceof Error ? error.message : "Unknown email error",
      },
    };
  }
}
