import { beforeEach, describe, expect, it } from "vitest";

import { createMockService } from "@/services/mockService";
import type { SpendBoardService } from "@/services/types";

let service: SpendBoardService;

const findCategory = async (name: string) => {
  const categories = await service.listCategories();
  return categories.find((c) => c.name === name)!;
};

beforeEach(() => {
  service = createMockService();
});

describe("authentication", () => {
  it("accepts valid credentials", async () => {
    const user = await service.login("demo", "spendboard");
    expect(user.username).toBe("demo");
    expect(await service.getCurrentUser()).not.toBeNull();
  });

  it("rejects invalid credentials", async () => {
    await expect(service.login("demo", "wrong")).rejects.toThrow(/Incorrect/);
    expect(await service.getCurrentUser()).toBeNull();
  });

  it("logs out", async () => {
    await service.login("demo", "spendboard");
    await service.logout();
    expect(await service.getCurrentUser()).toBeNull();
  });
});

describe("categories", () => {
  it("creates a category", async () => {
    const created = await service.createCategory("Health");
    expect(created.name).toBe("Health");
  });

  it("rejects duplicates", async () => {
    await expect(service.createCategory("food")).rejects.toThrow(/already exists/);
  });

  it("renames a category", async () => {
    const food = await findCategory("Food");
    const renamed = await service.renameCategory(food.id, "Groceries");
    expect(renamed.name).toBe("Groceries");
  });

  it("prevents deleting a category with transactions", async () => {
    const food = await findCategory("Food");
    await expect(service.deleteCategory(food.id)).rejects.toThrow(/cannot be deleted/);
  });

  it("deletes an unused category", async () => {
    const created = await service.createCategory("Health");
    await service.deleteCategory(created.id);
    expect((await service.listCategories()).some((c) => c.id === created.id)).toBe(false);
  });
});

describe("transactions", () => {
  it("creates income and expenses", async () => {
    const salary = await findCategory("Salary");
    const income = await service.createTransaction({
      name: "Bonus",
      categoryId: salary.id,
      amount: "1200.50",
      date: "2026-04-01",
    });
    const expense = await service.createTransaction({
      name: "Books",
      categoryId: salary.id,
      amount: "-20.99",
      date: "2026-04-02",
    });
    expect(income.amountCents).toBe(120050);
    expect(expense.amountCents).toBe(-2099);
  });

  it("rejects a zero amount", async () => {
    const salary = await findCategory("Salary");
    await expect(
      service.createTransaction({
        name: "Nothing",
        categoryId: salary.id,
        amount: "0.00",
        date: "2026-04-01",
      }),
    ).rejects.toThrow(/must not be zero/);
  });

  it("rejects invalid decimal precision", async () => {
    const salary = await findCategory("Salary");
    await expect(
      service.createTransaction({
        name: "Odd",
        categoryId: salary.id,
        amount: "10.999",
        date: "2026-04-01",
      }),
    ).rejects.toThrow(/two decimal places/);
  });

  it("edits a transaction and moves it between categories", async () => {
    const food = await findCategory("Food");
    const other = await findCategory("Other");
    const created = await service.createTransaction({
      name: "Snack",
      categoryId: food.id,
      amount: "-5.00",
      date: "2026-04-01",
    });
    const updated = await service.updateTransaction(created.id, {
      name: "Refund",
      categoryId: other.id,
      amount: "5.00",
      date: "2026-04-02",
    });
    expect(updated.categoryId).toBe(other.id);
    expect(updated.amountCents).toBe(500);
  });

  it("deletes a transaction", async () => {
    const food = await findCategory("Food");
    const created = await service.createTransaction({
      name: "Snack",
      categoryId: food.id,
      amount: "-5.00",
      date: "2026-04-01",
    });
    await service.deleteTransaction(created.id);
    const list = await service.listTransactions({ categoryId: food.id });
    expect(list.some((t) => t.id === created.id)).toBe(false);
  });

  it("lists category transactions newest first within the range", async () => {
    const food = await findCategory("Food");
    const year = new Date().getFullYear();
    const list = await service.listTransactions({
      categoryId: food.id,
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
    });
    const dates = list.map((t) => t.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
});

describe("summary through the service", () => {
  it("matches the seeded ledger", async () => {
    const year = new Date().getFullYear();
    const summary = await service.getSummary({
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
    });
    expect(summary.totalIncomeCents).toBe(992000);
    expect(summary.totalExpenseCents).toBe(-401520);
    expect(summary.netBalanceCents).toBe(590480);
    expect(summary.expenses[0]!.categoryName).toBe("Housing");
  });
});
