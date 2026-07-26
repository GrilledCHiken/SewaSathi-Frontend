import { useMemo, useState } from "react";
import DashboardHeader from "../components/User/DashboardHeader";

const SUMMARY_STATS = [
  {
    label: "Total Paid",
    value: "NPR 800",
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="M22 4L12 14.01l-3-3" />
      </svg>
    ),
  },
  {
    label: "Pending",
    value: "NPR 4,000",
    iconBg: "bg-amber-100",
    iconText: "text-amber-600",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    label: "Payment Methods",
    value: "2",
    iconBg: "bg-sky-100",
    iconText: "text-sky-600",
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <path d="M1 10h22" />
      </svg>
    ),
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

const STATUS_STYLES = {
  completed: {
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
    label: "text-emerald-600",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    ),
  },
  pending: {
    iconBg: "bg-amber-100",
    iconText: "text-amber-600",
    label: "text-amber-600",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  refunded: {
    iconBg: "bg-sky-100",
    iconText: "text-sky-600",
    label: "text-sky-600",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6M3 10l6-6" />
      </svg>
    ),
  },
};

function PaymentMethodCard({ method }) {
  return (
    <div
      className={[
        "flex items-center justify-between gap-3 rounded-xl border p-4",
        method.active
          ? "border-emerald-200 bg-emerald-50/60"
          : "border-slate-200 bg-white",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            method.active
              ? "bg-emerald-100 text-emerald-600"
              : "bg-slate-100 text-slate-600",
          ].join(" ")}
        >
          {method.icon}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{method.name}</p>
          <p className="text-sm text-slate-500">{method.status}</p>
        </div>
      </div>
      <span
        className={[
          "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
          method.active
            ? "bg-emerald-100 text-emerald-700"
            : "bg-slate-100 text-slate-600",
        ].join(" ")}
      >
        {method.active ? "Active" : "Inactive"}
      </span>
    </div>
  );
}

function TransactionItem({ transaction }) {
  const style = STATUS_STYLES[transaction.status] || STATUS_STYLES.pending;

  return (
    <li className="flex items-center gap-4 border-b border-slate-100 py-4 last:border-0">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${style.iconBg} ${style.iconText}`}
      >
        {style.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">{transaction.title}</p>
        <p className="text-sm text-slate-500">
          {transaction.date} · {transaction.method}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-bold text-slate-900">{transaction.amount}</p>
        <p className={`text-xs font-medium capitalize ${style.label}`}>
          {transaction.status}
        </p>
      </div>
    </li>
  );
}

export default function CustomerPayment() {
  const [txFilter, setTxFilter] = useState("All");

  const filteredTransactions = useMemo(() => {
    if (txFilter === "All") return TRANSACTIONS;
    return TRANSACTIONS.filter(
      (tx) => tx.status === txFilter.toLowerCase(),
    );
  }, [txFilter]);

  return (
    <div className="flex min-h-svh flex-1 flex-col">
      <DashboardHeader searchPlaceholder="Search workers..." />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Payments
            </h2>
            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              Manage your transactions and payment methods.
            </p>
          </div>

          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SUMMARY_STATS.map((stat) => (
              <article
                key={stat.label}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
              >
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconBg} ${stat.iconText}`}
                >
                  {stat.icon}
                </span>
                <p className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {stat.label}
                </p>
              </article>
            ))}
          </div>

          {/* Bottom two columns */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Payment methods */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-slate-900">
                  Payment Methods
                </h3>
                <button
                  type="button"
                  className="text-sm font-semibold text-brand transition hover:text-brand-dark"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-3">
                {PAYMENT_METHODS.map((method) => (
                  <PaymentMethodCard key={method.id} method={method} />
                ))}
              </div>
            </section>

            {/* Transaction history */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-bold text-slate-900">
                  Transaction History
                </h3>
                <div className="flex flex-wrap gap-2">
                  {TX_FILTERS.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setTxFilter(filter)}
                      className={[
                        "rounded-full px-3 py-1.5 text-sm font-medium transition",
                        txFilter === filter
                          ? "bg-brand/10 text-brand"
                          : "text-slate-600 hover:bg-slate-100",
                      ].join(" ")}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {filteredTransactions.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No transactions found for this filter.
                </p>
              ) : (
                <ul>
                  {filteredTransactions.map((tx) => (
                    <TransactionItem key={tx.id} transaction={tx} />
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
