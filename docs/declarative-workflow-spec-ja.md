# Microsoft Agent Framework 宣言型ワークフロー YAML 仕様メモ

本資料は、Microsoft Learn の「Declarative Workflows - Overview」をもとに、Microsoft Agent Framework の宣言型ワークフローに関する仕様を整理したものです。特に、YAML ベースでワークフローを定義する際に必要な構造・アクション・式・変数・実行モデルをまとめています。

## 1. 概要

宣言型ワークフローは、プログラムでロジックを書く代わりに、YAML で「何を実行したいか」を記述する方式です。Microsoft Agent Framework では、YAML を読み込み、内部で実行可能なワークフローグラフへ変換します。

主な特徴:

- YAML で読みやすく、非開発者でも編集しやすい
- ワークフローをバージョン管理しやすい
- 実行ロジックをコード変更ではなく設定変更で調整しやすい
- 事前定義されたアクション型で構造が統一される

## 2. 基本構造

### 2.1 C# 形式

C# 向けの YAML では、ワークフローは `kind: Workflow` をルートに持ち、`trigger` 配下に `actions` が配置されます。

```yaml
#
# Workflow description as a comment
#
kind: Workflow
trigger:
  kind: OnConversationStart
  id: my_workflow
  actions:
    - kind: ActionType
      id: unique_action_id
      displayName: Human readable name
      # Action-specific properties
```

主要項目:

- `kind`: 必須。`Workflow` を指定
- `trigger.kind`: 必須。通常は `OnConversationStart`
- `trigger.id`: 必須。ワークフロー識別子
- `trigger.actions`: 必須。アクションの配列

### 2.2 Python 形式

Python 向けの YAML は、ルートに `name`, `description`, `inputs`, `actions` を持ちます。

```yaml
name: my-workflow
description: A brief description of what this workflow does

inputs:
  parameterName:
    type: string
    description: Description of the parameter

actions:
  - kind: ActionType
    id: unique_action_id
    displayName: Human readable name
    # Action-specific properties
```

主要項目:

- `name`: 必須。ワークフロー名
- `description`: 任意
- `inputs`: 任意。ワークフロー入力を定義
- `actions`: 必須。アクションの配列

## 3. 変数と名前空間

宣言型ワークフローでは、変数が名前空間で管理されます。

### 3.1 C# の名前空間

- `Local.*`: ワークフロー内ローカル変数
- `System.*`: システム提供の値

例:

- `Local.message`
- `System.ConversationId`
- `System.LastMessage.Text`

### 3.2 Python の名前空間

- `Local.*`: ローカル変数
- `Workflow.Inputs.*`: 入力パラメータ
- `Workflow.Outputs.*`: 出力値
- `System.*`: システム値

## 4. 式言語

値が `=` で始まる場合、その値は実行時に式として評価されます。PowerFx に近い構文が使われます。

```yaml
value: Hello

value: =Concat("Hello, ", Local.userName)

condition: =Local.age >= 18
```

よく使う機能:

- `Concat(...)`: 文字列連結
- `If(condition, trueValue, falseValue)`: 条件分岐
- `IsBlank(value)`: 空かどうか判定
- `Upper(...)` / `Lower(...)`
- `And(...)`, `Or(...)`, `Not(...)`
- `Find(...)`

## 5. アクションの基本形

すべてのアクションは共通の構造を持ちます。

```yaml
- kind: ActionType
  id: unique_id
  displayName: Name
  # Action-specific properties...
```

共通プロパティ:

- `kind`: 必須
- `id`: 任意（参照用）
- `displayName`: 任意（ログ表示）

## 6. アクションカテゴリ

### 6.1 変数操作

- `SetVariable`
- `SetMultipleVariables`
- `SetTextVariable`
- `ResetVariable`
- `ClearAllVariables`
- `ParseValue`
- `EditTableV2`

例:

```yaml
- kind: SetVariable
  id: set_greeting
  variable: Local.greeting
  value: Hello

- kind: SetVariable
  id: build_message
  variable: Local.message
  value: =Concat(Local.greeting, ", ", Local.userName, "!")
```

