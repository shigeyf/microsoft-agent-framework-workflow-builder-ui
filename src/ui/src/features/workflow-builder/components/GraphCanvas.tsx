import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BaseEdge,
  ConnectionLineType,
  ControlButton,
  Controls,
  EdgeLabelRenderer,
  Handle,
  Position,
  ReactFlow,
  applyNodeChanges,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ActionKind, ActionModel, WorkflowConnection } from "../types";
import { OUTPUT_NODE_ID, START_NODE_ID, parseNodeId } from "../domain/nodeIds";
import { findAction } from "../domain/actionTree";
import type { WorkflowGraphNode } from "../WorkflowBuilder";

type WorkflowEdgeData = {
  kind?:
    | "sequential"
    | "branch-root"
    | "branch-continue"
    | "branch-end"
    | "flow-end";
  from?: string;
  to?: string;
  onRequestAdd?: (sourceId: string, anchor: { x: number; y: number }) => void;
};

type WorkflowEdge = Edge<WorkflowEdgeData>;

type GraphCanvasProps = {
  actions: ActionModel[];
  nodes: WorkflowGraphNode[];
  connections: WorkflowConnection[];
  selectedActionId: string;
  actionKindOptions: ActionKind[];
  onSelectAction: (id: string, anchor: { x: number; y: number }) => void;
  onUpdateAction: <K extends keyof ActionModel>(
    id: string,
    field: K,
    value: ActionModel[K],
  ) => void;
  onUpdateNodePosition: (id: string, x: number, y: number) => void;
  onAddActionFromConnector?: (
    sourceId: string,
    kind: ActionKind,
    mode?: "after" | "branch-append",
    anchor?: { x: number; y: number },
  ) => void;
  onMoveBranchContainer?: (
    actionId: string,
    deltaX: number,
    deltaY: number,
  ) => void;
  onToggleBranchCollapse?: (actionId: string) => void;
  onAddCondition?: (actionId: string) => void;
  onRemoveCondition?: (actionId: string, conditionIndex: number) => void;
  onSelectWorkflow: (anchor: { x: number; y: number }) => void;
  onAutoArrange: () => void;
};

type FlowNodeData = {
  kind: "input" | "process" | "output" | "branch";
  label: string;
  meta?: string;
  branchKind?: "container" | "then" | "else" | "loop" | "condition" | "adder";
  width?: number;
  height?: number;
  collapsed?: boolean;
  actionKind?: string;
  unreachable?: boolean;
  onAddToBranch?: (nodeId: string) => void;
  onToggleCollapse?: (nodeId: string) => void;
  onAddCondition?: (nodeId: string) => void;
  onRemoveCondition?: (nodeId: string) => void;
};

