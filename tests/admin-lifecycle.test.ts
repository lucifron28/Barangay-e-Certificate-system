import { describe, expect, it } from "vitest";
import {
  createMockPayment,
  createNotificationLog,
  listNotificationLogsForRequest,
  listPaymentsForRequest,
  resolveMockPayment,
} from "@/lib/db/sqlite/queries";
import { getSqliteDb } from "@/lib/db/sqlite/client";

const requestId = "10000000-0000-4000-8000-000000000002";
const residentId = "00000000-0000-4000-8000-000000000003";

describe("admin lifecycle views", () => {
  it("exposes scoped payment attempts for an admin request detail view", () => {
    const db = getSqliteDb();
    db.transaction(() => {
      db.prepare(
        "DELETE FROM payment_events WHERE payment_id IN (SELECT id FROM payments WHERE request_id = ?)",
      ).run(requestId);
      db.prepare("DELETE FROM payments WHERE request_id = ?").run(requestId);
      db.prepare(
        "UPDATE certificate_requests SET status = 'accepted', payment_status = 'unpaid' WHERE id = ?",
      ).run(requestId);
    })();

    const failed = createMockPayment({ amount: 50, request_id: requestId, resident_id: residentId });
    resolveMockPayment({ payment_id: failed?.id ?? "", resident_id: residentId, status: "failed" });
    const cancelled = createMockPayment({ amount: 50, request_id: requestId, resident_id: residentId });
    resolveMockPayment({ payment_id: cancelled?.id ?? "", resident_id: residentId, status: "cancelled" });
    createMockPayment({ amount: 50, request_id: requestId, resident_id: residentId });

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
