import { describe, expect, it } from "vitest";
import {
  canChangeStyle,
  isKindAvailable,
  kindsForDestination,
  kindsForStyle,
} from "./styles";

describe("kindsForStyle", () => {
  it("offers SetValue only for python", () => {
    expect(kindsForStyle("python")).toContain("SetValue");
    expect(kindsForStyle("csharp")).not.toContain("SetValue");
  });

  it("keeps SetVariable available to both runtimes", () => {
    expect(isKindAvailable("SetVariable", "python")).toBe(true);
    expect(isKindAvailable("SetVariable", "csharp")).toBe(true);
  });

  it("drops nothing else from the csharp palette", () => {
    const missing = kindsForStyle("python").filter(
      (kind) => !isKindAvailable(kind, "csharp"),
    );

    expect(missing).toEqual(["SetValue"]);
  });
});

describe("kindsForDestination", () => {
  it("offers the loop controls only inside a loop", () => {
    expect(kindsForDestination("python", false)).not.toContain("BreakLoop");
    expect(kindsForDestination("python", false)).not.toContain("ContinueLoop");
    expect(kindsForDestination("python", true)).toContain("BreakLoop");
    expect(kindsForDestination("python", true)).toContain("ContinueLoop");
  });

  it("still applies the style filter inside a loop", () => {
    expect(kindsForDestination("csharp", true)).not.toContain("SetValue");
  });
});

describe("canChangeStyle", () => {
  it("allows a style change only while the workflow is empty", () => {
    expect(canChangeStyle(0, 0)).toBe(true);
    expect(canChangeStyle(1, 0)).toBe(false);
    expect(canChangeStyle(0, 1)).toBe(false);
  });
});
