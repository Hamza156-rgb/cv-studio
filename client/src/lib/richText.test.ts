import { describe, expect, it } from "vitest";
import { toggleInlineMarker } from "./richText";

describe("toolbar bold/italic wrapping", () => {
  it("keeps the closing marker on the same line when the selection includes the line break", () => {
    expect(toggleInlineMarker("JEEYM — Enterprise Platform\n", "**")).toBe("**JEEYM — Enterprise Platform**\n");
  });

  it("leaves surrounding spaces and list markers outside the marker", () => {
    expect(toggleInlineMarker("  Led a team ", "**")).toBe("  **Led a team** ");
    expect(toggleInlineMarker("- Built the API", "**")).toBe("- **Built the API**");
  });

  it("bolds each line of a multi-line selection separately and skips blank lines", () => {
    expect(toggleInlineMarker("First\n\nSecond", "**")).toBe("**First**\n\n**Second**");
  });

  it("unwraps text that is already formatted", () => {
    expect(toggleInlineMarker("**Already bold**\n", "**")).toBe("Already bold\n");
    expect(toggleInlineMarker("*slanted*", "*")).toBe("slanted");
    expect(toggleInlineMarker("**bold**", "*")).toBe("***bold***");
  });
});
