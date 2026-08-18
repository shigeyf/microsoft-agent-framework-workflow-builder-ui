import type { ActionKind, ActionModel, WorkflowStyle } from "../types";
import { isBranchAction, isTerminatorAction } from "../domain/branches";
import { ActionFieldRenderer } from "./editor/ActionFieldRenderer";

type ActionEditorProps = {
  action: ActionModel;
  kindsFor: (nodeId: string | null) => ActionKind[];
  onUpdateAction: <K extends keyof ActionModel>(
    id: string,
    field: K,
    value: ActionModel[K],
  ) => void;
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
  onRemoveAction: (id: string) => void;
  gotoTargets: string[];
  style: WorkflowStyle;
};

export function ActionEditor({
  action,
  kindsFor,
  onUpdateAction,
  onAddAction,
  onAddCondition,
  onRemoveAction,
  gotoTargets,
  style,
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
        kindsFor={kindsFor}
        gotoTargets={gotoTargets}
        style={style}
        onUpdateAction={onUpdateAction}
        onAddAction={onAddAction}
        onAddCondition={onAddCondition}
      />

      {isBranchAction(action) || isTerminatorAction(action) ? null : (
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
          {kindsFor(action.id).map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
