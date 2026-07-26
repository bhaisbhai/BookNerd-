import { describe, it, expect } from "vitest";
import { getBookLinks } from "./bookLinks.js";

describe("getBookLinks", () => {
  it("returns links for all five destinations", () => {
    const links = getBookLinks("Mistborn", "Brandon Sanderson");
    expect(links.map((l) => l.label)).toEqual([
      "Amazon",
      "Bookshop.org",
      "Audible",
      "Apple Books",
      "Find at a library",
    ]);
  });

  it("encodes title and author into each URL", () => {
    const links = getBookLinks("The Name of the Wind", "Patrick Rothfuss");
    for (const link of links) {
      expect(link.url).toContain(encodeURIComponent("The Name of the Wind Patrick Rothfuss"));
    }
  });

  it("encodes special characters safely", () => {
    const links = getBookLinks("Kafka on the Shore & Beyond", "Someone/Else");
    const amazon = links.find((l) => l.label === "Amazon")!;
    expect(amazon.url).not.toContain("&Beyond");
    expect(amazon.url).toContain(encodeURIComponent("Kafka on the Shore & Beyond Someone/Else"));
  });

  it("falls back to title only when author is empty", () => {
    const links = getBookLinks("Untitled Work", "");
    expect(links[0].url).toContain(encodeURIComponent("Untitled Work"));
    expect(links[0].url).not.toContain("+");
  });
});
