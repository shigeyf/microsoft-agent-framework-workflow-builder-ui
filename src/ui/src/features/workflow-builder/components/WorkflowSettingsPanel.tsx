import { useState } from "react";
import type { ActionKind, InputParam } from "../types";
import { InputListSection } from "./sections/InputListSection";
import { WorkflowMetaSection } from "./sections/WorkflowMetaSection";

type WorkflowSettingsPanelProps = {
  name: string;
  description: string;
  triggerKind: string;
  style: "python" | "csharp";
  inputs: InputParam[];
  actionKindOptions: ActionKind[];
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTriggerChange: (value: string) => void;
  onAddInput: () => void;
  onAddAction: (
    kind: ActionKind,
    destination?: {
      parentId?: string;
      branch?: "then" | "else";
      insertAfterId?: string;
    },
  ) => void;
  onInputChange: (
    index: number,
    field: "name" | "type" | "description",
    value: string,
  ) => void;
  onRemoveInput: (index: number) => void;
};

export function WorkflowSettingsPanel({
  name,
  description,
  triggerKind,
  style,
  inputs,
  actionKindOptions,
  onNameChange,
  onDescriptionChange,
  onTriggerChange,
  onAddInput,
  onAddAction,
  onInputChange,
  onRemoveInput,
}: WorkflowSettingsPanelProps) {
  const [workflowOpen, setWorkflowOpen] = useState(true);
  const [inputsOpen, setInputsOpen] = useState(true);

  return (
    <>
      <section className="section-block">
        <button
          type="button"
          className="collapse-header"
          onClick={() => setWorkflowOpen((previous) => !previous)}
        >
          <h2>Workflow</h2>
          <span>{workflowOpen ? "−" : "+"}</span>
        </button>

        {workflowOpen ? (
          <WorkflowMetaSection
            name={name}
            description={description}
            triggerKind={triggerKind}
            style={style}
            actionKindOptions={actionKindOptions}
            onNameChange={onNameChange}
            onDescriptionChange={onDescriptionChange}
            onTriggerChange={onTriggerChange}
            onAddInput={onAddInput}
            onAddAction={onAddAction}
          />
        ) : null}
      </section>

      <section className="section-block">
        <div
          className="section-header collapse-header"
          onClick={() => setInputsOpen((previous) => !previous)}
        >
          <h2>Inputs</h2>
          <div className="collapse-header-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={(event) => {
                event.stopPropagation();
                onAddInput();
              }}
            >
              Add input
            </button>
            <span>{inputsOpen ? "−" : "+"}</span>
          </div>
        </div>

        {inputsOpen ? (
          <InputListSection
            inputs={inputs}
            onAddInput={onAddInput}
            onInputChange={onInputChange}
            onRemoveInput={onRemoveInput}
          />
        ) : null}
      </section>
    </>
  );
}
