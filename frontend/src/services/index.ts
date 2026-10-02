import { createApiService } from "./apiService";
import type { SpendBoardService } from "./types";

/** Single access point for every backend call in the app. */
export const spendBoard: SpendBoardService = createApiService();

export * from "./types";
export * from "./domain";
export { createApiService };
export { createMockService } from "./mockService";
