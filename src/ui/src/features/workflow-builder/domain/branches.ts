import type { ActionModel } from "../types";
import type { BranchRef } from "./nodeIds";

export type BranchDef = {
  ref: BranchRef;
  label: string;
  actions: ActionModel[];
};

export function isBranchAction(action: ActionModel): boolean {
  return action.kind === "If" || action.kind === "ConditionGroup";
}

/** Branch order shown on the canvas; also drives edge building and insertion. */
export function branchesOf(action: ActionModel): BranchDef[] {
  if (action.kind === "If") {
    return [
      { ref: { branch: "then" }, label: "Then", actions: action.then ?? [] },
      { ref: { branch: "else" }, label: "Else", actions: action.else ?? [] },
    ];
  }

  if (action.kind === "ConditionGroup") {
    const conditions = (action.conditions ?? []).map<BranchDef>(
      (condition, index) => ({
        ref: { branch: "condition", index },
        label: `Condition ${index + 1}`,
        actions: condition.actions,
      }),
    );

    return [
      ...conditions,
      { ref: { branch: "else" }, label: "Else", actions: action.else ?? [] },
    ];
  }

  return [];
}

/** Row index of a branch, used to place its label and actions. */
export function branchRowIndex(action: ActionModel, ref: BranchRef): number {
  return branchesOf(action).findIndex((branch) =>
    branch.ref.branch === "condition" && ref.branch === "condition"
      ? branch.ref.index === ref.index
      : branch.ref.branch === ref.branch,
  );
}

export function branchActionsOf(
  action: ActionModel,
  ref: BranchRef,
): ActionModel[] {
  if (ref.branch === "then") {
    return action.then ?? [];
  }

  if (ref.branch === "else") {
    return action.else ?? [];
  }

  return action.conditions?.[ref.index]?.actions ?? [];
}
