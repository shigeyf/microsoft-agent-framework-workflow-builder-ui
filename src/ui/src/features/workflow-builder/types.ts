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
  then?: ActionModel[];
  else?: ActionModel[];
  conditions?: ConditionBranch[];
  thenText?: string;
  elseText?: string;
  agentName?: string;
  conversationId?: string;
  output?: { responseObject?: string; autoSend?: boolean };
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
];
