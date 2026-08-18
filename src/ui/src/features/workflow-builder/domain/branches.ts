import type { ActionModel } from "../types";
import type { BranchRef } from "./nodeIds";

export type BranchDef = {
  ref: BranchRef;
  label: string;
  actions: ActionModel[];
};

export function isBranchAction(action: ActionModel): boolean {
  return (
    action.kind === "If" ||
    action.kind === "ConditionGroup" ||
    action.kind === "Foreach"
  );
}

/**
 * Kinds that transfer control elsewhere, so the runtime never falls through to
 * the next action in the list. Mirrors TERMINATOR_ACTIONS in the Python builder
 * and the RestartAfter calls in the C# visitor.
 */
const TERMINATOR_KINDS = new Set([
  "GotoAction",
  "BreakLoop",
  "ContinueLoop",
  "EndWorkflow",
  "EndDialog",
  "EndConversation",
  "CancelDialog",
  "CancelAllDialogs",
]);

/** Terminators that finish the run rather than jumping somewhere else. */
const ENDING_KINDS = new Set([
  "EndWorkflow",
  "EndDialog",
  "EndConversation",
  "CancelDialog",
  "CancelAllDialogs",
]);

export function isTerminatorAction(action: ActionModel): boolean {
  return TERMINATOR_KINDS.has(action.kind);
}

export function endsWorkflow(action: ActionModel): boolean {
  return ENDING_KINDS.has(action.kind);
}

/** Branch order shown on the canvas; also drives edge building and insertion. */
export function branchesOf(action: ActionModel): BranchDef[] {
  if (action.kind === "If") {
    return [
      { ref: { branch: "then" }, label: "Then", actions: action.then ?? [] },
      { ref: { branch: "else" }, label: "Else", actions: action.else ?? [] },
    ];
  }

  if (action.kind === "Foreach") {
    return [
      { ref: { branch: "loop" }, label: "Each", actions: action.body ?? [] },
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

  if (ref.branch === "loop") {
    return action.body ?? [];
  }

  return action.conditions?.[ref.index]?.actions ?? [];
}
