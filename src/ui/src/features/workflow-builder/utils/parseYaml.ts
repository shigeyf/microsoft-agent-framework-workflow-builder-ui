import { parse } from "yaml";
import { actionKindOptions } from "../types";
import type {
  ActionKind,
  ActionModel,
  AgentInput,
  AgentOutput,
  ConditionBranch,
  InputParam,
  WorkflowInputType,
  WorkflowStyle,
} from "../types";

export type ParsedWorkflow = {
  style: WorkflowStyle;
  name: string;
  description: string;
  triggerKind: string;
  inputs: InputParam[];
  actions: ActionModel[];
  /** Action kinds the builder has no editor for; they are still placed on the canvas. */
  unsupportedKinds: string[];
};

export class WorkflowParseError extends Error {}

const KNOWN_KINDS = new Set<string>(actionKindOptions);
const INPUT_TYPES = new Set<WorkflowInputType>([
  "string",
  "number",
  "integer",
  "boolean",
  "object",
]);

type YamlRecord = Record<string, unknown>;

function isRecord(value: unknown): value is YamlRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Flattens any YAML node back to the single-line expression the editors work with.
 * `SetValue.value` may legitimately be a nested map, which we keep as inline JSON.
 */
function asText(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function nestedText(value: unknown, key: string): string {
  return isRecord(value) ? asText(value[key]) : asText(value);
}

class IdFactory {
  private readonly used = new Set<string>();

  /** Keeps authored ids so round-tripped YAML stays diffable; invents stable ones otherwise. */
  claim(candidate: unknown, kind: string): string {
    const base =
      typeof candidate === "string" && candidate.trim()
        ? candidate.trim()
        : kind.toLowerCase();

    if (!this.used.has(base)) {
      this.used.add(base);
      return base;
    }

    let suffix = 2;
    while (this.used.has(`${base}_${suffix}`)) {
      suffix += 1;
    }

    const id = `${base}_${suffix}`;
    this.used.add(id);
    return id;
  }
}

function parseAction(
  raw: unknown,
  ids: IdFactory,
  unsupported: Set<string>,
): ActionModel | null {
  if (!isRecord(raw)) {
    return null;
  }

  const kindText = asText(raw.kind);
  if (!kindText) {
    return null;
  }

  if (!KNOWN_KINDS.has(kindText)) {
    unsupported.add(kindText);
  }

  const kind = kindText as ActionKind;
  const action: ActionModel = {
    id: ids.claim(raw.id, kindText),
    kind,
    displayName: asText(raw.displayName) || kindText,
  };

  if (raw.path !== undefined) {
    action.path = asText(raw.path);
  }

  if (raw.variable !== undefined) {
    action.variable = asText(raw.variable);
  }

  if (raw.value !== undefined) {
    action.value = asText(raw.value);
  }

  if (raw.condition !== undefined) {
    action.condition = asText(raw.condition);
  }

  if (raw.conversationId !== undefined) {
    action.conversationId = asText(raw.conversationId);
  }

  if (raw.actionId !== undefined) {
    action.actionId = asText(raw.actionId);
  }

  if (raw.activity !== undefined) {
    const text = nestedText(raw.activity, "text");
    action.activity = { text };
    action.activityText = text;
  }

  if (raw.question !== undefined) {
    const text = nestedText(raw.question, "text");
    action.question = { text };
    action.questionText = text;
  }

  if (raw.prompt !== undefined) {
    action.prompt = { text: nestedText(raw.prompt, "text") };
  }

  if (raw.default !== undefined) {
    const value = asText(raw.default);
    action.default = value;
    action.defaultValue = value;
  }

  if (raw.agent !== undefined) {
    action.agentName = nestedText(raw.agent, "name");
  }

  const input = parseAgentInput(raw.input);
  if (input) {
    action.input = input;
  }

  const output = parseAgentOutput(raw.output);
  if (output) {
    action.output = output;
  }

  if (raw.then !== undefined) {
    action.then = parseActionList(raw.then, ids, unsupported);
  }

  if (raw.conditions !== undefined) {
    action.conditions = parseConditions(raw.conditions, ids, unsupported);
  }

  // `If` names its fallback `else`; `ConditionGroup` names it `elseActions`.
  const fallback = raw.elseActions ?? raw.else;
  if (fallback !== undefined) {
    action.else = parseActionList(fallback, ids, unsupported);
  }

  if (kind === "If") {
    action.then ??= [];
    action.else ??= [];
  }

  if (kind === "ConditionGroup") {
    action.conditions ??= [];
  }

  return action;
}

function parseAgentInput(raw: unknown): AgentInput | null {
  if (!isRecord(raw)) {
    return null;
  }

  const input: AgentInput = {};

  if (raw.messages !== undefined) {
    input.messages = asText(raw.messages);
  }

  if (isRecord(raw.arguments)) {
    input.arguments = Object.fromEntries(
      Object.entries(raw.arguments).map(([key, value]) => [key, asText(value)]),
    );
  }

  if (raw.externalLoop !== undefined) {
    input.externalLoop = { when: nestedText(raw.externalLoop, "when") };
  }

  return input;
}

function parseAgentOutput(raw: unknown): AgentOutput | null {
  if (!isRecord(raw)) {
    return null;
  }

  const output: AgentOutput = {};

  if (raw.responseObject !== undefined) {
    output.responseObject = asText(raw.responseObject);
  }

  if (raw.messages !== undefined) {
    output.messages = asText(raw.messages);
  }

  if (raw.autoSend !== undefined) {
    output.autoSend = raw.autoSend === true || raw.autoSend === "true";
  }

  return output;
}

function parseActionList(
  raw: unknown,
  ids: IdFactory,
  unsupported: Set<string>,
): ActionModel[] {
  return asArray(raw)
    .map((entry) => parseAction(entry, ids, unsupported))
    .filter((entry): entry is ActionModel => entry !== null);
}

function parseConditions(
  raw: unknown,
  ids: IdFactory,
  unsupported: Set<string>,
): ConditionBranch[] {
  return asArray(raw)
    .filter(isRecord)
    .map((entry) => {
      const branch: ConditionBranch = {
        condition: asText(entry.condition),
        actions: parseActionList(entry.actions, ids, unsupported),
      };

      const id = asText(entry.id);
      if (id) {
        branch.id = id;
      }

      return branch;
    });
}

function parseInputs(raw: unknown): InputParam[] {
  if (!isRecord(raw)) {
    return [];
  }

  return Object.entries(raw).map(([name, spec]) => {
    const type = isRecord(spec) ? asText(spec.type) : "";

    return {
      name,
      type: INPUT_TYPES.has(type as WorkflowInputType)
        ? (type as WorkflowInputType)
        : "string",
      description: isRecord(spec) ? asText(spec.description) : "",
    };
  });
}

export function parseWorkflowYaml(text: string): ParsedWorkflow {
  let document: unknown;

  try {
    document = parse(text);
  } catch (error) {
    throw new WorkflowParseError(
      `YAML の構文エラー: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!isRecord(document)) {
    throw new WorkflowParseError("ワークフローのマッピングが見つかりません。");
  }

  const trigger = isRecord(document.trigger) ? document.trigger : null;
  const style: WorkflowStyle = trigger ? "csharp" : "python";
  const unsupported = new Set<string>();
  const ids = new IdFactory();

  const rawActions = trigger ? trigger.actions : document.actions;
  if (rawActions === undefined) {
    throw new WorkflowParseError(
      "actions が見つかりません。宣言型ワークフローの YAML か確認してください。",
    );
  }

  return {
    style,
    name: asText(document.name) || asText(trigger?.id) || "imported-workflow",
    description: asText(document.description),
    triggerKind: asText(trigger?.kind) || "OnConversationStart",
    inputs: parseInputs(document.inputs),
    actions: parseActionList(rawActions, ids, unsupported),
    unsupportedKinds: [...unsupported],
  };
}
