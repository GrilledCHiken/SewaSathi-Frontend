import { useMemo, useState } from "react";
import DashboardHeader from "../components/User/DashboardHeader";
import PageShell, { PageHeader } from "../components/ui/PageShell";
import { Panel } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import StatTile from "../components/ui/StatTile";
import EmptyState from "../components/ui/EmptyState";
import SegmentedControl from "../components/ui/SegmentedControl";
import {
  CardIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  SearchIcon,
} from "../components/ui/icons";

/**
 * Payments.
 *
 * Note for whoever picks this up next: everything below is static sample data.
 * `paymentApi.listMyPayments()` already exists and hits GET /payments/mine —
 * wiring it up is a functional change and was deliberately out of scope for the
 * visual pass, so the figures here are still placeholders.
 */

const SUMMARY_STATS = [
  {
    label: "Total Paid",
    value: "NPR 800",
    tone: "success",
    icon: <CheckCircleIcon className="h-6 w-6" />,
  },
  {
    label: "Pending",
    value: "NPR 4,000",
    tone: "warning",
    icon: <ClockIcon className="h-6 w-6" />,
  },
  {
    label: "Payment Methods",
    value: "2",
    tone: "info",
    icon: <CardIcon className="h-6 w-6" />,
  },
];

const PAYMENT_METHODS = [
  {
    id: "esewa",
    name: "eSewa",
    status: "Connected",
    active: true,
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M12 18h.01" />
      </svg>
    ),
  },
  {
    id: "khalti",
    name: "Khalti",
    status: "Connected",
    active: true,
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
      </svg>
    ),
  },
];

const TRANSACTIONS = [
  {
    id: "1",
    title: "Fix leaking kitchen pipe",
    date: "2026-05-11",
    method: "eSewa",
    amount: "NPR 800",
    status: "completed",
  },
  {
    id: "2",
    title: "Assemble IKEA bookshelf",
    date: "2026-05-15",
    method: "Khalti",
    amount: "NPR 1,500",
    status: "pending",
  },
  {
    id: "3",
    title: "Deep clean apartment",
    date: "2026-05-14",
    method: "eSewa",
    amount: "NPR 2,500",
    status: "pending",
  },
];

const TX_FILTERS = ["All", "Completed", "Pending", "Refunded"];

const STATUS_META = {
  completed: {
    tone: "success",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    ),
  },
  pending: {
    tone: "warning",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  refunded: {
    tone: "info",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6M3 10l6-6" />
      </svg>
    ),
  },
};

const TONE_TILES = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
};

function PaymentMethodCard({ method }) {
  return (
    <div
      className={[
        "flex items-center justify-between gap-3 rounded-card border p-4 transition",
        method.active
          ? "border-success/25 bg-success-soft"
          : "border-line bg-surface",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-field",
            method.active
              ? "bg-white text-success"
              : "bg-surface-sunken text-ink-muted",
          ].join(" ")}
        >
          {method.icon}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-ink">{method.name}</p>
          <p className="text-sm text-ink-muted">{method.status}</p>
        </div>
      </div>
      <Badge tone={method.active ? "success" : "neutral"}>
        {method.active ? "Active" : "Inactive"}
      </Badge>
    </div>
  );
}

function TransactionItem({ transaction }) {
  const meta = STATUS_META[transaction.status] || STATUS_META.pending;

  return (
    <li className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${TONE_TILES[meta.tone]}`}
      >
        {meta.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{transaction.title}</p>
        <p className="text-sm text-ink-muted">
          {transaction.date} · {transaction.method}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-bold tabular-nums text-ink">{transaction.amount}</p>
        <Badge tone={meta.tone} className="mt-1">
          {transaction.status}
        </Badge>
      </div>
    </li>
  );
}

export default function CustomerPayment() {
  const [txFilter, setTxFilter] = useState("All");

  const filteredTransactions = useMemo(() => {
    if (txFilter === "All") return TRANSACTIONS;
    return TRANSACTIONS.filter((tx) => tx.status === txFilter.toLowerCase());
  }, [txFilter]);

  const counts = useMemo(
    () => ({
      All: TRANSACTIONS.length,
      Completed: TRANSACTIONS.filter((t) => t.status === "completed").length,
      Pending: TRANSACTIONS.filter((t) => t.status === "pending").length,
      Refunded: TRANSACTIONS.filter((t) => t.status === "refunded").length,
    }),
    [],
  );

  return (
    <PageShell
      header={<DashboardHeader title="Payments" searchPlaceholder="Search workers..." />}
      width="lg"
    >
      <PageHeader
        title="Payments"
        description="Manage your transactions and payment methods."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SUMMARY_STATS.map((stat) => (
          <StatTile
            key={stat.label}
            label={stat.label}
            value={stat.value}
            tone={stat.tone}
            icon={stat.icon}
          />
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Payment Methods"
          padding="lg"
          action={
            <Button variant="quiet" size="sm" iconLeft={<PlusIcon className="h-4 w-4" />}>
              Add
            </Button>
          }
        >
          <div className="space-y-3">
            {PAYMENT_METHODS.map((method) => (
              <PaymentMethodCard key={method.id} method={method} />
            ))}
          </div>
        </Panel>

        <Panel title="Transaction History" padding="lg">
          <SegmentedControl
            options={TX_FILTERS}
            value={txFilter}
            onChange={setTxFilter}
            counts={counts}
            size="sm"
            ariaLabel="Filter transactions"
            className="mb-4"
          />

          {filteredTransactions.length === 0 ? (
            <EmptyState
              tone="bare"
              icon={<SearchIcon className="h-6 w-6" />}
              title="Nothing here"
              body="No transactions match this filter."
            />
          ) : (
            <ul className="divide-y divide-line-soft">
              {filteredTransactions.map((tx) => (
                <TransactionItem key={tx.id} transaction={tx} />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </PageShell>
  );
}
