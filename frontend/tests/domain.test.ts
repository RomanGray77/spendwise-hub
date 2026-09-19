import { describe, expect, it } from "vitest";

import { computeSummary, formatCents, parseAmountToCents, validateTransactionInput } from "@/services/domain";
import type { Category, Transaction } from "@/services/types";

const categories: Category[] = [
  { id: "food", name: "Food", createdAt: "" },
  { id: "housing", name: "Housing", createdAt: "" },
  { id: "salary", name: "Salary", createdAt: "" },
];

const tx = (id: string, amountCents: number, date: string, categoryId: string): Transaction => ({
  id,
  name: id,
  amountCents,
  date,
  note: "",
  categoryId,
  createdAt: "",
  updatedAt: "",
});

describe("amount parsing", () => {
  it("accepts income and expenses", () => {
    expect(parseAmountToCents("2500.00")).toBe(250000);
    expect(parseAmountToCents("-75.50")).toBe(-7550);
  });

  it("rejects zero", () => {
    expect(() => parseAmountToCents("0")).toThrow(/must not be zero/);
  });

  it("rejects more than two decimals", () => {
    expect(() => parseAmountToCents("10.123")).toThrow(/two decimal places/);
  });

  it("rejects empty and non-numeric values", () => {
    expect(() => parseAmountToCents("")).toThrow(/required/);
    expect(() => parseAmountToCents("abc")).toThrow(/valid number/);
  });
});

describe("transaction validation", () => {
  const base = { name: "Lunch", categoryId: "food", amount: "-12.00", date: "2026-03-01" };

  it("accepts a valid transaction", () => {
    expect(validateTransactionInput(base).amountCents).toBe(-1200);
  });

  it("requires a name", () => {
    expect(() => validateTransactionInput({ ...base, name: "  " })).toThrow(/name is required/);
  });

  it("requires a category", () => {
    expect(() => validateTransactionInput({ ...base, categoryId: "" })).toThrow(/select a category/);
  });

  it("requires a valid date", () => {
    expect(() => validateTransactionInput({ ...base, date: "nope" })).toThrow(/valid date/);
  });
});

describe("summary", () => {
  const transactions = [
    tx("salary", 500000, "2026-01-31", "salary"),
    tx("rent", -120000, "2026-02-01", "housing"),
    tx("food1", -30000, "2026-02-02", "food"),
    tx("food2", -10000, "2026-02-03", "food"),
    tx("old", -99999, "2025-12-31", "food"),
  ];
  const range = { startDate: "2026-01-01", endDate: "2026-12-31" };
  const summary = computeSummary(transactions, categories, range);

  it("filters by date range", () => {
    expect(summary.expenses.reduce((s, r) => s + r.count, 0)).toBe(3);
  });

  it("computes totals and net balance", () => {
    expect(summary.totalIncomeCents).toBe(500000);
    expect(summary.totalExpenseCents).toBe(-160000);
    expect(summary.netBalanceCents).toBe(340000);
  });

  it("computes expense percentages independently", () => {
    const housing = summary.expenses.find((r) => r.categoryName === "Housing")!;
    expect(housing.percentage).toBeCloseTo(75);
  });

  it("computes income percentages independently", () => {
    expect(summary.income[0]!.percentage).toBeCloseTo(100);
  });

  it("sorts categories by largest absolute amount", () => {
    expect(summary.expenses.map((r) => r.categoryName)).toEqual(["Housing", "Food"]);
  });

  it("returns 0% instead of dividing by zero", () => {
    const empty = computeSummary([], categories, range);
    expect(empty.income).toEqual([]);
    expect(empty.netBalanceCents).toBe(0);
  });

  it("formats money as USD", () => {
    expect(formatCents(-150000)).toBe("-$1,500.00");
  });
});