### 6.2 制御フロー

- `If`
- `ConditionGroup`
- `Foreach`
- `BreakLoop`
- `ContinueLoop`
- `GotoAction`

例:

```yaml
- kind: If
  id: check_age
  condition: =Local.age >= 18
  then:
    - kind: SendActivity
      activity:
        text: "Welcome, adult user!"
  else:
    - kind: SendActivity
      activity:
        text: "Welcome, young user!"
```

`ConditionGroup` は `If` と似ているが、**フォールバック側のキー名が異なる**。`If` は `else`、`ConditionGroup` は `elseActions` を使う。混同しやすいので注意する。

```yaml
- kind: ConditionGroup
  id: route_by_category
  conditions:
    - condition: =Local.category = "electronics"
      id: electronics_branch
      actions:
        - kind: SetVariable
          variable: Local.department
          value: Electronics Team
  elseActions: # ← else ではない
    - kind: SetVariable
      variable: Local.department
      value: General Support
```

`GotoAction` の `actionId` は、同じワークフロー内に実在するアクション ID を指す必要がある。

```yaml
- kind: GotoAction
  id: continue_loop
  actionId: student_label
```

### 6.3 出力

- `SendActivity`

例:

```yaml
- kind: SendActivity
  id: send_welcome
  activity:
    text: =Concat("Hello, ", Local.userName, "!")
```

### 6.4 エージェント呼び出し

- `InvokeAzureAgent`

```yaml
- kind: InvokeAzureAgent
  id: call_assistant
  agent:
    name: AssistantAgent
  conversationId: =System.ConversationId
  input:
    messages: =Local.userMessage
    arguments:
      topic: =Local.topic
    externalLoop:
      when: =Not(Local.IsResolved)
  output:
    responseObject: Local.AnalystResult
    messages: Local.AnalystMessages
    autoSend: true
```

`input` / `output` のプロパティは次のとおり。

| プロパティ                | 説明                         |
| ------------------------- | ---------------------------- |
| `agent.name`              | 必須。登録済みエージェント名 |
| `conversationId`          | 会話コンテキスト             |
| `input.messages`          | エージェントへ渡すメッセージ |
| `input.arguments`         | 任意キーの引数マップ         |
| `input.externalLoop.when` | 真の間、呼び出しを繰り返す   |
| `output.responseObject`   | 応答オブジェクトの格納先     |
| `output.messages`         | 会話メッセージの格納先       |
| `output.autoSend`         | 応答を自動送信するか         |

`output.responseObject` と `output.messages` は**別のプロパティ**であり、片方の別名ではない。また `output` は後続アクションが参照する変数の代入元になるため、ここを落とすと「代入されていない変数を参照する」壊れたワークフローになる。

### 6.5 関数 / MCP / HTTP

- `InvokeFunctionTool`
- `InvokeMcpTool`
- `HttpRequestAction`

キー名は `HttpRequestAction` であり、`InvokeHttpRequest` ではない。

```yaml
- kind: InvokeFunctionTool
  id: invoke_weather
  functionName: get_weather
  arguments:
    location: =Local.location
  output:
    result: Local.weatherInfo
    autoSend: true

- kind: InvokeMcpTool
  id: search_docs
  serverUrl: https://learn.microsoft.com/api/mcp
  serverLabel: microsoft_docs
  toolName: microsoft_docs_search
  requireApproval: =Workflow.Inputs.requireApproval
  arguments:
    query: =Local.SearchQuery
  output:
    result: Local.SearchResults

- kind: HttpRequestAction
  id: fetch_repo_info
  method: GET
  url: =Concatenate("https://api.github.com/repos/", Local.RepoName)
  headers:
    Accept: application/vnd.github+json
  queryParameters:
    per_page: 10
  response: Local.RepoInfo
  responseHeaders: Local.RepoHeaders
```

ツール系の結果格納先は `output.result` であり、エージェントの `output.responseObject` とは別のキーである。

