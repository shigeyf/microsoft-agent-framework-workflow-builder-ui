import type { ActionModel } from "../types";
import { branchesOf, isTerminatorAction } from "./branches";
import { flattenActions } from "./actionTree";

/**
 * Ids of actions the runtime can never reach because a terminator earlier in the
 * same list transfers control elsewhere. They are not a load error; the runtime
 * simply skips them.
 */
export function unreachableActionIds(actions: ActionModel[]): Set<string> {
  const unreachable = new Set<string>();

  const walk = (list: ActionModel[], blocked: boolean) => {
    let stopped = blocked;

    for (const action of list) {
      if (stopped) {
        for (const nested of flattenActions([action])) {
          unreachable.add(nested.id);
        }
      }

      for (const branch of branchesOf(action)) {
        walk(branch.actions, stopped);
      }

      if (isTerminatorAction(action)) {
        stopped = true;
      }
    }
  };

  walk(actions, false);
  return unreachable;
}
