type KeyValueRowsProps = {
  /** Singular noun for one row, used for the button and the row labels. */
  label: string;
  entries: Record<string, string> | undefined;
  placeholder?: string;
  onChange: (next: Record<string, string>) => void;
};

/** Editable rows for the free-form maps used by arguments, headers and query parameters. */
export function KeyValueRows({
  label,
  entries,
  placeholder,
  onChange,
}: KeyValueRowsProps) {
  const rows = Object.entries(entries ?? {});

  const replaceAt = (index: number, key: string, value: string) =>
    onChange(
      Object.fromEntries(
        rows.map((row, current) => (current === index ? [key, value] : row)),
      ),
    );

  return (
    <>
      <div className="inspector-actions-row">
        <button
          type="button"
          className="secondary-button"
          onClick={() => onChange({ ...(entries ?? {}), "": "" })}
        >
          + Add {label}
        </button>
      </div>

      {rows.map(([key, value], index) => (
        <div key={index} className="argument-row">
          <input
            aria-label={`${label} ${index + 1} name`}
            placeholder="name"
            value={key}
            onChange={(event) => replaceAt(index, event.target.value, value)}
          />
          <input
            aria-label={`${label} ${index + 1} value`}
            placeholder={placeholder}
            value={value}
            onChange={(event) => replaceAt(index, key, event.target.value)}
          />
          <button
            type="button"
            className="danger-button"
            aria-label={`Remove ${label} ${index + 1}`}
            onClick={() =>
              onChange(Object.fromEntries(rows.filter((_, at) => at !== index)))
            }
          >
            ×
          </button>
        </div>
      ))}
    </>
  );
}
