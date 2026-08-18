import { useRef, useState } from "react";
import { fetchWorkflowSample, workflowSamples } from "../samples";
import type { WorkflowStyle } from "../types";

type WorkflowHeaderProps = {
  style: WorkflowStyle;
  /** The two runtimes are not interchangeable, so an existing workflow keeps its style. */
  styleLocked: boolean;
  onStyleChange: (value: WorkflowStyle) => void;
  onCopyYaml: () => void | Promise<void>;
  onImportYaml: (text: string) => void;
  onImportFailed: (message: string) => void;
  onNewWorkflow: () => void;
  onAutoArrange: () => void;
};

export function WorkflowHeader({
  style,
  styleLocked,
  onStyleChange,
  onCopyYaml,
  onImportYaml,
  onImportFailed,
  onNewWorkflow,
  onAutoArrange,
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
            disabled={styleLocked}
            title={
              styleLocked
                ? "Python と C# は文書構造も変数名前空間も異なります。切り替えるには New workflow で作り直してください。"
                : undefined
            }
            onChange={(event) =>
              onStyleChange(event.target.value as WorkflowStyle)
            }
          >
            <option value="python">Python</option>
            <option value="csharp">C#</option>
          </select>
        </label>

        <button
          type="button"
          className="secondary-button"
          onClick={onNewWorkflow}
        >
          New workflow
        </button>

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
          onClick={onAutoArrange}
        >
          Auto arrange
        </button>

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
