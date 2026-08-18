import type { ActionKind, InputParam } from "../../types";

type WorkflowMetaSectionProps = {
  name: string;
  description: string;
  triggerKind: string;
  style: "python" | "csharp";
  kindsFor: (nodeId: string | null) => ActionKind[];
  inputs: InputParam[];
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTriggerChange: (value: string) => void;
  onAddInput: () => void;
  onSelectInput: (name: string) => void;
  onRemoveInput: (index: number) => void;
  onAddAction: (
    kind: ActionKind,
    destination?: {
      parentId?: string;
      branch?: "then" | "else" | "loop";
      insertAfterId?: string;
    },
  ) => void;
};

export function WorkflowMetaSection({
  name,
  description,
  triggerKind,
  style,
  kindsFor,
  inputs,
  onNameChange,
  onDescriptionChange,
  onTriggerChange,
  onAddInput,
  onSelectInput,
  onRemoveInput,
  onAddAction,
}: WorkflowMetaSectionProps) {
  return (
    <div className="collapse-content">
      <label>
        <span>Name</span>
        <input
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
        />
      </label>

      <label>
        <span>Description</span>
        <textarea
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
        />
      </label>

      {style === "csharp" ? (
        <label>
          <span>Trigger</span>
          <select
            value={triggerKind}
            onChange={(event) => onTriggerChange(event.target.value)}
          >
            <option value="OnConversationStart">OnConversationStart</option>
          </select>
        </label>
      ) : null}

      <div className="section-header">
        <span className="section-label">Inputs</span>
        <button type="button" className="secondary-button" onClick={onAddInput}>
          + Input
        </button>
      </div>

      {inputs.length === 0 ? (
        <p className="empty-hint">No inputs defined.</p>
      ) : (
        <ul className="input-list">
          {inputs.map((input, index) => (
            <li key={input.name}>
              <button
                type="button"
                className="input-item"
                onClick={() => onSelectInput(input.name)}
              >
                <strong>{input.name}</strong>
                <small>{input.type}</small>
              </button>
              <button
                type="button"
                className="input-remove-button"
                title="Remove input"
                onClick={() => onRemoveInput(index)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="section-header">
        <span className="section-label">Actions</span>
        <select
          className="action-select"
          value=""
          onChange={(event) => {
            const nextKind = event.target.value as ActionKind;
            if (nextKind) {
              onAddAction(nextKind, { insertAfterId: "workflow:start" });
            }
            event.target.value = "";
          }}
        >
          <option value="">+ Action</option>
          {kindsFor(null).map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
