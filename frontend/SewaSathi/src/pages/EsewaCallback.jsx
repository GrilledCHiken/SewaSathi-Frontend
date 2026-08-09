import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import DashboardHeader from "../components/User/DashboardHeader";
import PageShell, { PageHeader } from "../components/ui/PageShell";
import Button from "../components/ui/Button";
import {
  CheckIcon,
  CrossIcon,
  ResultCard,
  VerifyingCard,
} from "../components/payments/PaymentResult";
import { formatMoney } from "../components/tasks/taskUi";
import { verifyEsewaPayment } from "../api/paymentApi";

/**
 * Where eSewa drops the customer after checkout. On the success path the
 * `?data=` blob is forwarded to the backend, which is what actually confirms the
 * payment — flipping the task to assigned for an advance, or closing the job out
 * for a balance.
 *
 * The gateway is not told which leg it was handling, so the failure route carries
 * only a task id. That is enough: the checkout page picks the leg back up from the
 * task's own state.
 */
export default function EsewaCallback() {
  const { pathname } = useLocation();
  const { taskId } = useParams();
  const [searchParams] = useSearchParams();
  const isFailure = pathname.includes("/failure");

  const esewaData = searchParams.get("data");

  const [payment, setPayment] = useState(null);
  const [failureMessage, setFailureMessage] = useState(null);
  const [verifying, setVerifying] = useState(!isFailure && Boolean(esewaData));
  const verified = useRef(false);

  useEffect(() => {
    if (isFailure || !esewaData) return;
    // StrictMode mounts effects twice; verifying once keeps the server log clean.
    if (verified.current) return;
    verified.current = true;

    verifyEsewaPayment(esewaData)
      .then(setPayment)
      .catch((err) =>
        setFailureMessage(
          err.response?.data?.message ||
            "We could not confirm this payment with eSewa.",
        ),
      )
      .finally(() => setVerifying(false));
  }, [isFailure, esewaData]);

  const error =
    failureMessage ||
    (!isFailure && !esewaData
      ? "eSewa did not send a payment reference back."
      : null);

  const retryTaskId = taskId || payment?.task?.id;
  const isBalance = payment?.type === "BALANCE";

  return (
    <PageShell
      header={<DashboardHeader title="Payment" />}
      width="sm"
    >
      <PageHeader title="Payment" />

      <div className="mt-6">
        {verifying ? (
          <VerifyingCard gateway="eSewa" />
        ) : isFailure ? (
          <ResultCard
            tone="rose"
            icon={<CrossIcon />}
            title="Payment was not completed"
            body="Nothing has been charged and your task is still waiting on its payment. You can try again whenever you're ready."
          >
            {retryTaskId && (
              <Button as={Link} to={`/dashboard/checkout/${retryTaskId}`}>
                Try again
              </Button>
            )}
            <Button as={Link} to="/dashboard/tasks" variant="secondary">
              Back to My Tasks
            </Button>
          </ResultCard>
        ) : error ? (
          <ResultCard
            tone="rose"
            icon={<CrossIcon />}
            title="We couldn't confirm this payment"
            body={error}
          >
            {retryTaskId && (
              <Button as={Link} to={`/dashboard/checkout/${retryTaskId}`}>
                Try again
              </Button>
            )}
            <Button as={Link} to="/dashboard/tasks" variant="secondary">
              Back to My Tasks
            </Button>
          </ResultCard>
        ) : (
          <ResultCard
            tone="emerald"
            icon={<CheckIcon />}
            title={isBalance ? "Paid in full!" : "Payment confirmed!"}
            body={
              <>
                <p>
                  {isBalance ? (
                    <>
                      Your {formatMoney(payment.amount)} final payment is in and{" "}
                      <span className="font-semibold text-ink">
                        {payment.task?.title}
                      </span>{" "}
                      is fully settled with{" "}
                      {payment.task?.assignedWorker?.fullName || "your worker"}.
                    </>
                  ) : (
                    <>
                      Your {formatMoney(payment.amount)} advance is paid and{" "}
                      <span className="font-semibold text-ink">
                        {payment.task?.title}
                      </span>{" "}
                      is now assigned to{" "}
                      {payment.task?.assignedWorker?.fullName || "your worker"}.
                    </>
                  )}
                </p>
                {payment.refId && (
                  <p className="mt-2 text-xs text-ink-muted">
                    eSewa reference {payment.refId}
                  </p>
                )}
              </>
            }
          >
            <Button
              as={Link}
              to={`/dashboard/messages?taskId=${payment.task?.id}`}
            >
              Message worker
            </Button>
            <Button as={Link} to="/dashboard/tasks" variant="secondary">
              Back to My Tasks
            </Button>
          </ResultCard>
        )}
      </div>
    </PageShell>
  );
}
