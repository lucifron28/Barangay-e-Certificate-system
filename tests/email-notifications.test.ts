import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const nodemailerMock = vi.hoisted(() => ({
  createTransport: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: nodemailerMock,
}));

const input = {
  message: "Your certificate request is ready for pickup.",
  subject: "Certificate Ready for Pickup",
  to: "resident@example.com",
};

function configureSmtp() {
  vi.stubEnv("SMTP_HOST", "smtp.gmail.com");
  vi.stubEnv("SMTP_PORT", "465");
  vi.stubEnv("SMTP_SECURE", "true");
  vi.stubEnv("SMTP_USER", "demo.sender@gmail.com");
  vi.stubEnv("SMTP_PASS", "test-smtp-secret");
  vi.stubEnv(
    "EMAIL_FROM",
    "Barangay Bato e-Certificate <demo.sender@gmail.com>",
  );
}

async function loadSender() {
  return import("@/lib/email/send-email-notification");
}

describe("Gmail SMTP email notifications", () => {
  beforeEach(() => {
    nodemailerMock.createTransport.mockReset();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("skips delivery when SMTP credentials are not configured", async () => {
    const { sendEmailNotification } = await loadSender();

    const result = await sendEmailNotification(input);

    expect(result).toMatchObject({
      providerResponse: {
        provider: "gmail-smtp",
        reason: "Gmail SMTP is not configured. Action continued.",
      },
      status: "skipped",
    });
    expect(nodemailerMock.createTransport).not.toHaveBeenCalled();
  });

  it("creates a Gmail SMTP transport and sends the expected message", async () => {
    configureSmtp();
    const sendMail = vi.fn().mockResolvedValue({
      accepted: [input.to],
      messageId: "<test-message-id>",
      rejected: [],
      response: "250 2.0.0 OK",
    });
    nodemailerMock.createTransport.mockReturnValue({ sendMail });
    const { sendEmailNotification } = await loadSender();

    const result = await sendEmailNotification(input);

    expect(nodemailerMock.createTransport).toHaveBeenCalledWith({
      auth: {
        pass: "test-smtp-secret",
        user: "demo.sender@gmail.com",
      },
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
    });
    expect(sendMail).toHaveBeenCalledWith({
      from: "Barangay Bato e-Certificate <demo.sender@gmail.com>",
      subject: input.subject,
      text: input.message,
      to: input.to,
    });
    expect(result).toMatchObject({
      providerResponse: {
        accepted: [input.to],
        messageId: "<test-message-id>",
        provider: "gmail-smtp",
        rejected: [],
        response: "250 2.0.0 OK",
      },
      status: "sent",
    });
  });

  it("returns a redacted failure when Gmail rejects the message", async () => {
    configureSmtp();
    const sendMail = vi.fn().mockRejectedValue(
      Object.assign(new Error("Authentication failed: test-smtp-secret"), {
        code: "EAUTH",
        command: "AUTH",
      }),
    );
    nodemailerMock.createTransport.mockReturnValue({ sendMail });
    const { sendEmailNotification } = await loadSender();

    const result = await sendEmailNotification(input);
    const serializedResponse = JSON.stringify(result.providerResponse);

    expect(result).toMatchObject({
      providerResponse: {
        errorCode: "EAUTH",
        errorCommand: "AUTH",
        message: "Authentication failed: [REDACTED]",
        provider: "gmail-smtp",
      },
      status: "failed",
    });
    expect(serializedResponse).not.toContain("test-smtp-secret");
  });

  it("waits for the SMTP send promise before reporting success", async () => {
    configureSmtp();
    let resolveMail:
      | ((value: {
          accepted: string[];
          messageId: string;
          rejected: string[];
          response: string;
        }) => void)
      | undefined;
    const sendMail = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveMail = resolve;
        }),
    );
    nodemailerMock.createTransport.mockReturnValue({ sendMail });
    const { sendEmailNotification } = await loadSender();

    let settled = false;
    const resultPromise = sendEmailNotification(input).then((result) => {
      settled = true;
      return result;
    });

    await Promise.resolve();
    expect(settled).toBe(false);

    resolveMail?.({
      accepted: [input.to],
      messageId: "<awaited-message-id>",
      rejected: [],
      response: "250 2.0.0 OK",
    });

    await expect(resultPromise).resolves.toMatchObject({ status: "sent" });
    expect(settled).toBe(true);
  });

  it("rejects invalid SMTP ports during configuration loading", async () => {
    configureSmtp();
    vi.stubEnv("SMTP_PORT", "70000");

    await expect(loadSender()).rejects.toThrow(
      "SMTP_PORT must be a whole number between 1 and 65535.",
    );
  });
});
