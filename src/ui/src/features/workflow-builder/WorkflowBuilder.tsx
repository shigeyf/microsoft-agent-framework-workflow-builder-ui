import { useMemo, useState } from "react";
import { GraphCanvas } from "./components/GraphCanvas";
import { InspectorPanel } from "./components/InspectorPanel";
import { WorkflowHeader } from "./components/WorkflowHeader";
import { YamlPreview } from "./components/YamlPreview";
import { createAction, defaultActions, defaultInputs } from "./data";
import {
  findAction,
  flattenActions,
  insertAfter,
  insertIntoBranch,
  removeAction as removeActionFromTree,
  translateSubtree,
  updateAction as updateActionInTree,
} from "./domain/actionTree";
import {
  branchActionsOf,
  branchRowIndex,
  branchesOf,
  isBranchAction,
  type BranchDef,
} from "./domain/branches";
import {
  START_NODE_ID,
  nodeId,
  parseNodeId,
  type BranchRef,
} from "./domain/nodeIds";
import type {
  ActionKind,
  ActionModel,
  InputParam,
  WorkflowConnection,
  WorkflowStyle,
} from "./types";

export type WorkflowGraphNode = {
  id: string;
  kind: "input" | "process" | "output" | "branch";
  displayName: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  meta?: string;
  branchKind?: "if" | "then" | "else" | "condition" | "adder";
  collapsed?: boolean;
  actionKind?: ActionKind;
};

const PROCESS_NODE_WIDTH = 220;
const PROCESS_NODE_HEIGHT = 110;
const BRANCH_LABEL_WIDTH = 150;
const BRANCH_LABEL_HEIGHT = 48;
const BRANCH_ADDER_SIZE = 34;
const BRANCH_GAP_X = 60;
const CONTAINER_PADDING = 28;
const CONTAINER_HEADER = 30;

/** External graph endpoint: branch actions connect through their container box. */
function externalIdOf(action: ActionModel): string {
  return isBranchAction(action) ? nodeId.container(action.id) : action.id;
}

function branchLabelPosition(
  action: ActionModel,
  index: number,
): { x: number; y: number } {
  return {
    x: (action.x ?? 0) + 270,
    y: (action.y ?? 0) + index * (BRANCH_LABEL_HEIGHT + 92),
  };
}

