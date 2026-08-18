import type { ActionModel } from "../types";
import type { BranchRef } from "./nodeIds";

/**
 * Every recursion over then / else / conditions / loop body lives here.
 * Other modules compose these helpers instead of walking the tree themselves.
 */
function mapBranchLists(
  action: ActionModel,
  fn: (list: ActionModel[]) => ActionModel[],
): ActionModel {
  return {
    ...action,
    then: action.then ? fn(action.then) : action.then,
    else: action.else ? fn(action.else) : action.else,
    body: action.body ? fn(action.body) : action.body,
    conditions: action.conditions
      ? action.conditions.map((condition) => ({
          ...condition,
          actions: fn(condition.actions),
        }))
      : action.conditions,
  };
}

export function childrenOf(action: ActionModel): ActionModel[] {
  return [
    ...(action.then ?? []),
    ...(action.else ?? []),
    ...(action.body ?? []),
    ...(action.conditions?.flatMap((condition) => condition.actions) ?? []),
  ];
}

export function findAction(
  actions: ActionModel[],
  id: string,
): ActionModel | null {
  for (const action of actions) {
    if (action.id === id) {
      return action;
    }

    const found = findAction(childrenOf(action), id);
    if (found) {
      return found;
    }
  }

  return null;
}

/** Depth-first list of actions; `skipChildrenOf` hides the subtree of collapsed containers. */
export function flattenActions(
  actions: ActionModel[],
  skipChildrenOf: string[] = [],
): ActionModel[] {
  return actions.flatMap((action) => [
    action,
    ...(skipChildrenOf.includes(action.id)
      ? []
      : flattenActions(childrenOf(action), skipChildrenOf)),
  ]);
}

export function updateAction(
  actions: ActionModel[],
  id: string,
  patch: Partial<ActionModel> | ((action: ActionModel) => ActionModel),
): ActionModel[] {
  return actions.map((action) => {
    if (action.id === id) {
      return typeof patch === "function"
        ? patch(action)
        : { ...action, ...patch };
    }

    return mapBranchLists(action, (list) => updateAction(list, id, patch));
  });
}

export function removeAction(
  actions: ActionModel[],
  id: string,
): ActionModel[] {
  return actions
    .filter((action) => action.id !== id)
    .map((action) => mapBranchLists(action, (list) => removeAction(list, id)));
}

export function insertAfter(
  actions: ActionModel[],
  targetId: string,
  newAction: ActionModel,
): ActionModel[] {
  return actions.flatMap((action) => {
    if (action.id === targetId) {
      return [action, newAction];
    }

    return [
      mapBranchLists(action, (list) => insertAfter(list, targetId, newAction)),
    ];
  });
}

export function insertIntoBranch(
  actions: ActionModel[],
  parentId: string,
  ref: BranchRef,
  newAction: ActionModel,
  position: "head" | "tail",
): ActionModel[] {
  const place = (list: ActionModel[]) =>
    position === "head" ? [newAction, ...list] : [...list, newAction];

  return updateAction(actions, parentId, (action) => {
    if (ref.branch === "condition") {
      return {
        ...action,
        conditions: (action.conditions ?? []).map((condition, index) =>
          index === ref.index
            ? { ...condition, actions: place(condition.actions) }
            : condition,
        ),
      };
    }

    if (ref.branch === "loop") {
      return { ...action, body: place(action.body ?? []) };
    }

    return { ...action, [ref.branch]: place(action[ref.branch] ?? []) };
  });
}

/** Moves an action and everything nested inside it by the given delta. */
export function translateSubtree(
  actions: ActionModel[],
  id: string,
  deltaX: number,
  deltaY: number,
): ActionModel[] {
  const shift = (list: ActionModel[]): ActionModel[] =>
    list.map((item) =>
      mapBranchLists(
        {
          ...item,
          x: (item.x ?? 0) + deltaX,
          y: (item.y ?? 0) + deltaY,
        },
        shift,
      ),
    );

  return updateAction(actions, id, (action) => shift([action])[0]);
}
