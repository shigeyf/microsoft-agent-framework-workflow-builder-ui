import { describe, expect, it } from "vitest";
import { unreachableActionIds } from "./reachability";
import type { ActionModel } from "../types";

const send = (id: string): ActionModel => ({
  id,
  kind: "SendActivity",
  displayName: id,
});

describe("unreachableActionIds", () => {
  it("marks everything after a terminator in the same list", () => {
    const found = unreachableActionIds([
      send("first"),
      { id: "stop", kind: "EndWorkflow", displayName: "stop" },
      send("dead"),
    ]);

    expect([...found]).toEqual(["dead"]);
  });

  it("marks the whole subtree of an unreachable container", () => {
    const found = unreachableActionIds([
      { id: "brk", kind: "BreakLoop", displayName: "break" },
      {
        id: "if_1",
        kind: "If",
        displayName: "if",
        then: [send("inner")],
        else: [],
      },
    ]);

    expect(found.has("if_1")).toBe(true);
    expect(found.has("inner")).toBe(true);
  });

  it("keeps branches of a reachable container reachable", () => {
    const found = unreachableActionIds([
      {
        id: "if_1",
        kind: "If",
        displayName: "if",
        then: [send("a")],
        else: [send("b")],
      },
      send("after"),
    ]);

    expect([...found]).toEqual([]);
  });

  it("marks only the actions after a terminator inside a branch", () => {
    const found = unreachableActionIds([
      {
        id: "loop",
        kind: "Foreach",
        displayName: "loop",
        body: [
          send("runs"),
          { id: "brk", kind: "BreakLoop", displayName: "break" },
          send("dead"),
        ],
      },
    ]);

    expect([...found]).toEqual(["dead"]);
  });
});