`requireApproval` は真偽値だけでなく**式も取り得る**（例: `=Workflow.Inputs.requireApproval`）。UI で真偽値のチェックボックスとして扱うと式を表現できない。

### 6.6 Human-in-the-Loop

- `Question`
- `RequestExternalInput`

例:

```yaml
- kind: Question
  id: ask_name
  question:
    text: "What is your name?"
  variable: Local.userName
  default: "Guest"
```

### 6.7 ワークフロー制御

- `EndWorkflow`
- `EndConversation`
- `CreateConversation`

### 6.8 会話操作（C# 専用）

- `AddConversationMessage`
- `CopyConversationMessages`
- `RetrieveConversationMessage`
- `RetrieveConversationMessages`

## 6.9 言語別の対応状況（ソース検証済み）

Microsoft Learn の Actions Quick Reference は 2 か所にあり、内容が食い違っている。Python ピボットの表は `ParseValue` / `SetTextVariable` / `ClearAllVariables` / `EditTableV2` を落としているが、Python の実装には存在する。以下は実装ソースで確認した結果である。

確認箇所:

- Python: `python/packages/declarative/agent_framework_declarative/_workflows/_declarative_builder.py` の `ALL_ACTION_EXECUTORS`、および同ファイル内で構造として特別扱いされる制御構文
- C#: `dotnet/src/Microsoft.Agents.AI.Workflows.Declarative/Interpreter/WorkflowActionVisitor.cs` の `Visit(...)` 群

### 6.9.1 対応表

「本アプリ」列は、この GUI が専用の編集フォームを持つかどうかを示す。未対応のものも読み込み・再出力では内容を保持する。

| kind                           | Python | C#  | 本アプリ |
| ------------------------------ | ------ | --- | -------- |
| `SetValue`                     | ○      | —   | ○        |
| `SetVariable`                  | ○      | ○   | ○        |
| `SetTextVariable`              | ○      | ○   | —        |
| `SetMultipleVariables`         | ○      | ○   | —        |
| `ResetVariable`                | ○      | ○   | —        |
| `ClearAllVariables`            | ○      | ○   | —        |
| `ParseValue`                   | ○      | ○   | —        |
| `EditTable`                    | ○      | ○   | —        |
| `EditTableV2`                  | ○      | ○   | —        |
| `If`                           | ○      | ○   | ○        |
| `ConditionGroup`               | ○      | ○   | ○        |
| `Foreach`                      | ○ ※    | ○ ※ | —        |
| `BreakLoop`                    | ○      | ○   | —        |
| `ContinueLoop`                 | ○      | ○   | —        |
| `GotoAction`                   | ○      | ○   | ○        |
| `SendActivity`                 | ○      | ○   | ○        |
| `InvokeAzureAgent`             | ○      | ○   | ○        |
| `InvokeFunctionTool`           | ○      | ○   | ○        |
| `InvokeMcpTool`                | ○      | ○   | ○        |
| `HttpRequestAction`            | ○      | ○   | ○        |
| `Question`                     | ○      | ○   | ○        |
| `RequestExternalInput`         | ○      | ○   | ○        |
| `EndWorkflow`                  | ○      | ○   | ○        |
| `EndConversation`              | ○      | ○   | —        |
| `EndDialog`                    | ○      | ○   | —        |
| `CancelDialog`                 | ○      | ○   | —        |
| `CancelAllDialogs`             | ○      | ○   | —        |
| `CreateConversation`           | ○      | ○   | ○        |
| `AddConversationMessage`       | —      | ○   | —        |
| `CopyConversationMessages`     | —      | ○   | —        |
| `RetrieveConversationMessage`  | —      | ○   | —        |
| `RetrieveConversationMessages` | —      | ○   | —        |

C# にはこのほか Power Virtual Agents 由来の `BeginDialog` / `OAuthInput` / `RecognizeIntent` / `TransferConversation` / `EmitEvent` / `InvokeConnectorAction` など約 30 種が存在する。Python にはない。