function FlowNodeCard({ id, data, selected }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const isBranchNode = nodeData.kind === "branch";
  const isIfContainer = nodeData.branchKind === "container";
  const isAdder = nodeData.branchKind === "adder";
  const isBranchSlot =
    nodeData.branchKind === "then" ||
    nodeData.branchKind === "else" ||
    nodeData.branchKind === "loop" ||
    nodeData.branchKind === "condition";

  if (isAdder) {
    return (
      <div
        className="flow-node adder-node"
        style={{ width: nodeData.width, height: nodeData.height }}
      >
        <Handle
          type="target"
          position={Position.Left}
          className="node-handle-target"
        />
        <button
          type="button"
          className="branch-add-button"
          title="Add action to this branch"
          onClick={(event) => {
            event.stopPropagation();
            nodeData.onAddToBranch?.(id);
          }}
        >
          +
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flow-node ${nodeData.kind}${selected ? " selected" : ""}${isBranchNode ? " branch-node" : ""}${isIfContainer ? " if-container" : ""}${isBranchSlot ? " branch-slot" : ""}${nodeData.unreachable ? " unreachable" : ""}`}
      style={
        isBranchNode
          ? {
              width: nodeData.width,
              height: nodeData.height,
              minHeight: nodeData.height,
              padding: isIfContainer ? "10px 14px" : "6px 10px",
            }
          : undefined
      }
    >
      <Handle
        type="target"
        position={Position.Left}
        className="node-handle-target"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="node-handle-source"
      />

      {isIfContainer ? (
        <div className="if-container-head">
          <span className="if-container-tag">{nodeData.label}</span>
          <button
            type="button"
            className="container-toggle-button"
            title={
              nodeData.collapsed ? "Expand container" : "Collapse container"
            }
            onClick={(event) => {
              event.stopPropagation();
              nodeData.onToggleCollapse?.(id);
            }}
          >
            {nodeData.collapsed ? "+" : "−"}
          </button>
        </div>
      ) : isBranchSlot ? (
        <div className="branch-slot-body">
          <strong>{nodeData.label}</strong>
          {nodeData.branchKind === "condition" ? (
            <button
              type="button"
              className="branch-remove-button"
              title="Remove this condition"
              onClick={(event) => {
                event.stopPropagation();
                nodeData.onRemoveCondition?.(id);
              }}
            >
              ×
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="branch-box-header">
            <span className="node-kind">{nodeData.kind}</span>
            <strong>{nodeData.label}</strong>
          </div>
          <span className="node-meta">{nodeData.meta ?? "flow step"}</span>
          {nodeData.unreachable ? (
            <span
              className="node-warning"
              title="手前の終端アクションで制御が移るため、このアクションは実行されません"
            >
              ⚠ 到達不能
            </span>
          ) : null}
          {nodeData.actionKind === "ConditionGroup" && !nodeData.collapsed ? (
            <button
              type="button"
              className="condition-add-button"
              title="Add condition"
              onClick={(event) => {
                event.stopPropagation();
                nodeData.onAddCondition?.(id);
              }}
            >
              + Condition
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

const nodeTypes = {
  flowNode: FlowNodeCard,
};

function WorkflowConnectorEdge(props: EdgeProps<Edge<WorkflowEdgeData>>) {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
  } = props;
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 24,
  });

  const isAddable =
    (data?.kind ?? "sequential") === "sequential" ||
    (data?.kind ?? "sequential") === "branch-continue";
  const isBranchRoot = (data?.kind ?? "sequential") === "branch-root";
  const isBranchEnd = (data?.kind ?? "sequential") === "branch-end";
  const isFlowEnd = (data?.kind ?? "sequential") === "flow-end";

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: isFlowEnd
            ? "#94a3b8"
            : isBranchRoot || isBranchEnd
              ? "#c084fc"
              : isAddable
                ? "#7dd3fc"
                : "#c084fc",
          strokeWidth: isBranchRoot || isBranchEnd || isFlowEnd ? 2 : 2.5,
          strokeDasharray: isBranchRoot
            ? "7 8"
            : isBranchEnd
              ? "4 6"
              : isFlowEnd
                ? "2 7"
                : "0",
        }}
      />

      {isAddable && data?.onRequestAdd && data.from ? (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              left: labelX,
              top: labelY,
              transform: "translate(-50%, -50%)",
              pointerEvents: "all",
            }}
          >
            <button
              type="button"
              className="edge-add-button"
              onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                data.onRequestAdd?.(data.from as string, {
                  x: labelX,
                  y: labelY,
                });
              }}
            >
              +
            </button>
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

const edgeTypes = {
  workflowEdge: WorkflowConnectorEdge,
};

export function GraphCanvas({
  actions,
  nodes,
  connections,
  selectedActionId,
  actionKindOptions,
  onSelectAction,
  onUpdateAction,
  onUpdateNodePosition,
  onAddActionFromConnector,
  onMoveBranchContainer,
  onToggleBranchCollapse,
  onAddCondition,
  onRemoveCondition,
  onSelectWorkflow,
  onAutoArrange,
}: GraphCanvasProps) {
  // State rather than a ref: ending a drag has to re-run the sync effect.
  const [dragging, setDragging] = useState(false);
  const canvasAreaRef = useRef<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = canvasAreaRef.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setCanvasSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Lower the zoom floor only as far as the current graph needs, so small graphs keep a readable scale.
  const minZoom = useMemo(() => {
    const DEFAULT_MIN_ZOOM = 0.5;

    if (
      nodes.length === 0 ||
      canvasSize.width === 0 ||
      canvasSize.height === 0
    ) {
      return DEFAULT_MIN_ZOOM;
    }

    const left = Math.min(...nodes.map((node) => node.x));
    const top = Math.min(...nodes.map((node) => node.y));
    const right = Math.max(
      ...nodes.map((node) => node.x + (node.width ?? 220)),
    );
    const bottom = Math.max(
      ...nodes.map((node) => node.y + (node.height ?? 110)),
    );
    const contentWidth = right - left;
    const contentHeight = bottom - top;

    if (contentWidth <= 0 || contentHeight <= 0) {
      return DEFAULT_MIN_ZOOM;
    }

    const required =
      Math.min(
        canvasSize.width / contentWidth,
        canvasSize.height / contentHeight,
      ) * 0.7;

    return Math.min(DEFAULT_MIN_ZOOM, Math.max(0.02, required));
  }, [canvasSize, nodes]);
  const containerDragStartRef = useRef<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [connectorPicker, setConnectorPicker] = useState<{
    sourceId: string;
    mode: "after" | "branch-append";
    x: number;
    y: number;
  } | null>(null);

  const clampPickerPosition = (x: number, y: number) => {
    const safeX = Math.min(Math.max(x, 110), 420);
    const safeY = Math.min(Math.max(y, 110), 420);
    return { x: safeX, y: safeY };
  };

  const handleAddToBranch = useCallback((id: string) => {
    setConnectorPicker({
      sourceId: id,
      mode: "branch-append",
      ...clampPickerPosition(180, 180),
    });
  }, []);

  const handleRequestAddAfter = useCallback(
    (id: string, anchor: { x: number; y: number }) => {
      setConnectorPicker({
        sourceId: id,
        mode: "after",
        ...clampPickerPosition(anchor.x, anchor.y),
      });
    },
    [],
  );

  const handleToggleCollapse = useCallback(
    (id: string) => {
      const parsed = parseNodeId(id);

      if (parsed.kind === "container") {
        onToggleBranchCollapse?.(parsed.actionId);
      }
    },
    [onToggleBranchCollapse],
  );

  const handleAddCondition = useCallback(
    (id: string) => {
      onAddCondition?.(id);
    },
    [onAddCondition],
  );

  const handleRemoveCondition = useCallback(
    (id: string) => {
      const parsed = parseNodeId(id);

      if (parsed.kind === "branch" && parsed.ref.branch === "condition") {
        onRemoveCondition?.(parsed.actionId, parsed.ref.index);
      }
    },
    [onRemoveCondition],
  );

  const toFlowNode = useCallback(
    (node: WorkflowGraphNode): Node<FlowNodeData> => ({
      id: node.id,
      type: "flowNode",
      position: { x: node.x, y: node.y },
      data: {
        kind: node.kind,
        label: node.displayName,
        meta: node.meta,
        branchKind: node.branchKind,
        unreachable: node.unreachable,
        width: node.width,
        height: node.height,
        collapsed: node.collapsed,
        actionKind: node.actionKind,
        onAddToBranch: handleAddToBranch,
        onToggleCollapse: handleToggleCollapse,
        onAddCondition: handleAddCondition,
        onRemoveCondition: handleRemoveCondition,
      },
      zIndex: node.branchKind === "container" ? 0 : 1,
      draggable: node.kind !== "branch" || node.branchKind === "container",
      selectable: node.kind !== "branch",
      connectable: node.kind !== "branch",
      selected: node.kind === "process" && node.id === selectedActionId,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }),
    [
      handleAddToBranch,
      handleToggleCollapse,
      handleAddCondition,
      handleRemoveCondition,
      selectedActionId,
    ],
  );

  const [reactFlowNodes, setReactFlowNodes] = useState<Node<FlowNodeData>[]>(
    () => nodes.map(toFlowNode),
  );

  useEffect(() => {
    if (dragging) {
      return;
    }

    setReactFlowNodes(nodes.map(toFlowNode));
  }, [dragging, nodes, toFlowNode]);

  const reactFlowEdges = useMemo<WorkflowEdge[]>(
    () =>
      connections.map((connection) => ({
        id: connection.id,
        source: connection.from,
        target: connection.to,
        type: "workflowEdge",
        data: {
          kind: connection.kind ?? "sequential",
          from: connection.from,
          to: connection.to,
          onRequestAdd: handleRequestAddAfter,
        },
        animated: false,
      })),
    [connections, handleRequestAddAfter],
  );

  useEffect(() => {
    if (!connectorPicker) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setConnectorPicker(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [connectorPicker]);

  const handleNodesChange = (changes: NodeChange[]) => {
    const positionChanges = changes.filter(
      (
        change,
      ): change is NodeChange & {
        id: string;
        position: { x: number; y: number };
      } =>
        change.type === "position" &&
        "id" in change &&
        "position" in change &&
        change.position != null,
    );

    if (positionChanges.length === 0) {
      setReactFlowNodes(
        (currentNodes) =>
          applyNodeChanges(
            changes,
            currentNodes,
          ) as unknown as Node<FlowNodeData>[],
      );
      return;
    }

    setReactFlowNodes(
      (currentNodes) =>
        applyNodeChanges(
          changes,
          currentNodes,
        ) as unknown as Node<FlowNodeData>[],
    );

    for (const change of positionChanges) {
      const parsed = parseNodeId(change.id);

      if (parsed.kind === "container") {
        continue;
      }

      if (parsed.kind === "start" || parsed.kind === "output") {
        onUpdateNodePosition(change.id, change.position.x, change.position.y);
        continue;
      }

      if (findAction(actions, change.id)) {
        onUpdateAction(change.id, "x", change.position.x);
        onUpdateAction(change.id, "y", change.position.y);
      }
    }
  };

  return (
    <section className="panel graph-panel">
      <div className="section-block canvas-header">
        <h2>Workflow canvas</h2>
      </div>

      <div className="canvas-area" ref={canvasAreaRef}>
        <ReactFlow
          nodes={reactFlowNodes}
          edges={reactFlowEdges}
          onNodesChange={handleNodesChange}
          onNodeDragStart={(_, node) => {
            setDragging(true);

            if (parseNodeId(node.id).kind === "container") {
              containerDragStartRef.current = {
                id: node.id,
                x: node.position.x,
                y: node.position.y,
              };
            }
          }}
          onNodeDragStop={(_, node) => {
            setDragging(false);

            const start = containerDragStartRef.current;
            containerDragStartRef.current = null;
            const parsed = parseNodeId(node.id);

            if (start?.id === node.id && parsed.kind === "container") {
              const deltaX = node.position.x - start.x;
              const deltaY = node.position.y - start.y;

              if (deltaX !== 0 || deltaY !== 0) {
                onMoveBranchContainer?.(parsed.actionId, deltaX, deltaY);
              }
            }
          }}
          onPaneClick={() => setConnectorPicker(null)}
          onMoveStart={() => setConnectorPicker(null)}
          onNodeClick={(event, node) => {
            setConnectorPicker(null);

            if (node.type !== "flowNode") {
              return;
            }

            const bounds = canvasAreaRef.current?.getBoundingClientRect();
            const anchor = {
              x: bounds ? event.clientX - bounds.left : 0,
              y: bounds ? event.clientY - bounds.top : 0,
            };

            if (node.id === START_NODE_ID || node.id === OUTPUT_NODE_ID) {
              onSelectWorkflow(anchor);
              return;
            }

            onSelectAction(node.id, anchor);
          }}
          fitView
          fitViewOptions={{ padding: 0.25, minZoom }}
          minZoom={minZoom}
          defaultEdgeOptions={{
            type: "smoothstep",
            animated: false,
          }}
          connectionLineType={ConnectionLineType.SmoothStep}
          nodesDraggable
          nodesConnectable
          elementsSelectable
          proOptions={{ hideAttribution: true }}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          className="workflow-react-flow"
          style={{ width: "100%", height: "100%" }}
        >
          <Background color="#334155" gap={24} size={1} />
          <Controls position="bottom-right">
            <ControlButton onClick={onAutoArrange} title="Auto arrange">
              <svg viewBox="0 0 16 16" aria-label="Auto arrange">
                <rect x="1" y="6" width="4" height="4" rx="1" />
                <rect x="11" y="1" width="4" height="4" rx="1" />
                <rect x="11" y="11" width="4" height="4" rx="1" />
                <path
                  d="M5 8h3v-5h3M8 8h3v5h0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
              </svg>
            </ControlButton>
          </Controls>
        </ReactFlow>

        {connectorPicker ? (
          <div
            className="edge-action-picker"
            style={{
              position: "absolute",
              left: connectorPicker.x,
              top: connectorPicker.y,
              transform: "translate(-50%, -20%)",
              maxWidth: "calc(100% - 24px)",
            }}
          >
            <label>
              <span>Add action</span>
              <select
                value=""
                onChange={(event) => {
                  const nextKind = event.target.value as ActionKind;
                  if (!nextKind) {
                    return;
                  }

                  onAddActionFromConnector?.(
                    connectorPicker.sourceId,
                    nextKind,
                    connectorPicker.mode,
                    {
                      x: connectorPicker.x,
                      y: connectorPicker.y,
                    },
                  );
                  setConnectorPicker(null);
                }}
              >
                <option value="">Select...</option>
                {actionKindOptions.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="picker-cancel-button"
              onClick={() => setConnectorPicker(null)}
            >
              Cancel
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
