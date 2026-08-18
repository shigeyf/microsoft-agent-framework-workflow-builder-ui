# YAML ワークフロー GUI 開発計画と実装状況

## 1. 目的

Microsoft Agent Framework の宣言型ワークフロー仕様をもとに、YAML を手入力ではなくキャンバスとフォームで組み立てられる React アプリを開発する。

目的は以下の 3 点。

- YAML 仕様の習得を支援する
- ワークフロー定義のミスを減らす
- 生成された YAML をそのまま保存・コピーできる体験を提供する

## 2. 対象ユーザー

- AI エージェントや自動化フローを設計する開発者
- YAML レイアウトを理解し始めたプロトタイプ担当者
- 宣言型ワークフローの設計レビューを行うチーム

## 3. 実装済みの機能

### 3.1 ワークフローの編集

- ワークフロー名 / 説明 / トリガー種別 / 入力パラメータの編集
- キャンバス上でのアクション追加・削除・編集・移動
- `If` と `ConditionGroup` をコンテナとして描画し、内部に分岐を保持
- コンテナの折りたたみと展開
- 分岐末尾の `+` からの追加、結線上の `+` からの挿入

### 3.2 対応アクション

| kind                   | Python | C#  |
| ---------------------- | ------ | --- |
| `SetValue`             | ○      | —   |
| `SetVariable`          | ○      | ○   |
| `SendActivity`         | ○      | ○   |
| `If`                   | ○      | ○   |
| `ConditionGroup`       | ○      | ○   |
| `InvokeAzureAgent`     | ○      | ○   |
| `Question`             | ○      | ○   |
| `RequestExternalInput` | ○      | ○   |
| `GotoAction`           | ○      | ○   |
| `CreateConversation`   | ○      | ○   |
| `EndWorkflow`          | ○      | ○   |
| `InvokeFunctionTool`   | ○      | ○   |
| `InvokeMcpTool`        | ○      | ○   |
| `HttpRequestAction`    | ○      | ○   |

対応可否の根拠は `declarative-workflow-spec-ja.md` の 6.9 節を参照。

※ `Foreach` は両言語に存在するがプロパティ名が異なるため、選択中の Style に応じて `items` / `value` / `index`（C#）と `source` / `itemName` / `indexName`（Python）を使い分ける。入力欄のラベルも Style で切り替わる。

### 3.3 未対応のアクション

下記は専用の編集フォームを持たない。いずれも Python / C# の両方で使える。

| kind | 対応に必要なもの |
| --- | --- |
| `EndConversation` | プロパティなし。カード表示のみで足りる |
| `SetMultipleVariables` | `assignments` 配列の編集 UI |
| `ParseValue` | `variable` / `value` / `valueType` |
| `SetTextVariable` / `ResetVariable` / `ClearAllVariables` | 単一の変数指定 |
| `EditTable` / `EditTableV2` | テーブル操作の UI |
| 会話操作系 | C# 専用。スタイル別フィルタとの連携が必要 |

これらを含む YAML を読み込んでも、未解釈のプロパティは `extra` に保持され、再出力で失われない。実際のスキーマは `declarative-workflow-spec-ja.md` の 6.10 節に記載している。

### 3.4 YAML の入出力

- 入力内容から C# 形式 / Python 形式の YAML をリアルタイム生成
- クリップボードへのコピー
- ローカルファイルの読み込み
- 公式サンプル 12 件を URL から取得して描画

### 3.5 スタイルの扱い

2 つの形式は相互変換できないため、アクションまたは入力が 1 つでもある間は Style を変更できない。作り直すための `New workflow` ボタンを用意している。

アクション一覧は選択中の Style で使えるものだけに絞り込む。

## 4. アーキテクチャ

```text
src/ui/src/features/workflow-builder/
├── WorkflowBuilder.tsx     状態の保持と各操作のオーケストレーション
├── types.ts                ドメインモデルの型定義
├── data.ts                 アクションの初期値
├── samples.ts              公式サンプルの URL 一覧と取得
├── domain/                 座標に依存しない純粋なモデル操作
│   ├── actionTree.ts       then / else / conditions を跨ぐ探索・挿入・削除
│   ├── branches.ts         分岐の正準的な順序
│   ├── nodeIds.ts          キャンバス上のノード ID 規約
│   └── styles.ts           言語別の対応アクションとスタイル固定の判定
├── graph/                  モデル → 描画用ビューモデル
│   ├── layout.ts           座標定数
│   ├── buildNodes.ts       ノード生成と寸法計算
│   ├── buildEdges.ts       結線生成
│   ├── autoLayout.ts       座標を持たない読み込みデータの自動配置
│   └── useWorkflowGraph.ts 上記をまとめるフック
├── components/             React コンポーネント
└── utils/
    ├── yaml.ts             モデル → YAML
    └── parseYaml.ts        YAML → モデル
```

依存の向きは `domain` → `graph` → `components` の一方向とする。`domain` と `graph` は React に依存しない純粋な関数で構成し、単体テストの対象とする。

## 5. 実装上の重要な決定

### 5.1 分岐を平坦化しない

`If` と `ConditionGroup` は親の `actions` 配列に属する 1 つのアクションであり、その中身は `then` / `else` / `conditions[].actions` という別の配列である。この 2 層構造をキャンバス上でも保つ。詳細は `declarative-workflow-spec-ja.md` の 11 節を参照。

### 5.2 未知のプロパティを保持する

パーサーが解釈しなかったキーは `ActionModel.extra` に退避し、書き出し時にそのまま再出力する。仕様には存在するが UI が未対応のプロパティ（`body` や `connection.name` など）や、未対応の kind を読み込んでも内容が失われない。

### 5.3 コンテナの寸法は構造から求める

ネストした分岐が重ならないよう、行の高さと幅を座標ではなく木の構造から算出する。

- `subtreeHeight(action)` — 行の高さ
- `subtreeWidth(action)` — 分岐末尾の `+` の位置、挿入位置、自動配置で共通利用

固定値（`node.width` など）で代用すると、ネストしたコンテナの内側に `+` が入り込む。

### 5.4 コールバックは `node.data` 経由で渡す

キャンバスとビルダー間の通知に `window` のカスタムイベントを使わず、React Flow の `node.data` / `edge.data` に型付きコールバックを載せる。

## 6. テスト方針

`npm test` で Vitest を実行する。重視しているのは次の 3 種類。

1. **往復テスト** — `parse → buildYaml → parse` でモデルが一致すること
2. **プロパティ網羅テスト** — 元 YAML と再出力 YAML のプロパティパスを比較し、欠落を検出する。往復テストは読み書き双方が無視するフィールドを検出できないため、その死角を埋める
3. **レイアウト不変条件** — カード同士が重ならないこと、コンテナ枠が自分の部分木だけを覆うこと、分岐末尾の `+` がネストしたコンテナの内側に入らないこと

テストデータには公式サンプル 11 件をそのまま fixture として使用する。C# の単体テスト由来の `loop_each` / `loop_break` を含む。

## 7. 残課題

- `SetMultipleVariables` / `ParseValue` / `EndConversation` などの専用フォーム。現状は `extra` で内容を保持するのみ
- C# 専用アクション（会話操作など）の対応
- 手動で追加したアクションの自動整列
- `GraphCanvas.tsx` の分割

## 8. 受け入れ基準

- 公式サンプルを読み込み、YAML と一致するグラフを描画できる
- 読み込んだ YAML を再出力してもプロパティが失われない
- C# と Python の差異を UI が区別する
- `npm run build` / `npm test` / `npm run lint` がすべて成功する
