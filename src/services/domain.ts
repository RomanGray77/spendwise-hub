import type {
  Category,
  CategorySummary,
  DateRange,
  Summary,
  Transaction,
  TransactionInput,
} from "./types";
import { ServiceError } from "./types";

export function parseAmountToCents(raw: string): number {
  const value = (raw ?? "").trim();
  if (value === "") throw new ServiceError("Amount is required.");
  if (!/^-?\d+([.,]\d{1,2})?$/.test(value)) {
    if (/^-?\d+[.,]\d{3,}$/.test(value)) {
      throw new ServiceError("Amount may contain at most two decimal places.");
    }
    throw new ServiceError("Amount must be a valid number.");
  }
  const normalized = value.replace(",", ".");
  const cents = Math.round(parseFloat(normalized) * 100);
  if (cents === 0) throw new ServiceError("Amount must not be zero.");
  return cents;
}

export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatCentsAbs(cents: number): string {
  return formatCents(Math.abs(cents));
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function validateTransactionInput(input: TransactionInput): {
  name: string;
  categoryId: string;
  amountCents: number;
  date: string;
  note: string;
} {
  const name = (input.name ?? "").trim();
  if (!name) throw new ServiceError("Transaction name is required.");
  if (!input.categoryId) throw new ServiceError("Please select a category.");
  const amountCents = parseAmountToCents(input.amount);
  const date = (input.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    throw new ServiceError("A valid date is required.");
  }
  return { name, categoryId: input.categoryId, amountCents, date, note: (input.note ?? "").trim() };
}

export function todayISO(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function defaultRange(now: Date = new Date()): DateRange {
  return { startDate: `${now.getFullYear()}-01-01`, endDate: todayISO(now) };
}

export function inRange(t: Transaction, range: Partial<DateRange>): boolean {
  if (range.startDate && t.date < range.startDate) return false;
  if (range.endDate && t.date > range.endDate) return false;
  return true;
}

function buildSection(
  transactions: Transaction[],
  categories: Category[],
  totalCents: number,
): CategorySummary[] {
  const byCategory = new Map<string, { total: number; count: number }>();
  for (const t of transactions) {
    const entry = byCategory.get(t.categoryId) ?? { total: 0, count: 0 };
    entry.total += t.amountCents;
    entry.count += 1;
    byCategory.set(t.categoryId, entry);
  }
  const rows: CategorySummary[] = [];
  for (const [categoryId, entry] of byCategory) {
    rows.push({
      categoryId,
      categoryName: categories.find((c) => c.id === categoryId)?.name ?? "Unknown",
      totalCents: entry.total,
      count: entry.count,
      percentage:
        totalCents === 0 ? 0 : (Math.abs(entry.total) / Math.abs(totalCents)) * 100,
    });
  }
  return rows.sort((a, b) => Math.abs(b.totalCents) - Math.abs(a.totalCents));
}

export function computeSummary(
  transactions: Transaction[],
  categories: Category[],
  range: DateRange,
): Summary {
  const scoped = transactions.filter((t) => inRange(t, range));
  const incomeTx = scoped.filter((t) => t.amountCents > 0);
  const expenseTx = scoped.filter((t) => t.amountCents < 0);
  const totalIncomeCents = incomeTx.reduce((s, t) => s + t.amountCents, 0);
  const totalExpenseCents = expenseTx.reduce((s, t) => s + t.amountCents, 0);

  return {
    totalIncomeCents,
    totalExpenseCents,
    netBalanceCents: totalIncomeCents + totalExpenseCents,
    income: buildSection(incomeTx, categories, totalIncomeCents),
    expenses: buildSection(expenseTx, categories, totalExpenseCents),
  };
}
