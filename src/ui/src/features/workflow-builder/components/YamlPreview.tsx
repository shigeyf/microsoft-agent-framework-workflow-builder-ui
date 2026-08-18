type YamlPreviewProps = {
  yaml: string;
  collapsed: boolean;
  onToggle: () => void;
};

export function YamlPreview({ yaml, collapsed, onToggle }: YamlPreviewProps) {
  return (
    <aside className={`panel right-panel${collapsed ? " collapsed" : ""}`}>
      <div className="section-block yaml-panel">
        <button
          type="button"
          className="yaml-toggle"
          onClick={onToggle}
          aria-expanded={!collapsed}
          title={
            collapsed ? "Expand generated YAML" : "Collapse generated YAML"
          }
        >
          <span className="yaml-toggle-icon">{collapsed ? "▸" : "▾"}</span>
          <h2>Generated YAML</h2>
        </button>
        {collapsed ? null : <pre>{yaml}</pre>}
      </div>
    </aside>
  );
}
