import { describe, expect, it } from "vitest";
import { buildEdges } from "./buildEdges";
import { nodeId, OUTPUT_NODE_ID, START_NODE_ID } from "../domain/nodeIds";
import type { ActionModel } from "../types";

function ifAction(overrides: Partial<ActionModel> = {}): ActionModel {
  return {
    id: "if_1",
    kind: "If",
    displayName: "Check",
    then: [],
    else: [],
    ...overrides,
  };
}

const idsOf = (actions: ActionModel[], collapsed: string[] = []) =>
  buildEdges(actions, collapsed).map((edge) => `${edge.from}->${edge.to}`);

describe("buildEdges", () => {
  it("connects start straight to output when there are no actions", () => {
    expect(idsOf([])).toEqual([`${START_NODE_ID}->${OUTPUT_NODE_ID}`]);
  });

  it("routes external edges through the container of a branch action", () => {
    const edges = idsOf([ifAction()]);

    expect(edges).toContain(`${START_NODE_ID}->${nodeId.container("if_1")}`);
    expect(edges).toContain(`${nodeId.container("if_1")}->${OUTPUT_NODE_ID}`);
  });

  it("links an empty branch directly to its adder", () => {
    const edges = idsOf([ifAction()]);
    const thenBox = nodeId.branch("if_1", { branch: "then" });

    expect(edges).toContain(`if_1->${thenBox}`);
    expect(edges).toContain(`${thenBox}->${thenBox}:add`);
  });

  it("chains branch actions between the label and the adder", () => {
    const edges = idsOf([
      ifAction({
        then: [
          { id: "a1", kind: "SetValue", displayName: "a1" },
          { id: "a2", kind: "SetValue", displayName: "a2" },
        ],
      }),
    ]);
    const thenBox = nodeId.branch("if_1", { branch: "then" });

    expect(edges).toContain(`${thenBox}->a1`);
    expect(edges).toContain("a1->a2");
    expect(edges).toContain(`a2->${thenBox}:add`);
  });

  it("drops internal edges while a container is collapsed", () => {
    const edges = idsOf([ifAction()], ["if_1"]);

    expect(edges).toEqual([
      `${START_NODE_ID}->${nodeId.container("if_1")}`,
      `${nodeId.container("if_1")}->${OUTPUT_NODE_ID}`,
    ]);
  });

  it("keeps the sequential chain across a branch action", () => {
    const edges = idsOf([
      ifAction(),
      { id: "after", kind: "SetValue", displayName: "after" },
    ]);

    expect(edges).toContain(`${nodeId.container("if_1")}->after`);
    expect(edges).toContain(`after->${OUTPUT_NODE_ID}`);
  });

  it("gives a ConditionGroup one branch per condition plus an else row", () => {
    const edges = idsOf([
      {
        id: "cg",
        kind: "ConditionGroup",
        displayName: "Route",
        conditions: [
          { condition: "=a", actions: [] },
          { condition: "=b", actions: [] },
        ],
      },
    ]);

    expect(edges).toContain(
      `cg->${nodeId.branch("cg", { branch: "condition", index: 0 })}`,
    );
    expect(edges).toContain(
      `cg->${nodeId.branch("cg", { branch: "condition", index: 1 })}`,
    );
    expect(edges).toContain(`cg->${nodeId.branch("cg", { branch: "else" })}`);
  });
});
