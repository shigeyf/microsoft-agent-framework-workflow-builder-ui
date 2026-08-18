import type { ActionModel } from "../types";
import { branchesOf, isBranchAction } from "../domain/branches";
import { branchLabelPosition } from "./buildNodes";
import { LAYOUT } from "./layout";

export type AutoLayoutResult = {
  actions: ActionModel[];
  /** Right edge of the laid out content, used to park the Output node after it. */
  right: number;
};

/**
 * Imported YAML carries no coordinates, so every action is placed here:
 * sequences run left to right and each branch row is laid out inside its container.
 */
export function autoLayout(actions: ActionModel[]): AutoLayoutResult {
  const positioned = structuredClone(actions);
  const left = LAYOUT.startPosition.x + LAYOUT.node.width + LAYOUT.branchGapX;
  const width = layoutSequence(positioned, left, LAYOUT.startPosition.y);

  return { actions: positioned, right: left + width };
}

/** Places a chain of actions and returns the horizontal space it consumed. */
function layoutSequence(actions: ActionModel[], x: number, y: number): number {
  let cursor = x;

  for (const action of actions) {
    action.x = cursor;
    action.y = y;
    cursor += layoutAction(action) + LAYOUT.branchGapX;
  }

  return actions.length === 0 ? 0 : cursor - x - LAYOUT.branchGapX;
}

/** Places the branches of one action and returns its own width. */
function layoutAction(action: ActionModel): number {
  if (!isBranchAction(action)) {
    return LAYOUT.node.width;
  }

  const labelRight = LAYOUT.branchLabelOffsetX + LAYOUT.branchLabel.width;
  let widest = labelRight;

  branchesOf(action).forEach((branch, rowIndex) => {
    const label = branchLabelPosition(action, rowIndex);
    const rowX = label.x + LAYOUT.branchLabel.width + LAYOUT.branchGapX;
    const rowY = label.y - (LAYOUT.node.height - LAYOUT.branchLabel.height) / 2;
    const width = layoutSequence(branch.actions, rowX, rowY);
    const right = rowX - (action.x ?? 0) + width;

    widest = Math.max(widest, right);
  });

  // Leave room for the trailing "+" button that ends every branch row.
  return widest + LAYOUT.branchGapX + LAYOUT.adderSize;
}
