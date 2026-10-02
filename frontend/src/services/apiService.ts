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

const LOCAL_API_PORT = 8090;

type Fetch = typeof globalThis.fetch;

interface ApiErrorBody {
  message?: unknown;
  detail?: unknown;
}

function defaultApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:${LOCAL_API_PORT}`;
  }
  return `http://127.0.0.1:${LOCAL_API_PORT}`;
}

function errorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const { message, detail } = body as ApiErrorBody;
  if (typeof message === "string" && message) return message;
  if (typeof detail === "string" && detail) return detail;
  return fallback;
}

/** HTTP implementation of the SpendBoard service contract. */
export function createApiService(
  baseUrl = import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl(),
  fetchImpl: Fetch = globalThis.fetch,
): SpendBoardService {
  const root = baseUrl.replace(/\/$/, "");
  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((listener) => listener());

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let response: Response;
    try {
      response = await fetchImpl(`${root}${path}`, {
        ...init,
        credentials: "include",
        headers: {
          ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
          ...init.headers,
        },
      });
    } catch {
      throw new ServiceError("Unable to connect to the SpendBoard server.");
    }

    if (!response.ok) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = undefined;
      }
      throw new ServiceError(errorMessage(body, `Request failed (${response.status}).`));
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  const body = (value: unknown): Pick<RequestInit, "body"> => ({
    body: JSON.stringify(value),
  });

  return {
    async login(username, password) {
      const user = await request<User>("/auth/login", {
        method: "POST",
        ...body({ username, password }),
      });
      notify();
      return user;
    },

    async logout() {
      await request<void>("/auth/logout", { method: "POST" });
      notify();
    },

    getCurrentUser() {
      return request<User | null>("/auth/me");
    },

    listCategories() {
      return request<Category[]>("/categories");
    },

    async createCategory(name) {
      const category = await request<Category>("/categories", {
        method: "POST",
        ...body({ name }),
      });
      notify();
      return category;
    },

    async renameCategory(id, name) {
      const category = await request<Category>(`/categories/${encodeURIComponent(id)}`, {
        method: "PATCH",
        ...body({ name }),
      });
      notify();
      return category;
    },

    async deleteCategory(id) {
      await request<void>(`/categories/${encodeURIComponent(id)}`, { method: "DELETE" });
      notify();
    },

    listTransactions({ categoryId, startDate, endDate }) {
      const params = new URLSearchParams();
      if (categoryId) params.set("categoryId", categoryId);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const query = params.size ? `?${params}` : "";
      return request<Transaction[]>(`/transactions${query}`);
    },

    async createTransaction(input: TransactionInput) {
      const transaction = await request<Transaction>("/transactions", {
        method: "POST",
        ...body(input),
      });
      notify();
      return transaction;
    },

    async updateTransaction(id: ID, input: TransactionInput) {
      const transaction = await request<Transaction>(`/transactions/${encodeURIComponent(id)}`, {
        method: "PUT",
        ...body(input),
      });
      notify();
      return transaction;
    },

    async deleteTransaction(id) {
      await request<void>(`/transactions/${encodeURIComponent(id)}`, { method: "DELETE" });
      notify();
    },

    getSummary(range: DateRange) {
      const params = new URLSearchParams({
        startDate: range.startDate,
        endDate: range.endDate,
      });
      return request<Summary>(`/summary?${params}`);
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
