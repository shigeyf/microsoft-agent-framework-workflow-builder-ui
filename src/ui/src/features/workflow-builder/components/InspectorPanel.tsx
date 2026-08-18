import type { ActionKind, ActionModel, InputParam } from "../types";
import { findAction, flattenActions } from "../domain/actionTree";
import { ActionEditor } from "./ActionEditor";
import { WorkflowMetaSection } from "./sections/WorkflowMetaSection";

type InspectorTarget =
  | { kind: "workflow" }
  | { kind: "action"; id: string }
  | { kind: "input"; id: string };

type InspectorPanelProps = {
  target: InspectorTarget;
  anchor?: { x: number; y: number } | null;
  actions: ActionModel[];
  inputs: InputParam[];
  name: string;
  description: string;
  triggerKind: string;
  style: "python" | "csharp";
  actionKindOptions: ActionKind[];
  onClose: () => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTriggerChange: (value: string) => void;
  onAddInput: () => void;
  onAddAction: (
    kind: ActionKind,
    destination?: {
      parentId?: string;
      branch?: "then" | "else" | "loop";
      conditionIndex?: number;
      insertAfterId?: string;
    },
  ) => void;
  onAddCondition: (actionId: string) => void;
  onUpdateAction: <K extends keyof ActionModel>(
    id: string,
    field: K,
    value: ActionModel[K],
  ) => void;
  onRemoveAction: (id: string) => void;
  onUpdateInput: (
    index: number,
    field: "name" | "type" | "description",
    value: string,
  ) => void;
  onRemoveInput: (index: number) => void;
  onSelectInput: (name: string) => void;
};

export function InspectorPanel({
  target,
  anchor,
  actions,
  inputs,
  name,
  description,
  triggerKind,
  style,
  actionKindOptions,
  onClose,
  onNameChange,
  onDescriptionChange,
  onTriggerChange,
  onAddInput,
  onAddAction,
  onAddCondition,
  onUpdateAction,
  onRemoveAction,
  onUpdateInput,
  onRemoveInput,
  onSelectInput,
}: InspectorPanelProps) {
  const action =
    target.kind === "action" ? findAction(actions, target.id) : null;
  const inputIndex =
    target.kind === "input"
      ? inputs.findIndex((input) => `input:${input.name}` === target.id)
      : -1;
  const input = inputIndex >= 0 ? inputs[inputIndex] : null;

  const hasContent =
    target.kind === "workflow" ||
    (target.kind === "action" && action != null) ||
    (target.kind === "input" && input != null);

  if (!hasContent) {
    return null;
  }

  const anchoredStyle = anchor
    ? {
        left: Math.max(12, anchor.x + 16),
        top: Math.max(12, anchor.y - 12),
        right: "auto" as const,
      }
    : undefined;

  return (
    <div className="inspector-panel" style={anchoredStyle}>
      <div className="inspector-header">
        <strong>
          {target.kind === "workflow"
            ? "Workflow"
            : target.kind === "action"
              ? "Action"
              : "Input"}
        </strong>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Close inspector"
        >
          ×
        </button>
      </div>

      <div className="inspector-body">
        {target.kind === "workflow" ? (
          <>
            <WorkflowMetaSection
              name={name}
              description={description}
              triggerKind={triggerKind}
              style={style}
              actionKindOptions={actionKindOptions}
              inputs={inputs}
              onNameChange={onNameChange}
              onDescriptionChange={onDescriptionChange}
              onTriggerChange={onTriggerChange}
              onAddInput={onAddInput}
              onSelectInput={onSelectInput}
              onRemoveInput={onRemoveInput}
              onAddAction={onAddAction}
            />
          </>
        ) : null}

        {target.kind === "action" && action ? (
          <ActionEditor
            action={action}
            actionKindOptions={actionKindOptions}
            style={style}
            gotoTargets={flattenActions(actions)
              .map((item) => item.id)
              .filter((id) => id !== action.id)}
            onUpdateAction={onUpdateAction}
            onAddAction={onAddAction}
            onAddCondition={onAddCondition}
            onRemoveAction={onRemoveAction}
          />
        ) : null}

        {target.kind === "input" && input && inputIndex >= 0 ? (
          <div className="section-block editor-block">
            <label>
              <span>Name</span>
              <input
                value={input.name}
                onChange={(event) =>
                  onUpdateInput(inputIndex, "name", event.target.value)
                }
              />
            </label>

            <label>
              <span>Type</span>
              <select
                value={input.type}
                onChange={(event) =>
                  onUpdateInput(inputIndex, "type", event.target.value)
                }
              >
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="object">object</option>
              </select>
            </label>

            <label>
              <span>Description</span>
              <input
                value={input.description}
                onChange={(event) =>
                  onUpdateInput(inputIndex, "description", event.target.value)
                }
              />
            </label>

            <button
              type="button"
              className="danger-button"
              onClick={() => onRemoveInput(inputIndex)}
            >
              Remove input
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
