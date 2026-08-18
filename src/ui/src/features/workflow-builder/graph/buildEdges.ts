import type { ActionModel, WorkflowConnection } from "../types";
import {
  branchesOf,
  endsWorkflow,
  isBranchAction,
  isTerminatorAction,
} from "../domain/branches";
import { OUTPUT_NODE_ID, START_NODE_ID, nodeId } from "../domain/nodeIds";
import { unreachableActionIds } from "../domain/reachability";

type EdgeKind = NonNullable<WorkflowConnection["kind"]>;

/** Branch actions connect to the rest of the flow through their container box. */
function externalIdOf(action: ActionModel): string {
  return isBranchAction(action) ? nodeId.container(action.id) : action.id;
}

export function buildEdges(
  actions: ActionModel[],
  collapsed: string[],
): WorkflowConnection[] {
  const edges: WorkflowConnection[] = [];

  const connect = (from: string, to: string, kind: EdgeKind = "sequential") => {
    if (edges.some((edge) => edge.from === from && edge.to === to)) {
      return;
    }

    edges.push({ id: `${from}-${to}`, from, to, kind });
  };

  const connectChain = (list: ActionModel[], kind: EdgeKind) => {
    for (let index = 0; index < list.length - 1; index += 1) {
      if (isTerminatorAction(list[index])) {
        continue;
      }

      connect(externalIdOf(list[index]), externalIdOf(list[index + 1]), kind);
    }

    for (const action of list) {
      if (collapsed.includes(action.id)) {
        continue;
      }

      for (const branch of branchesOf(action)) {
        const branchId = nodeId.branch(action.id, branch.ref);
        const adderId = nodeId.branchAdder(action.id, branch.ref);

        connect(action.id, branchId, "branch-root");

        if (branch.actions.length === 0) {
          connect(branchId, adderId, "branch-end");
          continue;
        }

        connect(branchId, externalIdOf(branch.actions[0]), "branch-continue");
        connectChain(branch.actions, "branch-continue");
        connect(
          externalIdOf(branch.actions[branch.actions.length - 1]),
          adderId,
          "branch-end",
        );
      }
    }
  };

  if (actions.length === 0) {
    connect(START_NODE_ID, OUTPUT_NODE_ID);
    return edges;
  }

  connect(START_NODE_ID, externalIdOf(actions[0]));
  connectChain(actions, "sequential");

  // A top level action that finishes the run reaches the output without falling through.
  for (const action of actions) {
    if (endsWorkflow(action)) {
      connect(action.id, OUTPUT_NODE_ID, "flow-end");
    }
  }

  const last = actions[actions.length - 1];
  if (
    !isTerminatorAction(last) &&
    !unreachableActionIds(actions).has(last.id)
  ) {
    connect(externalIdOf(last), OUTPUT_NODE_ID);
  }

  return edges;
}
