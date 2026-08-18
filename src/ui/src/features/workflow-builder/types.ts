export type WorkflowStyle = "csharp" | "python";

export type WorkflowInputType =
  "string" | "number" | "integer" | "boolean" | "object";

export type ActionKind =
  | "SetValue"
  | "SetVariable"
  | "SendActivity"
  | "If"
  | "ConditionGroup"
  | "InvokeAzureAgent"
  | "Question"
  | "RequestExternalInput"
  | "GotoAction"
  | "EndWorkflow"
  | "CreateConversation"
  | "InvokeFunctionTool"
  | "InvokeMcpTool"
  | "InvokeHttpRequest";

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
  thenText?: string;
  elseText?: string;
  agentName?: string;
  conversationId?: string;
  input?: AgentInput;
  output?: AgentOutput;
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
  "InvokeAzureAgent",
  "Question",
  "RequestExternalInput",
  "GotoAction",
  "CreateConversation",
  "EndWorkflow",
];
