import { useMemo, useState } from "react";
import { GraphCanvas } from "./components/GraphCanvas";
import { InspectorPanel } from "./components/InspectorPanel";
import { WorkflowHeader } from "./components/WorkflowHeader";
import { YamlPreview } from "./components/YamlPreview";
import { createAction, defaultActions, defaultInputs } from "./data";
import {
  findAction,
  insertAfter,
  insertIntoBranch,
  removeAction as removeActionFromTree,
  translateSubtree,
  updateAction as updateActionInTree,
} from "./domain/actionTree";
import {
  branchActionsOf,
  branchRowIndex,
  isBranchAction,
} from "./domain/branches";
import {
  OUTPUT_NODE_ID,
  START_NODE_ID,
  parseNodeId,
  type BranchRef,
} from "./domain/nodeIds";
import { canChangeStyle, kindsForStyle } from "./domain/styles";
import { branchSlotPosition } from "./graph/buildNodes";
import { autoLayout } from "./graph/autoLayout";
import { LAYOUT, OVERLAY_CASCADE } from "./graph/layout";
import { useWorkflowGraph } from "./graph/useWorkflowGraph";
import { buildYaml } from "./utils/yaml";
import { parseWorkflowYaml, type ParsedWorkflow } from "./utils/parseYaml";
import type {
  ActionKind,
  ActionModel,
  InputParam,
  WorkflowStyle,
} from "./types";

export type { WorkflowGraphNode } from "./graph/buildNodes";

type Position = { x: number; y: number };

function importWarning(parsed: ParsedWorkflow): string {
  const notes: string[] = [];

  if (parsed.unsupportedKinds.length > 0) {
    notes.push(
      `未対応のアクションはそのまま表示されます: ${parsed.unsupportedKinds.join(", ")}`,
    );
  }

  if (parsed.styleMismatchKinds.length > 0) {
    notes.push(
      `${parsed.style === "python" ? "Python" : "C#"} では使えないアクションが含まれています: ${parsed.styleMismatchKinds.join(", ")}`,
    );
  }

  return notes.join(" / ");
}

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
  const [importError, setImportError] = useState("");
  const [nodePositions, setNodePositions] = useState<{
    start: Position;
    output: Position;
  }>({ start: LAYOUT.startPosition, output: LAYOUT.outputPosition });

  const updateNodePosition = (id: string, x: number, y: number) => {
    const key =
      id === START_NODE_ID ? "start" : id === OUTPUT_NODE_ID ? "output" : null;

    if (key) {
      setNodePositions((previous) => ({ ...previous, [key]: { x, y } }));
    }
  };

  const { nodes: workflowNodes, edges: workflowConnections } = useWorkflowGraph(
    actions,
    collapsedActionIds,
    nodePositions,
  );

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
        x:
          previous.x > OVERLAY_CASCADE.resetX
            ? OVERLAY_CASCADE.origin
            : previous.x + OVERLAY_CASCADE.step,
        y:
          previous.y > OVERLAY_CASCADE.resetY
            ? OVERLAY_CASCADE.origin
            : previous.y + OVERLAY_CASCADE.step,
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
    const grid = LAYOUT.newActionGrid;
    const nextIndex = actions.length;
    const nextAction = {
      ...newAction,
      x: grid.originX + (nextIndex % grid.columns) * grid.stepX,
      y: grid.originY + Math.floor(nextIndex / grid.columns) * grid.stepY,
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
      const preceding =
        position === "head" ? [] : branchActionsOf(parent, branchRef);
      const branchAction = {
        ...nextAction,
        ...branchSlotPosition(
          parent,
          branchRowIndex(parent, branchRef),
          preceding,
        ),
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
        x: (targetNode?.x ?? nextAction.x) + LAYOUT.insertOffset.x,
        y: (targetNode?.y ?? nextAction.y) + LAYOUT.insertOffset.y,
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

  const importYaml = (text: string) => {
    let parsed;

    try {
      parsed = parseWorkflowYaml(text);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : String(error));
      return;
    }

    setStyle(parsed.style);
    setName(parsed.name);
    setDescription(parsed.description);
    setTriggerKind(parsed.triggerKind);
    setInputs(parsed.inputs);

    const positioned = autoLayout(parsed.actions);
    setActions(positioned.actions);
    setNodePositions({
      start: LAYOUT.startPosition,
      output: {
        x: positioned.right + LAYOUT.branchGapX,
        y: LAYOUT.startPosition.y,
      },
    });
    setCollapsedActionIds([]);
    closeInspector();
    setImportError(importWarning(parsed));
  };

  const resetWorkflow = () => {
    setName("greeting-workflow");
    setDescription("A simple workflow that greets the user");
    setTriggerKind("OnConversationStart");
    setInputs([]);
    setActions([]);
    setCollapsedActionIds([]);
    setNodePositions({
      start: LAYOUT.startPosition,
      output: LAYOUT.outputPosition,
    });
    closeInspector();
    setImportError("");
  };

  const resolvedActionId = findAction(actions, selectedActionId)
    ? selectedActionId
    : "";

  const inspectorTarget =
    selectedNodeId === START_NODE_ID || selectedNodeId === OUTPUT_NODE_ID
      ? { kind: "workflow" as const }
      : resolvedActionId
        ? { kind: "action" as const, id: resolvedActionId }
        : selectedNodeId && selectedNodeId.startsWith("input:")
          ? { kind: "input" as const, id: selectedNodeId }
          : null;

  const actionBySelectedId = resolvedActionId;
  const availableKinds = kindsForStyle(style);
  const styleLocked = !canChangeStyle(actions.length, inputs.length);

  return (
    <div className="app-shell">
      <WorkflowHeader
        style={style}
        styleLocked={styleLocked}
        onStyleChange={setStyle}
        onCopyYaml={copyYaml}
        onImportYaml={importYaml}
        onImportFailed={setImportError}
        onNewWorkflow={resetWorkflow}
      />

      {importError ? (
        <p className="import-banner" role="status">
          {importError}
        </p>
      ) : null}

      <main className={`workspace${yamlCollapsed ? " yaml-collapsed" : ""}`}>
        <div className="canvas-stage">
          <GraphCanvas
            actions={actions}
            nodes={workflowNodes}
            connections={workflowConnections}
            selectedActionId={actionBySelectedId}
            actionKindOptions={availableKinds}
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
              handleNodeSelection(START_NODE_ID, "workflow", anchor)
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
              actionKindOptions={availableKinds}
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
