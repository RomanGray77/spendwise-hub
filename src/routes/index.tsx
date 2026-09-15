import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, TrendingDown, TrendingUp, Scale } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  defaultRange,
  formatCents,
  formatCentsAbs,
  spendBoard,
  type CategorySummary,
  type Summary,
} from "@/services";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SpendBoard — income and expenses by category" },
      {
        name: "description",
        content:
          "SpendBoard is a simple personal ledger: track income and expenses, filter by date range and see totals per category.",
      },
      { property: "og:title", content: "SpendBoard — income and expenses by category" },
      {
        property: "og:description",
        content:
          "Track income and expenses, pick a date range and review totals, counts and percentages per category.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OverviewPage,
});

function StatCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: "income" | "expense" | "neutral";
  icon: typeof TrendingUp;
}) {
  const toneClass =
    tone === "income"
      ? "text-income"
      : tone === "expense"
        ? "text-expense"
        : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </div>
      <p className={`numeric mt-2 font-display text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function CategoryRows({
  rows,
  kind,
  range,
}: {
  rows: CategorySummary[];
  kind: "income" | "expense";
  range: { startDate: string; endDate: string };
}) {
  if (rows.length === 0) {
    return <p className="px-5 py-6 text-sm text-muted-foreground">No transactions in this range.</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => (
        <li key={row.categoryId}>
          <Link
            to="/categories/$categoryId"
            params={{ categoryId: row.categoryId }}
            search={range}
            className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary/50"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{row.categoryName}</p>
              <p className="text-xs text-muted-foreground">
                {row.count} transaction{row.count === 1 ? "" : "s"}
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={kind === "income" ? "h-full bg-income" : "h-full bg-expense"}
                  style={{ width: `${Math.min(100, row.percentage)}%` }}
                />
              </div>
            </div>
            <div className="text-right">
              <p
                className={`numeric font-semibold ${kind === "income" ? "text-income" : "text-expense"}`}
              >
                {formatCentsAbs(row.totalCents)}
              </p>
              <p className="numeric text-xs text-muted-foreground">
                {row.percentage.toFixed(1)}%
              </p>
            </div>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function OverviewPage() {
  const initial = defaultRange();
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [range, setRange] = useState(initial);
  const [summary, setSummary] = useState<Summary | null>(null);

  const load = useCallback(() => {
    spendBoard.getSummary(range).then(setSummary);
  }, [range]);

  useEffect(() => {
    load();
    return spendBoard.subscribe(load);
  }, [load]);

  return (
    <AppLayout>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything between {range.startDate} and {range.endDate}.
          </p>
        </div>
        <Button asChild>
          <Link to="/transactions/new">Add transaction</Link>
        </Button>
      </div>

      <form
        className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setRange({ startDate, endDate });
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="start">Start date</Label>
          <Input
            id="start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="numeric"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="end">End date</Label>
          <Input
            id="end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="numeric"
          />
        </div>
        <Button type="submit" variant="secondary">
          Apply
        </Button>
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total income"
          value={formatCents(summary?.totalIncomeCents ?? 0)}
          tone="income"
          icon={TrendingUp}
        />
        <StatCard
          label="Total expenses"
          value={formatCentsAbs(summary?.totalExpenseCents ?? 0)}
          tone="expense"
          icon={TrendingDown}
        />
        <StatCard
          label="Net balance"
          value={formatCents(summary?.netBalanceCents ?? 0)}
          tone="neutral"
          icon={Scale}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <h2 className="border-b border-border px-5 py-4 text-lg font-semibold">Expenses</h2>
          <CategoryRows rows={summary?.expenses ?? []} kind="expense" range={range} />
        </section>
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <h2 className="border-b border-border px-5 py-4 text-lg font-semibold">Income</h2>
          <CategoryRows rows={summary?.income ?? []} kind="income" range={range} />
        </section>
      </div>
    </AppLayout>
  );
}
