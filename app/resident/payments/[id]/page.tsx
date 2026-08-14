import Link from "next/link";
import { redirect } from "next/navigation";
import { startMockPaymentAction, resolveMockPaymentAction, getResidentDemoPayment } from "@/lib/actions/payments";
import { certificateLabel, formatCurrency } from "@/lib/utils/format";

export default async function ResidentPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { request, payment, payments } = await getResidentDemoPayment(id);
  if (!request) redirect("/resident/my-requests?error=Payment%20request%20not%20found.");
  return <div className="mx-auto max-w-2xl space-y-5">
    <div><h1 className="text-3xl font-bold">Online Payment Simulation</h1><p className="text-base-content/70">No actual funds are transferred. This thesis/demo checkout stands in for a future online payment provider.</p></div>
    <div className="alert alert-warning"><span>SIMULATED PAYMENT - NO ACTUAL FUNDS TRANSFERRED</span></div>
    <section className="rounded-lg border border-base-300 bg-base-100 p-5"><dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-sm text-base-content/60">Request</dt><dd>{request.request_number}</dd></div><div><dt className="text-sm text-base-content/60">Certificate</dt><dd>{certificateLabel(request.certificate_type)}</dd></div><div><dt className="text-sm text-base-content/60">Fee</dt><dd>{formatCurrency(request.fee_amount)}</dd></div><div><dt className="text-sm text-base-content/60">Payment status</dt><dd>{request.payment_status}</dd></div></dl></section>
    {request.payment_status === "free" ? <div className="alert alert-success"><span>This certificate is free and does not require checkout.</span></div> : null}
    {(!payment || ["failed", "cancelled", "expired"].includes(payment.status)) && request.status === "accepted" && request.payment_status === "unpaid" ? <form action={startMockPaymentAction}><input type="hidden" name="request_id" value={request.id}/><button className="btn btn-primary">{payment ? "Retry Simulated Payment" : "Start Simulated Payment"}</button></form> : null}
    {payment?.status === "pending" ? <div className="flex flex-wrap gap-2"><form action={resolveMockPaymentAction}><input type="hidden" name="payment_id" value={payment.id}/><input type="hidden" name="request_id" value={request.id}/><input type="hidden" name="outcome" value="paid"/><button className="btn btn-success">Simulate Successful Payment</button></form><form action={resolveMockPaymentAction}><input type="hidden" name="payment_id" value={payment.id}/><input type="hidden" name="request_id" value={request.id}/><input type="hidden" name="outcome" value="failed"/><button className="btn btn-outline">Simulate Failed Payment</button></form><form action={resolveMockPaymentAction}><input type="hidden" name="payment_id" value={payment.id}/><input type="hidden" name="request_id" value={request.id}/><input type="hidden" name="outcome" value="cancelled"/><button className="btn btn-ghost">Cancel Simulated Payment</button></form></div> : null}
    {payment?.status === "paid" ? <div className="alert alert-success"><span>Payment completed. Certificate issuance is now available to the admin.</span></div> : null}
    {payments.length ? <section className="rounded-lg border border-base-300 bg-base-100 p-5"><h2 className="font-semibold">Payment attempts</h2><div className="mt-3 space-y-2">{payments.map((attempt) => <div key={attempt.id} className="flex flex-wrap justify-between gap-2 border-b border-base-300 pb-2 text-sm"><span>{attempt.provider_transaction_id}</span><span className="font-semibold">{attempt.status}</span></div>)}</div></section> : null}
    <Link href="/resident/my-requests" className="btn btn-ghost">Back to My Requests</Link>
  </div>;
}