※ `Foreach` は両言語に存在するが、**プロパティ名が互いに異なり互換性がない**。6.10 節を参照。

### 6.9.2 `SetValue` は Python 専用

根拠は次の 4 点。

1. Learn の Python ピボットに「Python **also** supports the `SetValue` action kind」という注記がある
2. Learn の C# ピボットの変数管理アクション一覧に `SetValue` がない
3. C# 形式のサンプル 7 件はすべて `SetVariable` のみを使う
4. C# の `WorkflowActionVisitor.cs` に `SetValue` の出現が 0 件

C# では `SetVariable` に `variable` を指定する形を使う。

### 6.9.3 「実装に無い」ことの判定には注意が必要

C# のビジターには `If` / `EndWorkflow` / `SetValue` の `Visit` が無いが、`If` と `EndWorkflow` は C# サンプルで実際に使われている。オブジェクトモデル側で `If` → `ConditionGroup`、`EndWorkflow` → `EndDialog` のように正規化されるためと考えられる。

**存在すること**の証明にはソース上の出現が使えるが、**存在しないこと**の証明には使えない。`SetValue` については上記のとおり 4 つの独立した根拠を揃えている。

## 6.10 未実装アクションの仕様（実装ソースで確認）

本アプリが専用フォームを持たないアクションのうち、代表的なものの実際のスキーマを記載する。**Learn の記載と Python 実装が食い違うものがある**ため、実装を優先して確認した。

### `Foreach`

コレクションを反復する。`actions` を持つコンテナ型であり、`If` や `ConditionGroup` と同じくネストした構造を取る。

**同じ kind 名でありながら、C# と Python でプロパティ名が完全に異なる。** Learn は両ピボットとも Python 側の形だけを載せているため、C# の記載は誤りである。

C# の形（`dotnet/tests/.../Workflows/LoopEach.yaml` より）:

```yaml
- kind: Foreach
  id: foreach_loop
  items: =["a", "b", "c", "d", "e", "f"] # 反復対象
  value: Local.LoopValue # 現在の要素を入れる変数のパス
  index: Local.LoopIndex # 任意。現在の添字を入れる変数のパス
  actions:
    - kind: SendActivity
      id: send_activity_inner
      activity: x{Local.Count} - {Local.LoopIndex}:{Local.LoopValue}
```

`items` と `value` が必須で、`index` は任意。`value` / `index` は**変数のパス**を書く。

Python の形（`_executors_control_flow.py` より）:

```yaml
- kind: Foreach
  id: process_items
  source: =Local.items # 反復対象
  itemName: item # 任意。既定は item
  indexName: index # 任意。キー自体が無ければ添字変数は作られない
  actions:
    - kind: SendActivity
      activity:
        text: =Concat("Processing ", Local.item)
```

`source` と `actions` が必須。`itemName` / `indexName` は**変数のパスではなく名前**で、実際の変数は `Local.<itemName>` に束縛される。

| 用途       | C#        | Python                      |
| ---------- | --------- | --------------------------- |
| 反復対象   | `items`   | `source`                    |
| 現在の要素 | `value`   | `itemName`（`Local.` 補完） |
| 現在の添字 | `index`   | `indexName`（同上）         |
| 本体       | `actions` | `actions`                   |

一方の形をもう一方へそのまま持ち込むことはできない。

### `BreakLoop` / `ContinueLoop`

`Foreach` の内側で使う。固有のプロパティは持たず、`id` のみを指定する。両言語で同じ形である。

```yaml
- kind: Foreach
  id: foreach_loop
  items: =["a", "b", "c"]
  value: Local.LoopValue
  actions:
    - kind: BreakLoop
      id: break_loop_now

    # BreakLoop 以降は実行されない
    - kind: SetVariable
      id: set_variable_inner
      variable: Local.Count
      value: =Local.Count + 1
```

`ContinueLoop` も同じ形で、以降の本体をスキップして次の反復へ進む。

