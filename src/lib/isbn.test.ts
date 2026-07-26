import { describe, it, expect } from "vitest";
import { extractIsbn } from "./isbn.js";

describe("extractIsbn", () => {
  it("accepts a clean 978-prefixed ISBN-13", () => {
    expect(extractIsbn("9780593135204")).toBe("9780593135204");
  });

  it("accepts a 979-prefixed ISBN-13", () => {
    expect(extractIsbn("9791234567896")).toBe("9791234567896");
  });

  it("strips non-digit characters (e.g. hyphens some barcode decoders include)", () => {
    expect(extractIsbn("978-0-593-13520-4")).toBe("9780593135204");
  });

  it("rejects text that isn't 13 digits", () => {
    expect(extractIsbn("978059313520")).toBeNull();
    expect(extractIsbn("97805931352045")).toBeNull();
  });

  it("rejects a 13-digit code that isn't ISBN-prefixed (978/979)", () => {
    expect(extractIsbn("1234567890123")).toBeNull();
  });

  it("rejects non-numeric garbage", () => {
    expect(extractIsbn("not a barcode")).toBeNull();
    expect(extractIsbn("")).toBeNull();
  });
});
