import type { InputParam } from "../../types";

type InputListSectionProps = {
  inputs: InputParam[];
  onAddInput: () => void;
  onInputChange: (
    index: number,
    field: "name" | "type" | "description",
    value: string,
  ) => void;
  onRemoveInput: (index: number) => void;
};

export function InputListSection({
  inputs,
  onAddInput,
  onInputChange,
  onRemoveInput,
}: InputListSectionProps) {
  return (
    <div className="collapse-content">
      <div className="section-header align-end">
        <span />
        <button type="button" className="secondary-button" onClick={onAddInput}>
          Add input
        </button>
      </div>

      {inputs.map((input, index) => (
        <div key={`${input.name}-${index}`} className="card mini-card">
          <div className="field-row">
            <label>
              <span>Name</span>
              <input
                value={input.name}
                onChange={(event) =>
                  onInputChange(index, "name", event.target.value)
                }
              />
            </label>
            <label>
              <span>Type</span>
              <select
                value={input.type}
                onChange={(event) =>
                  onInputChange(index, "type", event.target.value)
                }
              >
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="object">object</option>
              </select>
            </label>
          </div>

          <label>
            <span>Description</span>
            <input
              value={input.description}
              onChange={(event) =>
                onInputChange(index, "description", event.target.value)
              }
            />
          </label>

          <button
            type="button"
            className="danger-button"
            onClick={() => onRemoveInput(index)}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