いずれも制御を移す終端アクションであり、後続のアクションへは進まない。C# の実装では `GotoAction` / `EndWorkflow` / `EndConversation` などと同じ「終端アクション」として扱われる。

### `EndConversation`

会話を終了する。固有のプロパティは持たない。`EndWorkflow` / `EndDialog` / `CancelDialog` / `CancelAllDialogs` も同様に、制御を移す終端アクションである。

```yaml
- kind: EndConversation
  id: end_all

# これ以降は実行されない
- kind: SendActivity
  id: send_activity_1
  activity: NEVER 1!
```

### `SetMultipleVariables`

**Learn の記載と実装が異なる。** Learn は `variables` というマップを示すが、Python の実装が読むのは `assignments` という配列である。

```yaml
# 実装が受け付ける形
- kind: SetMultipleVariables
  id: initialize
  assignments:
    - variable: Local.counter
      value: 0
    - variable: Local.status
      value: pending
```

各要素は `variable` または `path` で対象を指定する。`variables` マップは読み取られない。

### `ParseValue`

**Learn の記載と実装が異なる。** Learn は `source` と `variable` を示すが、実際に読まれるのは `variable`（Python は `path` も可）、`value`、任意の `valueType` である。この形は C# と Python で共通している。

C# の例（`dotnet/tests/.../Workflows/ParseValue.yaml` より）:

```yaml
- kind: SetVariable
  id: set_var
  variable: Local.MySource
  value: "42"

- kind: ParseValue
  id: parse_var
  variable: Local.MyVar
  value: =Local.MySource
  valueType: Number # Table を指定すると配列として解釈する
```

Python は `valueType` に `string` / `number` / `boolean` / `object` / `array` を受け付ける。C# のテストでは `Number` / `Table` が使われており、**値の語彙も一致しない**。`valueType` を省略すると型変換は行われない。

### 補足: `SendActivity` の文字列テンプレート

C# のサンプルでは `activity` にマップではなく文字列を直接与え、`{変数}` で補間する形が使われている。

```yaml
- kind: SendActivity
  id: send_activity_inner
  activity: x{Local.Count} - {Local.LoopIndex}:{Local.LoopValue}
```

`activity.text` を使う形と併存する。読み込み側はどちらの形も受け付ける必要がある。

### 未実装アクションの扱い

これらを含む YAML を読み込んだ場合、本アプリは次のように振る舞う。

- キャンバスにはカードとして表示する
- 解釈しなかったプロパティは `ActionModel.extra` に保持し、書き出し時にそのまま再出力する
- 専用の編集フォームは無いため、ラベル以外は編集できない
- 読み込み時に警告バナーで kind 名を通知する

したがって、未対応のアクションを含むワークフローでも**内容が失われることはない**。

## 6.11 C# 形式と Python 形式は相互に変換できない

同じアクション語彙を持つ部分があるため一見似ているが、3 つの層で異なる。

| 層           | Python                                                        | C#                                          |
| ------------ | ------------------------------------------------------------- | ------------------------------------------- |
| 文書構造     | `name` / `description` / `inputs` / `actions`                 | `kind: Workflow` / `trigger.actions`        |
| 変数名前空間 | `Local.*` `System.*` `Workflow.Inputs.*` `Workflow.Outputs.*` | `Local.*` `System.*` のみ                   |
| アクション   | `SetValue` あり                                               | `SetValue` なし。会話操作など C# 専用が多数 |
| プロパティ   | `Foreach` は `source` / `itemName` / `indexName`              | `Foreach` は `items` / `value` / `index`    |

特に名前空間が致命的で、C# は `Workflow.Inputs` / `Workflow.Outputs` を持たない。入力は `System.LastMessage`、出力は `SendActivity` で表現する。

したがって Python のワークフローを C# 形式に切り替えると、`Workflow.Inputs.age` のような式が**存在しない名前空間を参照したまま残る**。また C# 形式には `inputs:` ブロック自体が無いため、入力定義は出力されず失われる。

スタイルの切り替えは自動変換できないものとして扱うべきである。

