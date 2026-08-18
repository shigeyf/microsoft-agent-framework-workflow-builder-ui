import type { ActionKind, ActionModel } from "../types";
import { flattenActions } from "../domain/actionTree";
import { branchesOf, isBranchAction } from "../domain/branches";
import { OUTPUT_NODE_ID, START_NODE_ID, nodeId } from "../domain/nodeIds";
import { LAYOUT } from "./layout";

export type WorkflowGraphNode = {
  id: string;
  kind: "input" | "process" | "output" | "branch";
  displayName: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  meta?: string;
  branchKind?: "container" | "then" | "else" | "loop" | "condition" | "adder";
  collapsed?: boolean;
  actionKind?: ActionKind;
};

export type NodePositions = { start: Position; output: Position };

type Position = { x: number; y: number };
type Box = Position & { width: number; height: number };

/**
 * Vertical space an action needs, counting every branch nested inside it.
 * Derived from the tree shape alone so it never depends on stored coordinates.
 */
export function subtreeHeight(action: ActionModel): number {
  if (!isBranchAction(action)) {
    return LAYOUT.node.height;
  }

  const rows = branchesOf(action);
  if (rows.length === 0) {
    return LAYOUT.node.height;
  }

  return rows.reduce(
    (total, branch, index) =>
      total +
      branchRowHeight(branch.actions) +
      (index > 0 ? LAYOUT.branchRowGap : 0),
    0,
  );
}

export function branchRowHeight(actions: ActionModel[]): number {
  return Math.max(
    LAYOUT.branchLabel.height,
    LAYOUT.node.height,
    ...actions.map(subtreeHeight),
  );
}

/** Branch labels stack vertically to the right of the branch action. */
export function branchLabelPosition(
  action: ActionModel,
  rowIndex: number,
): Position {
  const rows = branchesOf(action);
  let offset = 0;

  for (let index = 0; index < rowIndex && index < rows.length; index += 1) {
    offset += branchRowHeight(rows[index].actions) + LAYOUT.branchRowGap;
  }

  return {
    x: (action.x ?? 0) + LAYOUT.branchLabelOffsetX,
    y: (action.y ?? 0) + offset,
  };
}

/**
 * Horizontal space an action needs, counting every branch nested inside it.
 * Derived from the tree shape alone so it never depends on stored coordinates.
 */
export function subtreeWidth(action: ActionModel): number {
  if (!isBranchAction(action)) {
    return LAYOUT.node.width;
  }

  const labelRight = LAYOUT.branchLabelOffsetX + LAYOUT.branchLabel.width;
  const widest = branchesOf(action).reduce(
    (right, branch) =>
      Math.max(
        right,
        labelRight + LAYOUT.branchGapX + branchRowWidth(branch.actions),
      ),
    labelRight,
  );

  // Every branch row ends with a "+" button that has to fit inside the frame.
  return widest + LAYOUT.branchGapX + LAYOUT.adderSize;
}

export function branchRowWidth(actions: ActionModel[]): number {
  return actions.reduce(
    (total, action, index) =>
      total + (index > 0 ? LAYOUT.branchGapX : 0) + subtreeWidth(action),
    0,
  );
}

/** Where the next action of a branch should be placed. */
export function branchSlotPosition(
  action: ActionModel,
  rowIndex: number,
  preceding: ActionModel[],
): Position {
  const label = branchLabelPosition(action, rowIndex);
  const offset =
    preceding.length > 0 ? branchRowWidth(preceding) + LAYOUT.branchGapX : 0;

  return {
    x: label.x + LAYOUT.branchLabel.width + LAYOUT.branchGapX + offset,
    y: label.y - (LAYOUT.node.height - LAYOUT.branchLabel.height) / 2,
  };
}

function containerLabelOf(action: ActionModel): string {
  return action.kind.toUpperCase();
}

function collapsedContainer(action: ActionModel): WorkflowGraphNode {
  const { padding, headerHeight } = LAYOUT.container;

  return {
    id: nodeId.container(action.id),
    kind: "branch",
    displayName: containerLabelOf(action),
    x: (action.x ?? 0) - padding,
    y: (action.y ?? 0) - padding - headerHeight,
    width: LAYOUT.node.width + padding * 2,
    height: LAYOUT.node.height + padding * 2 + headerHeight,
    branchKind: "container",
    collapsed: true,
  };
}

