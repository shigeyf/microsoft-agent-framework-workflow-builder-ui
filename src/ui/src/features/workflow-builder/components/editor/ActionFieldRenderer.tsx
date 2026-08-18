import type {
  ActionKind,
  ActionModel,
  AgentInput,
  AgentOutput,
} from "../../types";

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
  /** Ids GotoAction is allowed to jump to. */
  gotoTargets: string[];
};

export function ActionFieldRenderer({
  action,
  actionKindOptions,
  onUpdateAction,
  onAddAction,
  onAddCondition,
  gotoTargets,
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
    const input = action.input ?? {};
    const output = action.output ?? {};
    const args = Object.entries(input.arguments ?? {});

    const patchInput = (patch: Partial<AgentInput>) =>
      onUpdateAction(action.id, "input", { ...input, ...patch });
    const patchOutput = (patch: Partial<AgentOutput>) =>
      onUpdateAction(action.id, "output", { ...output, ...patch });
    const renameArgument = (index: number, key: string) =>
      patchInput({
        arguments: Object.fromEntries(
          args.map(([name, value], current) => [
            current === index ? key : name,
            value,
          ]),
        ),
      });

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

        <label>
          <span>Input messages</span>
          <input
            value={input.messages ?? ""}
            onChange={(event) => patchInput({ messages: event.target.value })}
          />
        </label>

        <label>
          <span>External loop condition</span>
          <textarea
            value={input.externalLoop?.when ?? ""}
            onChange={(event) =>
              patchInput({ externalLoop: { when: event.target.value } })
            }
          />
        </label>

        <div className="inspector-actions-row">
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              patchInput({
                arguments: { ...(input.arguments ?? {}), "": "" },
              })
            }
          >
            + Add argument
          </button>
        </div>

        {args.map(([key, value], index) => (
          <div key={index} className="argument-row">
            <input
              aria-label={`Argument ${index + 1} name`}
              placeholder="name"
              value={key}
              onChange={(event) => renameArgument(index, event.target.value)}
            />
            <input
              aria-label={`Argument ${index + 1} value`}
              placeholder="=Local.value"
              value={value}
              onChange={(event) =>
                patchInput({
                  arguments: { ...input.arguments, [key]: event.target.value },
                })
              }
            />
            <button
              type="button"
              className="danger-button"
              aria-label={`Remove argument ${index + 1}`}
              onClick={() =>
                patchInput({
                  arguments: Object.fromEntries(
                    args.filter((_, current) => current !== index),
                  ),
                })
              }
            >
              ×
            </button>
          </div>
        ))}

        <label>
          <span>Output response object</span>
          <input
            value={output.responseObject ?? ""}
            onChange={(event) =>
              patchOutput({ responseObject: event.target.value })
            }
          />
        </label>

        <label>
          <span>Output messages</span>
          <input
            value={output.messages ?? ""}
            onChange={(event) => patchOutput({ messages: event.target.value })}
          />
        </label>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={output.autoSend ?? false}
            onChange={(event) =>
              patchOutput({ autoSend: event.target.checked })
            }
          />
          <span>Auto send response</span>
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

  if (action.kind === "GotoAction") {
    const target = action.actionId ?? "";
    const isDangling = target !== "" && !gotoTargets.includes(target);

    return (
      <>
        <label>
          <span>Target action</span>
          <select
            value={target}
            onChange={(event) =>
              onUpdateAction(action.id, "actionId", event.target.value)
            }
          >
            <option value="">(select an action)</option>
            {isDangling ? <option value={target}>{target}</option> : null}
            {gotoTargets.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        {isDangling ? (
          <p className="field-note field-note-warning">
            {target} は存在しないアクション ID です。
          </p>
        ) : null}
      </>
    );
  }

  if (action.kind === "CreateConversation") {
    return (
      <label>
        <span>Conversation ID variable</span>
        <input
          value={action.conversationId ?? ""}
          onChange={(event) =>
            onUpdateAction(action.id, "conversationId", event.target.value)
          }
        />
      </label>
    );
  }

  if (action.kind === "EndWorkflow") {
    return (
      <p className="field-note">
        ワークフローを終了します。設定項目はありません。
      </p>
    );
  }

  return null;
}