## 6.12 YAML 記法上の注意

### 式の引用

`=` で始まる式であっても、コロンと空白の並びを含む場合は**引用しないと YAML として壊れる**。公式サンプルは単一引用符を使っている。

```yaml
# 壊れる（プレーンスカラーが : で終端する）
text: =Concat("You have been categorized as: ", Local.category)

# 正しい
text: '=Concat("You have been categorized as: ", Local.category)'
```

同様に `#` を含む値、前後に空白がある値も引用が必要になる。

### 複数行の式

`externalLoop.when` のように複数行にわたる式は、リテラルブロックスカラー `|-` を使う。引用符付きスカラーで複数行にすると、YAML の仕様上**改行が空白に畳まれる**ため、元の表現が保たれない。

```yaml
externalLoop:
  when: |-
    =Not(Local.ServiceParameters.IsResolved)
     And
     Not(Local.ServiceParameters.NeedsTicket)
```

ただしブロックスカラーは、先頭の空行・行頭インデント・末尾改行を再現できない。`"\n\n[Teacher]:\n"` のような値は引用符付きスカラーで表現する必要がある。

### 構造化された値

`SetValue` の `value` はスカラーだけでなくマップも取れる。文字列として扱うと意味が変わるため注意する。

```yaml
- kind: SetValue
  id: store_results
  path: Workflow.Outputs.survey
  value:
    name: =Local.userName
    feeling: =Local.feeling
```

## 7. 実行モデル

宣言型ワークフローは、YAML を読み込んだあと、以下のような実行フローになります。

1. YAML を読み込む
2. ワークフロー定義を構造化されたアクション列へ変換する
3. 各アクションを順次実行する
4. 必要に応じて条件分岐、ループ、エージェント呼び出し、HTTP 実行を行う
5. 結果を `Local.*` または `Workflow.Outputs.*` に保存する

## 8. 実務上の設計指針

- アクション ID はユニークにする
- ワークフロー全体は `Local.*` と `Workflow.Inputs.*` 経由で状態を管理する
- 条件式は `=` で明示し、文字列比較は `""` を使う
- 実行順序を読みやすくし、コメントでセクションを分ける
- `SendActivity` を使ってデバッグ時の状態確認を行う

## 9. 代表的なサンプル

### 9.1 シンプルな挨拶ワークフロー（C# 形式）

```yaml
kind: Workflow
trigger:
  kind: OnConversationStart
  id: greeting_workflow
  actions:
    - kind: SetVariable
      id: capture_name
      variable: Local.userName
      value: =System.LastMessage.Text

    - kind: SetVariable
      id: set_greeting
      variable: Local.greeting
      value: Hello

    - kind: SetVariable
      id: build_message
      variable: Local.message
      value: =Concat(Local.greeting, ", ", Local.userName, "!")

    - kind: SendActivity
      id: send_greeting
      activity:
        text: =Local.message
```

### 9.2 Python 形式

```yaml
name: greeting-workflow
description: A simple workflow that greets the user

inputs:
  name:
    type: string
    description: The name of the person to greet

actions:
  - kind: SetVariable
    id: set_greeting
    variable: Local.greeting
    value: Hello

  - kind: SetVariable
    id: build_message
    variable: Local.message
    value: =Concat(Local.greeting, ", ", Workflow.Inputs.name, "!")

  - kind: SendActivity
    id: send_greeting
    activity:
      text: =Local.message

  - kind: SetVariable
    id: set_output
    variable: Workflow.Outputs.greeting
    value: =Local.message
```

## 10. まとめ

Microsoft Agent Framework の宣言型ワークフローは、YAML によってワークフローの構造、変数、条件分岐、Agent 呼び出し、HTTP 呼び出し、ループ、対話入力を定義できる仕組みです。C# と Python でルート定義の差異はあるものの、基本の考え方は共通しており、アクションと式によって簡潔に制御できます。

本アプリでは、この仕様を基に、YAML を視覚的に組み立てる GUI を構築し、ファイル生成を支援します。

