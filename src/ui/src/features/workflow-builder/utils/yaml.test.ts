import { describe, expect, it } from "vitest";
import { buildYaml } from "./yaml";
import type { ActionModel, InputParam } from "../types";

const noInputs: InputParam[] = [];

function yamlOf(actions: ActionModel[], inputs: InputParam[] = noInputs) {
  return buildYaml(
    "python",
    "wf",
    "desc",
    "OnConversationStart",
    inputs,
    actions,
  );
}

describe("buildYaml", () => {
  it("emits an empty actions block when there is nothing to render", () => {
    expect(yamlOf([])).toContain("actions:");
    expect(yamlOf([])).toContain("# no inputs");
  });

  it("renders declared inputs", () => {
    const yaml = yamlOf(
      [],
      [{ name: "userName", type: "string", description: "who to greet" }],
    );

    expect(yaml).toContain("userName:");
    expect(yaml).toContain("type: string");
  });

  it("renders If with then and else branches", () => {
    const yaml = yamlOf([
      {
        id: "if_1",
        kind: "If",
        displayName: "Check",
        condition: "=Local.age >= 18",
        then: [
          {
            id: "a1",
            kind: "SendActivity",
            displayName: "Adult",
            activity: { text: "hi" },
          },
        ],
        else: [
          {
            id: "a2",
            kind: "SetValue",
            displayName: "Minor",
            path: "Local.x",
            value: "1",
          },
        ],
      },
    ]);

    expect(yaml).toContain("kind: If");
    expect(yaml).toContain("then:");
    expect(yaml).toContain("else:");
    expect(yaml).toContain("id: a1");
    expect(yaml).toContain("id: a2");
  });

  it("omits If branches that have no actions", () => {
    const yaml = yamlOf([
      {
        id: "if_1",
        kind: "If",
        displayName: "Check",
        condition: "=true",
        then: [],
        else: [],
      },
    ]);

    expect(yaml).not.toContain("then:");
    expect(yaml).not.toContain("else:");
  });

  /** ConditionGroup uses `elseActions`, not `else` - this was previously emitted incorrectly. */
  it("renders ConditionGroup conditions and elseActions", () => {
    const yaml = yamlOf([
      {
        id: "cg_1",
        kind: "ConditionGroup",
        displayName: "Route",
        conditions: [
          {
            condition: "=Local.a",
            actions: [
              {
                id: "c1",
                kind: "SetValue",
                displayName: "A",
                path: "Local.p",
                value: "a",
              },
            ],
          },
        ],
        else: [
          {
            id: "e1",
            kind: "SetValue",
            displayName: "Fallback",
            path: "Local.p",
            value: "z",
          },
        ],
      },
    ]);

    expect(yaml).toContain("conditions:");
    expect(yaml).toContain("elseActions:");
    expect(yaml).not.toMatch(/^\s{4}else:/m);
  });

  it("nests branch actions under their parent", () => {
    const yaml = yamlOf([
      {
        id: "if_outer",
        kind: "If",
        displayName: "Outer",
        condition: "=true",
        then: [
          {
            id: "if_inner",
            kind: "If",
            displayName: "Inner",
            condition: "=false",
            then: [
              {
                id: "leaf",
                kind: "SendActivity",
                displayName: "Leaf",
                activity: { text: "deep" },
              },
            ],
          },
        ],
      },
    ]);

    const leafIndent =
      yaml.split("\n").find((line) => line.includes("id: leaf")) ?? "";
    const outerIndent =
      yaml.split("\n").find((line) => line.includes("id: if_outer")) ?? "";

    expect(leafIndent.search(/\S/)).toBeGreaterThan(outerIndent.search(/\S/));
  });
});
