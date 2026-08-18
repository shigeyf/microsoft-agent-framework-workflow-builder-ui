import { describe, expect, it } from "vitest";
import {
  findAction,
  flattenActions,
  insertAfter,
  insertIntoBranch,
  isInsideLoop,
  removeAction,
  translateSubtree,
  updateAction,
} from "./actionTree";
import type { ActionModel } from "../types";

function action(id: string, extra: Partial<ActionModel> = {}): ActionModel {
  return { id, kind: "SetValue", displayName: id, ...extra };
}

function tree(): ActionModel[] {
  return [
    action("if_1", {
      kind: "If",
      x: 100,
      y: 200,
      then: [action("t1", { x: 300, y: 200 })],
      else: [action("e1", { x: 300, y: 300 })],
    }),
    action("tail"),
  ];
}

describe("isInsideLoop", () => {
  const tree: ActionModel[] = [
    {
      id: "loop",
      kind: "Foreach",
      displayName: "loop",
      body: [
        { id: "inner", kind: "SendActivity", displayName: "inner" },
        {
          id: "if_in_loop",
          kind: "If",
          displayName: "if",
          then: [{ id: "deep", kind: "SendActivity", displayName: "deep" }],
          else: [],
        },
      ],
    },
    { id: "outside", kind: "SendActivity", displayName: "outside" },
  ];

  it("reports the loop body and everything nested in it", () => {
    expect(isInsideLoop(tree, "inner")).toBe(true);
    expect(isInsideLoop(tree, "deep")).toBe(true);
  });

  it("reports siblings of the loop as outside", () => {
    expect(isInsideLoop(tree, "loop")).toBe(false);
    expect(isInsideLoop(tree, "outside")).toBe(false);
  });
});

describe("findAction", () => {
  it("reaches actions nested in a loop body", () => {
    const tree: ActionModel[] = [
      {
        id: "loop",
        kind: "Foreach",
        displayName: "loop",
        body: [{ id: "inner", kind: "BreakLoop", displayName: "break" }],
      },
    ];

    expect(findAction(tree, "inner")?.kind).toBe("BreakLoop");
  });

  it("moves an action nested in a loop body", () => {
    const tree: ActionModel[] = [
      {
        id: "loop",
        kind: "Foreach",
        displayName: "loop",
        body: [{ id: "inner", kind: "BreakLoop", displayName: "break", x: 0 }],
      },
    ];

    expect(updateAction(tree, "inner", { x: 42 })[0].body?.[0].x).toBe(42);
  });

  it("finds nested branch actions", () => {
    expect(findAction(tree(), "t1")?.id).toBe("t1");
    expect(findAction(tree(), "e1")?.id).toBe("e1");
  });

  it("returns null for unknown ids", () => {
    expect(findAction(tree(), "missing")).toBeNull();
  });
});

describe("flattenActions", () => {
  it("includes branch children", () => {
    expect(flattenActions(tree()).map((a) => a.id)).toEqual([
      "if_1",
      "t1",
      "e1",
      "tail",
    ]);
  });

  it("hides the subtree of collapsed containers", () => {
    expect(flattenActions(tree(), ["if_1"]).map((a) => a.id)).toEqual([
      "if_1",
      "tail",
    ]);
  });
});

describe("updateAction", () => {
  it("patches a nested action without touching siblings", () => {
    const next = updateAction(tree(), "t1", { displayName: "renamed" });

    expect(findAction(next, "t1")?.displayName).toBe("renamed");
    expect(findAction(next, "e1")?.displayName).toBe("e1");
  });
});

describe("removeAction", () => {
  it("removes nested actions", () => {
    const next = removeAction(tree(), "t1");

    expect(findAction(next, "t1")).toBeNull();
    expect(findAction(next, "if_1")).not.toBeNull();
  });
});

describe("insertAfter", () => {
  it("inserts at top level", () => {
    const next = insertAfter(tree(), "if_1", action("new"));

    expect(next.map((a) => a.id)).toEqual(["if_1", "new", "tail"]);
  });

  it("inserts inside a branch list", () => {
    const next = insertAfter(tree(), "t1", action("new"));

    expect(findAction(next, "if_1")?.then?.map((a) => a.id)).toEqual([
      "t1",
      "new",
    ]);
  });
});

describe("insertIntoBranch", () => {
  it("appends to the tail of a branch", () => {
    const next = insertIntoBranch(
      tree(),
      "if_1",
      { branch: "then" },
      action("new"),
      "tail",
    );

    expect(findAction(next, "if_1")?.then?.map((a) => a.id)).toEqual([
      "t1",
      "new",
    ]);
  });

  it("inserts at the head of a branch", () => {
    const next = insertIntoBranch(
      tree(),
      "if_1",
      { branch: "then" },
      action("new"),
      "head",
    );

    expect(findAction(next, "if_1")?.then?.map((a) => a.id)).toEqual([
      "new",
      "t1",
    ]);
  });

  it("targets the requested condition index", () => {
    const source = [
      action("cg", {
        kind: "ConditionGroup",
        conditions: [
          { condition: "=a", actions: [] },
          { condition: "=b", actions: [] },
        ],
      }),
    ];

    const next = insertIntoBranch(
      source,
      "cg",
      { branch: "condition", index: 1 },
      action("new"),
      "tail",
    );

    const conditions = findAction(next, "cg")?.conditions ?? [];
    expect(conditions[0].actions).toHaveLength(0);
    expect(conditions[1].actions.map((a) => a.id)).toEqual(["new"]);
  });
});

describe("translateSubtree", () => {
  it("moves the action and all of its descendants by the same delta", () => {
    const next = translateSubtree(tree(), "if_1", 10, 20);

    expect(findAction(next, "if_1")).toMatchObject({ x: 110, y: 220 });
    expect(findAction(next, "t1")).toMatchObject({ x: 310, y: 220 });
    expect(findAction(next, "e1")).toMatchObject({ x: 310, y: 320 });
  });

  it("leaves unrelated actions untouched", () => {
    const next = translateSubtree(tree(), "if_1", 10, 20);

    expect(findAction(next, "tail")?.x).toBeUndefined();
  });
});
