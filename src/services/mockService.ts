import {
  computeSummary,
  defaultRange,
  inRange,
  validateTransactionInput,
} from "./domain";
import type {
  Category,
  DateRange,
  ID,
  SpendBoardService,
  Summary,
  Transaction,
  TransactionInput,
  User,
} from "./types";
import { ServiceError } from "./types";

const DEFAULT_CATEGORIES = ["Food", "Transport", "Housing", "Salary", "Entertainment", "Other"];

const CREDENTIALS = { username: "demo", password: "spendboard" };
const STORAGE_KEY = "spendboard.state.v1";

interface State {
  user: User | null;
  categories: Category[];
  transactions: Transaction[];
}

const uid = () => Math.random().toString(36).slice(2, 10);

function seed(): State {
  const now = new Date().toISOString();
  const categories: Category[] = DEFAULT_CATEGORIES.map((name) => ({
    id: uid(),
    name,
    createdAt: now,
  }));
  const byName = (n: string) => categories.find((c) => c.name === n)!.id;
  const year = new Date().getFullYear();
  const tx = (
    name: string,
    amountCents: number,
    date: string,
    categoryName: string,
    note = "",
  ): Transaction => ({
    id: uid(),
    name,
    amountCents,
    date,
    note,
    categoryId: byName(categoryName),
    createdAt: now,
    updatedAt: now,
  });

  return {
    user: null,
    categories,
    transactions: [
      tx("Monthly salary", 450000, `${year}-01-31`, "Salary", "Employer payout"),
      tx("Monthly salary", 450000, `${year}-02-28`, "Salary"),
      tx("Freelance project", 92000, `${year}-03-12`, "Other", "Logo redesign"),
      tx("Rent", -180000, `${year}-01-05`, "Housing"),
      tx("Rent", -180000, `${year}-02-05`, "Housing"),
      tx("Groceries", -14250, `${year}-02-09`, "Food"),
      tx("Groceries", -11080, `${year}-03-02`, "Food"),
      tx("Dinner out", -7550, `${year}-03-08`, "Food", "Birthday"),
      tx("Metro pass", -4500, `${year}-02-01`, "Transport"),
      tx("Taxi", -2340, `${year}-03-15`, "Transport"),
      tx("Cinema", -1800, `${year}-03-20`, "Entertainment"),
    ],
  };
}

function load(): State {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    /* ignore */
  }
  const state = seed();
  save(state);
  return state;
}

function save(state: State) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

/** In-memory mock backend: the whole app runs without a server. */
export function createMockService(initial?: Partial<State>): SpendBoardService {
  let state: State = initial
    ? { ...seed(), ...initial }
    : load();
  const listeners = new Set<() => void>();

  const commit = () => {
    save(state);
    listeners.forEach((l) => l());
  };
  const delay = () => new Promise((r) => setTimeout(r, 0));

  const requireCategory = (id: ID) => {
    const c = state.categories.find((x) => x.id === id);
    if (!c) throw new ServiceError("Please select a category.");
    return c;
  };

  return {
    async login(username, password) {
      await delay();
      if (username.trim() !== CREDENTIALS.username || password !== CREDENTIALS.password) {
        throw new ServiceError("Incorrect username or password.");
      }
      state = { ...state, user: { id: "user-1", username: CREDENTIALS.username } };
      commit();
      return state.user!;
    },
    async logout() {
      await delay();
      state = { ...state, user: null };
      commit();
    },
    async getCurrentUser() {
      return state.user;
    },

    async listCategories() {
      await delay();
      return [...state.categories].sort((a, b) => a.name.localeCompare(b.name));
    },
    async createCategory(name) {
      await delay();
      const trimmed = name.trim();
      if (!trimmed) throw new ServiceError("Category name is required.");
      if (state.categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
        throw new ServiceError("Category name already exists.");
      }
      const category: Category = {
        id: uid(),
        name: trimmed,
        createdAt: new Date().toISOString(),
      };
      state = { ...state, categories: [...state.categories, category] };
      commit();
      return category;
    },
    async renameCategory(id, name) {
      await delay();
      const trimmed = name.trim();
      if (!trimmed) throw new ServiceError("Category name is required.");
      requireCategory(id);
      if (
        state.categories.some(
          (c) => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase(),
        )
      ) {
        throw new ServiceError("Category name already exists.");
      }
      state = {
        ...state,
        categories: state.categories.map((c) => (c.id === id ? { ...c, name: trimmed } : c)),
      };
      commit();
      return state.categories.find((c) => c.id === id)!;
    },
    async deleteCategory(id) {
      await delay();
      requireCategory(id);
      if (state.transactions.some((t) => t.categoryId === id)) {
        throw new ServiceError(
          "This category cannot be deleted because transactions are assigned to it.",
        );
      }
      state = { ...state, categories: state.categories.filter((c) => c.id !== id) };
      commit();
    },

    async listTransactions({ categoryId, startDate, endDate }) {
      await delay();
      return state.transactions
        .filter((t) => (categoryId ? t.categoryId === categoryId : true))
        .filter((t) => inRange(t, { startDate, endDate }))
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    },
    async createTransaction(input: TransactionInput) {
      await delay();
      const v = validateTransactionInput(input);
      requireCategory(v.categoryId);
      const now = new Date().toISOString();
      const transaction: Transaction = { id: uid(), ...v, createdAt: now, updatedAt: now };
      state = { ...state, transactions: [...state.transactions, transaction] };
      commit();
      return transaction;
    },
    async updateTransaction(id, input) {
      await delay();
      const existing = state.transactions.find((t) => t.id === id);
      if (!existing) throw new ServiceError("Transaction not found.");
      const v = validateTransactionInput(input);
      requireCategory(v.categoryId);
      const updated: Transaction = { ...existing, ...v, updatedAt: new Date().toISOString() };
      state = {
        ...state,
        transactions: state.transactions.map((t) => (t.id === id ? updated : t)),
      };
      commit();
      return updated;
    },
    async deleteTransaction(id) {
      await delay();
      if (!state.transactions.some((t) => t.id === id)) {
        throw new ServiceError("Transaction not found.");
      }
      state = { ...state, transactions: state.transactions.filter((t) => t.id !== id) };
      commit();
    },

    async getSummary(range: DateRange): Promise<Summary> {
      await delay();
      return computeSummary(state.transactions, state.categories, range ?? defaultRange());
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