function boundingContainer(
  action: ActionModel,
  boxes: Box[],
): WorkflowGraphNode {
  const { padding, headerHeight } = LAYOUT.container;
  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.width));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));

  return {
    id: nodeId.container(action.id),
    kind: "branch",
    displayName: containerLabelOf(action),
    x: minX - padding,
    y: minY - padding - headerHeight,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2 + headerHeight,
    branchKind: "container",
    collapsed: false,
  };
}

/** Container box, branch labels and trailing adders for every branch action. */
function buildBranchNodes(
  actions: ActionModel[],
  collapsed: string[],
): WorkflowGraphNode[] {
  return actions.flatMap((action) => {
    if (!isBranchAction(action)) {
      return [];
    }

    if (collapsed.includes(action.id)) {
      return [collapsedContainer(action)];
    }

    const nodes: WorkflowGraphNode[] = [];
    const boxes: Box[] = [
      { x: action.x ?? 0, y: action.y ?? 0, ...LAYOUT.node },
    ];

    branchesOf(action).forEach((branch, rowIndex) => {
      const label = branchLabelPosition(action, rowIndex);

      nodes.push({
        id: nodeId.branch(action.id, branch.ref),
        kind: "branch",
        displayName: branch.label,
        ...label,
        ...LAYOUT.branchLabel,
        branchKind: branch.ref.branch,
      });
      boxes.push({ ...label, ...LAYOUT.branchLabel });

      flattenActions(branch.actions, collapsed).forEach((child) => {
        boxes.push({ x: child.x ?? 0, y: child.y ?? 0, ...LAYOUT.node });
      });

      const lastAction = branch.actions.at(-1);
      const anchor = lastAction
        ? {
            x: (lastAction.x ?? 0) + subtreeWidth(lastAction),
            y: (lastAction.y ?? 0) + LAYOUT.node.height / 2,
          }
        : {
            x: label.x + LAYOUT.branchLabel.width,
            y: label.y + LAYOUT.branchLabel.height / 2,
          };

      const adder: WorkflowGraphNode = {
        id: nodeId.branchAdder(action.id, branch.ref),
        kind: "branch",
        displayName: "+",
        x: anchor.x + LAYOUT.branchGapX,
        y: anchor.y - LAYOUT.adderSize / 2,
        width: LAYOUT.adderSize,
        height: LAYOUT.adderSize,
        branchKind: "adder",
      };

      nodes.push(adder);
      boxes.push({
        x: adder.x,
        y: adder.y,
        width: LAYOUT.adderSize,
        height: LAYOUT.adderSize,
      });
    });

    // Nested containers are measured too, so their frame stays inside this one.
    const nested = buildBranchNodes(
      branchesOf(action).flatMap((branch) => branch.actions),
      collapsed,
    );

    for (const node of nested) {
      boxes.push({
        x: node.x,
        y: node.y,
        width: node.width ?? LAYOUT.node.width,
        height: node.height ?? LAYOUT.node.height,
      });
    }

    return [boundingContainer(action, boxes), ...nodes, ...nested];
  });
}

export function buildNodes(
  actions: ActionModel[],
  collapsed: string[],
  positions: NodePositions,
): WorkflowGraphNode[] {
  const startNode: WorkflowGraphNode = {
    id: START_NODE_ID,
    kind: "input",
    displayName: "Start",
    ...positions.start,
    meta: "trigger",
  };

  const outputNode: WorkflowGraphNode = {
    id: OUTPUT_NODE_ID,
    kind: "output",
    displayName: "Output",
    ...positions.output,
    meta: "result",
  };

  const processNodes = flattenActions(
    actions,
    collapsed,
  ).map<WorkflowGraphNode>((action, index) => ({
    id: action.id,
    kind: "process",
    displayName: action.displayName,
    x: action.x ?? LAYOUT.newActionGrid.originX,
    y: action.y ?? LAYOUT.newActionGrid.originY + index * LAYOUT.node.height,
    ...LAYOUT.node,
    actionKind: action.kind,
    collapsed: collapsed.includes(action.id),
    meta:
      action.variable ??
      action.path ??
      action.activityText ??
      action.questionText ??
      action.kind,
  }));

  return [
    startNode,
    ...processNodes,
    ...buildBranchNodes(actions, collapsed),
    outputNode,
  ];
}
