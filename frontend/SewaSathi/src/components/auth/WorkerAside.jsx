import { DefaultAside } from "./AuthLayout";

/**
 * The worker-facing marketing panel, in place of the customer one the shell defaults to.
 * Shared by all three screens of worker signup: the account form, verification and success.
 */
export default function WorkerAside() {
  return (
    <DefaultAside
      heading={
        <>
          Earn on your
          <br />
          own terms.
        </>
      }
      blurb="Set your own rate, pick the jobs that fit your week, and get paid securely for every task you complete."
      points={[
        "Set your own rates and schedule",
        "Get paid within 24 hours of completion",
        "Build a verified reputation",
      ]}
      quote="I pick up jobs between my regular shifts. The work is steady and payment has never been late."
      quoteAuthor="Rajesh Thapa · Kathmandu"
      quoteInitials="RT"
    />
  );
}
