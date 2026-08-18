import type {
  ActionKind,
  ActionModel,
  InputParam,
  WorkflowStyle,
} from "./types";

export const defaultInputs: InputParam[] = [];

export const defaultActions: ActionModel[] = [];

export function createAction(
  kind: ActionKind,
  style: WorkflowStyle = "python",
): ActionModel {
  const id = `${kind.toLowerCase()}_${Math.random().toString(36).slice(2, 8)}`;

  switch (kind) {
    case "SetValue":
      return {
        id,
        kind,
        displayName: "Set value",
        x: 40,
        y: 80,
        path: "Local.value",
        value: "Hello",
      };
    case "SetVariable":
      return {
        id,
        kind,
        displayName: "Set variable",
        x: 40,
        y: 80,
        variable: "Local.value",
        value: "sample value",
      };
    case "SendActivity":
      return {
        id,
        kind,
        displayName: "Send activity",
        x: 40,
        y: 80,
        activity: { text: "Hello from workflow" },
        activityText: "Hello from workflow",
      };
    case "If":
      return {
        id,
        kind,
        displayName: "Conditional branch",
        x: 40,
        y: 80,
        condition: "=Local.age >= 18",
        then: [],
        else: [],
      };
    case "ConditionGroup":
      return {
        id,
        kind,
        displayName: "Condition group",
        x: 40,
        y: 80,
        conditions: [
          {
            condition: "=Local.isReady",
            actions: [],
          },
        ],
      };
    case "InvokeAzureAgent":
      return {
        id,
        kind,
        displayName: "Invoke agent",
        x: 40,
        y: 80,
        agentName: "AssistantAgent",
        conversationId: "=System.ConversationId",
      };
    case "Question":
      return {
        id,
        kind,
        displayName: "Ask user",
        x: 40,
        y: 80,
        question: { text: "What is your name?" },
        questionText: "What is your name?",
        variable: "Local.userName",
        defaultValue: "Guest",
        default: "Guest",
      };
    case "RequestExternalInput":
      return {
        id,
        kind,
        displayName: "Request external input",
        x: 40,
        y: 80,
        prompt: { text: "Do you have any feedback?" },
        variable: "Local.feedback",
        default: "No feedback",
      };
    case "GotoAction":
      return {
        id,
        kind,
        displayName: "Go to action",
        x: 40,
        y: 80,
        actionId: "",
      };
    case "CreateConversation":
      return {
        id,
        kind,
        displayName: "Create conversation",
        x: 40,
        y: 80,
        conversationId: "Local.NewConversationId",
      };
    case "EndWorkflow":
      return {
        id,
        kind,
        displayName: "End workflow",
        x: 40,
        y: 80,
      };
    case "Foreach":
      // C# names a variable path, Python names the variable itself.
      return {
        id,
        kind,
        displayName: "For each",
        x: 40,
        y: 80,
        loopSource: style === "csharp" ? '=["a", "b"]' : "=Local.items",
        loopValue: style === "csharp" ? "Local.LoopValue" : "item",
        body: [],
      };
    case "BreakLoop":
      return {
        id,
        kind,
        displayName: "Break loop",
        x: 40,
        y: 80,
      };
    case "ContinueLoop":
      return {
        id,
        kind,
        displayName: "Continue loop",
        x: 40,
        y: 80,
      };
    case "InvokeFunctionTool":
      return {
        id,
        kind,
        displayName: "Invoke function tool",
        x: 40,
        y: 80,
        functionName: "get_weather",
        arguments: {},
        output: { result: "Local.result" },
      };
    case "InvokeMcpTool":
      return {
        id,
        kind,
        displayName: "Invoke MCP tool",
        x: 40,
        y: 80,
        serverUrl: "https://learn.microsoft.com/api/mcp",
        serverLabel: "microsoft_docs",
        toolName: "microsoft_docs_search",
        arguments: {},
        output: { result: "Local.result" },
      };
    case "HttpRequestAction":
      return {
        id,
        kind,
        displayName: "HTTP request",
        x: 40,
        y: 80,
        method: "GET",
        url: "https://api.github.com/repos/microsoft/agent-framework",
        headers: {},
        response: "Local.response",
      };
    default:
      return {
        id,
        kind: "SetValue",
        displayName: "Set value",
        x: 40,
        y: 80,
        path: "Local.value",
        value: "sample value",
      };
  }
}