function collectBranchContainers(
  actions: ActionModel[],
  collapsed: string[] = [],
): WorkflowGraphNode[] {
  return actions.flatMap((action) => {
    if (!isBranchAction(action)) {
      return [];
    }

    const containers: WorkflowGraphNode[] = [];
    const branches = branchesOf(action);
    const containerLabel = action.kind === "If" ? "IF" : "CONDITIONGROUP";

    if (collapsed.includes(action.id)) {
      return [
        {
          id: nodeId.container(action.id),
          kind: "branch" as const,
          displayName: containerLabel,
          x: (action.x ?? 0) - CONTAINER_PADDING,
          y: (action.y ?? 0) - CONTAINER_PADDING - CONTAINER_HEADER,
          width: PROCESS_NODE_WIDTH + CONTAINER_PADDING * 2,
          height:
            PROCESS_NODE_HEIGHT + CONTAINER_PADDING * 2 + CONTAINER_HEADER,
          branchKind: "if" as const,
          collapsed: true,
        },
      ];
    }

    const boxes: { x: number; y: number; width: number; height: number }[] = [
      {
        x: action.x ?? 0,
        y: action.y ?? 0,
        width: PROCESS_NODE_WIDTH,
        height: PROCESS_NODE_HEIGHT,
      },
    ];

    branches.forEach((branch, index) => {
      const position = branchLabelPosition(action, index);

      containers.push({
        id: nodeId.branch(action.id, branch.ref),
        kind: "branch",
        displayName: branch.label,
        x: position.x,
        y: position.y,
        width: BRANCH_LABEL_WIDTH,
        height: BRANCH_LABEL_HEIGHT,
        branchKind: branch.ref.branch,
      });

      boxes.push({
        x: position.x,
        y: position.y,
        width: BRANCH_LABEL_WIDTH,
        height: BRANCH_LABEL_HEIGHT,
      });

      flattenActions(branch.actions, collapsed).forEach((child) => {
        boxes.push({
          x: child.x ?? 0,
          y: child.y ?? 0,
          width: PROCESS_NODE_WIDTH,
          height: PROCESS_NODE_HEIGHT,
        });
      });

      const lastAction = branch.actions[branch.actions.length - 1];
      const adderAnchor = lastAction
        ? {
            x: (lastAction.x ?? 0) + PROCESS_NODE_WIDTH,
            y: (lastAction.y ?? 0) + PROCESS_NODE_HEIGHT / 2,
          }
        : {
            x: position.x + BRANCH_LABEL_WIDTH,
            y: position.y + BRANCH_LABEL_HEIGHT / 2,
          };

      const adderNode = {
        id: nodeId.branchAdder(action.id, branch.ref),
        kind: "branch" as const,
        displayName: "+",
        x: adderAnchor.x + BRANCH_GAP_X,
        y: adderAnchor.y - BRANCH_ADDER_SIZE / 2,
        width: BRANCH_ADDER_SIZE,
        height: BRANCH_ADDER_SIZE,
        branchKind: "adder" as const,
      };

      containers.push(adderNode);
      boxes.push({
        x: adderNode.x,
        y: adderNode.y,
        width: BRANCH_ADDER_SIZE,
        height: BRANCH_ADDER_SIZE,
      });
    });

    const minX = Math.min(...boxes.map((box) => box.x));
    const minY = Math.min(...boxes.map((box) => box.y));
    const maxX = Math.max(...boxes.map((box) => box.x + box.width));
    const maxY = Math.max(...boxes.map((box) => box.y + box.height));

    containers.unshift({
      id: nodeId.container(action.id),
      kind: "branch",
      displayName: containerLabel,
      x: minX - CONTAINER_PADDING,
      y: minY - CONTAINER_PADDING - CONTAINER_HEADER,
      width: maxX - minX + CONTAINER_PADDING * 2,
      height: maxY - minY + CONTAINER_PADDING * 2 + CONTAINER_HEADER,
      branchKind: "if",
      collapsed: false,
    });

    return [
      ...containers,
      ...collectBranchContainers(action.then ?? [], collapsed),
      ...collectBranchContainers(action.else ?? [], collapsed),
      ...(action.conditions?.flatMap((condition) =>
        collectBranchContainers(condition.actions, collapsed),
      ) ?? []),
    ];
  });
}

import { buildYaml } from "./utils/yaml";
import { actionKindOptions } from "./types";

