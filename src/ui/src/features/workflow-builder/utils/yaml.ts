import { stringify } from "yaml";
import type {
  ActionModel,
  AgentInput,
  AgentOutput,
  InputParam,
  WorkflowStyle,
} from "../types";

/** `: ` and ` #` end a plain scalar, so any value containing them must be quoted. */
function needsQuoting(value: string): boolean {
  return (
    /:(\s|$)/.test(value) ||
    /(^|\s)#/.test(value) ||
    /[\n"']/.test(value) ||
    value.trim() !== value
  );
}

/** JSON is valid YAML, so structured values survive as a flow mapping instead of a string. */
function isJsonStructure(value: string): boolean {
  if (!/^[[{]/.test(value)) {
    return false;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null;
  } catch {
    return false;
  }
}

function yamlScalar(value: string): string {
  if (!value) {
    return '""';
  }

  // Expressions must keep their leading `=`, so single quotes are used instead of JSON escaping.
  if (value.startsWith("=") && !value.includes("\n")) {
    return needsQuoting(value) ? `'${value.replaceAll("'", "''")}'` : value;
  }

  if (/^[A-Za-z0-9_./-]+$/.test(value)) {
    return value;
  }

  if (isJsonStructure(value)) {
    return value;
  }

  return JSON.stringify(value);
}

/**
 * A block scalar cannot reproduce a leading blank line, leading indentation or a
 * trailing newline, so those values fall back to a quoted scalar.
 */
function canUseBlockScalar(value: string): boolean {
  return (
    value.includes("\n") &&
    !value.endsWith("\n") &&
    !/^\s/.test(value) &&
    value.split("\n").every((line) => line === line.trimEnd())
  );
}

/**
 * Renders `key: value`, preferring a literal block scalar for multi-line values
 * because quoted scalars fold their newlines into spaces.
 */
function field(indent: string, key: string, value: string): string[] {
  if (!canUseBlockScalar(value)) {
    return [`${indent}${key}: ${yamlScalar(value)}`];
  }

  return [
    `${indent}${key}: |-`,
    ...value.split("\n").map((line) => `${indent}  ${line}`),
  ];
}

function renderAgentInput(input: AgentInput, indent: string): string[] {
  const lines: string[] = [];

  if (input.messages) {
    lines.push(...field(`${indent}  `, "messages", input.messages));
  }

  const args = Object.entries(input.arguments ?? {});
  if (args.length > 0) {
    lines.push(`${indent}  arguments:`);
    for (const [key, value] of args) {
      lines.push(...field(`${indent}    `, key, value));
    }
  }

  if (input.externalLoop?.when) {
    lines.push(`${indent}  externalLoop:`);
    lines.push(...field(`${indent}    `, "when", input.externalLoop.when));
  }

  return lines.length > 0 ? [`${indent}input:`, ...lines] : [];
}

function renderAgentOutput(output: AgentOutput, indent: string): string[] {
  const lines: string[] = [];

  if (output.autoSend !== undefined) {
    lines.push(`${indent}  autoSend: ${output.autoSend}`);
  }

  if (output.responseObject) {
    lines.push(
      ...field(`${indent}  `, "responseObject", output.responseObject),
    );
  }

  if (output.result) {
    lines.push(...field(`${indent}  `, "result", output.result));
  }

  if (output.messages) {
    lines.push(...field(`${indent}  `, "messages", output.messages));
  }

  return lines.length > 0 ? [`${indent}output:`, ...lines] : [];
}

function renderStringMap(
  map: Record<string, string> | undefined,
  key: string,
  indent: string,
): string[] {
  const entries = Object.entries(map ?? {});

  if (entries.length === 0) {
    return [];
  }

  return [
    `${indent}${key}:`,
    ...entries.flatMap(([name, value]) => field(`${indent}  `, name, value)),
  ];
}

/** Re-emits properties the builder does not model, so imports survive a round trip. */
function renderExtra(
  extra: Record<string, unknown> | undefined,
  indent: string,
): string[] {
  if (!extra || Object.keys(extra).length === 0) {
    return [];
  }

  return stringify(extra)
    .trimEnd()
    .split("\n")
    .map((line) => `${indent}${line}`);
}

function renderConversationId(action: ActionModel, indent: string): string[] {
  return action.conversationId
    ? field(`${indent}  `, "conversationId", action.conversationId)
    : [];
}

function renderRequireApproval(action: ActionModel, indent: string): string[] {
  return action.requireApproval
    ? field(`${indent}  `, "requireApproval", action.requireApproval)
    : [];
}

function renderActionList(actions: ActionModel[], indentLevel = 2): string[] {
  const indent = " ".repeat(indentLevel);

  return actions.flatMap((action) => {
    const lines = [`${indent}- kind: ${action.kind}`];

    if (action.id) {
      lines.push(`${indent}  id: ${yamlScalar(action.id)}`);
    }

    if (action.displayName) {
      lines.push(`${indent}  displayName: ${yamlScalar(action.displayName)}`);
    }

    switch (action.kind) {
      case "SetValue":
        lines.push(
          ...field(`${indent}  `, "path", action.path ?? "Local.value"),
        );
        lines.push(...field(`${indent}  `, "value", action.value ?? ""));
        break;
      case "SetVariable":
        lines.push(
          ...field(`${indent}  `, "variable", action.variable ?? "Local.value"),
        );
        lines.push(...field(`${indent}  `, "value", action.value ?? ""));
        break;
      case "SendActivity": {
        const text = action.activity?.text ?? action.activityText ?? "";
        lines.push(`${indent}  activity:`);
        lines.push(...field(`${indent}    `, "text", text));
        break;
      }
      case "If": {
        lines.push(
          ...field(`${indent}  `, "condition", action.condition ?? "=true"),
        );

        const thenActions =
          action.then && action.then.length > 0 ? action.then : [];
        const elseActions =
          action.else && action.else.length > 0 ? action.else : [];

        if (thenActions.length > 0) {
          lines.push(`${indent}  then:`);
          lines.push(...renderActionList(thenActions, indentLevel + 4));
        }

        if (elseActions.length > 0) {
          lines.push(`${indent}  else:`);
          lines.push(...renderActionList(elseActions, indentLevel + 4));
        }
        break;
      }
      case "ConditionGroup": {
        lines.push(`${indent}  conditions:`);
        for (const condition of action.conditions ?? []) {
          const head = field(`${indent}    `, "condition", condition.condition);
          lines.push(`${indent}    - ${head[0].trimStart()}`);
          lines.push(...head.slice(1).map((line) => `  ${line}`));
          if (condition.id) {
            lines.push(`${indent}      id: ${yamlScalar(condition.id)}`);
          }
          lines.push(`${indent}      actions:`);
          lines.push(...renderActionList(condition.actions, indentLevel + 8));
        }

        if (action.else && action.else.length > 0) {
          lines.push(`${indent}  elseActions:`);
          lines.push(...renderActionList(action.else, indentLevel + 4));
        }
        break;
      }
      case "InvokeAzureAgent": {
        lines.push(`${indent}  agent:`);
        lines.push(
          `${indent}    name: ${yamlScalar(action.agentName ?? "AssistantAgent")}`,
        );
        if (action.conversationId) {
          lines.push(
            `${indent}  conversationId: ${yamlScalar(action.conversationId)}`,
          );
        }
        if (action.input) {
          lines.push(...renderAgentInput(action.input, `${indent}  `));
        }
        if (action.output) {
          lines.push(...renderAgentOutput(action.output, `${indent}  `));
        }
        break;
      }
      case "Question": {
        const text = action.question?.text ?? action.questionText ?? "";
        lines.push(`${indent}  question:`);
        lines.push(`${indent}    text: ${yamlScalar(text)}`);
        lines.push(
          `${indent}  variable: ${yamlScalar(action.variable ?? "Local.answer")}`,
        );
        lines.push(
          `${indent}  default: ${yamlScalar(action.defaultValue ?? action.default ?? "")}`,
        );
        break;
      }
      case "GotoAction":
        lines.push(`${indent}  actionId: ${yamlScalar(action.actionId ?? "")}`);
        break;
      case "CreateConversation":
        if (action.conversationId) {
          lines.push(
            `${indent}  conversationId: ${yamlScalar(action.conversationId)}`,
          );
        }
        break;
      case "RequestExternalInput": {
        const text = action.prompt?.text ?? "";
        lines.push(`${indent}  prompt:`);
        lines.push(`${indent}    text: ${yamlScalar(text)}`);
        lines.push(
          `${indent}  variable: ${yamlScalar(action.variable ?? "Local.value")}`,
        );
        lines.push(
          `${indent}  default: ${yamlScalar(action.defaultValue ?? action.default ?? "")}`,
        );
        break;
      }
      case "InvokeFunctionTool": {
        lines.push(
          ...field(`${indent}  `, "functionName", action.functionName ?? ""),
        );
        lines.push(...renderConversationId(action, indent));
        lines.push(...renderRequireApproval(action, indent));
        lines.push(
          ...renderStringMap(action.arguments, "arguments", `${indent}  `),
        );
        if (action.output) {
          lines.push(...renderAgentOutput(action.output, `${indent}  `));
        }
        break;
      }
      case "InvokeMcpTool": {
        lines.push(
          ...field(`${indent}  `, "serverUrl", action.serverUrl ?? ""),
        );
        if (action.serverLabel) {
          lines.push(
            ...field(`${indent}  `, "serverLabel", action.serverLabel),
          );
        }
        lines.push(...field(`${indent}  `, "toolName", action.toolName ?? ""));
        lines.push(...renderConversationId(action, indent));
        lines.push(...renderRequireApproval(action, indent));
        lines.push(
          ...renderStringMap(action.arguments, "arguments", `${indent}  `),
        );
        lines.push(
          ...renderStringMap(action.headers, "headers", `${indent}  `),
        );
        if (action.output) {
          lines.push(...renderAgentOutput(action.output, `${indent}  `));
        }
        break;
      }
      case "HttpRequestAction": {
        lines.push(...renderConversationId(action, indent));
        if (action.method) {
          lines.push(...field(`${indent}  `, "method", action.method));
        }
        lines.push(...field(`${indent}  `, "url", action.url ?? ""));
        lines.push(
          ...renderStringMap(action.headers, "headers", `${indent}  `),
        );
        lines.push(
          ...renderStringMap(
            action.queryParameters,
            "queryParameters",
            `${indent}  `,
          ),
        );
        if (action.response) {
          lines.push(...field(`${indent}  `, "response", action.response));
        }
        if (action.responseHeaders) {
          lines.push(
            ...field(`${indent}  `, "responseHeaders", action.responseHeaders),
          );
        }
        break;
      }
      default:
        break;
    }

    lines.push(...renderExtra(action.extra, `${indent}  `));

    return lines;
  });
}

export function buildYaml(
  style: WorkflowStyle,
  name: string,
  description: string,
  triggerKind: string,
  inputs: InputParam[],
  actions: ActionModel[],
): string {
  const inputBlock = inputs
    .map(
      (input) =>
        `  ${input.name}:\n    type: ${input.type}\n    description: ${yamlScalar(input.description)}`,
    )
    .join("\n");

  const actionsYaml = renderActionList(actions).join("\n");

  if (style === "csharp") {
    const indentedActions = actionsYaml
      .split("\n")
      .map((line) => `    ${line}`)
      .join("\n");

    return [
      "#",
      `# ${name}`,
      "#",
      "kind: Workflow",
      "trigger:",
      `  kind: ${triggerKind}`,
      `  id: ${name}`,
      "  actions:",
      indentedActions,
    ].join("\n");
  }

  // `description` and `inputs` are optional, so they are omitted while empty.
  return [
    `name: ${name}`,
    ...(description ? [`description: ${yamlScalar(description)}`] : []),
    ...(inputs.length > 0 ? ["", "inputs:", inputBlock] : []),
    "",
    "actions:",
    actionsYaml,
  ].join("\n");
}
