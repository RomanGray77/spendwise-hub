export type ID = string;

export interface User {
  id: ID;
  username: string;
}

export interface Category {
  id: ID;
  name: string;
  createdAt: string;
}

export interface Transaction {
  id: ID;
  name: string;
  /** Money stored as integer cents. Positive = income, negative = expense. */
  amountCents: number;
  /** ISO date, e.g. "2026-01-31" */
  date: string;
  note: string;
  categoryId: ID;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionInput {
  name: string;
  categoryId: ID;
  /** Raw string from the form, e.g. "-75.50" */
  amount: string;
  date: string;
  note?: string;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface CategorySummary {
  categoryId: ID;
  categoryName: string;
  totalCents: number;
  count: number;
  percentage: number;
}

export interface Summary {
  totalIncomeCents: number;
  /** Negative number (sum of expense transactions). */
  totalExpenseCents: number;
  netBalanceCents: number;
  income: CategorySummary[];
  expenses: CategorySummary[];
}

export class ServiceError extends Error {}

/**
 * The single boundary between the UI and any backend.
 * Swap the mock implementation for a real API client without touching the UI.
 */
export interface SpendBoardService {
  login(username: string, password: string): Promise<User>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;

  listCategories(): Promise<Category[]>;
  createCategory(name: string): Promise<Category>;
  renameCategory(id: ID, name: string): Promise<Category>;
  deleteCategory(id: ID): Promise<void>;

  listTransactions(params: { categoryId?: ID } & Partial<DateRange>): Promise<Transaction[]>;
  createTransaction(input: TransactionInput): Promise<Transaction>;
  updateTransaction(id: ID, input: TransactionInput): Promise<Transaction>;
  deleteTransaction(id: ID): Promise<void>;

  getSummary(range: DateRange): Promise<Summary>;

  subscribe(listener: () => void): () => void;
}
