import type { ActionKind, ActionModel } from "../types";
import { ActionFieldRenderer } from "./editor/ActionFieldRenderer";

type ActionEditorProps = {
  action: ActionModel;
  actionKindOptions: Array<ActionKind>;
  onUpdateAction: <K extends keyof ActionModel>(
    id: string,
    field: K,
    value: ActionModel[K],
  ) => void;
  onAddAction: (
    kind: ActionKind,
    destination?: {
      parentId?: string;
      branch?: "then" | "else";
      conditionIndex?: number;
      insertAfterId?: string;
    },
  ) => void;
  onAddCondition: (actionId: string) => void;
  onRemoveAction: (id: string) => void;
  gotoTargets: string[];
};

export function ActionEditor({
  action,
  actionKindOptions,
  onUpdateAction,
  onAddAction,
  onAddCondition,
  onRemoveAction,
  gotoTargets,
}: ActionEditorProps) {
  return (
    <div className="section-block editor-block">
      <div className="section-header">
        <h2>Edit action</h2>
        <button
          type="button"
          className="danger-button"
          onClick={() => onRemoveAction(action.id)}
        >
          Delete
        </button>
      </div>

      <label>
        <span>Label</span>
        <input
          value={action.displayName}
          onChange={(event) =>
            onUpdateAction(action.id, "displayName", event.target.value)
          }
        />
      </label>

      <ActionFieldRenderer
        action={action}
        actionKindOptions={actionKindOptions}
        gotoTargets={gotoTargets}
        onUpdateAction={onUpdateAction}
        onAddAction={onAddAction}
        onAddCondition={onAddCondition}
      />

      {action.kind !== "If" && action.kind !== "ConditionGroup" ? (
        <select
          className="action-select accent"
          value=""
          onChange={(event) => {
            const nextKind = event.target.value as ActionKind;
            if (nextKind) {
              onAddAction(nextKind, { insertAfterId: action.id });
            }
            event.target.value = "";
          }}
        >
          <option value="">+ Action</option>
          {actionKindOptions.map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