export function WorkflowBuilder() {
  const [style, setStyle] = useState<WorkflowStyle>("python");
  const [name, setName] = useState("greeting-workflow");
  const [description, setDescription] = useState(
    "A simple workflow that greets the user",
  );
  const [triggerKind, setTriggerKind] = useState("OnConversationStart");
  const [inputs, setInputs] = useState<InputParam[]>(defaultInputs);
  const [actions, setActions] = useState<ActionModel[]>(defaultActions);
  const [collapsedActionIds, setCollapsedActionIds] = useState<string[]>([]);
  const [selectedActionId, setSelectedActionId] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorAnchor, setInspectorAnchor] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [yamlCollapsed, setYamlCollapsed] = useState(false);
  const [nodePositions, setNodePositions] = useState<
    Record<string, { x: number; y: number }>
  >({
    "workflow:start": { x: 40, y: 180 },
    "workflow:output": { x: 1420, y: 180 },
  });

  const updateNodePosition = (id: string, x: number, y: number) => {
    setNodePositions((previous) => ({
      ...previous,
      [id]: { x, y },
    }));
  };

  const workflowNodes = useMemo<WorkflowGraphNode[]>(() => {
    const startNode = {
      id: "workflow:start",
      kind: "input" as const,
      displayName: "Start",
      x: nodePositions["workflow:start"]?.x ?? 40,
      y: nodePositions["workflow:start"]?.y ?? 180,
      meta: "trigger",
    };

    const visibleActions = flattenActions(actions, collapsedActionIds);
    const processNodes = visibleActions.map((action, index) => ({
      id: action.id,
      kind: "process" as const,
      displayName: action.displayName,
      x: action.x ?? nodePositions[action.id]?.x ?? 560,
      y: action.y ?? nodePositions[action.id]?.y ?? 80 + index * 180,
      width: PROCESS_NODE_WIDTH,
      height: PROCESS_NODE_HEIGHT,
      actionKind: action.kind,
      collapsed: collapsedActionIds.includes(action.id),
      meta:
        action.variable ??
        action.path ??
        action.activityText ??
        action.questionText ??
        action.kind,
    }));

    const branchContainerNodes = collectBranchContainers(
      actions,
      collapsedActionIds,
    );

    const mappedBranchNodes = branchContainerNodes.map((node) => ({
      ...node,
      x: node.x ?? 560,
      y: node.y ?? 80,
    }));

    const outputNode = {
      id: "workflow:output",
      kind: "output" as const,
      displayName: "Output",
      x: nodePositions["workflow:output"]?.x ?? 980,
      y: nodePositions["workflow:output"]?.y ?? 180,
      meta: "result",
    };

    if (processNodes.length === 0 && branchContainerNodes.length === 0) {
      return [startNode, outputNode];
    }

    return [startNode, ...processNodes, ...mappedBranchNodes, outputNode];
  }, [actions, collapsedActionIds, nodePositions]);

  const workflowConnections = useMemo<WorkflowConnection[]>(() => {
    const nextConnections: WorkflowConnection[] = [];

    const addConnection = (
      from: string,
      to: string,
      kind:
        | "sequential"
        | "branch-root"
        | "branch-continue"
        | "branch-end" = "sequential",
    ) => {
      const connectionId = `${from}-${to}`;

      if (
        nextConnections.some(
          (connection) => connection.from === from && connection.to === to,
        )
      ) {
        return;
      }

      nextConnections.push({ id: connectionId, from, to, kind });
    };

    const connectBranch = (action: ActionModel, branch: BranchDef) => {
      const branchBoxId = nodeId.branch(action.id, branch.ref);
      const adderId = nodeId.branchAdder(action.id, branch.ref);
      addConnection(action.id, branchBoxId, "branch-root");

      if (branch.actions.length === 0) {
        addConnection(branchBoxId, adderId, "branch-end");
        return;
      }

      addConnection(
        branchBoxId,
        externalIdOf(branch.actions[0]),
        "branch-continue",
      );
      connectActionList(branch.actions, "branch-continue");
      addConnection(
        externalIdOf(branch.actions[branch.actions.length - 1]),
        adderId,
        "branch-end",
      );
    };

    const connectActionList = (
      list: ActionModel[],
      edgeKind: "sequential" | "branch-continue" = "sequential",
    ) => {
      for (let index = 0; index < list.length - 1; index += 1) {
        addConnection(
          externalIdOf(list[index]),
          externalIdOf(list[index + 1]),
          edgeKind,
        );
      }

      for (const action of list) {
        if (collapsedActionIds.includes(action.id)) {
          continue;
        }

        for (const branch of branchesOf(action)) {
          connectBranch(action, branch);
        }
      }
    };

    if (actions.length === 0) {
      addConnection("workflow:start", "workflow:output", "sequential");
      return nextConnections;
    }

    addConnection("workflow:start", externalIdOf(actions[0]), "sequential");
    connectActionList(actions);
    addConnection(
      externalIdOf(actions[actions.length - 1]),
      "workflow:output",
      "sequential",
    );

    return nextConnections;
  }, [actions, collapsedActionIds]);

  const moveBranchContainer = (
    actionId: string,
    deltaX: number,
    deltaY: number,
  ) => {
    setActions((previous) =>
      translateSubtree(previous, actionId, deltaX, deltaY),
    );
  };

  const toggleBranchCollapse = (actionId: string) => {
    setCollapsedActionIds((previous) =>
      previous.includes(actionId)
        ? previous.filter((id) => id !== actionId)
        : [...previous, actionId],
    );
  };

  const removeCondition = (actionId: string, conditionIndex: number) => {
    setActions((previous) =>
      updateActionInTree(previous, actionId, (action) => ({
        ...action,
        conditions: (action.conditions ?? []).filter(
          (_, index) => index !== conditionIndex,
        ),
      })),
    );
  };

  const yaml = useMemo(
    () => buildYaml(style, name, description, triggerKind, inputs, actions),
    [style, name, description, triggerKind, inputs, actions],
  );

  const updateInput = (
    index: number,
    field: "name" | "type" | "description",
    value: string,
  ) => {
    setInputs((previous) =>
      previous.map((input, currentIndex) => {
        if (currentIndex !== index) {
          return input;
        }

        return {
          ...input,
          [field]: field === "type" ? (value as InputParam["type"]) : value,
        } as InputParam;
      }),
    );
  };

  const updateAction = <K extends keyof ActionModel>(
    id: string,
    field: K,
    value: ActionModel[K],
  ) => {
    setActions((previous) =>
      updateActionInTree(previous, id, { [field]: value }),
    );
  };

  const addInput = () => {
    const nextInput: InputParam = {
      name: `param${inputs.length + 1}`,
      type: "string",
      description: "New parameter",
    };

    setInputs((previous) => [...previous, nextInput]);
  };

  const removeInput = (index: number) => {
    setInputs((previous) =>
      previous.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const selectAction = (id: string, anchor?: { x: number; y: number }) => {
    setSelectedNodeId(id);
    setSelectedActionId(id);
    setInspectorOpen(true);

    if (anchor) {
      setInspectorAnchor(anchor);
      return;
    }

    // Offset so a newly created action's overlay doesn't sit exactly on the one it was created from.
    setInspectorAnchor((previous) => {
      if (!previous) {
        return previous;
      }

      return {
        x: previous.x > 420 ? 40 : previous.x + 34,
        y: previous.y > 320 ? 40 : previous.y + 34,
      };
    });
  };

  const addAction = (
    kind: ActionKind,
    destination?: {
      parentId?: string;
      branch?: "then" | "else";
      conditionIndex?: number;
      insertAfterId?: string;
      insertAtHead?: boolean;
    },
    anchor?: { x: number; y: number },
  ) => {
    const newAction = createAction(kind);
    const nextIndex = actions.length;
    const nextAction = {
      ...newAction,
      x: 40 + (nextIndex % 3) * 260,
      y: 70 + Math.floor(nextIndex / 3) * 170,
    };

    const parent = destination?.parentId
      ? findAction(actions, destination.parentId)
      : null;
    const branchRef: BranchRef | null =
      destination?.conditionIndex !== undefined
        ? { branch: "condition", index: destination.conditionIndex }
        : destination?.branch
          ? { branch: destination.branch }
          : null;

    if (parent && isBranchAction(parent) && branchRef) {
      const position = destination?.insertAtHead ? "head" : "tail";
      const slotIndex =
        position === "head" ? 0 : branchActionsOf(parent, branchRef).length;
      const labelPosition = branchLabelPosition(
        parent,
        branchRowIndex(parent, branchRef),
      );
      const branchAction = {
        ...nextAction,
        x:
          labelPosition.x +
          BRANCH_LABEL_WIDTH +
          BRANCH_GAP_X +
          slotIndex * (PROCESS_NODE_WIDTH + BRANCH_GAP_X),
        y: labelPosition.y - (PROCESS_NODE_HEIGHT - BRANCH_LABEL_HEIGHT) / 2,
      };

      setActions((previous) =>
        insertIntoBranch(
          previous,
          parent.id,
          branchRef,
          branchAction,
          position,
        ),
      );
      selectAction(branchAction.id, anchor);
      return;
    }

    const insertAfterId = destination?.insertAfterId;
    if (insertAfterId) {
      const targetNode =
        insertAfterId === START_NODE_ID
          ? null
          : findAction(actions, insertAfterId);
      const insertedAction = {
        ...nextAction,
        x: (targetNode?.x ?? nextAction.x) + 220,
        y: (targetNode?.y ?? nextAction.y) + 120,
      };

      setActions((previous) =>
        insertAfterId === START_NODE_ID
          ? [insertedAction, ...previous]
          : insertAfter(previous, insertAfterId, insertedAction),
      );

      selectAction(insertedAction.id, anchor);
      return;
    }

    setActions((previous) => [...previous, nextAction]);
    selectAction(nextAction.id, anchor);
  };

  const addCondition = (actionId: string) => {
    setActions((previous) =>
      updateActionInTree(previous, actionId, (action) => ({
        ...action,
        conditions: [
          ...(action.conditions ?? []),
          { condition: "=true", actions: [] },
        ],
      })),
    );
  };

  const removeAction = (id: string) => {
    setActions((previous) => removeActionFromTree(previous, id));
    closeInspector();
  };

  const addActionFromConnector = (
    sourceId: string,
    kind: ActionKind,
    mode: "after" | "branch-append" = "after",
    anchor?: { x: number; y: number },
  ) => {
    const source = parseNodeId(sourceId);

    if (source.kind === "branch" || source.kind === "branchAdder") {
      const appendToBranch =
        source.kind === "branchAdder" || mode === "branch-append";

      addAction(
        kind,
        {
          parentId: source.actionId,
          branch:
            source.ref.branch === "condition" ? undefined : source.ref.branch,
          conditionIndex:
            source.ref.branch === "condition" ? source.ref.index : undefined,
          insertAtHead: !appendToBranch,
        },
        anchor,
      );
      return;
    }

    addAction(
      kind,
      {
        insertAfterId: source.kind === "container" ? source.actionId : sourceId,
      },
      anchor,
    );
  };

  const copyYaml = async () => {
    await navigator.clipboard.writeText(yaml);
  };

  const handleNodeSelection = (
    nodeId: string,
    kind: "workflow" | "action" | "input",
    anchor?: { x: number; y: number },
  ) => {
    setSelectedNodeId(nodeId);
    setSelectedActionId(kind === "action" ? nodeId : "");
    setInspectorAnchor(anchor ?? null);
    setInspectorOpen(true);
  };

  const closeInspector = () => {
    setInspectorOpen(false);
    setSelectedNodeId(null);
    setSelectedActionId("");
    setInspectorAnchor(null);
  };

  const resolvedActionId = findAction(actions, selectedActionId)
    ? selectedActionId
    : "";

  const inspectorTarget =
    selectedNodeId === "workflow:start" || selectedNodeId === "workflow:output"
      ? { kind: "workflow" as const }
      : resolvedActionId
        ? { kind: "action" as const, id: resolvedActionId }
        : selectedNodeId && selectedNodeId.startsWith("input:")
          ? { kind: "input" as const, id: selectedNodeId }
          : null;

  const actionBySelectedId = resolvedActionId;

  return (
    <div className="app-shell">
      <WorkflowHeader
        style={style}
        onStyleChange={setStyle}
        onCopyYaml={copyYaml}
      />

      <main className={`workspace${yamlCollapsed ? " yaml-collapsed" : ""}`}>
        <div className="canvas-stage">
          <GraphCanvas
            actions={actions}
            nodes={workflowNodes}
            connections={workflowConnections}
            selectedActionId={actionBySelectedId}
            actionKindOptions={actionKindOptions}
            onSelectAction={(nodeId, anchor) =>
              handleNodeSelection(nodeId, "action", anchor)
            }
            onUpdateAction={updateAction}
            onUpdateNodePosition={updateNodePosition}
            onAddActionFromConnector={addActionFromConnector}
            onMoveBranchContainer={moveBranchContainer}
            onToggleBranchCollapse={toggleBranchCollapse}
            onAddCondition={addCondition}
            onRemoveCondition={removeCondition}
            onSelectWorkflow={(anchor) =>
              handleNodeSelection("workflow:start", "workflow", anchor)
            }
          />

          {inspectorOpen && inspectorTarget ? (
            <InspectorPanel
              target={inspectorTarget}
              anchor={inspectorAnchor}
              actions={actions}
              inputs={inputs}
              name={name}
              description={description}
              triggerKind={triggerKind}
              style={style}
              actionKindOptions={actionKindOptions}
              onClose={closeInspector}
              onNameChange={setName}
              onDescriptionChange={setDescription}
              onTriggerChange={setTriggerKind}
              onAddInput={addInput}
              onAddAction={addAction}
              onAddCondition={addCondition}
              onUpdateAction={updateAction}
              onRemoveAction={removeAction}
              onUpdateInput={updateInput}
              onRemoveInput={removeInput}
              onSelectInput={(inputName) =>
                handleNodeSelection(
                  `input:${inputName}`,
                  "input",
                  inspectorAnchor ?? undefined,
                )
              }
            />
          ) : null}
        </div>

        <YamlPreview
          yaml={yaml}
          collapsed={yamlCollapsed}
          onToggle={() => setYamlCollapsed((previous) => !previous)}
        />
      </main>
    </div>
  );
}
