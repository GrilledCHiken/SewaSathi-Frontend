import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import DashboardHeader from "../components/User/DashboardHeader";
import {
  CheckIcon,
  CrossIcon,
  PRIMARY_BTN,
  SECONDARY_BTN,
  ResultCard,
  VerifyingCard,
} from "../components/payments/PaymentResult";
import { formatMoney } from "../components/tasks/taskUi";
import { failPayment, verifyKhaltiPayment } from "../api/paymentApi";

/** Outcomes where the customer never paid, so there is nothing to verify. */
const ABANDONED = new Set(["User canceled", "Expired"]);

/**
 * Where Khalti drops the customer after checkout. Unlike eSewa there is a single
 * return URL for every outcome, so the `status` query parameter decides what to do:
 * an abandoned payment is just closed off, and anything else is handed to the
 * backend, which asks Khalti's lookup API what really happened.
 */
export default function KhaltiCallback() {
  const [searchParams] = useSearchParams();
  const pidx = searchParams.get("pidx");
  const status = searchParams.get("status");
  const purchaseOrderId = searchParams.get("purchase_order_id");
  const abandoned = ABANDONED.has(status);

  const [payment, setPayment] = useState(null);
  const [failureMessage, setFailureMessage] = useState(null);
  const [verifying, setVerifying] = useState(!abandoned && Boolean(pidx));
  const handled = useRef(false);

  useEffect(() => {
    // StrictMode mounts effects twice; running once keeps the server log clean.
    if (handled.current) return;
    handled.current = true;

    if (abandoned) {
      // Best effort: close the attempt off so it isn't left pending forever. The
      // response also tells us which task to offer a retry for.
      if (purchaseOrderId) {
        failPayment(purchaseOrderId)
          .then(setPayment)
          .catch(() => {});
      }
      return;
    }

    if (!pidx) return;

    verifyKhaltiPayment(pidx)
      .then(setPayment)
      .catch((err) => {
        setFailureMessage(
          err.response?.data?.message ||
            "We could not confirm this payment with Khalti.",
        );
        // The backend has already failed the payment; this is only to learn which
        // task to offer a retry for, since Khalti's return URL carries no task id.
        if (purchaseOrderId) {
          failPayment(purchaseOrderId)
            .then(setPayment)
            .catch(() => {});
        }
      })
      .finally(() => setVerifying(false));
  }, [abandoned, pidx, purchaseOrderId]);

  const error =
    failureMessage ||
    (!abandoned && !pidx ? "Khalti did not send a payment reference back." : null);

  const retryTaskId = payment?.task?.id;
  const settled = payment?.status === "COMPLETED";

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <DashboardHeader searchPlaceholder="Search workers..." />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-5 text-2xl font-bold text-slate-900 sm:text-3xl">
            Payment
          </h2>

          {verifying ? (
            <VerifyingCard gateway="Khalti" />
          ) : abandoned ? (
            <ResultCard
              tone="rose"
              icon={<CrossIcon />}
              title="Payment was not completed"
              body="Nothing has been charged and your task is still waiting for its advance. You can try again whenever you're ready."
            >
              {retryTaskId && (
                <Link to={`/dashboard/checkout/${retryTaskId}`} className={PRIMARY_BTN}>
                  Try again
                </Link>
              )}
              <Link to="/dashboard/tasks" className={SECONDARY_BTN}>
                Back to My Tasks
              </Link>
            </ResultCard>
          ) : error || !settled ? (
            <ResultCard
              tone="rose"
              icon={<CrossIcon />}
              title="We couldn't confirm this payment"
              body={error || "Khalti has not confirmed this payment yet."}
            >
              {retryTaskId && (
                <Link to={`/dashboard/checkout/${retryTaskId}`} className={PRIMARY_BTN}>
                  Try again
                </Link>
              )}
              <Link to="/dashboard/tasks" className={SECONDARY_BTN}>
                Back to My Tasks
              </Link>
            </ResultCard>
          ) : (
            <ResultCard
              tone="emerald"
              icon={<CheckIcon />}
              title="Payment confirmed!"
              body={
                <>
                  <p>
                    Your {formatMoney(payment.amount)} advance is paid and{" "}
                    <span className="font-semibold text-slate-900">
                      {payment.task?.title}
                    </span>{" "}
                    is now assigned to{" "}
                    {payment.task?.assignedWorker?.fullName || "your worker"}.
                  </p>
                  {payment.refId && (
                    <p className="mt-2 text-xs text-slate-500">
                      Khalti reference {payment.refId}
                    </p>
                  )}
                </>
              }
            >
              <Link
                to={`/dashboard/messages?taskId=${payment.task?.id}`}
                className={PRIMARY_BTN}
              >
                Message worker
              </Link>
              <Link to="/dashboard/tasks" className={SECONDARY_BTN}>
                Back to My Tasks
              </Link>
            </ResultCard>
          )}
        </div>
      </main>
    </div>
  );
}
