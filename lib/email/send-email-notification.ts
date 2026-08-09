import "server-only";

import nodemailer from "nodemailer";
import type { SentMessageInfo, Transporter } from "nodemailer";

import { env, hasEmailConfiguration } from "@/lib/env";

export type SendEmailInput = {
  to: string;
  subject: string;
  message: string;
};

export type SendEmailResult = {
  status: "sent" | "skipped" | "failed";
  providerResponse: Record<string, unknown>;
};

type EmailTransport = Pick<Transporter, "sendMail">;

export type SendEmailDependencies = {
  transport?: EmailTransport;
};

function redactSecrets(value: string) {
  return [env.smtpPass, env.smtpUser]
    .filter(Boolean)
    .reduce(
      (redacted, secret) => redacted.split(secret).join("[REDACTED]"),
      value,
    );
}

function safeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map(redactSecrets)
    : [];
}

function safeSuccessResponse(info: SentMessageInfo) {
  return {
    accepted: safeStringArray(info.accepted),
    messageId:
      typeof info.messageId === "string" ? redactSecrets(info.messageId) : null,
    provider: "gmail-smtp",
    rejected: safeStringArray(info.rejected),
    ...(typeof info.response === "string"
      ? { response: redactSecrets(info.response) }
      : {}),
  };
}

function safeFailureResponse(error: unknown) {
  const smtpError =
    error && typeof error === "object"
      ? (error as { code?: unknown; command?: unknown })
      : {};
  const message =
    error instanceof Error ? error.message : "Unknown SMTP email error";

  return {
    ...(typeof smtpError.code === "string"
      ? { errorCode: redactSecrets(smtpError.code) }
      : {}),
    ...(typeof smtpError.command === "string"
      ? { errorCommand: redactSecrets(smtpError.command) }
      : {}),
    message: redactSecrets(message),
    provider: "gmail-smtp",
  };
}

export async function sendEmailNotification(
  { message, subject, to }: SendEmailInput,
  dependencies: SendEmailDependencies = {},
): Promise<SendEmailResult> {
  if (!hasEmailConfiguration()) {
    return {
      status: "skipped",
      providerResponse: {
        provider: "gmail-smtp",
        reason: "Gmail SMTP is not configured. Action continued.",
      },
    };
  }

  const transport =
    dependencies.transport ??
    nodemailer.createTransport({
      auth: {
        pass: env.smtpPass,
        user: env.smtpUser,
      },
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
    });

  try {
    const response = await transport.sendMail({
      from: env.emailFrom,
      subject,
      text: message,
      to,
    });

    return {
      status: "sent",
      providerResponse: safeSuccessResponse(response),
    };
  } catch (error) {
    return {
      status: "failed",
      providerResponse: safeFailureResponse(error),
    };
  }
}
