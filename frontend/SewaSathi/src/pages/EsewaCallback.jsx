import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
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
import { verifyEsewaPayment } from "../api/paymentApi";

/**
 * Where eSewa drops the customer after checkout. On the success path the
 * `?data=` blob is forwarded to the backend, which is what actually confirms the
 * payment and flips the task to assigned.
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

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <DashboardHeader searchPlaceholder="Search workers..." />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-5 text-2xl font-bold text-slate-900 sm:text-3xl">
            Payment
          </h2>

          {verifying ? (
            <VerifyingCard gateway="eSewa" />
          ) : isFailure ? (
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
          ) : error ? (
            <ResultCard
              tone="rose"
              icon={<CrossIcon />}
              title="We couldn't confirm this payment"
              body={error}
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
                      eSewa reference {payment.refId}
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
