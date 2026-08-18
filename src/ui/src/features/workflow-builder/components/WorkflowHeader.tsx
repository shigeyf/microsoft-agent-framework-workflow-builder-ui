import { useRef } from "react";
import type { WorkflowStyle } from "../types";

type WorkflowHeaderProps = {
  style: WorkflowStyle;
  onStyleChange: (value: WorkflowStyle) => void;
  onCopyYaml: () => void | Promise<void>;
  onImportYaml: (text: string) => void;
};

export function WorkflowHeader({
  style,
  onStyleChange,
  onCopyYaml,
  onImportYaml,
}: WorkflowHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (file) {
      onImportYaml(await file.text());
    }
  };

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

        <input
          ref={fileInputRef}
          type="file"
          accept=".yaml,.yml"
          hidden
          onChange={handleFileChange}
        />

        <button
          type="button"
          className="secondary-button"
          onClick={() => fileInputRef.current?.click()}
        >
          Import YAML
        </button>

        <button type="button" className="primary-button" onClick={onCopyYaml}>
          Copy YAML
        </button>
      </div>
    </header>
  );
}
