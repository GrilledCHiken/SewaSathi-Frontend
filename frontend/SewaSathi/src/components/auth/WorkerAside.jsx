import { DefaultAside } from "./AuthLayout";

/**
 * The worker-facing marketing panel, in place of the customer one the shell
 * defaults to.
 *
 * Lives here rather than in WorkerSignup.jsx because the worker signup is no
 * longer a single screen: the verification step and the success screen that
 * follow it show the same panel, and a second copy would be exactly the drift
 * AuthLayout was written to stop.
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
