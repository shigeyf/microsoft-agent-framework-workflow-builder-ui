/**
 * Declarative workflow samples from the Agent Framework repository, pinned to the
 * commit below so the canvas keeps matching the URLs listed here.
 */
const COMMIT = "00d7102c54aa4ed14676cfceb41645e19097b62e";
const RAW_BASE = `https://raw.githubusercontent.com/microsoft/agent-framework/${COMMIT}/python/samples/03-workflows/declarative`;

export type WorkflowSample = {
  /** Sample folder name in the repository. */
  id: string;
  label: string;
  url: string;
};

const SAMPLE_FOLDERS: { id: string; label: string }[] = [
  { id: "simple_workflow", label: "Simple workflow" },
  { id: "conditional_workflow", label: "Conditional workflow" },
  { id: "human_in_loop", label: "Human in the loop" },
  { id: "customer_support", label: "Customer support" },
  { id: "student_teacher", label: "Student and teacher" },
  { id: "marketing", label: "Marketing" },
  { id: "function_tools", label: "Function tools" },
  { id: "invoke_function_tool", label: "Invoke function tool" },
  { id: "agent_to_function_tool", label: "Agent to function tool" },
  { id: "invoke_mcp_tool", label: "Invoke MCP tool" },
  { id: "invoke_foundry_toolbox_mcp", label: "Invoke Foundry toolbox MCP" },
  { id: "invoke_http_request", label: "Invoke HTTP request" },
];

export const workflowSamples: WorkflowSample[] = SAMPLE_FOLDERS.map(
  (folder) => ({
    ...folder,
    url: `${RAW_BASE}/${folder.id}/workflow.yaml`,
  }),
);

export async function fetchWorkflowSample(url: string): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`サンプルを取得できませんでした (HTTP ${response.status})`);
  }

  return response.text();
}
