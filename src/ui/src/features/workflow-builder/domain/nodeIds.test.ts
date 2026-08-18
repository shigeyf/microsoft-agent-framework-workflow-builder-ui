import { describe, expect, it } from "vitest";
import { nodeId, parseNodeId, START_NODE_ID, OUTPUT_NODE_ID } from "./nodeIds";
import type { BranchRef } from "./nodeIds";

const refs: BranchRef[] = [
  { branch: "then" },
  { branch: "else" },
  { branch: "condition", index: 0 },
  { branch: "condition", index: 12 },
];

describe("parseNodeId", () => {
  it("recognises the workflow endpoints", () => {
    expect(parseNodeId(START_NODE_ID)).toEqual({ kind: "start" });
    expect(parseNodeId(OUTPUT_NODE_ID)).toEqual({ kind: "output" });
  });

  it("treats a plain id as an action", () => {
    expect(parseNodeId("sendactivity_x1")).toEqual({
      kind: "action",
      actionId: "sendactivity_x1",
    });
  });

  it("round-trips every branch id it generates", () => {
    for (const ref of refs) {
      expect(parseNodeId(nodeId.branch("if_1", ref))).toEqual({
        kind: "branch",
        actionId: "if_1",
        ref,
      });

      expect(parseNodeId(nodeId.branchAdder("if_1", ref))).toEqual({
        kind: "branchAdder",
        actionId: "if_1",
        ref,
      });
    }
  });

  it("round-trips container ids", () => {
    expect(parseNodeId(nodeId.container("cg_1"))).toEqual({
      kind: "container",
      actionId: "cg_1",
    });
  });

  /** Container and branch ids share a `:box` suffix, so ordering of the patterns matters. */
  it("does not confuse a branch id with a container id", () => {
    expect(parseNodeId("if_1:then-box").kind).toBe("branch");
    expect(parseNodeId("if_1:box").kind).toBe("container");
  });
});
