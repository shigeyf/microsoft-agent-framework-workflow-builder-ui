import type { WorkflowStyle } from "../types";

type WorkflowHeaderProps = {
  style: WorkflowStyle;
  onStyleChange: (value: WorkflowStyle) => void;
  onCopyYaml: () => void | Promise<void>;
};

export function WorkflowHeader({
  style,
  onStyleChange,
  onCopyYaml,
}: WorkflowHeaderProps) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Microsoft Agent Framework</p>
        <h1>Declarative Workflow Builder</h1>
      </div>

      <div className="toolbar">
        <label className="segmented-control">
          <span>Style :</span>
          <select
            value={style}
            onChange={(event) =>
              onStyleChange(event.target.value as WorkflowStyle)
            }
          >
            <option value="python">Python</option>
            <option value="csharp">C#</option>
          </select>
        </label>

        <button type="button" className="primary-button" onClick={onCopyYaml}>
          Copy YAML
        </button>
      </div>
    </header>
  );
}
