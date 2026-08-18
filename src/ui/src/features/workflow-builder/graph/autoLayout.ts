import type { ActionModel } from "../types";
import { branchesOf, isBranchAction } from "../domain/branches";
import { branchLabelPosition, subtreeWidth } from "./buildNodes";
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
    layoutBranches(action);
    cursor += subtreeWidth(action) + LAYOUT.branchGapX;
  }

  return actions.length === 0 ? 0 : cursor - x - LAYOUT.branchGapX;
}

/** Places the rows of a branch action; the action itself is already positioned. */
function layoutBranches(action: ActionModel): void {
  if (!isBranchAction(action)) {
    return;
  }

  branchesOf(action).forEach((branch, rowIndex) => {
    const label = branchLabelPosition(action, rowIndex);

    layoutSequence(
      branch.actions,
      label.x + LAYOUT.branchLabel.width + LAYOUT.branchGapX,
      label.y - (LAYOUT.node.height - LAYOUT.branchLabel.height) / 2,
    );
  });
}
