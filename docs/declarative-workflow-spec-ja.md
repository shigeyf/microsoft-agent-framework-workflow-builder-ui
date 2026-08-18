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

例:

```yaml
- kind: InvokeAzureAgent
  id: call_assistant
  agent:
    name: AssistantAgent
  conversationId: =System.ConversationId
  output:
    responseObject: Local.AnalystResult
    autoSend: true
```

### 6.5 関数 / MCP / HTTP

- `InvokeFunctionTool`
- `InvokeMcpTool`
- `HttpRequestAction`

例:

```yaml
- kind: InvokeMcpTool
  id: search_docs
  serverUrl: https://learn.microsoft.com/api/mcp
  toolName: microsoft_docs_search
  arguments:
    query: =Local.SearchQuery
  output:
    result: Local.SearchResults
```

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
