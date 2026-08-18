import { useState } from "react";
import type { ActionKind, ActionModel } from "../types";

type ActionListProps = {
  actions: ActionModel[];
  selectedActionId: string;
  actionKindOptions: ActionKind[];
  onSelectAction: (id: string) => void;
  onAddAction: (kind: ActionKind) => void;
};

export function ActionList({
  actions,
  selectedActionId,
  actionKindOptions,
  onSelectAction,
  onAddAction,
}: ActionListProps) {
  const [actionsOpen, setActionsOpen] = useState(true);

  return (
    <section className="section-block">
      <div
        className="section-header collapse-header"
        onClick={() => setActionsOpen((previous) => !previous)}
      >
        <h2>Actions</h2>
        <div className="collapse-header-actions">
          <select
            className="action-select"
            value=""
            onChange={(event) => {
              const nextKind = event.target.value as ActionKind;
              if (nextKind) {
                onAddAction(nextKind);
              }
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <option value="">Add action</option>
            {actionKindOptions.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
          <span>{actionsOpen ? "−" : "+"}</span>
        </div>
      </div>

      {actionsOpen ? (
        <div className="action-list collapse-content">
          {actions.map((action) => (
            <button
              type="button"
              key={action.id}
              className={
                action.id === selectedActionId
                  ? "action-item selected"
                  : "action-item"
              }
              onClick={() => onSelectAction(action.id)}
            >
              <span>{action.displayName}</span>
              <small>{action.kind}</small>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
