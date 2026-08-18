/**
 * Canvas node ids follow a string convention shared by the graph builder and the canvas.
 * Keep every construction and every parse in this module so both sides stay in sync.
 */

export const START_NODE_ID = "workflow:start";
export const OUTPUT_NODE_ID = "workflow:output";

export type BranchRef =
  | { branch: "then" }
  | { branch: "else" }
  | { branch: "condition"; index: number };

export type ParsedNodeId =
  | { kind: "start" }
  | { kind: "output" }
  | { kind: "action"; actionId: string }
  | { kind: "container"; actionId: string }
  | { kind: "branch"; actionId: string; ref: BranchRef }
  | { kind: "branchAdder"; actionId: string; ref: BranchRef };

export function branchKeyOf(ref: BranchRef): string {
  return ref.branch === "condition"
    ? `condition-${ref.index}-box`
    : `${ref.branch}-box`;
}

export const nodeId = {
  container: (actionId: string) => `${actionId}:box`,
  branch: (actionId: string, ref: BranchRef) =>
    `${actionId}:${branchKeyOf(ref)}`,
  branchAdder: (actionId: string, ref: BranchRef) =>
    `${actionId}:${branchKeyOf(ref)}:add`,
};

const CONDITION_PATTERN = /^(.*):condition-(\d+)-box$/;
const THEN_ELSE_PATTERN = /^(.*):(then|else)-box$/;
const CONTAINER_PATTERN = /^(.*):box$/;

function parseBranchId(
  id: string,
): { actionId: string; ref: BranchRef } | null {
  const condition = CONDITION_PATTERN.exec(id);
  if (condition) {
    return {
      actionId: condition[1],
      ref: { branch: "condition", index: Number(condition[2]) },
    };
  }

  const thenElse = THEN_ELSE_PATTERN.exec(id);
  if (thenElse) {
    return {
      actionId: thenElse[1],
      ref: { branch: thenElse[2] as "then" | "else" },
    };
  }

  return null;
}

export function parseNodeId(id: string): ParsedNodeId {
  if (id === START_NODE_ID) {
    return { kind: "start" };
  }

  if (id === OUTPUT_NODE_ID) {
    return { kind: "output" };
  }

  const ADDER_SUFFIX = ":add";
  if (id.endsWith(ADDER_SUFFIX)) {
    const branch = parseBranchId(id.slice(0, -ADDER_SUFFIX.length));
    if (branch) {
      return { kind: "branchAdder", ...branch };
    }
  }

  const branch = parseBranchId(id);
  if (branch) {
    return { kind: "branch", ...branch };
  }

  const container = CONTAINER_PATTERN.exec(id);
  if (container) {
    return { kind: "container", actionId: container[1] };
  }

  return { kind: "action", actionId: id };
}

/** Resolves any canvas node id back to the action it belongs to, if any. */
export function actionIdOfNode(id: string): string | null {
  const parsed = parseNodeId(id);
  return parsed.kind === "start" || parsed.kind === "output"
    ? null
    : parsed.actionId;
}
