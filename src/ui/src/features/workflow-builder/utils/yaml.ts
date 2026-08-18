import type { ActionModel, InputParam, WorkflowStyle } from "../types";

/** `: ` and ` #` end a plain scalar, so any value containing them must be quoted. */
function needsQuoting(value: string): boolean {
  return (
    /:(\s|$)/.test(value) ||
    /(^|\s)#/.test(value) ||
    /[\n"']/.test(value) ||
    value.trim() !== value
  );
}

function yamlScalar(value: string): string {
  if (!value) {
    return '""';
  }

  // Expressions must keep their leading `=`, so single quotes are used instead of JSON escaping.
  if (value.startsWith("=")) {
    return needsQuoting(value) ? `'${value.replaceAll("'", "''")}'` : value;
  }

  if (/^[A-Za-z0-9_./-]+$/.test(value)) {
    return value;
  }

  return JSON.stringify(value);
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
          `${indent}  path: ${yamlScalar(action.path ?? "Local.value")}`,
        );
        lines.push(`${indent}  value: ${yamlScalar(action.value ?? "")}`);
        break;
      case "SetVariable":
        lines.push(
          `${indent}  variable: ${yamlScalar(action.variable ?? "Local.value")}`,
        );
        lines.push(`${indent}  value: ${yamlScalar(action.value ?? "")}`);
        break;
      case "SendActivity": {
        const text = action.activity?.text ?? action.activityText ?? "";
        lines.push(`${indent}  activity:`);
        lines.push(`${indent}    text: ${yamlScalar(text)}`);
        break;
      }
      case "If": {
        lines.push(
          `${indent}  condition: ${yamlScalar(action.condition ?? "=true")}`,
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
          lines.push(
            `${indent}    - condition: ${yamlScalar(condition.condition)}`,
          );
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
      default:
        break;
    }

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
  const inputBlock = inputs.length
    ? inputs
        .map(
          (input) =>
            `  ${input.name}:\n    type: ${input.type}\n    description: ${yamlScalar(input.description)}`,
        )
        .join("\n")
    : "  # no inputs";

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

  return [
    `name: ${name}`,
    `description: ${yamlScalar(description)}`,
    "",
    "inputs:",
    inputBlock,
    "",
    "actions:",
    actionsYaml,
  ].join("\n");
}
