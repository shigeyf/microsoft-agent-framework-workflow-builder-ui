import { describe, expect, it } from "vitest";
import conditionalWorkflow from "./__fixtures__/conditional_workflow.yaml?raw";
import customerSupport from "./__fixtures__/customer_support.yaml?raw";
import humanInLoop from "./__fixtures__/human_in_loop.yaml?raw";
import simpleWorkflow from "./__fixtures__/simple_workflow.yaml?raw";
import studentTeacher from "./__fixtures__/student_teacher.yaml?raw";
import { parseWorkflowYaml } from "./parseYaml";
import { buildYaml } from "./yaml";
import { flattenActions } from "../domain/actionTree";
import { autoLayout } from "../graph/autoLayout";
import { buildNodes } from "../graph/buildNodes";
import { buildEdges } from "../graph/buildEdges";

/** Verbatim copies of the official Agent Framework python samples. */
const SAMPLES = {
  simple_workflow: simpleWorkflow,
  conditional_workflow: conditionalWorkflow,
  human_in_loop: humanInLoop,
  customer_support: customerSupport,
  student_teacher: studentTeacher,
};

const SAMPLE_NAMES = Object.keys(SAMPLES) as (keyof typeof SAMPLES)[];

function readSample(name: keyof typeof SAMPLES): string {
  return SAMPLES[name];
}

describe("parseWorkflowYaml with official Agent Framework samples", () => {
  it.each(SAMPLE_NAMES)("parses %s without losing actions", (sample) => {
    const parsed = parseWorkflowYaml(readSample(sample));

    expect(parsed.actions.length).toBeGreaterThan(0);
    expect(parsed.name).not.toBe("");
  });

  it.each(SAMPLE_NAMES)(
    "assigns a unique id to every action in %s",
    (sample) => {
      const parsed = parseWorkflowYaml(readSample(sample));
      const ids = flattenActions(parsed.actions).map((action) => action.id);

      expect(ids).not.toContain("");
      expect(new Set(ids).size).toBe(ids.length);
    },
  );

  it.each(SAMPLE_NAMES)("builds a connected graph for %s", (sample) => {
    const parsed = parseWorkflowYaml(readSample(sample));
    const nodes = buildNodes(parsed.actions, [], {
      start: { x: 0, y: 0 },
      output: { x: 0, y: 0 },
    });
    const edges = buildEdges(parsed.actions, []);
    const nodeIds = new Set(nodes.map((node) => node.id));

    expect(new Set(nodes.map((n) => n.id)).size).toBe(nodes.length);

    for (const edge of edges) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
    }
  });

  it.each(SAMPLE_NAMES)("survives a YAML round trip for %s", (sample) => {
    const first = parseWorkflowYaml(readSample(sample));
    const second = parseWorkflowYaml(
      buildYaml(
        first.style,
        first.name,
        first.description,
        first.triggerKind,
        first.inputs,
        first.actions,
      ),
    );

    expect(second.actions).toEqual(first.actions);
  });

  it.each(SAMPLE_NAMES)("lays %s out without overlapping cards", (sample) => {
    const parsed = parseWorkflowYaml(readSample(sample));
    const cards = buildNodes(autoLayout(parsed.actions).actions, [], {
      start: { x: 0, y: 0 },
      output: { x: 0, y: 0 },
    }).filter((node) => node.kind === "process");

    for (const a of cards) {
      for (const b of cards) {
        if (a.id >= b.id) {
          continue;
        }

        const overlaps =
          a.x < b.x + (b.width ?? 0) &&
          b.x < a.x + (a.width ?? 0) &&
          a.y < b.y + (b.height ?? 0) &&
          b.y < a.y + (a.height ?? 0);

        expect(overlaps, `${a.id} overlaps ${b.id}`).toBe(false);
      }
    }
  });

  it("detects the python style and typed inputs", () => {
    const parsed = parseWorkflowYaml(readSample("conditional_workflow"));

    expect(parsed.style).toBe("python");
    expect(parsed.name).toBe("conditional-workflow");
    expect(parsed.inputs).toEqual([
      {
        name: "age",
        type: "integer",
        description: "The user's age in years",
      },
    ]);
  });

  it("keeps the three level nesting of conditional_workflow", () => {
    const parsed = parseWorkflowYaml(readSample("conditional_workflow"));
    const outer = parsed.actions.find((action) => action.id === "check_age");

    expect(outer?.kind).toBe("If");
    expect(outer?.condition).toBe("=Local.age < 13");
    expect(outer?.then?.map((action) => action.kind)).toEqual([
      "SetValue",
      "SendActivity",
    ]);

    const second = outer?.else?.[0];
    const third = second?.else?.[0];

    expect(second?.kind).toBe("If");
    expect(third?.kind).toBe("If");
    expect(third?.condition).toBe("=Local.age < 65");
    expect(third?.else?.map((action) => action.kind)).toEqual([
      "SetValue",
      "SendActivity",
    ]);
  });

  it("detects the csharp style from the trigger block", () => {
    const parsed = parseWorkflowYaml(readSample("student_teacher"));

    expect(parsed.style).toBe("csharp");
    expect(parsed.triggerKind).toBe("OnConversationStart");
    expect(parsed.name).toBe("student_teacher_workflow");
  });

  it("reads ConditionGroup branches with their ids", () => {
    const parsed = parseWorkflowYaml(readSample("customer_support"));
    const group = parsed.actions.find(
      (action) => action.id === "check_if_resolved",
    );

    expect(group?.kind).toBe("ConditionGroup");
    expect(group?.conditions?.[0]).toMatchObject({
      id: "test_if_resolved",
      condition: "=Local.ServiceParameters.IsResolved",
    });
  });

  it("maps elseActions onto the fallback branch", () => {
    const parsed = parseWorkflowYaml(readSample("student_teacher"));
    const group = flattenActions(parsed.actions).find(
      (action) => action.kind === "ConditionGroup",
    );

    expect(group?.else?.length).toBeGreaterThan(0);
  });

  it("accepts a plain string activity as well as a nested text map", () => {
    const parsed = parseWorkflowYaml(readSample("customer_support"));
    const routing = flattenActions(parsed.actions).find((action) =>
      action.activity?.text?.startsWith("Routing to"),
    );

    expect(routing?.kind).toBe("SendActivity");
  });

  it("flattens a structured SetValue payload into an editable expression", () => {
    const parsed = parseWorkflowYaml(readSample("human_in_loop"));
    const store = parsed.actions.find(
      (action) => action.id === "store_results",
    );

    expect(store?.path).toBe("Workflow.Outputs.survey");
    expect(store?.value).toContain("Local.userName");
  });

  it("reports action kinds the builder cannot edit", () => {
    const parsed = parseWorkflowYaml(readSample("student_teacher"));

    expect(parsed.unsupportedKinds).toContain("GotoAction");
  });

  it("rejects yaml that is not a workflow", () => {
    expect(() => parseWorkflowYaml("name: nope")).toThrow(/actions/);
  });
});