## 11. 実装上の重要な事実: If / ConditionGroup と branch の整合性

実際の MAF の YAML サンプルでは、条件分岐は「通常の `actions` 配列の要素」そのものとして定義され、分岐の本体は内部の `then` / `else` / `conditions` 配列へネストされる。これは UI の設計において非常に重要な事実である。

### 11.1 実際の構造は親 list と branch list を分離する

代表的な形は次のとおりである。

```yaml
kind: Workflow
trigger:
  kind: OnConversationStart
  actions:
    - kind: ConditionGroup
      id: check_if_resolved
      conditions:
        - condition: =Local.ServiceParameters.IsResolved
          id: test_if_resolved
          actions:
            - kind: GotoAction
              id: end_when_resolved
              actionId: all_done

    - kind: SendActivity
      id: log_ticket
      activity: "Created ticket..."
```

この例から分かるように、`ConditionGroup` 自体は親 `actions` 配列の中に存在する。`condition` の本体は `actions` に入る。したがって、分岐をフラットにして親リストから直接つなぐと、YAML の構造と一致しなくなる。

### 11.2 If / ConditionGroup は「シーケンスの一要素」であり、branch は内部に含む

MAF の分岐は、次の 2 層構造を持つ。

1. 親のアクション配列
   - `If`
   - `ConditionGroup`
   - `SendActivity`
   - `InvokeAzureAgent`
   - など

2. branch の内部配列
   - `then:`
   - `else:`
   - `conditions:[]`
   - `condition.actions:[]`

つまり、条件分岐ノードを単なる「横並びの分岐点」として扱うのではなく、親シーケンス上の一つのノードとして扱うのが自然である。

### 11.3 したがって、UI では branch を平坦化しない

以下のような設計は整合しない。

- `ConditionGroup` から直接 `Then` / `Else` / 次の sibling を同一レベルのノードとして接続する
- `condition` への branch を、親配列の通常の edge と同じように結ぶ
- `If` の `then` 本体を、親のシーケンスと同レベルのノード群として扱う

実際の YAML では、branch は nested な `actions` 配列であり、親の `actions` 配列とは別物である。したがって、canvas 上でも同じように分離して扱うべきである。

### 11.4 挿入ルールは「親 list への挿入」と「branch 内への挿入」を分ける

UI の挿入動作は、次のように定義すべきである。

- `If` または `ConditionGroup` の前/後への挿入
  - 親の `actions` 配列への挿入として扱う
  - これは分岐ノードそのものの位置変更であり、branch 本体ではない

- `then` へ追加
  - `then.actions` に追加する

- `else` へ追加
  - `else.actions` に追加する

- `ConditionGroup.conditions[i]` へ追加
  - `conditions[i].actions` に追加する

このルールにより、曖昧な接続が発生しない。特に「If の前に追加する」の意味が branch 選択なのか親シーケンスなのかで不定になる問題を避けられる。

### 11.5 UI 上の設計判断

今回の実装では、次の設計判断が妥当である。

- 分岐コンテナ自体は親シーケンス上のノードとして表示する
- ただし branch 本体は nested action list として保持する
- branch への追加だけを明示的に選択できるようにする
- 親リストへの挿入は、分岐コンテナの前後に対してのみ行う
- direct sibling のような branch-to-branch 接続は作らない

この整理により、MAF の YAML 仕様とグラフ表現が一致し、実ユーザーが誤った結線を作りにくくなる。

## 12. まとめ

MAF の宣言型ワークフローにおいて、`If` と `ConditionGroup` は「単なる分岐点」ではなく、親の `actions` 配列の中に位置するアクション要素であり、その中身は `then` / `else` / `conditions` の nested な `actions` 配列である。したがって、GUI では branch を平坦化して sibling 接続へ落とすのではなく、親 list と branch list を明確に分離して扱うことが、YAML 仕様と整合する。

この理解は、UI の挿入規則、接続ルール、そして分岐ノードの可視化設計の基礎になる。
