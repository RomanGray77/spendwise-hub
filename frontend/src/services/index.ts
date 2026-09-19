import { createMockService } from "./mockService";
import type { SpendBoardService } from "./types";

/**
 * Single access point for every backend call in the app.
 * Replace this with a real API client implementing SpendBoardService.
 */
export const spendBoard: SpendBoardService = createMockService();

export * from "./types";
export * from "./domain";
export { createMockService };
