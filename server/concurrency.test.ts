import { describe, it, expect } from "vitest";
import { mapWithConcurrency } from "./concurrency.js";

describe("mapWithConcurrency", () => {
  it("maps every item and preserves input order in the results", async () => {
    const result = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => n * 10);
    expect(result).toEqual([10, 20, 30, 40, 50]);
  });

  it("never runs more than `limit` calls concurrently", async () => {
    let active = 0;
    let maxActive = 0;

    await mapWithConcurrency(Array.from({ length: 20 }, (_, i) => i), 3, async (n) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      return n;
    });

    expect(maxActive).toBeLessThanOrEqual(3);
  });

  it("handles an empty array", async () => {
    const result = await mapWithConcurrency([], 5, async (n: number) => n);
    expect(result).toEqual([]);
  });

  it("handles a limit larger than the item count", async () => {
    const result = await mapWithConcurrency([1, 2], 10, async (n) => n + 1);
    expect(result).toEqual([2, 3]);
  });

  it("propagates a rejection from fn", async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error("boom");
        return n;
      })
    ).rejects.toThrow("boom");
  });
});
