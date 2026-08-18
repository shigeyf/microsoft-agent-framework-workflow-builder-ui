import type { ActionKind, ActionModel } from "../../types";

type ActionFieldRendererProps = {
  action: ActionModel;
  actionKindOptions: ActionKind[];
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
};

export function ActionFieldRenderer({
  action,
  actionKindOptions,
  onUpdateAction,
  onAddAction,
  onAddCondition,
}: ActionFieldRendererProps) {
  if (action.kind === "SetValue" || action.kind === "SetVariable") {
    return (
      <>
        {action.kind === "SetValue" ? (
          <label>
            <span>Path</span>
            <input
              value={action.path ?? ""}
              onChange={(event) =>
                onUpdateAction(action.id, "path", event.target.value)
              }
            />
          </label>
        ) : (
          <label>
            <span>Variable</span>
            <input
              value={action.variable ?? ""}
              onChange={(event) =>
                onUpdateAction(action.id, "variable", event.target.value)
              }
            />
          </label>
        )}
        <label>
          <span>Value</span>
          <input
            value={action.value ?? ""}
            onChange={(event) =>
              onUpdateAction(action.id, "value", event.target.value)
            }
          />
        </label>
      </>
    );
  }

  if (action.kind === "SendActivity") {
    const text = action.activity?.text ?? action.activityText ?? "";
    return (
      <label>
        <span>Text</span>
        <input
          value={text}
          onChange={(event) => {
            onUpdateAction(action.id, "activityText", event.target.value);
            onUpdateAction(action.id, "activity", { text: event.target.value });
          }}
        />
      </label>
    );
  }

  if (action.kind === "If") {
    return (
      <>
        <label>
          <span>Condition</span>
          <input
            value={action.condition ?? ""}
            onChange={(event) =>
              onUpdateAction(action.id, "condition", event.target.value)
            }
          />
        </label>

        <div className="inspector-actions-row">
          <select
            className="action-select"
            value=""
            onChange={(event) => {
              const nextKind = event.target.value as ActionKind;
              if (nextKind) {
                onAddAction(nextKind, { parentId: action.id, branch: "then" });
              }
              event.target.value = "";
            }}
          >
            <option value="">+ Then action</option>
            {actionKindOptions.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </div>

        <label>
          <span>Then branch</span>
          <textarea
            value={
              action.then?.map((item) => item.displayName).join("\n") ??
              action.thenText ??
              ""
            }
            onChange={(event) =>
              onUpdateAction(action.id, "thenText", event.target.value)
            }
          />
        </label>

        <div className="inspector-actions-row">
          <select
            className="action-select"
            value=""
            onChange={(event) => {
              const nextKind = event.target.value as ActionKind;
              if (nextKind) {
                onAddAction(nextKind, { parentId: action.id, branch: "else" });
              }
              event.target.value = "";
            }}
          >
            <option value="">+ Else action</option>
            {actionKindOptions.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </div>

        <label>
          <span>Else branch</span>
          <textarea
            value={
              action.else?.map((item) => item.displayName).join("\n") ??
              action.elseText ??
              ""
            }
            onChange={(event) =>
              onUpdateAction(action.id, "elseText", event.target.value)
            }
          />
        </label>
      </>
    );
  }

  if (action.kind === "ConditionGroup") {
    return (
      <>
        <div className="inspector-actions-row">
          <button
            type="button"
            className="secondary-button"
            onClick={() => onAddCondition(action.id)}
          >
            + Add condition
          </button>
        </div>

        {action.conditions?.map((condition, conditionIndex) => (
          <div
            key={condition.id ?? `${action.id}-condition-${conditionIndex}`}
            className="condition-group-item"
          >
            <label>
              <span>Condition {conditionIndex + 1}</span>
              <input
                value={condition.condition}
                onChange={(event) => {
                  const nextConditions = [...(action.conditions ?? [])];
                  nextConditions[conditionIndex] = {
                    ...condition,
                    condition: event.target.value,
                  };
                  onUpdateAction(action.id, "conditions", nextConditions);
                }}
              />
            </label>

            <div className="inspector-actions-row">
              <select
                className="action-select"
                value=""
                onChange={(event) => {
                  const nextKind = event.target.value as ActionKind;
                  if (nextKind) {
                    onAddAction(nextKind, {
                      parentId: action.id,
                      conditionIndex,
                    });
                  }
                  event.target.value = "";
                }}
              >
                <option value="">+ Condition action</option>
                {actionKindOptions.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </div>

            <label>
              <span>Condition actions</span>
              <textarea
                value={condition.actions
                  .map((item) => item.displayName)
                  .join("\n")}
                onChange={() => undefined}
              />
            </label>
          </div>
        )) ?? null}
      </>
    );
  }

  if (action.kind === "InvokeAzureAgent") {
    return (
      <>
        <label>
          <span>Agent name</span>
          <input
            value={action.agentName ?? ""}
            onChange={(event) =>
              onUpdateAction(action.id, "agentName", event.target.value)
            }
          />
        </label>
        <label>
          <span>Conversation ID</span>
          <input
            value={action.conversationId ?? ""}
            onChange={(event) =>
              onUpdateAction(action.id, "conversationId", event.target.value)
            }
          />
        </label>
      </>
    );
  }

  if (action.kind === "Question" || action.kind === "RequestExternalInput") {
    const questionText =
      action.question?.text ?? action.questionText ?? action.prompt?.text ?? "";
    const defaultValue = action.defaultValue ?? action.default ?? "";

    return (
      <>
        <label>
          <span>
            {action.kind === "Question" ? "Question text" : "Prompt text"}
          </span>
          <input
            value={questionText}
            onChange={(event) => {
              const nextValue = event.target.value;
              onUpdateAction(action.id, "questionText", nextValue);
              onUpdateAction(action.id, "prompt", { text: nextValue });
              onUpdateAction(action.id, "question", { text: nextValue });
            }}
          />
        </label>
        <label>
          <span>Variable</span>
          <input
            value={action.variable ?? ""}
            onChange={(event) =>
              onUpdateAction(action.id, "variable", event.target.value)
            }
          />
        </label>
        <label>
          <span>Default</span>
          <input
            value={defaultValue}
            onChange={(event) => {
              onUpdateAction(action.id, "defaultValue", event.target.value);
              onUpdateAction(action.id, "default", event.target.value);
            }}
          />
        </label>
      </>
    );
  }

  return null;
}
