export type WorkflowStyle = "csharp" | "python";

export type WorkflowInputType =
  "string" | "number" | "integer" | "boolean" | "object";

export type ActionKind =
  | "SetValue"
  | "SetVariable"
  | "SendActivity"
  | "If"
  | "ConditionGroup"
  | "Foreach"
  | "BreakLoop"
  | "ContinueLoop"
  | "InvokeAzureAgent"
  | "Question"
  | "RequestExternalInput"
  | "GotoAction"
  | "EndWorkflow"
  | "CreateConversation"
  | "InvokeFunctionTool"
  | "InvokeMcpTool"
  | "HttpRequestAction";

export type ConditionBranch = {
  id?: string;
  condition: string;
  actions: ActionModel[];
};

export type InputParam = {
  name: string;
  type: WorkflowInputType;
  description: string;
};

export type AgentInput = {
  messages?: string;
  arguments?: Record<string, string>;
  /** Repeats the agent call while this expression stays true. */
  externalLoop?: { when?: string };
};

export type AgentOutput = {
  responseObject?: string;
  /** Tool actions store their payload here instead of responseObject. */
  result?: string;
  messages?: string;
  autoSend?: boolean;
};

export type ActionModel = {
  id: string;
  kind: ActionKind;
  displayName: string;
  x?: number;
  y?: number;
  variable?: string;
  value?: string;
  path?: string;
  activityText?: string;
  activity?: { text?: string };
  questionText?: string;
  question?: { text?: string };
  prompt?: { text?: string };
  defaultValue?: string;
  default?: string;
  condition?: string;
  /** Target action id for GotoAction. */
  actionId?: string;
  then?: ActionModel[];
  else?: ActionModel[];
  conditions?: ConditionBranch[];
  /** Loop body of a Foreach; the YAML key is `actions`. */
  body?: ActionModel[];
  /** Collection to iterate: `items` in C#, `source` in Python. */
  loopSource?: string;
  /** Current element: a variable path in C# (`value`), a bare name in Python (`itemName`). */
  loopValue?: string;
  /** Current index: `index` in C#, `indexName` in Python. */
  loopIndex?: string;
  thenText?: string;
  elseText?: string;
  agentName?: string;
  conversationId?: string;
  input?: AgentInput;
  output?: AgentOutput;
  functionName?: string;
  toolName?: string;
  serverUrl?: string;
  serverLabel?: string;
  /** Literal `true`/`false` or an expression, so it stays a string. */
  requireApproval?: string;
  url?: string;
  method?: string;
  response?: string;
  responseHeaders?: string;
  arguments?: Record<string, string>;
  headers?: Record<string, string>;
  queryParameters?: Record<string, string>;
  /** Properties the builder has no editor for, kept so nothing is lost on export. */
  extra?: Record<string, unknown>;
};

export type WorkflowConnection = {
  id: string;
  from: string;
  to: string;
  kind?: "sequential" | "branch-root" | "branch-continue" | "branch-end";
};

export const actionKindOptions: ActionKind[] = [
  "SetValue",
  "SetVariable",
  "SendActivity",
  "If",
  "ConditionGroup",
  "Foreach",
  "BreakLoop",
  "ContinueLoop",
  "InvokeAzureAgent",
  "Question",
  "RequestExternalInput",
  "GotoAction",
  "CreateConversation",
  "EndWorkflow",
  "InvokeFunctionTool",
  "InvokeMcpTool",
  "HttpRequestAction",
];
