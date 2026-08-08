import { describe, expect, it } from "vitest";
import {
  createNotificationLog,
  listNotificationLogsForRequest,
  listPaymentsForRequest,
} from "@/lib/db/sqlite/queries";

const requestId = "10000000-0000-4000-8000-000000000002";

describe("admin lifecycle views", () => {
  it("exposes seeded payment attempts for an admin request detail view", () => {
    const attempts = listPaymentsForRequest(requestId);

    expect(attempts.length).toBeGreaterThan(0);
    expect(attempts.every((payment) => payment.request_id === requestId)).toBe(true);
    expect(attempts.map((payment) => payment.status)).toEqual(
      expect.arrayContaining(["failed", "cancelled", "pending"]),
    );
  });

  it("lists non-blocking notification attempts by request", () => {
    createNotificationLog({
      message: "Demo notification message",
      provider_response: { reason: "test" },
      recipient_email: "resident@example.com",
      request_id: requestId,
      status: "skipped",
      subject: "Demo notification",
    });

    const logs = listNotificationLogsForRequest(requestId);
    const log = logs.find((item) => item.subject === "Demo notification");

    expect(log).toMatchObject({
      provider_response: { reason: "test" },
      recipient_email: "resident@example.com",
      request_id: requestId,
      status: "skipped",
    });
  });
});
