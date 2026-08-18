import { actionKindOptions } from "../types";
import type { ActionKind, WorkflowStyle } from "../types";

/**
 * Action kinds that exist in only one of the two runtimes.
 * `SetValue` is the Python spelling of `SetVariable`; the C# object model has no
 * such kind, so a C# workflow must use `SetVariable` with `variable` instead.
 */
const PYTHON_ONLY: ActionKind[] = ["SetValue"];

export function kindsForStyle(style: WorkflowStyle): ActionKind[] {
  return style === "python"
    ? actionKindOptions
    : actionKindOptions.filter((kind) => !PYTHON_ONLY.includes(kind));
}

export function isKindAvailable(
  kind: ActionKind,
  style: WorkflowStyle,
): boolean {
  return kindsForStyle(style).includes(kind);
}

/**
 * The two styles are not interchangeable: the document shape, the variable
 * namespaces (`Workflow.Inputs`/`Workflow.Outputs` are Python only) and part of
 * the action vocabulary all differ, so an existing workflow keeps its style.
 */
export function canChangeStyle(actionCount: number, inputCount: number) {
  return actionCount === 0 && inputCount === 0;
}
