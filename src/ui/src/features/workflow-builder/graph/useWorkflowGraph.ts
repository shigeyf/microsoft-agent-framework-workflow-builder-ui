import { useMemo } from "react";
import type { ActionModel } from "../types";
import { buildEdges } from "./buildEdges";
import { buildNodes, type NodePositions } from "./buildNodes";

export function useWorkflowGraph(
  actions: ActionModel[],
  collapsed: string[],
  positions: NodePositions,
) {
  const nodes = useMemo(
    () => buildNodes(actions, collapsed, positions),
    [actions, collapsed, positions],
  );

  const edges = useMemo(
    () => buildEdges(actions, collapsed),
    [actions, collapsed],
  );

  return { nodes, edges };
}
