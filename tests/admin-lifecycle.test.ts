import { describe, expect, it } from "vitest";
import {
  createNotificationLog,
  listNotificationLogsForRequest,
  listPaymentsForRequest,
  rejectPaymentProof,
  submitPaymentProof,
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

    const submitted1 = submitPaymentProof({
      proofSha256: "test-sha-1",
      proofStorageKey: "payment-proofs/test1.png",
      proofStorageProvider: "local",
      provider: "gcash",
      referenceNumber: "GCASH-TEST-FAILED1",
      requestId,
      residentId,
      transactionDatetime: new Date().toISOString(),
    });
    rejectPaymentProof({
      paymentId: submitted1?.id ?? "",
      rejectionReason: "Reference not found",
      reviewerId: "00000000-0000-4000-8000-000000000002",
    });

    submitPaymentProof({
      proofSha256: "test-sha-2",
      proofStorageKey: "payment-proofs/test2.png",
      proofStorageProvider: "local",
      provider: "maya",
      referenceNumber: "MAYA-TEST-PENDING1",
      requestId,
      residentId,
      transactionDatetime: new Date().toISOString(),
    });
    const attempts = listPaymentsForRequest(requestId);

    expect(attempts.length).toBeGreaterThan(0);
    expect(attempts.every((payment) => payment.request_id === requestId)).toBe(true);
    expect(attempts.map((payment) => payment.status)).toEqual(["pending"]);

    const events = getSqliteDb()
      .prepare("SELECT event_type FROM payment_events WHERE payment_id = ?")
      .all(attempts[0].id) as Array<{ event_type: string }>;
    expect(events.map((e) => e.event_type)).toEqual(
      expect.arrayContaining(["payment_rejected", "payment_proof_resubmitted"]),
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
