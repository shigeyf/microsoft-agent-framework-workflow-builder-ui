import { useRef, useState } from "react";
import { fetchWorkflowSample, workflowSamples } from "../samples";
import type { WorkflowStyle } from "../types";

type WorkflowHeaderProps = {
  style: WorkflowStyle;
  onStyleChange: (value: WorkflowStyle) => void;
  onCopyYaml: () => void | Promise<void>;
  onImportYaml: (text: string) => void;
  onImportFailed: (message: string) => void;
};

export function WorkflowHeader({
  style,
  onStyleChange,
  onCopyYaml,
  onImportYaml,
  onImportFailed,
}: WorkflowHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadingSample, setLoadingSample] = useState("");

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (file) {
      onImportYaml(await file.text());
    }
  };

  const handleSampleChange = async (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const url = event.target.value;
    event.target.value = "";

    if (!url) {
      return;
    }

    setLoadingSample(url);

    try {
      onImportYaml(await fetchWorkflowSample(url));
    } catch (error) {
      onImportFailed(error instanceof Error ? error.message : String(error));
    } finally {
      setLoadingSample("");
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

        <label className="segmented-control">
          <span>Sample :</span>
          <select
            value=""
            disabled={loadingSample !== ""}
            onChange={handleSampleChange}
          >
            <option value="">
              {loadingSample ? "Loading…" : "Load a sample"}
            </option>
            {workflowSamples.map((sample) => (
              <option key={sample.id} value={sample.url}>
                {sample.label}
              </option>
            ))}
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
