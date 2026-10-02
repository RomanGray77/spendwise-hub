import { describe, expect, it, vi } from "vitest";

import { createApiService } from "@/services/apiService";
import { ServiceError } from "@/services/types";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("API service", () => {
  it("uses the backend with cookie credentials", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ id: "user-1", username: "demo" }));
    const service = createApiService("http://api.test/", fetchMock);

    await service.login("demo", "spendboard");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/auth/login",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ username: "demo", password: "spendboard" }),
      }),
    );
  });

  it("serializes transaction filters", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse([]));
    const service = createApiService("http://api.test", fetchMock);

    await service.listTransactions({
      categoryId: "food & drink",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/transactions?categoryId=food+%26+drink&startDate=2026-01-01&endDate=2026-01-31",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("surfaces the backend error message", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ message: "Incorrect username or password." }, 401));
    const service = createApiService("http://api.test", fetchMock);

    await expect(service.login("demo", "wrong")).rejects.toEqual(
      new ServiceError("Incorrect username or password."),
    );
  });

  it("notifies subscribers after a successful mutation", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(async () =>
        jsonResponse({ id: "category-1", name: "Books", createdAt: "now" }, 201),
      );
    const listener = vi.fn();
    const service = createApiService("http://api.test", fetchMock);
    const unsubscribe = service.subscribe(listener);

    await service.createCategory("Books");
    expect(listener).toHaveBeenCalledOnce();

    unsubscribe();
    await service.createCategory("Games");
    expect(listener).toHaveBeenCalledOnce();
  });

  it("turns network failures into service errors", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed"));
    const service = createApiService("http://api.test", fetchMock);

    await expect(service.getCurrentUser()).rejects.toThrow(
      "Unable to connect to the SpendBoard server.",
    );
  });
});
